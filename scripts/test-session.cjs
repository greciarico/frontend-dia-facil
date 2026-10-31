const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/services/session-manager.ts'), 'utf8');
const moduleExports = {};
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleExports);
const { SessionManager, SessionFailure } = moduleExports;
function grant(n = 0) {
  return { cuidador: { idCuidador: 3, nombre: 'Grecia', avatarId: null }, sesion: {
    tokenType: 'Bearer', accessToken: 'a_' + String.fromCharCode(65 + n).repeat(43), refreshToken: 'r_' + String.fromCharCode(65 + n).repeat(43),
    accessExpiresAt: new Date(Date.now() + 900000).toISOString(), refreshExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), sessionExpiresAt: new Date(Date.now() + 90 * 86400000).toISOString() } };
}
function fixture(overrides = {}) {
  let raw = null; const writes = []; const revocations = [];
  const deps = {
    read: async () => raw,
    write: async value => { raw = value; writes.push(value); },
    renew: async () => grant(1),
    current: async () => grant().cuidador,
    revoke: async token => { revocations.push(token); }, ...overrides,
  };
  return { manager: new SessionManager(deps), deps, writes, revocations, raw: () => raw,
    seed: token => { raw = JSON.stringify({ version: 1, active: token, pendingRevocations: [] }); } };
}
test('fresh installation is anonymous; only refresh is persisted before authentication', async () => {
  const f = fixture(); await f.manager.restore(); assert.equal(f.manager.getSnapshot().status, 'anonymous');
  await f.manager.establish(grant(), 'onboarding', true);
  assert.equal(f.manager.getSnapshot().stage, 'onboarding'); assert.equal(f.manager.getSnapshot().skippedAvatar, true);
  assert.ok(f.raw().includes(grant().sesion.refreshToken)); assert.ok(!f.raw().includes(grant().sesion.accessToken));
  assert.ok(!f.raw().includes('Grecia')); assert.ok(!f.raw().includes('comprobante'));
});
test('reopening or JavaScript reload restores via refresh without repeating onboarding', async () => {
  const f = fixture(); await f.manager.establish(grant(), 'onboarding');
  const reopened = new SessionManager(f.deps); await reopened.restore();
  assert.equal(reopened.getSnapshot().status, 'authenticated'); assert.equal(reopened.getSnapshot().stage, 'ready');
  assert.equal(JSON.parse(f.raw()).active, grant(1).sesion.refreshToken);
});
test('concurrent refresh requests share a single network call', async () => {
  let resolve; let calls = 0;
  const f = fixture({ renew: () => { calls++; return new Promise(r => { resolve = r; }); } });
  await f.manager.establish(grant(), 'ready');
  const a = f.manager.refresh(), b = f.manager.refresh();
  await new Promise(r => setImmediate(r)); assert.equal(calls, 1);
  resolve(grant(1)); assert.equal(await a, await b);
});
test('transient refresh failure preserves credential; server invalidation removes it', async () => {
  const f = fixture({ renew: async () => { throw new SessionFailure('network'); } });
  f.seed(grant().sesion.refreshToken); await f.manager.restore();
  assert.equal(f.manager.getSnapshot().status, 'restore-error'); assert.equal(JSON.parse(f.raw()).active, grant().sesion.refreshToken);
  f.deps.renew = async () => { throw new SessionFailure('invalid'); };
  await f.manager.retry(); assert.equal(f.manager.getSnapshot().status, 'anonymous'); assert.equal(f.raw(), null);
});
test('offline logout is durable and never restores a pending revocation', async () => {
  const f = fixture({ revoke: async () => { throw new SessionFailure('network'); } });
  await f.manager.establish(grant(), 'ready'); await f.manager.logout();
  assert.equal(f.manager.getSnapshot().status, 'anonymous');
  assert.equal(JSON.parse(f.raw()).active, null);
  assert.deepEqual(JSON.parse(f.raw()).pendingRevocations, [grant().sesion.refreshToken]);
  const reopened = new SessionManager(f.deps); await reopened.restore();
  assert.equal(reopened.getSnapshot().status, 'anonymous');
  await reopened.flushRevocations();
  f.deps.revoke = async token => f.revocations.push(token);
  await reopened.flushRevocations(); assert.equal(f.raw(), null);
});
test('logout during rotation ignores late response and revokes its family via old refresh', async () => {
  let resolve;
  const f = fixture({ renew: () => new Promise(r => { resolve = r; }), revoke: async () => { throw new SessionFailure('network'); } });
  await f.manager.establish(grant(), 'ready'); const flight = f.manager.refresh();
  await new Promise(r => setImmediate(r)); await f.manager.logout(); resolve(grant(1));
  await assert.rejects(flight, e => e.kind === 'canceled');
  assert.equal(f.manager.getSnapshot().status, 'anonymous'); assert.equal(JSON.parse(f.raw()).active, null);
});
test('failed SecureStore write retries the retained result instead of re-authenticating', async () => {
  const f = fixture(); const write = f.deps.write; let calls = 0;
  f.deps.write = async value => { calls++; if (calls === 1) throw new Error(); return write(value); };
  await assert.rejects(f.manager.establish(grant(), 'onboarding'), e => e.kind === 'storage');
  assert.equal(f.manager.getSnapshot().status, 'storage-error');
  await f.manager.retry(); assert.equal(f.manager.getSnapshot().status, 'authenticated'); assert.equal(calls, 2);
});
test('lost rotated response causes OTP on next invalid refresh, without weakening replay detection', async () => {
  let calls = 0;
  const f = fixture({ renew: async () => { calls++; throw new SessionFailure(calls === 1 ? 'network' : 'invalid'); } });
  f.seed(grant().sesion.refreshToken); await f.manager.restore(); await f.manager.retry();
  assert.equal(f.manager.getSnapshot().status, 'anonymous'); assert.equal(f.raw(), null);
});
test('valid refresh is not enough to route private before initial bearer validation', async () => {
  let release;
  const f = fixture({ current: () => new Promise(r => { release = r; }) }); f.seed(grant().sesion.refreshToken);
  const restore = f.manager.restore(); await new Promise(r => setImmediate(r));
  assert.equal(f.manager.getSnapshot().status, 'booting'); release(grant().cuidador); await restore;
  assert.equal(f.manager.getSnapshot().status, 'authenticated');
});

test('private Axios retries a rejected GET only once and never retries 403 or an unsafe POST', async () => {
  let request, failure, response;
  let refreshCalls = 0, replayCalls = 0;
  let currentToken = 'old';
  const manager = { revision: () => 1, access: async () => currentToken,
    recoverRejected: async () => { refreshCalls++; currentToken = 'new'; return currentToken; } };
  const client = async config => {
    replayCalls++; await request(config);
    return failure({ config, response: { status: 401, data: { codigo: 'SESION_REQUIERE_RENOVACION' } } });
  };
  client.interceptors = { request: { use: fn => { request = fn; } }, response: { use: (ok, fail) => { response = ok; failure = fail; } } };
  const module = {};
  const privateSource = fs.readFileSync(path.join(__dirname, '../src/services/private-http.ts'), 'utf8');
  new Function('require', 'exports', ts.transpileModule(privateSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(
    id => ({ axios: { create: () => client }, '@/config/env': { getApiUrl: () => 'https://example.invalid' },
      './session': { sessionManager: manager }, './session-manager': { SessionFailure } })[id], module);
  assert.equal(module.getAuthenticatedHttpClient(), client);
  const config = { method: 'get', url: '/api/auth/cuidadores/sesion', baseURL: 'https://other.invalid', headers: { set: () => {} } };
  await request(config);
  assert.equal(config.baseURL, 'https://example.invalid');
  await assert.rejects(failure({ config, response: { status: 401, data: { codigo: 'SESION_REQUIERE_RENOVACION' } } }));
  assert.equal(refreshCalls, 1); assert.equal(replayCalls, 1);
  const post = { ...config, method: 'post', _retried: false };
  await assert.rejects(failure({ config: post, response: { status: 401, data: { codigo: 'SESION_REQUIERE_RENOVACION' } } }));
  await assert.rejects(failure({ config: { ...config, _retried: false }, response: { status: 403 } }));
  assert.equal(refreshCalls, 1); assert.equal(replayCalls, 1);
  await assert.rejects(request({ ...config, url: 'https://other.invalid' }));
  assert.equal(response({ status: 200 }).status, 200);
});

test('access expiring during interrupted startup renews once without discarding a valid refresh', async () => {
  let reads = 0, renewals = 0;
  const f = fixture({ renew: async () => { renewals++; return grant(renewals); }, current: async () => {
    reads++; if (reads === 1) throw new SessionFailure('renewable'); return grant().cuidador;
  } });
  f.seed(grant().sesion.refreshToken); await f.manager.restore();
  assert.equal(f.manager.getSnapshot().status, 'authenticated');
  assert.equal(reads, 2); assert.equal(renewals, 2); assert.equal(JSON.parse(f.raw()).active, grant(2).sesion.refreshToken);
});

// Execute the actual route/layout components with lightweight native and JSX adapters.
// This covers navigation guards and screen lifecycle, beyond the manager-only tests.
function loadComponent(relative, modules) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const tokens = {};
  new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/theme/tokens.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText)(tokens);
  const defaults = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { StyleSheet: { create: value => value }, Text: 'Text', View: 'View', TextInput: 'TextInput',
      Pressable: 'Pressable', Keyboard: { dismiss() {} }, AccessibilityInfo: { announceForAccessibility() {} } },
    'react-native-svg': { default: 'Svg', Path: 'Path' },
    '@/theme/tokens': tokens,
    '@/theme/use-theme': { useAppTheme: () => tokens.themes.light },
    '@/components/carer/account-avatar': { AccountAvatar: 'AccountAvatar' },
    '@/components/carer/account-layout': { AccountLayout: 'AccountLayout', accountStyles: {} },
    '@/components/carer/continue-button': { ContinueButton: 'ContinueButton' },
    '@/components/carer/avatar-selector': { AvatarSelector: 'AvatarSelector' },
    ...modules,
  };
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(id => {
    assert.ok(id in defaults, `Missing test adapter: ${id}`);
    return defaults[id];
  }, exports);
  return exports.default;
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function allowedScreens(snapshot) {
  const Stack = Object.assign('Stack', { Screen: 'Screen', Protected: 'Protected' });
  const layout = loadComponent('app/cuidador/_layout.tsx', {
    'expo-router': { Stack },
    '@/context/carer-registration': { CarerRegistrationProvider: 'RegistrationProvider' },
    '@/context/session': { useSession: () => snapshot },
  })();
  return nodes(layout).filter(node => node.type === 'Protected' && node.props.guard)
    .flatMap(node => nodes(node.props.children).filter(child => child.type === 'Screen').map(child => child.props.name));
}

test('registration keeps Step 3 mounted during the authenticated transition; existing/restored sessions exclude onboarding', () => {
  assert.ok(allowedScreens({ status: 'anonymous', stage: 'ready' }).includes('paso-3'));
  assert.deepEqual(allowedScreens({ status: 'authenticated', stage: 'onboarding' }), ['paso-3', 'paso-4']);
  assert.deepEqual(allowedScreens({ status: 'authenticated', stage: 'otp' }), ['paso-2']);
  assert.deepEqual(allowedScreens({ status: 'authenticated', stage: 'ready' }), []);
});

test('actual Step 3 persists the session before navigating, without losing its route when the manager publishes', async () => {
  let releaseWrite;
  const f = fixture({ write: () => new Promise(resolve => { releaseWrite = resolve; }) });
  await f.manager.restore();
  const navigations = [];
  let stateIndex = 0;
  const cleanup = [];
  const screen = loadComponent('app/cuidador/paso-3.tsx', {
    '@/components/forms/keyboard-aware-form': { KeyboardAwareTextInput: 'TextInput' },
    react: { useState: initial => [stateIndex++ === 0 ? 'Grecia' : initial, () => {}],
      useRef: current => ({ current }), useCallback: fn => fn, useEffect: fn => fn() },
    'expo-router': { Redirect: 'Redirect', router: { replace: route => navigations.push(route) },
      useFocusEffect: fn => cleanup.push(fn()) },
    '@/context/session': { useSession: () => ({ manager: f.manager, ...f.manager.getSnapshot() }) },
    '@/context/carer-registration': { useCarerRegistration: () => ({ pending: { comprobanteRegistro: 'test-only' }, clear() {} }) },
    '@/services/carer-auth': { completeCarerRegistration: async () => grant(), CodeRequestError: class extends Error {} },
    '@/utils/carer-registration': { validateCarerName: () => undefined,
      registrationInput: (comprobanteRegistro, nombre, avatarId) => ({ comprobanteRegistro, nombre, avatarId }) },
  });
  let allowedAtPublication;
  const unsubscribe = f.manager.subscribe(() => { allowedAtPublication = allowedScreens(f.manager.getSnapshot()); });
  nodes(screen()).find(node => node.type === 'ContinueButton' && node.props.label === 'Continuar').props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(navigations, []);
  assert.equal(f.manager.getSnapshot().status, 'anonymous');
  releaseWrite();
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(allowedAtPublication.includes('paso-3'));
  assert.deepEqual(navigations, ['/cuidador/paso-4']);
  assert.equal(f.manager.getSnapshot().stage, 'onboarding');
  unsubscribe(); cleanup.forEach(fn => fn?.());
});

test('Step 4 mount/unmount does not finish onboarding; Continue and explicit back do', async () => {
  for (const action of ['continue', 'back']) {
    const f = fixture(); await f.manager.establish(grant(), 'onboarding');
    const effects = [];
    const navigations = [];
    const screen = loadComponent('app/cuidador/paso-4.tsx', {
      react: { useEffect: fn => effects.push(fn()) },
      'expo-router': { Redirect: 'Redirect', router: { replace: route => navigations.push(route) } },
      '@/context/session': { useSession: () => ({ manager: f.manager, ...f.manager.getSnapshot() }) },
    });
    screen(); effects.splice(0).forEach(cleanup => cleanup?.());
    assert.equal(f.manager.getSnapshot().stage, 'onboarding');
    assert.deepEqual(navigations, []);
    const tree = screen();
    if (action === 'continue') nodes(tree).find(node => node.type === 'ContinueButton').props.onPress();
    else tree.props.onBack();
    assert.equal(f.manager.getSnapshot().stage, 'ready');
    assert.deepEqual(navigations, ['/']);
    assert.equal(screen().type, 'Redirect');
  }
});

test('storage retry retains immediate onboarding, but a new manager restores ready and cannot show Step 4', async () => {
  const f = fixture(); const write = f.deps.write;
  f.deps.write = async () => { throw new Error('Storage unavailable'); };
  await assert.rejects(f.manager.establish(grant(), 'onboarding', true));
  assert.ok(!allowedScreens(f.manager.getSnapshot()).includes('paso-4'));
  f.deps.write = write; await f.manager.retry();
  assert.ok(allowedScreens(f.manager.getSnapshot()).includes('paso-4'));
  assert.equal(f.manager.getSnapshot().skippedAvatar, true);
  const restored = new SessionManager(f.deps); await restored.restore();
  assert.equal(restored.getSnapshot().stage, 'ready');
  assert.equal(restored.getSnapshot().skippedAvatar, false);
  assert.ok(!allowedScreens(restored.getSnapshot()).includes('paso-4'));
});

test('private client retries opted-in POST only after renewable 401 and keeps safe business metadata', async () => {
  let request, failure; let renewals = 0, replays = 0;
  const manager = { revision: () => 1, access: async () => 'access', recoverRejected: async () => { renewals++; } };
  const client = async config => { replays++; assert.equal(config._retried, true); return { status: 201 }; };
  client.interceptors = { request: { use: fn => { request = fn; } }, response: { use: (_ok, fn) => { failure = fn; } } };
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/private-http.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText)(id => ({ axios: { create: () => client }, '@/config/env': { getApiUrl: () => 'https://example.invalid' },
    './session': { sessionManager: manager }, './session-manager': { SessionFailure } })[id], exports);
  exports.getAuthenticatedHttpClient();
  const config = { method: 'post', url: '/api/perfiles', authReplaySafe: true, headers: { set() {} } };
  await request(config);
  assert.equal((await failure({ config, response: { status: 401, data: { codigo: 'SESION_REQUIERE_RENOVACION' } } })).status, 201);
  assert.equal(renewals, 1); assert.equal(replays, 1);
  for (const status of [409, 503]) {
    await assert.rejects(failure({ config, response: { status, data: { codigo: 'LIMITE_PERFILES_ALCANZADO', detail: 'private detail',
      errores: [{ campo: 'nombre', mensaje: 'private' }, { campo: 'secret' }] } } }), error => {
      assert.equal(error.status, status); assert.equal(error.codigo, 'LIMITE_PERFILES_ALCANZADO');
      assert.deepEqual(error.fields, ['nombre']); assert.ok(!JSON.stringify(error).includes('private')); return true;
    });
  }
  await assert.rejects(failure({ config, code: 'ECONNABORTED' }));
  assert.equal(renewals, 1); assert.equal(replays, 1);
});
