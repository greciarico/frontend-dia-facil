const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
function load(file, modules, globals = {}) {
  const exports = {};
  new Function('require', 'exports', ...Object.keys(globals), ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(name => { assert.ok(name in modules, name); return modules[name]; }, exports, ...Object.values(globals));
  return exports;
}
const deferred = () => { let resolve, reject; const promise = new Promise((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; };
class HttpError extends Error { constructor(status) { super('safe'); this.status = status; } }
function fixture(options = {}) {
  let epoch = 1, index = 0, dirty = false, value;
  let snapshot = { status: 'authenticated', stage: 'ready', caregiver: { idCuidador: 8 } };
  const slots = [], effects = [], exits = new Set(), tokens = new Set(), responses = new Set(), appStates = new Set();
  const calls = [], deletes = [], opens = [], gets = [], channelGets = [], channelCreates = [];
  let channel = options.channel ?? null;
  let prompts = 0, nativeQueries = 0;
  const expoOptions = [], deadlines = new Map(); let timerId = 0;
  let deviceToken = { type: 'android', data: 'native-initial' };
  const emitToken = token => tokens.forEach(fn => fn(token));
  const preferences = options.preferences ?? new Map();
  const remoteGets = [], preferenceWrites = [];
  const preferenceIntents = new Map(); let nextIntent = 0, serverVersion = 0;
  const etag = () => JSON.stringify(epoch + ':' + serverVersion);
  let remoteState = { activo: false, idCuidador: 8, idRegistro: null, generacion: null };
  const manager = { revision: () => epoch, getSnapshot: () => snapshot, onExit: fn => { exits.add(fn); return () => exits.delete(fn); } };
  const changed = (a, b) => !a || a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]));
  const react = {
    createContext: () => ({ Provider: 'Provider' }), useContext: () => value,
    useRef: initial => { const i = index++; return slots[i] ??= { current: initial }; },
    useState: initial => { const i = index++; slots[i] ??= { value: initial }; return [slots[i].value, v => { slots[i].value = typeof v === 'function' ? v(slots[i].value) : v; dirty = true; }]; },
    useEffect: (fn, deps) => { const i = index++; const old = slots[i]; if (changed(old?.deps, deps)) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
    useCallback: (fn, deps) => { const i = index++; if (changed(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
  };
  const subscribe = (set, fn) => { set.add(fn); return { remove: () => set.delete(fn) }; };
  const native = {
    AndroidImportance: { HIGH: 4 }, setNotificationHandler: h => { native.handler = h; },
    getNotificationChannelAsync: async id => { channelGets.push(id); return options.channelLookup ? options.channelLookup(id) : channel; },
    setNotificationChannelAsync: async (id, settings) => { channelCreates.push([id, settings]); channel = { id, ...settings }; return channel; },
    getPermissionsAsync: options.permissions ?? (async () => ({ granted: !options.denied, canAskAgain: !options.blocked })),
    requestPermissionsAsync: async () => { prompts++; return options.permissionRequest ? options.permissionRequest() : { granted: true }; },
    getDevicePushTokenAsync: async () => {
      nativeQueries++;
      if (options.nativeToken) return options.nativeToken();
      emitToken(deviceToken); // Match the installed Android module: querying emits even unchanged tokens.
      return deviceToken;
    },
    getExpoPushTokenAsync: async args => { expoOptions.push(args); return options.token ? options.token(args) : { data: 'token' }; },
    addPushTokenListener: fn => subscribe(tokens, fn),
    addNotificationReceivedListener: () => ({ remove() {} }),
    addNotificationResponseReceivedListener: fn => subscribe(responses, fn),
    getLastNotificationResponseAsync: async () => options.initialResponse ?? null, clearLastNotificationResponseAsync: async () => {}, dismissAllNotificationsAsync: async () => {},
  };
  const intents = load('utils/push-intent.ts', {});
  const { CarerPushProvider } = load('context/carer-push.tsx', {
    react, 'react/jsx-runtime': { jsx: (_t, props) => { value = props.value; return props; } },
    'react-native': { AppState: { addEventListener: (_name, fn) => subscribe(appStates, fn) }, Linking: {} },
    'expo-constants': { __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'project' } } } } },
    'expo-router': { useRootNavigationState: () => ({ key: 'mounted' }), router: { push: route => opens.push(route) } },
    './session': { useSession: () => ({ ...snapshot, manager }) }, './device-access': { useDeviceAccess: () => ({ status: options.user ? 'linked' : 'unlinked' }) },
    '@/services/private-http': { PrivateHttpError: HttpError }, '@/utils/push-intent': intents,
    '@/services/carer-notifications': { getNotification: async (...args) => { gets.push(args); if (options.error) throw options.error; return { idNotificacion: args[0] }; }, markNotificationRead: () => assert.fail('Push must not mark read') },
    '@/services/carer-push': { pushSupported: () => true, notificationsNative: async () => native, installationId: options.installation ?? (async () => 'installation'), pushRefresh: { emit() {} },
      readPushPreference: async (owner, installation) => {
        const key = owner + ':' + installation;
        if (!preferenceIntents.has(key)) preferenceIntents.set(key, 'intent-' + ++nextIntent);
        const preference = options.preferenceRead ? await options.preferenceRead(owner, installation) : preferences.get(key) ?? 'enabled';
        return { version: 1, intentId: preferenceIntents.get(key), preference };
      },
      writePushPreference: async (owner, installation, preference, expected, current = () => true) => {
        const key = owner + ':' + installation;
        if (!current() || expected !== undefined && expected !== preferenceIntents.get(key)) throw new Error('stale intent');
        preferenceWrites.push([owner, installation, preference]);
        if (options.preferenceWrite) await options.preferenceWrite(preference);
        if (!current()) throw new Error('stale intent');
        const intentId = expected ?? 'intent-' + ++nextIntent;
        preferenceIntents.set(key, intentId); preferences.set(key, preference);
        return { version: 1, intentId, preference };
      },
      getPushRegistration: async (...args) => {
        remoteGets.push(args);
        const result = options.remote ? await options.remote(...args) : remoteState;
        return { ...result, etag: etag() };
      },
      registerPush: async (...args) => {
        calls.push(args);
        const result = options.register ? await options.register(...args) : { idRegistro: 2, generacion: 1, idCuidador: snapshot.caregiver.idCuidador };
        if (args[3] !== etag()) throw new HttpError(412);
        remoteState = { ...result, activo: true }; serverVersion++;
        return { ...result, etag: etag() };
      },
      unregisterPush: async (...args) => {
        deletes.push(args); if (options.unregister) await options.unregister(...args);
        if (args[2] !== etag()) throw new HttpError(412);
        if (!options.revocationIgnored) remoteState = { ...remoteState, activo: false };
        serverVersion++;
        if (options.lostDeleteResponse?.()) throw new HttpError();
        return etag();
      } },

  }, {
    setTimeout: (fn, ms) => { assert.equal(ms, 45_000); const id = ++timerId; deadlines.set(id, fn); return id; },
    clearTimeout: id => deadlines.delete(id),
  });
  const render = () => { index = 0; dirty = false; CarerPushProvider({ children: null }); effects.splice(0).forEach(fn => fn()); };
  const flush = async () => { for (let i = 0; i < 6; i++) { await new Promise(r => setImmediate(r)); if (dirty) render(); } };
  render();
  return { calls, deletes, opens, gets, channelGets, channelCreates, native, render, flush, state: () => value, prompts: () => prompts,
    serverActive: () => remoteState.activo, preferences, preferenceWrites, remoteGets, expoOptions, nativeQueries: () => nativeQueries, deadlines: () => deadlines.size,
    expire: () => { for (const [id, fn] of [...deadlines]) { deadlines.delete(id); fn(); } },
    repeatToken: () => emitToken(deviceToken),
    rotate: () => { deviceToken = { type: 'android', data: deviceToken.data + '-rotated' }; emitToken(deviceToken); }, foreground: () => appStates.forEach(fn => fn('active')),
    tap: () => responses.forEach(fn => fn({ notification: { request: { content: { data: { version: 1, tipo: 'NOTIFICACION_CUIDADOR', idNotificacion: 4, idRegistro: 2, generacion: 1, idCuidador: 8 } } } } })),
    logout: () => { exits.forEach(fn => fn()); epoch++; snapshot = { ...snapshot, status: 'anonymous', caregiver: null }; render(); },
    replaceSession: () => { epoch++; render(); },
    changeCaregiver: id => { epoch++; snapshot = { ...snapshot, caregiver: { idCuidador: id } }; remoteState = { activo: false, idCuidador: id }; render(); },
    unmount: () => slots.forEach(s => s.cleanup?.()),
  };
}
test('native query events and duplicate tokens never cause repeated Expo/backend registrations', async () => {
  const f = fixture(); await f.flush(); f.repeatToken(); f.repeatToken(); await f.flush();
  assert.equal(f.nativeQueries(), 1); assert.equal(f.expoOptions.length, 1); assert.equal(f.calls.length, 1);
  assert.deepEqual(f.expoOptions[0].devicePushToken, { type: 'android', data: 'native-initial' });
  assert.equal(f.state().status, 'enabled'); assert.equal(f.deadlines(), 0);
  f.rotate(); await f.flush(); f.repeatToken(); await f.flush();
  assert.equal(f.nativeQueries(), 1); assert.equal(f.calls.length, 2);
  assert.equal(f.expoOptions[1].devicePushToken.data, 'native-initial-rotated'); f.unmount();
});

test('every activation stage has a deadline and late completions cannot register or report success', async () => {
  for (const [key, stage, result] of [
    ['channelLookup', 'canal', null], ['permissions', 'permisos', { granted: true }],
    ['nativeToken', 'token-nativo', { type: 'android', data: 'late-native' }],
    ['token', 'token-expo', { data: 'late-expo' }], ['installation', 'almacenamiento', 'late-installation'],
    ['register', 'registro', { idRegistro: 2, generacion: 1, idCuidador: 8 }],
  ]) {
    const hanging = deferred(), f = fixture({ [key]: () => hanging.promise }); await f.flush();
    assert.equal(f.state().status, 'checking', key); f.expire(); await f.flush();
    assert.equal(f.state().status, 'error', key); assert.equal(f.state().errorStage, stage);
    assert.equal(f.state().errorCode, 'TIEMPO_AGOTADO'); assert.equal(f.deadlines(), 0);
    const before = f.calls.length;
    hanging.resolve(result); await f.flush();
    assert.equal(f.state().status, 'error'); assert.equal(f.calls.length, before);
    if (key === 'register') assert.equal(f.calls[0][2].aborted, true);
    f.unmount();
  }
});

test('timeout releases activation for manual retry and ignores the previous attempt', async () => {
  const old = deferred(); let count = 0;
  const f = fixture({ token: () => ++count === 1 ? old.promise : Promise.resolve({ data: 'fresh' }) });
  await f.flush(); f.expire(); await f.flush();
  assert.equal(f.state().status, 'error'); f.state().activate(); await f.flush();
  assert.equal(f.state().status, 'enabled'); assert.equal(f.calls.length, 1); assert.equal(f.calls[0][1], 'fresh');
  old.resolve({ data: 'stale' }); await f.flush(); assert.equal(f.calls.length, 1); assert.equal(f.state().status, 'enabled'); f.unmount();
});

test('failed registration does not drain queued automatic work and retries only on a new action', async () => {
  const response = deferred(); let count = 0;
  const f = fixture({ register: () => ++count === 1 ? response.promise : Promise.resolve({ idRegistro: 2, generacion: 1, idCuidador: 8 }) });
  await f.flush(); f.rotate(); f.foreground(); response.reject(new HttpError(503)); await f.flush();
  assert.equal(f.state().status, 'error'); assert.equal(f.state().errorStage, 'registro'); assert.equal(f.calls.length, 1);
  await f.flush(); assert.equal(f.calls.length, 1);
  f.state().activate(); await f.flush(); assert.equal(f.state().status, 'enabled'); assert.equal(f.calls.length, 2); f.unmount();
});

test('HTTP registration failures are recoverable without exposing response details', async () => {
  for (const status of [400, 401, 403, 503]) {
    const f = fixture({ register: async () => { throw new HttpError(status); } }); await f.flush();
    assert.equal(f.state().status, 'error'); assert.equal(f.state().errorStage, 'registro');
    assert.equal(f.state().errorCode, 'OPERACION_FALLIDA'); assert.equal(f.deadlines(), 0); f.unmount();
  }
});

test('a response belonging to another caregiver terminates with validation error', async () => {
  const f = fixture({ register: async () => ({ idRegistro: 2, generacion: 1, idCuidador: 99 }) }); await f.flush();
  assert.equal(f.state().status, 'error'); assert.equal(f.state().errorCode, 'VALIDACION'); assert.equal(f.deadlines(), 0); f.unmount();
});

test('permission prompt remains single-flight across timed-out manual attempts', async () => {
  const prompt = deferred(), f = fixture({ denied: true, permissionRequest: () => prompt.promise }); await f.flush();
  f.state().activate(); await f.flush(); assert.equal(f.prompts(), 1);
  f.expire(); await f.flush(); assert.equal(f.state().status, 'error');
  f.state().activate(); await f.flush(); assert.equal(f.prompts(), 1);
  prompt.resolve({ granted: true }); await f.flush();
  assert.equal(f.state().status, 'enabled'); assert.equal(f.calls.length, 1); f.unmount();
});

test('denied Android permissions never acquire a push token or leave a pending deadline', async () => {
  const f = fixture({ denied: true, blocked: true }); await f.flush();
  assert.equal(f.state().status, 'denied'); assert.equal(f.nativeQueries(), 0); assert.equal(f.prompts(), 0); assert.equal(f.deadlines(), 0); f.unmount();
});

test('missing Android channel uses system sound without a custom audio filename', async () => {
  const f = fixture(); await f.flush();
  assert.deepEqual(f.channelCreates, [['diafacil-cuidador-v1', { name: 'Avisos del cuidador', importance: 4 }]]);
  assert.equal(Object.hasOwn(f.channelCreates[0][1], 'sound'), false);
  assert.equal(f.calls.length, 1); assert.equal(f.state().status, 'enabled'); f.unmount();
});

test('existing Android channel preserves custom or silent user settings without recreation', async () => {
  for (const sound of ['custom', null]) {
    const channel = { id: 'diafacil-cuidador-v1', sound, importance: 2 };
    const f = fixture({ channel }); await f.flush(); f.foreground(); await f.flush();
    assert.equal(f.channelCreates.length, 0); assert.equal(channel.sound, sound); assert.equal(channel.importance, 2);
    assert.equal(f.state().status, 'enabled'); f.unmount();
  }
});

test('foreground and token rotation reuse one channel without an autonomous retry loop', async () => {
  const f = fixture(); await f.flush();
  f.foreground(); f.rotate(); f.foreground(); await f.flush();
  assert.equal(f.channelCreates.length, 1);
  assert.ok(f.calls.length >= 2);
  const lookups = f.channelGets.length, registrations = f.calls.length;
  await f.flush(); await f.flush();
  assert.equal(f.channelGets.length, lookups); assert.equal(f.calls.length, registrations); f.unmount();
});

test('logout or unmount during channel lookup prevents late channel creation and registration', async () => {
  for (const exit of ['logout', 'unmount']) {
    const lookup = deferred(), f = fixture({ channelLookup: () => lookup.promise }); await f.flush();
    f[exit](); lookup.resolve(null); await f.flush();
    assert.equal(f.channelCreates.length, 0); assert.equal(f.calls.length, 0); f.unmount();
  }
});

test('caregiver permissions require explicit action; denied permission keeps internal notifications available', async () => {
  const f = fixture({ denied: true }); await f.flush(); assert.equal(f.prompts(), 0); assert.equal(f.calls.length, 0); assert.equal(f.deletes.length, 1);
  f.state().activate(); await f.flush(); assert.equal(f.prompts(), 1); assert.equal(f.calls.length, 1); f.unmount();
});
test('user device never requests caregiver permissions or registers a token', async () => {
  const f = fixture({ user: true }); await f.flush(); f.state().activate(); await f.flush(); assert.equal(f.prompts(), 0); assert.equal(f.calls.length, 0); f.unmount();
});
test('logout during token acquisition cannot register or DELETE using the next identity', async () => {
  const token = deferred(), f = fixture({ token: () => token.promise }); await f.flush(); f.logout(); token.resolve({ data: 'late' }); await f.flush();
  assert.equal(f.calls.length, 0); assert.equal(f.deletes.length, 0); f.unmount();
});
test('same caregiver with a new session cancels old registration work', async () => {
  const token = deferred(); let n = 0; const f = fixture({ token: () => ++n === 1 ? token.promise : Promise.resolve({ data: 'new' }) });
  await f.flush(); f.replaceSession(); await f.flush(); token.resolve({ data: 'old' }); await f.flush();
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0][1], 'new'); assert.equal(f.calls[0][4], 2); f.unmount();
});
test('rotation during an in-flight registration is reconciled afterwards', async () => {
  const token = deferred(); let n = 0; const f = fixture({ token: () => ++n === 1 ? token.promise : Promise.resolve({ data: 'rotated' }) });
  await f.flush(); f.rotate(); token.resolve({ data: 'original' }); await f.flush(); assert.equal(f.calls.length, 2); assert.equal(f.calls[1][1], 'rotated'); f.unmount();
});
test('authorized cold/warm tap opens notifications once and never marks read', async () => {
  const f = fixture(); await f.flush(); f.tap(); await f.flush(); f.tap(); await f.flush();
  assert.equal(f.gets.length, 1); assert.equal(f.opens.length, 1); assert.equal(f.opens[0].pathname, '/notificaciones'); assert.equal(f.gets[0][2], 1); f.unmount();
});
test('terminal notification rejection is discarded; a network failure retries on foreground', async () => {
  for (const [error, expected] of [[new HttpError(403), 1], [new HttpError(404), 1], [new HttpError(), 2]]) {
    const f = fixture({ error }); await f.flush(); f.tap(); await f.flush(); f.foreground(); await f.flush(); assert.equal(f.gets.length, expected); assert.equal(f.opens.length, 0); f.unmount();
  }
});
test('private transport binds token operations before access, after access, on response and replay', async () => {
  let epoch = 1, request, success, failure, headers = 0, recover;
  const token = deferred(); let access = () => token.promise;
  const manager = { revision: () => epoch, access: () => access(), recoverRejected: async () => recover?.() };
  class Failure extends Error {}
  const client = async config => request(config);
  client.interceptors = { request: { use: fn => { request = fn; } }, response: { use: (ok, fail) => { success = ok; failure = fail; } } };
  const api = load('services/private-http.ts', { axios: { create: () => client }, '@/config/env': { getApiUrl: () => 'https://example.invalid' }, './session': { sessionManager: manager }, './session-manager': { SessionFailure: Failure } });
  api.getAuthenticatedHttpClient();
  const config = () => ({ url: '/api/push/registro', method: 'put', expectedRevision: 1, authReplaySafe: true, headers: { set() { headers++; } } });
  const pending = request(config()); epoch = 2; token.resolve('old'); await assert.rejects(pending, Failure); assert.equal(headers, 0);
  await assert.rejects(request(config()), Failure);
  assert.throws(() => success({ config: config() }), Failure);
  epoch = 1; access = async () => 'new'; const c = await request(config()); recover = () => { epoch = 2; };
  await assert.rejects(failure({ config: c, response: { status: 401, data: { codigo: 'SESION_REQUIERE_RENOVACION' } } }), Failure);
  assert.equal(headers, 1);
});

const payload = { version: 1, tipo: 'NOTIFICACION_CUIDADOR', idNotificacion: 4, idRegistro: 2, generacion: 1, idCuidador: 8 };
test('cold-start tap waits for registration and mounted navigation before opening', async () => {
  const token = deferred(); const f = fixture({ token: () => token.promise, initialResponse: { notification: { request: { content: { data: payload } } } } });
  await f.flush(); assert.equal(f.opens.length, 0); assert.equal(f.gets.length, 0);
  token.resolve({ data: 'token' }); await f.flush(); assert.equal(f.opens.length, 1); assert.equal(f.gets.length, 1); f.unmount();
});
test('foreground banners respect visible cards, session revision and provider cleanup', async () => {
  const f = fixture(); await f.flush(); const notification = { request: { content: { data: payload } } };
  assert.equal((await f.native.handler.handleNotification(notification)).shouldShowBanner, true);
  f.state().visible([4]); assert.equal((await f.native.handler.handleNotification(notification)).shouldShowBanner, false);
  f.state().visible([]); f.logout(); assert.equal((await f.native.handler.handleNotification(notification)).shouldShowBanner, false);
  f.unmount(); assert.equal((await f.native.handler.handleNotification(notification)).shouldPlaySound, false);
});


test('turning notices off revokes and verifies the device, persists and survives foreground/rotation/relaunch', async () => {
  const preferences = new Map(), f = fixture({ preferences }); await f.flush(); assert.equal(f.state().enabled, true);
  f.state().deactivate(); await f.flush();
  assert.equal(f.state().status, 'disabled'); assert.equal(f.state().enabled, false); assert.equal(f.deletes.length, 1);
  assert.equal(preferences.get('8:installation'), 'disabled');
  assert.equal(f.remoteGets.at(-1)[2], 1);
  f.foreground(); await f.flush(); f.rotate(); await f.flush(); assert.equal(f.calls.length, 1); f.unmount();
  const restarted = fixture({ preferences }); await restarted.flush();
  assert.equal(restarted.state().status, 'disabled'); assert.equal(restarted.calls.length, 0); assert.equal(restarted.nativeQueries(), 0); restarted.unmount();
});

test('offline revocation is explicitly pending and retries without re-registering on foreground', async () => {
  let offline = true;
  const f = fixture({ unregister: async () => { if (offline) throw new HttpError(); } }); await f.flush();
  f.state().deactivate(); await f.flush();
  assert.equal(f.state().status, 'disable-pending'); assert.equal(f.state().enabled, false);
  assert.equal(f.preferences.get('8:installation'), 'disable-pending'); assert.equal(f.calls.length, 1);
  offline = false; f.foreground(); await f.flush();
  assert.equal(f.state().status, 'disabled'); assert.equal(f.calls.length, 1); assert.equal(f.deletes.length, 2); f.unmount();
});

test('DELETE acknowledgement alone never reports disabled while GET still reports active', async () => {
  const options = { revocationIgnored: true }, f = fixture(options); await f.flush(); f.state().deactivate(); await f.flush();
  assert.equal(f.state().status, 'disable-pending'); assert.equal(f.preferences.get('8:installation'), 'disable-pending');
  options.revocationIgnored = false; f.state().deactivate(); await f.flush(); assert.equal(f.state().status, 'disabled'); f.unmount();
});

test('a manual disable interrupts token acquisition and rejects its late result', async () => {
  const token = deferred(), f = fixture({ token: () => token.promise }); await f.flush();
  f.state().deactivate(); await f.flush(); assert.equal(f.state().status, 'disabled');
  token.resolve({ data: 'late-token' }); await f.flush(); assert.equal(f.calls.length, 0); assert.equal(f.state().enabled, false); f.unmount();
});

test('storage failure cannot silently re-enable an off request within the current session', async () => {
  let broken = true;
  const f = fixture({ preferenceWrite: async () => { if (broken) throw new Error('storage'); } }); await f.flush();
  f.state().deactivate(); await f.flush(); assert.equal(f.state().status, 'disable-pending');
  broken = false; f.foreground(); await f.flush();
  assert.equal(f.state().status, 'disabled'); assert.equal(f.calls.length, 1); f.unmount();
});

test('preferences are per caregiver and session changes do not reuse a disabled identity', async () => {
  const f = fixture({ preferences: new Map([['8:installation', 'disabled']]) }); await f.flush();
  assert.equal(f.state().enabled, false); assert.equal(f.calls.length, 0);
  f.changeCaregiver(9); await f.flush(); assert.equal(f.state().enabled, true); assert.equal(f.calls.length, 1);
  assert.equal(f.preferences.get('8:installation'), 'disabled'); f.logout(); await f.flush();
  assert.equal(f.state().enabled, false); f.foreground(); await f.flush(); assert.equal(f.calls.length, 1); f.unmount();
});

test('logout during pending revocation cannot confirm or send requests under another session', async () => {
  const revoke = deferred(), f = fixture({ unregister: () => revoke.promise }); await f.flush();
  f.state().deactivate(); await f.flush(); const reads = f.remoteGets.length;
  f.logout(); revoke.resolve(); await f.flush();
  assert.equal(f.remoteGets.length, reads); assert.equal(f.preferences.get('8:installation'), 'disable-pending'); assert.equal(f.state().enabled, false); f.unmount();
});

function historyFixture(options = {}) {
  let index = 0, dirty = false, tree, focused = true;
  const slots = [], effects = [], timers = new Map(), scrolls = [], writes = [];
  let timerId = 0, pagesLoaded = 0, detailCalls = 0;
  let params = { pushId: String(options.target ?? 4), pushKey: 'one' };
  const changed = (a, b) => !a || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  const react = {
    useState: initial => { const i = index++; slots[i] ??= { value: initial }; return [slots[i].value, v => { slots[i].value = typeof v === 'function' ? v(slots[i].value) : v; dirty = true; }]; },
    useRef: value => { const i = index++; return slots[i] ??= { current: value }; },
    useEffect: (fn, deps) => { const i = index++; if (changed(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
    useCallback: (fn, deps) => { const i = index++; if (changed(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
  };
  const notice = id => ({ idNotificacion: id, tipo: 'AYUDA_GENERAL', leida: false });
  const query = { items: (options.ids ?? [5, 4, 3]).map(notice), cursor: options.pages ? 'next' : null, loading: false, more: false, error: '', marking: [], reload() {},
    loadMore: () => { const ids = options.pages?.[pagesLoaded++] ?? []; query.items = [...query.items, ...ids.map(notice)]; query.cursor = pagesLoaded < options.pages.length ? 'next' : null; dirty = true; },
    markRead: id => { writes.push(id); query.items = query.items.map(n => n.idNotificacion === id ? { ...n, leida: true } : n); dirty = true; },
  };
  const jsx = (type, props) => {
    if (type === 'List') props.ref.current = { scrollToIndex: value => scrolls.push(['index', value]), scrollToOffset: value => scrolls.push(['offset', value]) };
    return { type, props };
  };
  const colors = { text: { primary: '#000', secondary: '#333' }, action: { primary: '#650', onPrimary: '#fff' }, profiles: { information: '#F8F3FA' }, status: { error: '#f00' } };
  const { default: Screen } = load('app/(cuidador-autenticado)/(principal)/notificaciones.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'expo-router': { useLocalSearchParams: () => params, useFocusEffect: fn => react.useEffect(() => focused ? fn() : undefined, [fn, focused]) },
    'react-native': { View: 'View', FlatList: 'List', Pressable: 'Pressable', ActivityIndicator: 'Spinner', StyleSheet: { create: v => v } },
    '@/components/app-text': { AppText: 'Text' }, '@/components/carer/continue-button': { ContinueButton: 'Button' }, '@/components/carer/notification-card': { NotificationCard: 'Card' },
    '@/hooks/use-carer-notifications': { useCarerNotifications: () => query },
    '@/theme/tokens': { layout: {}, radii: {}, sizes: {}, spacing: {}, typography: { family: {}, size: {}, lineHeight: {} } }, '@/theme/use-theme': { useAppTheme: () => ({ colors }) },
    '@/context/carer-push': { useCarerPush: () => ({ visible() {} }) }, '@/services/carer-push': { pushRefresh: { subscribe() {} } },
    '@/services/carer-notifications': { getNotification: async (id, signal) => { detailCalls++; return options.detail ? options.detail(id, signal) : { idNotificacion: id }; }, markNotificationRead: () => assert.fail('Push opening cannot write read state') },
  }, { setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id) });
  const render = () => { index = 0; dirty = false; tree = Screen(); effects.splice(0).forEach(fn => fn()); };
  const flush = async () => { for (let i = 0; i < 10; i++) { await new Promise(r => setImmediate(r)); if (dirty) render(); } };
  const list = () => tree.props.children.find(node => node?.type === 'List');
  render();
  return { flush, list, query, scrolls, writes, timers, tree: () => tree,
    row: id => list().props.renderItem({ item: query.items.find(item => item.idNotificacion === id) }),
    visible: ids => list().props.onViewableItemsChanged({ viewableItems: ids.map(id => ({ item: notice(id) })) }),
    expire: ms => { for (const [id, t] of [...timers]) if (t.ms === ms) { timers.delete(id); t.fn(); } },
    pages: () => pagesLoaded, details: () => detailCalls,
    retryTarget: () => list().props.ListHeaderComponent.props.children[1].props.onPress(),
    filter: name => tree.props.children[0].props.children.find(node => node.props.accessibilityLabel === name).props.onPress(),
    intent: id => { params = { pushId: String(id), pushKey: String(id) }; render(); },
    unmount: () => slots.forEach(s => s?.cleanup?.()),
    focus: () => { focused = true; render(); }, blur: () => { focused = false; render(); },
  };
}

test('push stays at its chronological position, highlights for 3 seconds after visibility and only a tap marks read', async () => {
  const f = historyFixture(); await f.flush();
  assert.deepEqual(f.list().props.data.map(n => n.idNotificacion), [5, 4, 3]); assert.equal(f.writes.length, 0);
  assert.equal(f.scrolls[0][1].index, 1); assert.equal(f.timers.size, 0);
  assert.equal(f.row(4).props.highlighted, false);
  f.visible([4]); await f.flush(); assert.equal(f.row(4).props.highlighted, true);
  assert.equal([...f.timers.values()][0].ms, 3_000); assert.equal(f.writes.length, 0);
  f.expire(3_000); await f.flush(); assert.equal(f.row(4).props.highlighted, false);
  f.visible([4]); await f.flush(); assert.equal(f.timers.size, 0);
  f.row(4).props.onPress(); await f.flush(); assert.deepEqual(f.writes, [4]); assert.equal(f.query.items[1].leida, true);
  assert.equal(JSON.stringify(f.tree()).includes('Avisos Android activados'), false); f.unmount();
});

test('older push loads consecutive history pages without inserting or duplicating a selected card', async () => {
  const f = historyFixture({ ids: [9, 8], pages: [[7, 6], [5, 4]] }); await f.flush();
  assert.equal(f.pages(), 2); assert.deepEqual(f.query.items.map(n => n.idNotificacion), [9, 8, 7, 6, 5, 4]);
  assert.equal(f.scrolls[0][1].index, 5); assert.equal(f.writes.length, 0); f.unmount();
});

test('history lookup loads at most five extra pages, retains manual pagination and stops when filter changes', async () => {
  const f = historyFixture({ target: 1, ids: [20], pages: [[19], [18], [17], [16], [15], [14], [1]] }); await f.flush();
  assert.equal(f.pages(), 5); assert.equal(f.query.cursor, 'next'); assert.equal(f.scrolls.length, 0);
  f.filter('Ayuda'); await f.flush(); f.list().props.onViewableItemsChanged({ viewableItems: [{ item: { idNotificacion: 1 } }] }); await f.flush();
  assert.equal(f.timers.size, 0); assert.equal(f.pages(), 5); f.unmount();
});

test('changing push target, changing filters and leaving history clear highlight and scroll timers', async () => {
  const f = historyFixture(); await f.flush(); f.visible([4]); await f.flush();
  f.intent(3); await f.flush(); assert.equal(f.row(4).props.highlighted, false);
  f.visible([3]); await f.flush(); assert.equal(f.row(3).props.highlighted, true);
  f.filter('Sistema'); await f.flush(); assert.equal(f.row(3).props.highlighted, false); assert.equal(f.timers.size, 0);
  f.intent(4); await f.flush();
  f.list().props.onScrollToIndexFailed({ index: 1, averageItemLength: 120 }); assert.equal(f.timers.size, 1);
  f.blur(); await f.flush(); assert.equal(f.timers.size, 0); f.unmount();
});

test('revocation timeout stays pending and late completion cannot falsely confirm off', async () => {
  const revoke = deferred(), f = fixture({ unregister: () => revoke.promise }); await f.flush();
  f.state().deactivate(); await f.flush(); f.expire(); await f.flush();
  assert.equal(f.state().status, 'disable-pending'); assert.equal(f.state().errorCode, 'TIEMPO_AGOTADO');
  assert.equal(f.deletes[0][1].aborted, true); const reads = f.remoteGets.length;
  revoke.resolve(); await f.flush(); assert.equal(f.remoteGets.length, reads); assert.equal(f.state().status, 'disable-pending'); f.unmount();
});

test('unfinished push lookup resumes after blur/refocus and ignores the previous aborted response', async () => {
  const old = deferred(); let n = 0;
  const f = historyFixture({ detail: async () => ++n === 1 ? old.promise : { idNotificacion: 4 } }); await f.flush();
  f.blur(); await f.flush(); f.focus(); await f.flush();
  assert.equal(f.details(), 2); assert.equal(f.scrolls.at(-1)[1].index, 1);
  f.visible([4]); await f.flush(); assert.equal(f.row(4).props.highlighted, true);
  old.resolve({ idNotificacion: 4 }); await f.flush(); assert.equal(f.row(4).props.highlighted, true);
  assert.equal(f.writes.length, 0); f.unmount();
});

test('seen or filter-cancelled push intents never replay when history regains focus', async () => {
  for (const cancelled of [false, true]) {
    const f = historyFixture(); await f.flush();
    if (cancelled) f.filter('Ayuda'); else { f.visible([4]); await f.flush(); }
    await f.flush(); const lookups = f.details(), scrolls = f.scrolls.length;
    f.blur(); await f.flush(); f.focus(); await f.flush(); f.visible([4]); await f.flush();
    assert.equal(f.details(), lookups); assert.equal(f.scrolls.length, scrolls);
    assert.equal(f.timers.size, 0); assert.equal(f.row(4).props.highlighted, false); f.unmount();
  }
});

test('B1: an expired PUT cannot reactivate after acknowledged DELETE even without a previous token', async () => {
  const pending = deferred(), f = fixture({ register: () => pending.promise }); await f.flush();
  f.expire(); await f.flush(); f.state().deactivate(); await f.flush();
  assert.equal(f.state().status, 'disabled'); assert.equal(f.serverActive(), false);
  pending.resolve({ idRegistro: 2, generacion: 1, idCuidador: 8 }); await f.flush();
  assert.equal(f.state().status, 'disabled'); assert.equal(f.serverActive(), false);
  assert.equal(f.preferences.get('8:installation'), 'disabled'); f.unmount();
});

test('manual history retry resets its bounded page budget while refocus preserves that budget', async () => {
  const f=historyFixture({target:1,ids:[20],pages:[[19],[18],[17],[16],[15],[14],[1]]}); await f.flush();
  assert.equal(f.pages(),5); f.blur(); await f.flush(); f.focus(); await f.flush(); assert.equal(f.pages(),5);
  f.retryTarget(); await f.flush(); assert.equal(f.pages(),7); assert.equal(f.scrolls.at(-1)[1].index,7); f.unmount();
});

test('a current intent reconciles one 412 but repeated conflicts stop without an automatic loop', async () => {
  for (const permanent of [false, true]) {
    let calls = 0;
    const f = fixture({ register: async () => {
      if (++calls === 1 || permanent) throw new HttpError(412);
      return { idRegistro: 2, generacion: 1, idCuidador: 8 };
    } });
    await f.flush();
    assert.equal(calls, 2); assert.equal(f.state().status, permanent ? 'error' : 'enabled');
    await f.flush(); assert.equal(calls, 2); f.unmount();
  }
});
test('a disabled legacy preference establishes a server fence even when GET reports no registration', async () => {
  const f = fixture({ preferences: new Map([['8:installation', 'disabled']]) });
  await f.flush(); assert.equal(f.deletes.length, 1); assert.equal(f.calls.length, 0);
  assert.equal(f.state().status, 'disabled'); f.unmount();
});
test('lost DELETE response remains pending, and a fresh conditional DELETE confirms the same off intent', async () => {
  let lose = true;
  const f = fixture({ lostDeleteResponse: () => lose }); await f.flush();
  f.state().deactivate(); await f.flush();
  assert.equal(f.serverActive(), false); assert.equal(f.state().status, 'disable-pending');
  assert.equal(f.preferences.get('8:installation'), 'disable-pending');
  lose = false; f.foreground(); await f.flush();
  assert.equal(f.state().status, 'disabled'); assert.equal(f.deletes.length, 2); f.unmount();
});
test('an obsolete activation blocked in GET never sends PUT or upgrades its precondition after off', async () => {
  const old = deferred(); let gets = 0;
  const f = fixture({ remote: async () => ++gets === 1 ? old.promise : { activo: false, idCuidador: 8 } });
  await f.flush(); f.state().deactivate(); await f.flush();
  assert.equal(f.state().status, 'disabled'); assert.equal(f.calls.length, 0);
  old.resolve({ activo: false, idCuidador: 8 }); await f.flush();
  assert.equal(f.calls.length, 0); assert.equal(f.state().status, 'disabled'); f.unmount();
});
test('delete conflicts reconcile only the current off intent and never reacquire an Expo token', async () => {
  let attempts = 0;
  const f = fixture({ unregister: async () => { if (++attempts === 1) throw new HttpError(412); } });
  await f.flush(); f.state().deactivate(); await f.flush();
  assert.equal(attempts, 2); assert.equal(f.state().status, 'disabled');
  assert.equal(f.calls.length, 1); assert.equal(f.nativeQueries(), 1); f.unmount();
});
test('queued opposite choices invalidate old asynchronous permission work', async () => {
  const permission = deferred();
  const f = fixture({ permissions: () => permission.promise }); await f.flush();
  f.state().activate(); f.state().deactivate(); await f.flush();
  assert.equal(f.state().status, 'disabled');
  permission.resolve({ granted: true }); await f.flush();
  assert.equal(f.calls.length, 0); assert.equal(f.state().enabled, false); f.unmount();
});

test('off remains pending when preference reads fail, and reconnect never falls back to activation', async () => {
  let broken = false;
  const f = fixture({ preferenceRead: async () => { if (broken) throw new Error('storage'); return 'enabled'; } });
  await f.flush(); broken = true; f.state().deactivate(); await f.flush();
  assert.equal(f.state().status, 'disable-pending'); assert.equal(f.state().enabled, false);
  assert.equal(f.calls.length, 1);
  broken = false; f.foreground(); await f.flush();
  assert.equal(f.state().status, 'disabled'); assert.equal(f.calls.length, 1); f.unmount();
});
