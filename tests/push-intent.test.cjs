const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const api = {};
new Function('exports', ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/utils/push-intent.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(api);
const { parsePushIntent, pushDecision, PushIntents } = api;
const intent = { version: 1, tipo: 'NOTIFICACION_CUIDADOR', idNotificacion: 4, idRegistro: 2, generacion: 1, idCuidador: 8 };
const registration = { idRegistro: 2, generacion: 1, idCuidador: 8 };
test('wait for mounted navigation, authentication and registration; no user session activation', () => {
  assert.equal(pushDecision(intent, undefined, registration, true), 'wait');
  assert.equal(pushDecision(intent, 8, registration, false), 'wait');
  assert.equal(pushDecision(intent, 8, null, true), 'wait');
  assert.equal(pushDecision(intent, 8, registration, true), 'open');
});
test('discard old account, rotated generation and mismatched registration', () => {
  assert.equal(pushDecision(intent, 9, registration, true), 'discard');
  assert.equal(pushDecision(intent, 8, { ...registration, generacion: 2 }, true), 'discard');
  assert.equal(pushDecision(intent, 8, { ...registration, idRegistro: 3 }, true), 'discard');
  assert.equal(pushDecision(intent, 8, { ...registration, idCuidador: 9 }, true), 'discard');
});
test('reject malformed payloads and arbitrary links', () => {
  for (const value of [null, {}, { url: '/mi-agenda' }, { ...intent, version: 2 }, { ...intent, tipo: 'URL' }, { ...intent, idCuidador: '8' }, { ...intent, generacion: 0 }, { ...intent, idRegistro: Infinity }]) assert.equal(parsePushIntent(value), null);
  assert.deepEqual(parsePushIntent({ ...intent, url: 'https://bad.example' }), intent);
});
test('cold/warm duplicate taps consumed once; network failure retains pending', () => {
  const queue = new PushIntents(); queue.receive(intent); assert.deepEqual(queue.pending, intent);
  queue.receive(intent); queue.consume(queue.pending); queue.receive(intent); assert.equal(queue.pending, null);
});
test('new account and generation have independent dedup keys', () => {
  const queue = new PushIntents(); queue.receive(intent); queue.consume(queue.pending);
  queue.receive({ ...intent, generacion: 2 }); assert.equal(queue.pending.generacion, 2);
  queue.consume(queue.pending); queue.receive({ ...intent, idCuidador: 9 }); assert.equal(queue.pending.idCuidador, 9);
});
function service(options = {}) {
  let reads = 0, writes = 0, ids = 0;
  const etag = '\"' + 'a'.repeat(64) + '\"';
  const calls = [], stored = options.stored ?? new Map();
  const config = { extra: { eas: { projectId: 'test-project' }, push: { enabled: true } } };
  const modules = {
    'react-native': { Platform: { OS: options.platform ?? 'android' } },
    'expo-constants': { __esModule: true, default: { executionEnvironment: options.environment ?? 'standalone', expoConfig: options.disabled ? { extra: { push: { enabled: false } } } : config } },
    'expo-secure-store': { getItemAsync: async key => { reads++; return stored.get(key) ?? null; }, setItemAsync: async (key, value) => { writes++; if (options.write) await options.write(key, value); stored.set(key, value); } },
    '@/utils/operation-key': { operationKey: () => ++ids === 1 ? 'installation-uuid' : 'intent-' + ids },
    './session': { sessionManager: { revision: () => 1 } },
    './private-http': { getAuthenticatedHttpClient: () => ({ get: async (...args) => { calls.push(['GET', ...args]); return { headers: options.headers ?? { etag }, data: options.remote ?? { activo: false, idRegistro: null, generacion: null, idCuidador: 8, proyectoEas: 'test-project' } }; }, put: async (...args) => { calls.push(['PUT', ...args]); return { headers: options.headers ?? { etag }, data: options.response ?? { activo: true, idRegistro: 2, generacion: 1, idCuidador: 8, proyectoEas: 'test-project' } }; }, delete: async (...args) => { calls.push(['DELETE', ...args]); return { headers: options.headers ?? { etag } }; } }) },
  };
  const result = {};
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/services/carer-push.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => {
    assert.ok(name in modules, `Unexpected native module import: ${name}`); return modules[name];
  }, result);
  return { ...result, stored, calls, counts: () => [reads, writes] };
}
test('disabled, web and Expo Go never load notification native module', () => {
  for (const options of [{ disabled: true }, { platform: 'web' }, { environment: 'storeClient' }]) {
    const s = service(options); assert.equal(s.pushSupported(), false); assert.throws(() => s.notificationsNative()); assert.deepEqual(s.calls, []);
  }
});
test('installation concurrent callers share UUID; authenticated REST contract validates state', async () => {
  const s = service();
  assert.deepEqual(await Promise.all([s.installationId(), s.installationId()]), ['installation-uuid', 'installation-uuid']);
  assert.deepEqual(s.counts(), [1, 1]);
  const signal = new AbortController().signal;
  assert.equal((await s.registerPush('installation-uuid', 'test-token', signal, '\"' + 'a'.repeat(64) + '\"')).idRegistro, 2);
  await s.unregisterPush('installation-uuid', signal, '\"' + 'a'.repeat(64) + '\"');
  assert.deepEqual(s.calls[0].slice(0, 3), ['PUT', '/api/push/registro', { idInstalacion: 'installation-uuid', expoToken: 'test-token', plataforma: 'ANDROID' }]);
  assert.deepEqual(s.calls[1][2].params, { idInstalacion: 'installation-uuid' });
  await assert.rejects(service({ response: { activo: false } }).registerPush('id', 'token', signal, '\"' + 'a'.repeat(64) + '\"'));
});

test('push preference storage is account/installation scoped and GET uses the guarded session contract', async () => {
  const s = service(), signal = new AbortController().signal;
  assert.equal((await s.readPushPreference(8, 'one')).preference, 'enabled');
  await s.writePushPreference(8, 'one', 'disabled');
  assert.equal((await s.readPushPreference(8, 'one')).preference, 'disabled');
  assert.equal((await s.readPushPreference(9, 'one')).preference, 'enabled');
  assert.equal((await s.readPushPreference(8, 'two')).preference, 'enabled');
  const result = await s.getPushRegistration('one', signal, 7); assert.equal(result.activo, false);
  const request = s.calls.at(-1); assert.equal(request[0], 'GET'); assert.equal(request[2].expectedRevision, 7);
  assert.equal(request[2].params.idInstalacion, 'one'); assert.equal(request[2].signal, signal);
  await assert.rejects(service({ remote: { activo: true, idCuidador: 8, proyectoEas: 'other' } }).getPushRegistration('one', signal));
});

test('late preference writes are serialized so a newer disabled choice cannot be overwritten', async () => {
  let release; const hanging = new Promise(resolve => { release = resolve; }); let calls = 0;
  const s = service({ write: async () => { if (++calls === 1) await hanging; } });
  const old = s.writePushPreference(8, 'one', 'enabled');
  const latest = s.writePushPreference(8, 'one', 'disabled');
  await new Promise(resolve => setImmediate(resolve)); assert.equal(calls, 1);
  release(); await Promise.all([old, latest]); assert.equal((await s.readPushPreference(8, 'one')).preference, 'disabled');
});

test('REST mutations require strong ETags and preserve the session revision and exact precondition', async () => {
  const s = service(), signal = new AbortController().signal, etag = '"' + 'a'.repeat(64) + '"';
  const initial = await s.getPushRegistration('one', signal, 7); assert.equal(initial.etag, etag);
  await s.registerPush('one', 'test-token', signal, etag, 7);
  await s.unregisterPush('one', signal, etag, 7);
  for (const request of s.calls.slice(1)) {
    const config = request[0] === 'PUT' ? request[3] : request[2];
    assert.equal(config.headers['If-Match'], etag); assert.equal(config.expectedRevision, 7);
  }
  for (const value of [undefined, '*', 'W/' + etag, etag + ',' + etag]) {
    await assert.rejects(s.registerPush('one', 'test-token', signal, value));
    await assert.rejects(s.unregisterPush('one', signal, value));
  }
  await assert.rejects(service({ headers: {} }).getPushRegistration('one', signal));
});
test('legacy preferences upgrade durably and old confirmations cannot overwrite a newer intent', async () => {
  const stored = new Map([['diafacil.push.preference.8.one', 'disabled']]);
  const s = service({ stored });
  const initial = await s.readPushPreference(8, 'one');
  assert.equal(initial.preference, 'disabled');
  assert.deepEqual(await s.readPushPreference(8, 'one'), initial);
  const on = await s.writePushPreference(8, 'one', 'enabled');
  assert.notEqual(on.intentId, initial.intentId);
  const off = await s.writePushPreference(8, 'one', 'disable-pending');
  assert.notEqual(on.intentId, off.intentId);
  await assert.rejects(s.writePushPreference(8, 'one', 'enabled', on.intentId));
  const confirmed = await s.writePushPreference(8, 'one', 'disabled', off.intentId);
  assert.equal(confirmed.intentId, off.intentId);
  assert.deepEqual(JSON.parse(stored.get('diafacil.push.preference.8.one')), confirmed);
});
test('queued preference mutations check session/intent validity before persisting', async () => {
  const s = service(); let current = true;
  const initial = await s.readPushPreference(8, 'one');
  const obsolete = s.writePushPreference(8, 'one', 'enabled', initial.intentId, () => current);
  current = false; await assert.rejects(obsolete);
  assert.deepEqual(await s.readPushPreference(8, 'one'), initial);
});
