const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
function load(file, modules = {}) {
  const exports = {};
  const defaults = { 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, ...modules };
  new Function('require', 'exports', 'setInterval', 'clearInterval', 'performance', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(id => {if(id==='@/components/app-text')return {AppText:'Text'};if(id==='@/components/app-text-input')return {AppTextInput:'Input'};if(id==='@/context/carer-accessibility')return {useCarerAccessibilityFocusListeners:()=>({})}; assert.ok(id in defaults, `Missing adapter: ${id}`); return defaults[id]; }, exports,
    modules.__timers?.setInterval || (() => 0), modules.__timers?.clearInterval || (() => {}), modules.__performance || performance);
  return exports;
}
class HttpError extends Error { constructor(status, codigo) { super('private'); this.status = status; this.codigo = codigo; } }
const data = (code, seconds = 0) => ({ nombrePerfil: 'Persona real', codigoVinculacion: code || 'DF-2KQ9W6H2M8V3X5RA', dispositivosActivos: 2, renovacionEnSegundos: seconds });
const moduleOf = client => load('services/device-link.ts', { './private-http': { PrivateHttpError: HttpError, getAuthenticatedHttpClient: () => client } });
const api = moduleOf({});
const tick = () => new Promise(resolve => setImmediate(resolve));
test('contract accepts only current codes and actual counts, dropping extra data and rejecting invalid success', () => {
  assert.deepEqual(api.parseDeviceLink({ ...data(), idCuidador: 999 }), data());
  assert.deepEqual(api.parseDeviceLink(data('DF-7KQ9W6H2M8V3X5RA')), data('DF-7KQ9W6H2M8V3X5RA'));
  for (const invalid of [null, {}, data('DF-482157'), data('DF-123'), data('DF-0KQ9W6H2M8V3X5RA'),
    { ...data(), dispositivosActivos: -1 }, { ...data(), dispositivosActivos: '0' }, { ...data(), nombrePerfil: '' },
    { ...data(), renovacionEnSegundos: undefined }, data(undefined, -1), data(undefined, '60')]) {
    assert.throws(() => api.parseDeviceLink(invalid), error => error.kind === 'invalid-response');
  }
});
test('GET and POST use private transport, no client ownership, expected code only in body, safe errors', async () => {
  const calls = []; let failure;
  const client = Object.fromEntries(['get', 'post'].map(method => [method, async (...args) => {
    calls.push([method, ...args]); if (failure) throw failure; return { status: 200, data: data() };
  }]));
  const service = moduleOf(client); const signal = new AbortController().signal;
  assert.deepEqual(await service.getDeviceLink(12, signal), data());
  assert.deepEqual(calls[0], ['get', '/api/perfiles/12/vinculacion', { signal }]);
  await service.renewDeviceLink(12, 'DF-2KQ9W6H2M8V3X5RA', signal);
  assert.deepEqual(calls[1], ['post', '/api/perfiles/12/vinculacion/renovar-codigo', { codigoActual: 'DF-2KQ9W6H2M8V3X5RA' }, { signal, authReplaySafe: true }]);
  failure = new HttpError(409, 'CODIGO_VINCULACION_CAMBIADO'); await assert.rejects(service.renewDeviceLink(12, 'DF-2KQ9W6H2M8V3X5RA'), e => e.kind === 'changed');
  failure = new HttpError(429, 'RENOVACION_PREMATURA'); await assert.rejects(service.renewDeviceLink(12, 'DF-2KQ9W6H2M8V3X5RA'), e => e.kind === 'cooldown');
  failure = new HttpError(404, 'PERFIL_NO_ENCONTRADO'); await assert.rejects(service.getDeviceLink(12), e => e.kind === 'not-found');
  failure = new Error('sensitive internal detail'); await assert.rejects(service.getDeviceLink(12), e => e.kind === 'network' && !e.message.includes('sensitive'));
});
function fixture() {
  const refs = []; let cursor = 0; let result; let focus; let app; let epoch = 1; let id = 12;
  let now = 1000; let timer; let removed = false;
  let snapshot = { status: 'authenticated', caregiver: { idCuidador: 3 } }; const requests = [];
  const request = (method, id, code, signal) => new Promise((resolve, reject) => requests.push({ method, id, code, signal, resolve, reject }));
  const hook = load('hooks/use-device-link.ts', {
    react: { useRef: initial => refs[cursor++] ||= { current: initial }, useCallback: fn => fn,
      useState: () => [result, next => { result = typeof next === 'function' ? next(result) : next; }] },
    __timers: { setInterval: fn => { timer = fn; removed = false; return 1; }, clearInterval: () => { removed = true; } },
    'react-native': { AppState: { currentState: 'active', addEventListener: (name, callback) => { app = callback; return { remove() { app = null; } }; } } },
    '@/utils/device-link-cooldown': load('utils/device-link-cooldown.ts', { __performance: { now: () => now } }),
    'expo-router': { useFocusEffect: callback => { focus = callback; } },
    '@/context/session': { useSession: () => ({ manager: { revision: () => epoch, getSnapshot: () => snapshot }, caregiver: snapshot.caregiver }) },
    '@/services/device-link': { DeviceLinkError: api.DeviceLinkError,
      getDeviceLink: (id, signal) => request('GET', id, undefined, signal), renewDeviceLink: (id, code, signal) => request('POST', id, code, signal) },
  }).useDeviceLink;
  return { requests, render() { cursor = 0; return hook(id); }, focus: () => focus(),
    activate: () => app('active'), advance: (milliseconds, tick = true) => { now += milliseconds; if (tick) timer(); },
    timerRemoved: () => removed, id: value => { id = value; }, logout: () => { epoch++; snapshot = { status: 'anonymous', caregiver: null }; } };
}
test('loader coalesces requests, hides QR while renewing and blocks duplicate submissions', async () => {
  const f = fixture(); let current = f.render(); const blur = f.focus(); void current.reload();
  assert.equal(f.requests.length, 1); f.requests[0].resolve(data()); await tick(); current = f.render(); assert.equal(current.state.status, 'ready');
  void current.renew('DF-2KQ9W6H2M8V3X5RA'); void current.renew('DF-2KQ9W6H2M8V3X5RA'); assert.equal(f.requests.length, 2);
  assert.equal(f.render().state.status, 'renewing'); assert.equal(f.render().state.data, undefined);
  f.requests[1].resolve(data('DF-7KQ9W6H2M8V3X5RA')); await tick();
  assert.equal(f.render().state.data.codigoVinculacion, 'DF-7KQ9W6H2M8V3X5RA'); blur();
});
test('lost response and 409 recover via GET only; failed reconciliation keeps stale credential hidden', async () => {
  for (const kind of ['network', 'changed', 'cooldown']) {
    const f = fixture(); f.render(); const blur = f.focus(); f.requests[0].resolve(data()); await tick();
    void f.render().renew('DF-2KQ9W6H2M8V3X5RA'); f.requests[1].reject(new api.DeviceLinkError(kind)); await tick();
    assert.deepEqual(f.requests.map(r => r.method), ['GET', 'POST', 'GET']);
    assert.equal(f.render().state.status, 'renewing');
    f.requests[2].resolve(data('DF-7KQ9W6H2M8V3X5RA')); await tick(); assert.equal(f.render().state.status, 'ready'); blur();
  }
  const f = fixture(); f.render(); const blur = f.focus(); f.requests[0].resolve(data()); await tick();
  void f.render().renew('DF-2KQ9W6H2M8V3X5RA'); f.requests[1].reject(new api.DeviceLinkError('network')); await tick();
  f.requests[2].reject(new api.DeviceLinkError('network')); await tick();
  assert.equal(f.render().state.status, 'error'); assert.equal(f.render().state.data, undefined);
  void f.render().reload(); assert.equal(f.requests[3].method, 'GET'); blur();
});
test('cooldown uses server duration and elapsed monotonic time; it blocks early POST even without timer ticks', async () => {
  const f = fixture(); f.render(); const blur = f.focus(); f.requests[0].resolve(data(undefined, 45)); await tick();
  let current = f.render(); assert.equal(current.state.remainingSeconds, 45);
  void current.renew('DF-2KQ9W6H2M8V3X5RA'); assert.equal(f.requests.length, 1);
  f.advance(44001); current = f.render(); assert.equal(current.state.remainingSeconds, 1);
  void current.renew('DF-2KQ9W6H2M8V3X5RA'); assert.equal(f.requests.length, 1);
  f.advance(999, false); void current.renew('DF-2KQ9W6H2M8V3X5RA'); assert.equal(f.requests.length, 2);
  f.requests[1].resolve(data('DF-7KQ9W6H2M8V3X5RA', 60)); await tick();
  assert.equal(f.render().state.remainingSeconds, 60); blur(); assert.equal(f.timerRemoved(), true);
  f.advance(60000); assert.equal(f.render().state.remainingSeconds, 60); // Queued tick after blur does not publish.
});
test('foreground GET reanchors wait and server 429 overrides locally elapsed cooldown', async () => {
  const f = fixture(); f.render(); const blur = f.focus(); f.requests[0].resolve(data(undefined, 3)); await tick();
  f.advance(3000); void f.render().renew('DF-2KQ9W6H2M8V3X5RA'); f.requests[1].reject(new api.DeviceLinkError('cooldown')); await tick();
  f.requests[2].resolve(data(undefined, 22)); await tick(); assert.equal(f.render().state.remainingSeconds, 22);
  f.advance(120000, false); f.activate(); assert.equal(f.render().state.status, 'loading');
  f.requests[3].resolve(data(undefined, 0)); await tick(); assert.equal(f.render().state.remainingSeconds, 0); blur();
});
test('phone wall clock changes cannot alter renewal estimate', () => {
  const clock = { now: () => 5000 }; const utils = load('utils/device-link-cooldown.ts', { __performance: clock });
  const target = utils.renewalDeadline(60); const original = Date.now;
  try {
    Date.now = () => -1_000_000_000; assert.equal(utils.remainingRenewalSeconds(target), 60);
    Date.now = () => 9_000_000_000; clock.now = () => 65000; assert.equal(utils.remainingRenewalSeconds(target), 0);
  } finally { Date.now = original; }
});
test('focus and foreground reload; route changes, blur and logout cannot publish old credentials', async () => {
  const f = fixture(); f.render(); let blur = f.focus(); f.requests[0].resolve(data()); await tick();
  f.activate(); assert.equal(f.requests[1].method, 'GET'); blur(); assert.equal(f.requests[1].signal.aborted, true);
  f.requests[1].resolve(data()); await tick(); f.id(20); assert.equal(f.render().state.status, 'loading');
  blur = f.focus(); f.logout(); f.requests[2].resolve(data()); await tick(); assert.notEqual(f.render().state.status, 'ready'); blur();
  f.id(undefined); f.render(); const count = f.requests.length; f.focus(); assert.equal(f.requests.length, count); assert.equal(f.render().state.status, 'not-found');
});
test('unavailable profile during renewal does not initiate reconciliation or show old code', async () => {
  const f = fixture(); f.render(); const blur = f.focus(); f.requests[0].resolve(data()); await tick();
  void f.render().renew('DF-2KQ9W6H2M8V3X5RA'); f.requests[1].reject(new api.DeviceLinkError('not-found')); await tick();
  assert.equal(f.requests.length, 2); assert.equal(f.render().state.status, 'not-found'); blur();
});

const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const textOf = tree => Array.isArray(tree) ? tree.map(textOf).join('') : tree && typeof tree === 'object' ? textOf(tree.props?.children) : tree == null ? '' : String(tree);
test('screen uses exactly server code for local QR and clipboard, confirms renewal and leaves device management disabled', async () => {
  const tokens = load('theme/tokens.ts'); const navigation = load('utils/profile-navigation.ts');
  let state = { status: 'ready', data: data(), remainingSeconds: 0 }; let focus; let hardwareBack; let copied; let renewed; const nav = [];
  let delayCopy = false; let resolveCopy; let screenFocused = true;
  const values = []; const refs = []; let slot = 0; const effects = [];
  const screen = load('app/(cuidador-autenticado)/(principal)/perfiles/[idPerfilUsuario]/vincular-dispositivo.tsx', {
    react: { useState: initial => { const i = slot++; if (!(i in values)) values[i] = initial; return [values[i], v => { values[i] = v; }]; },
      useRef: initial => refs[slot++] ||= { current: initial }, useCallback: fn => fn, useEffect: fn => effects.push(fn) },
    'expo-router': { Stack: { Screen: 'Screen' }, router: { dismissTo: v => nav.push(v) }, useFocusEffect: fn => { focus = fn; }, useIsFocused: () => screenFocused, useLocalSearchParams: () => ({ idPerfilUsuario: '12' }) },
    'react-native': { StyleSheet: { create: v => v }, Text: 'Text', View: 'View', ScrollView: 'ScrollView', Pressable: 'Pressable', ActivityIndicator: 'Spinner',
      useWindowDimensions: () => ({ width: 390 }), BackHandler: { addEventListener: (name, fn) => { hardwareBack = fn; return { remove() {} }; } } },
    'expo-clipboard': { setStringAsync: async code => { copied = code; return delayCopy ? new Promise(resolve => { resolveCopy = resolve; }) : true; } }, 'react-native-qrcode-svg': { default: 'QR', __esModule: true },
    '@/hooks/use-device-link': { useDeviceLink: () => ({ state, reload() {}, renew: code => { renewed = code; } }) },
    '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.themes.light }, '@/utils/profile-navigation': navigation,
    '@/components/carer/account-layout': { accountStyles: {} },
    ...Object.fromEntries([['activity-dialog','ActivityDialog','Dialog'],['area-header','AreaHeader','Header'],['area-icon','AreaIcon','Icon'],
      ['continue-button','ContinueButton','Button'],['device-link-illustration','DeviceLinkIllustration','Illustration'],['step-dialog-actions','StepDialogActions','Actions']]
      .map(([file, name, tag]) => [`@/components/carer/${file}`, { [name]: tag }])),
  }).default;
  const render = () => { slot = 0; effects.length = 0; const tree = screen(); effects.forEach(fn => fn()); return nodes(tree); };
  let tree = render(); const blur = focus();
  assert.equal(tree.find(n => n.type === 'QR').props.value, data().codigoVinculacion);
  assert.ok(tree.find(n => n.props?.accessibilityLabel === 'Dispositivos vinculados (2)').props.accessibilityState.disabled);
  await tree.find(n => n.props?.accessibilityLabel === 'Copiar código de vinculación').props.onPress(); await tick(); assert.equal(copied, data().codigoVinculacion);
  tree = render(); assert.ok(tree.some(n => n.type === 'Text' && textOf(n).includes('Código copiado.')));
  tree.find(n => n.props?.accessibilityLabel === 'Renovar código de vinculación').props.onPress(); tree = render();
  assert.ok(tree.some(n => n.type === 'Dialog'));
  const actions = tree.find(n => n.type === 'Actions'); assert.equal(actions.props.label, 'Sí, renovar'); assert.equal(actions.props.secondaryVariant, 'destructive-outline');
  assert.ok(textOf(tree.find(n => n.type === 'Dialog').props.title).includes('¿Estás seguro de que quieres renovar el código?'));
  actions.props.onConfirm(); assert.equal(renewed, data().codigoVinculacion);
  state = { ...state, remainingSeconds: 45 }; tree = render();
  assert.equal(tree.find(n => n.props?.accessibilityLabel === 'Renovar código de vinculación').props.disabled, true);
  assert.ok(tree.some(n => n.type === 'Text' && textOf(n).includes('Renovar nuevamente en 45 s')));
  state = { status: 'ready', data: data(), remainingSeconds: 0 }; tree = render();
  delayCopy = true;
  void tree.find(n => n.props?.accessibilityLabel === 'Copiar código de vinculación').props.onPress();
  tree.find(n => n.props?.accessibilityLabel === 'Renovar código de vinculación').props.onPress();
  const beforeCleanup = [...values]; blur(); assert.deepEqual(values, beforeCleanup); // No state writes in cleanup.
  screenFocused = false; tree = render(); assert.ok(!tree.some(n => n.type === 'Dialog'));
  screenFocused = true; tree = render(); const secondBlur = focus(); resolveCopy(false); await tick(); tree = render();
  assert.ok(!tree.some(n => n.type === 'Text' && textOf(n).includes('No pudimos copiar'))); // Old focus cannot publish.
  state = { status: 'renewing' }; tree = render(); assert.ok(!tree.some(n => n.type === 'QR' || n.type === 'Dialog'));
  assert.equal(hardwareBack(), true); assert.deepEqual(nav, [navigation.profileHref(12)]); secondBlur();
});
