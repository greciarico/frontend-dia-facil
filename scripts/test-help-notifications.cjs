const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), test = require('node:test'), ts = require('typescript');
function load(file, modules = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', ...Object.keys(globals), source)(id => { assert.ok(id in modules, `Missing adapter ${id}`); return modules[id]; }, exports, ...Object.values(globals));
  return exports;
}
const dto = load('utils/help-notifications.ts');
const key = '51a033d7-42b6-4b21-a55b-4627ad204a24';
const general = { idSolicitudAyuda: 1, claveOperacion: key, fechaSolicitud: '2026-10-31T10:00:00', estado: 'PENDIENTE', idActividad: null, idEjecucion: null, idPasoActividad: null, posicionPaso: null, descripcionPaso: null };
const notice = id => ({ idNotificacion: id, tipo: 'AYUDA_GENERAL', titulo: 'Grecia necesita tu ayuda', mensaje: '', fechaCreacion: '2026-10-31T10:00:00-05:00', leida: false, nombrePerfil: 'Grecia', codigoIcono: null, idSolicitudAyuda: 1, idEjecucion: null });
class HelpHttpError extends Error { constructor(status, code, retryAfter = 60) { super(); Object.assign(this, { status, code, retryAfter }); } }
class DeviceFailure extends Error {}
class UnconfirmedHelp extends Error {}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(file, modules, globals = {}) {
  let slots = [], index = 0, focus, cleanup;
  const react = { useState: initial => { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: value => { const i = index++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; }, useCallback: fn => fn };
  const api = load(file, { react, 'expo-router': { useFocusEffect: fn => { focus = fn; } },
    'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } }, ...modules }, globals);
  return { render: (...args) => { index = 0; return Object.values(api)[0](...args); },
    focus: () => { cleanup = focus(); }, blur: () => { cleanup?.(); }, slots };
}
test('DTOs reject mismatched operations/context and invalid or oversized pages', () => {
  assert.equal(dto.parseHelpRequest(general, key).idSolicitudAyuda, 1);
  assert.throws(() => dto.parseHelpRequest(general, key.replace('51a', '61a')));
  const context = { idActividad: 3, idEjecucion: 4, idPasoActividad: 5 };
  assert.equal(dto.parseHelpRequest({ ...general, ...context, posicionPaso: 3, descripcionPaso: 'Paso tres' }, key, context).posicionPaso, 3);
  assert.throws(() => dto.parseHelpRequest(general, key, context));
  assert.equal(dto.parseNotificationPage({ notificaciones: [notice(1)], siguienteCursor: null }).notificaciones.length, 1);
  assert.throws(() => dto.parseNotificationPage({ notificaciones: [notice(1), notice(1)], siguienteCursor: null }));
  assert.throws(() => dto.parseNotificationPage({ notificaciones: Array.from({ length: 21 }, (_, i) => notice(i + 1)), siguienteCursor: null }));
  assert.equal(dto.notificationDate('2026-10-31T10:00:00'), dto.notificationDate('2026-10-31T10:00:00-05:00'));
});
function helpHarness(operation, globals = {}) {
  let revision = 1, created = 0;
  const h = harness('hooks/use-help-request.ts', { '@/services/user-help': { helpOperation: () => { created++; return operation; }, UnconfirmedHelp },
    '@/services/device-access': { HelpHttpError, deviceAccess: { revision: () => revision } } }, globals);
  h.render(); h.focus();
  return { ...h, created: () => created, changeIdentity: () => { revision++; } };
}
test('success can be reopened; relative 60 seconds ignore LocalDateTime and then allow a second request', async () => {
  let writes = 0, now = 1000; const originalNow = Date.now; Date.now = () => now;
  const h = helpHarness({ write: async () => { writes++; return general; } });
  try {
    await h.render().submit(); assert.equal(h.render().success, true); assert.equal(h.render().remaining, 60);
    h.render().reopen(); assert.equal(h.render().success, false);
    await h.render().submit(); assert.equal(writes, 1);
    now += 60_001; await h.render().submit(); assert.equal(writes, 2); assert.equal(h.created(), 2);
  } finally { h.blur(); Date.now = originalNow; }
});
test('recovery never creates a key; unknown result survives reopen; 404 permits reusing the same operation', async () => {
  let writes = 0, reads = 0;
  const h = helpHarness({ write: async () => { writes++; throw new UnconfirmedHelp(); }, recover: async () => { reads++; throw new HelpHttpError(404, 'SOLICITUD_NO_ENCONTRADA'); } });
  try {
    await h.render().recover(); assert.equal(h.created(), 0);
    await h.render().submit(); assert.equal(h.render().uncertain, true);
    h.render().reopen(); assert.equal(h.render().uncertain, true);
    await h.render().recover(); assert.equal(h.render().uncertain, false);
    await h.render().submit(); assert.equal(h.created(), 1); assert.equal(writes, 2); assert.equal(reads, 1);
  } finally { h.blur(); }
});
test('429 applies server Retry-After and does not report success', async () => {
  const h = helpHarness({ write: async () => { throw new HelpHttpError(429, 'AYUDA_PREMATURA', 27); } });
  try { await h.render().submit(); assert.equal(h.render().remaining, 27); assert.equal(h.render().success, false); }
  finally { h.blur(); }
});
test('coalesces taps, invalidates blur/refocus results and recovers the same pending operation', async () => {
  const pending = deferred(); let writes = 0;
  const h = helpHarness({ write: () => { writes++; return pending.promise; }, recover: async () => general });
  try {
    const work = h.render().submit(); await h.render().submit(); assert.equal(writes, 1);
    h.blur(); h.render(); h.focus(); assert.equal(h.render().busy, false); assert.equal(h.render().uncertain, true);
    pending.resolve(general); await work; assert.equal(h.render().success, false);
    await h.render().recover(); assert.equal(h.render().success, true); assert.equal(h.created(), 1);
  } finally { h.blur(); }
});
test('old identity cannot publish success after its operation resolves', async () => {
  const pending = deferred(), h = helpHarness({ write: () => pending.promise });
  try { const work = h.render().submit(); h.changeIdentity(); pending.resolve(general); await work; assert.equal(h.render().success, false);
    h.blur(); h.render(); h.focus(); assert.equal(h.render().busy, false); assert.equal(h.render().uncertain, false); }
  finally { h.blur(); }
});
test('service posts only help, recovers by the same key and verifies identity and response context', async () => {
  let revision = 1, posts = 0, gets = 0; const calls = [];
  const client = { post: async (url, data) => { posts++; calls.push([url, data]); throw new HelpHttpError(); },
    get: async url => { gets++; assert.ok(url.endsWith(key)); return { data: general }; } };
  const service = load('services/user-help.ts', { './device-access': { createUserHttpClient: () => client, deviceAccess: { revision: () => revision }, HelpHttpError },
    './device-access-manager': { DeviceFailure }, '@/utils/help-notifications': dto, '@/utils/operation-key': { operationKey: () => key } });
  const op = service.helpOperation(); assert.equal((await op.write()).idSolicitudAyuda, 1);
  assert.equal(posts, 1); assert.equal(gets, 1); assert.deepEqual(calls, [['/api/usuario/solicitudes-ayuda', { claveOperacion: key }]]);
  revision++; await assert.rejects(op.recover(), DeviceFailure);
  client.get = async () => { throw new HelpHttpError(404, 'SOLICITUD_NO_ENCONTRADA'); };
  await assert.rejects(service.helpOperation().write(), service.UnconfirmedHelp);
});
test('notification pagination deduplicates; mark is confirmed and does not race an older GET', async () => {
  const marking = deferred(), page = deferred(); let gets = 0, puts = 0;
  const h = harness('hooks/use-carer-notifications.ts', { '@/services/carer-notifications': {
    getNotifications: async (category, cursor) => { assert.equal(category, 'AYUDA'); gets++; return cursor ? page.promise : { notificaciones: [notice(2)], siguienteCursor: 'next' }; },
    markNotificationRead: () => { puts++; return marking.promise; } } });
  h.render('AYUDA'); h.focus();
  try {
    await tick(); assert.equal(h.render('AYUDA').items[0].leida, false);
    h.render('AYUDA').loadMore(); h.render('AYUDA').markRead(2); h.render('AYUDA').markRead(2);
    assert.equal(puts, 1); assert.equal(h.render('AYUDA').items[0].leida, false);
    marking.resolve(); await tick(); assert.equal(h.render('AYUDA').items[0].leida, true);
    page.resolve({ notificaciones: [notice(2), notice(1)], siguienteCursor: null }); await tick();
    assert.deepEqual(h.render('AYUDA').items.map(n => n.idNotificacion), [2, 1]); assert.equal(h.render('AYUDA').items[0].leida, true); assert.equal(gets, 2);
  } finally { h.blur(); }
});

test('history keeps date descending and ID descending across pages while deduplicating', async () => {
  const h = harness('hooks/use-carer-notifications.ts', { '@/services/carer-notifications': {
    getNotifications: async (_category, cursor) => cursor
      ? { notificaciones: [notice(2), { ...notice(1), fechaCreacion: '2026-11-01T10:00:00-05:00' }], siguienteCursor: null }
      : { notificaciones: [notice(2), notice(4)], siguienteCursor: 'next' },
    markNotificationRead: async () => {},
  } });
  h.render('TODAS'); h.focus();
  try {
    await tick(); assert.deepEqual(h.render('TODAS').items.map(n => n.idNotificacion), [4, 2]);
    h.render('TODAS').loadMore(); await tick();
    assert.deepEqual(h.render('TODAS').items.map(n => n.idNotificacion), [1, 4, 2]);
  } finally { h.blur(); }
});

test('help interval runs only during a cooldown, stops at expiry and resumes once on focus', async () => {
  let now = 1_000, id = 0; const intervals = new Map();
  const h = helpHarness({ write: async () => general }, {
    Date: { now: () => now },
    setInterval: (fn, ms) => { assert.equal(ms, 1_000); intervals.set(++id, fn); return id; },
    clearInterval: timer => intervals.delete(timer),
  });
  try {
    assert.equal(intervals.size, 0); h.render().reopen(); assert.equal(intervals.size, 0);
    await h.render().submit(); assert.equal(intervals.size, 1); assert.equal(h.render().remaining, 60);
    now += 1_000; [...intervals.values()][0](); assert.equal(h.render().remaining, 59);
    h.blur(); assert.equal(intervals.size, 0); h.render(); h.focus(); assert.equal(intervals.size, 1);
    now = 61_000; [...intervals.values()][0](); assert.equal(h.render().remaining, 0); assert.equal(intervals.size, 0);
    h.blur(); h.render(); h.focus(); assert.equal(intervals.size, 0);
  } finally { h.blur(); }
});

test('history list and read requests carry the captured session revision and discard late replies', async () => {
  class SessionFailure extends Error {}
  let revision = 1; const requests = []; let response;
  const client = { get: async (...args) => { requests.push(args); return response ?? { data: { notificaciones: [notice(1)], siguienteCursor: null } }; },
    put: async (...args) => { requests.push(args); return response; } };
  const api = load('services/carer-notifications.ts', { './private-http': { getAuthenticatedHttpClient: () => client },
    './session': { sessionManager: { revision: () => revision } }, './session-manager': { SessionFailure }, '@/utils/help-notifications': dto });
  const signal = new AbortController().signal;
  await api.getNotifications('TODAS', null, signal); assert.equal(requests[0][1].expectedRevision, 1);
  await api.markNotificationRead(1, signal); assert.equal(requests[1][2].expectedRevision, 1); assert.equal(requests[1][2].signal, signal);
  const pending = deferred(); response = pending.promise; const work = api.getNotifications('TODAS', null, signal); revision++;
  pending.resolve({ data: { notificaciones: [notice(1)], siguienteCursor: null } }); await assert.rejects(work, SessionFailure);
});
