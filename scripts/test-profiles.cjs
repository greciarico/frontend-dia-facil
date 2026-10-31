const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const jsx = (type, props) => ({ type, props });
function load(file, modules = {}) {
  const exports = {};
  const defaults = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { StyleSheet: { create: value => value }, Text: 'Text', View: 'View',
      Pressable: 'Pressable', FlatList: 'List', ScrollView: 'ScrollView', ActivityIndicator: 'Spinner', useWindowDimensions: () => ({ fontScale: 1 }) },
    'expo-image': { Image: 'Image' },
    ...modules,
  };
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(id => {
    if (id.startsWith('@/assets/') || id.includes('Nunito_')) return id;
    if(id==='@/components/app-text')return {AppText:'Text'};
    if(id==='@/theme/profile-appearance')return {useEffectiveFontScale:()=>1};
    assert.ok(id in defaults, `Missing test adapter: ${id}`);
    return defaults[id];
  }, exports);
  return exports;
}
const avatars = load('constants/carer-avatars.ts');
const utils = load('utils/profiles.ts', { '@/constants/carer-avatars': avatars });
const creationUtils = load('utils/create-profile.ts', { '@/constants/carer-avatars': avatars });
const profileNavigation = load('utils/profile-navigation.ts');
const activityUtils = load('utils/activities.ts');
const tokens = load('theme/tokens.ts');
const styling = { '@/context/device-access': { DeviceAccessProvider: 'DeviceProvider', useDeviceAccess: () => ({ status: 'unlinked', stage: 'ready' }) },
  '@/components/user/device-access-boundary': { DeviceAccessBoundary: 'DeviceBoundary' }, '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.themes.light },
  '@/utils/profile-navigation': profileNavigation,
  '@/components/carer/account-layout': { accountStyles: {} },
  '@/components/carer/area-icon': { AreaIcon: 'Icon' },
  '@/components/carer/continue-button': { ContinueButton: 'Button' },
  '@/components/carer/create-profile-button': { CreateProfileButton: 'CreateButton' },
  '@/components/carer/profile-card': { ProfileCard: 'Card' },
  './account-layout': { accountStyles: {} }, './continue-button': { ContinueButton: 'Button' },
  './area-icon': { AreaIcon: 'Icon' }, './profile-avatar': { ProfileAvatar: 'Avatar' } };
const response = (perfiles = []) => ({ perfiles, maximoPerfilesActivos: 4 });
const profile = (id = 1) => ({ idPerfilUsuario: id, nombre: 'Persona real', avatar: null });
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  if (!tree || typeof tree !== 'object') return tree == null ? '' : String(tree);
  return textOf(tree.props?.children);
}

test('contract accepts real empty/populated results and rejects malformed or duplicate profiles', () => {
  assert.deepEqual(utils.parseProfiles(response()), response());
  assert.deepEqual(utils.parseProfiles(response([profile()])), response([profile()]));
  for (const invalid of [null, {}, { perfiles: [], maximoPerfilesActivos: 0 }, response([profile(), profile()]),
    response([{ ...profile(), nombre: '' }]), response([{ ...profile(), avatar: undefined }]), response([{ ...profile(), idPerfilUsuario: -1 }])]) {
    assert.throws(() => utils.parseProfiles(invalid));
  }
  const raw = { ...profile(), codigoVinculacion: 'not-a-client-field', idCuidador: 2 };
  assert.deepEqual(utils.parseProfiles(response([raw])).perfiles, [profile()]);
});

test('profile avatars use known local IDs or public HTTPS without credentials; unknown values fall back', () => {
  assert.deepEqual(utils.profileAvatar('person-01'), { local: 'person-01', uri: null });
  assert.equal(utils.profileAvatar('https://images.example/avatar.png').uri, 'https://images.example/avatar.png');
  for (const avatar of [null, '', 'person-99', '/local/file.png', 'http://images.example/a', 'https://user:secret@images.example/a', 'file:///a']) {
    assert.deepEqual(utils.profileAvatar(avatar), { local: null, uri: null });
  }
});

test('service uses the existing private client, relative GET and abort signal without client ownership', async () => {
  const signal = new AbortController().signal;
  let called;
  const service = load('services/profiles.ts', {
    './private-http': { getAuthenticatedHttpClient: () => ({ get: async (...args) => { called = args; return { data: response() }; } }) },
    '@/utils/profiles': utils,
    '@/utils/create-profile': creationUtils,
  });
  assert.deepEqual(await service.getProfiles(signal), response());
  assert.deepEqual(called, ['/api/perfiles', { signal }]);
});

test('screen distinguishes loading, recoverable error, empty and real profiles without fabricated progress', () => {
  let state = { status: 'loading' }; let retried = 0;
  const navigations = [];
  const screen = load('app/(cuidador-autenticado)/(principal)/perfiles.tsx', { ...styling, 'expo-router': { router: { push: value => navigations.push(value) } },
    '@/hooks/use-profiles': { useProfiles: () => ({ state, reload: () => retried++ }) } }).default;
  assert.ok(textOf(screen()).includes('Cargando perfiles'));
  state = { status: 'error' };
  const error = screen(); assert.ok(!textOf(error).includes('Aún no tienes'));
  nodes(error).find(node => node.type === 'Button').props.onPress(); assert.equal(retried, 1);
  state = { status: 'ready', data: response() };
  assert.ok(textOf(screen()).includes('Aún no tienes'));
  assert.equal(nodes(screen()).find(node => node.type === 'CreateButton').props.first, true);
  nodes(screen()).find(node => node.type === 'CreateButton').props.onCreateProfile();
  state = { status: 'ready', data: { perfiles: [profile()], maximoPerfilesActivos: 2 } };
  assert.equal(nodes(screen()).filter(node => node.type === 'Card').length, 1);
  assert.ok(nodes(screen()).some(node => node.type === 'CreateButton'));
  nodes(screen()).find(node => node.type === 'CreateButton').props.onCreateProfile();
  assert.deepEqual(navigations, ['/crear-perfil', '/crear-perfil']);
  assert.ok(textOf(screen()).includes('hasta 2 perfiles'));
  assert.ok(!textOf(screen()).includes('actividades hoy'));
  assert.equal(nodes(screen()).find(node => node.type === 'Card').props.details, undefined);
  state = { status: 'ready', data: { perfiles: [profile(1), profile(2)], maximoPerfilesActivos: 2 } };
  assert.ok(!nodes(screen()).some(node => node.type === 'CreateButton'));
  assert.ok(textOf(screen()).includes('Has alcanzado el límite'));
});

function hookFixture() {
  const refs = []; let cursor = 0; let state; let focus;
  let snapshot = { status: 'authenticated', caregiver: { idCuidador: 3 } }; let epoch = 0;
  const requests = [];
  const exports = load('hooks/use-profiles.ts', {
    react: { useRef: value => { const index = cursor++; return refs[index] ||= { current: value }; },
      useState: initial => { state ??= initial; return [state, value => { state = value; }]; }, useCallback: fn => fn },
    'expo-router': { useFocusEffect: fn => { focus = fn; } },
    '@/context/session': { useSession: () => ({ manager: { revision: () => epoch, getSnapshot: () => snapshot }, caregiver: snapshot.caregiver }) },
    '@/services/profiles': { getProfiles: signal => new Promise((resolve, reject) => { requests.push({ signal, resolve, reject }); }) },
  });
  const render = () => { cursor = 0; return exports.useProfiles(); };
  return { render, activate: () => focus(), requests, logout: () => { epoch++; snapshot = { status: 'anonymous', caregiver: null }; } };
}
test('focused loader coalesces requests, retries errors and ignores late responses after blur/logout', async () => {
  const f = hookFixture(); const first = f.render(); const blur = f.activate();
  void first.reload(); assert.equal(f.requests.length, 1);
  f.requests[0].reject(new Error('network')); await new Promise(r => setImmediate(r));
  assert.equal(f.render().state.status, 'error');
  void f.render().reload(); f.requests[1].resolve(response([profile()])); await new Promise(r => setImmediate(r));
  assert.equal(f.render().state.status, 'ready');
  void f.render().reload(); blur(); assert.ok(f.requests[2].signal.aborted);
  f.requests[2].resolve(response()); await new Promise(r => setImmediate(r));
  assert.equal(f.render().state.status, 'loading');
  f.activate(); f.logout(); f.requests[3].resolve(response()); await new Promise(r => setImmediate(r));
  assert.equal(f.render().state.status, 'loading');
});

test('optional creation callback enables the button; profile access and future modules remain unavailable', () => {
  const create = load('components/carer/create-profile-button.tsx', styling).CreateProfileButton;
  assert.equal(nodes(create({ first: true })).find(node => node.type === 'Button').props.disabled, true);
  assert.equal(nodes(create({})).find(node => node.type === 'Button').props.disabled, true);
  const navigate = () => {};
  assert.equal(nodes(create({ onCreateProfile: navigate })).find(node => node.type === 'Button').props.disabled, false);
  const card = load('components/carer/profile-card.tsx', { ...styling,
    '@/components/carer/profile-avatar': { ProfileAvatar: 'Avatar' } }).ProfileCard;
  assert.equal(card({ profile: profile(), surface: 'token' }).props.disabled, true);
  const navigation = load('constants/carer-navigation.ts').carerDestinations;
  assert.deepEqual(navigation.filter(item => item.href).map(item => item.href), ['/perfiles']);
});

test('root routes only ready sessions to profiles and preserves immediate OTP/onboarding and restoration UI', () => {
  let snapshot;
  const screen = load('app/index.tsx', { ...styling,
    'expo-router': { Redirect: 'Redirect', router: {} }, react: { useState: initial => [initial, () => {}] },
    'react-native-safe-area-context': {}, 'react-native-svg': {},
    '@/components/welcome/role-card': {}, '@/components/session-boundary': { SessionBoundary: 'Boundary' },
    '@/context/session': { useSession: () => snapshot } }).default;
  for (const [stage, destination] of [['ready', '/perfiles']]) {
    snapshot = { status: 'authenticated', stage }; assert.equal(screen().props.href, destination);
  }
  for (const status of ['booting', 'restore-error', 'storage-error']) {
    snapshot = { status, stage: 'ready' }; assert.equal(screen().type, 'Boundary');
  }
  for (const stage of ['onboarding', 'otp']) {
    snapshot = { status: 'authenticated', stage }; assert.equal(screen().type, 'Boundary');
  }
  snapshot = { status: 'anonymous' }; assert.notEqual(screen().type, 'Redirect');
});

test('private route group only becomes available after restoration or onboarding finishes', () => {
  let snapshot;
  const Stack = { Screen: 'Screen', Protected: 'Protected' };
  const navigationTheme = { colors: {}, fonts: { regular: {}, medium: {}, bold: {}, heavy: {} } };
  const layout = load('app/_layout.tsx', { ...styling,
    react: { useEffect: () => {} }, 'expo-font': { useFonts: () => [true, undefined] },
    'expo-router': { Stack, ThemeProvider: 'Theme', DarkTheme: navigationTheme, DefaultTheme: navigationTheme, router: {} },
    'expo-splash-screen': { preventAutoHideAsync: async () => {}, hideAsync: async () => {} },
    'expo-status-bar': { StatusBar: 'StatusBar' }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/context/session': { SessionProvider: 'Provider', useSession: () => snapshot } }).default;
  for (const [status, stage, allowed] of [['anonymous', 'ready', false], ['booting', 'ready', false],
    ['authenticated', 'otp', false], ['authenticated', 'onboarding', false], ['authenticated', 'ready', true]]) {
    snapshot = { status, stage };
    const inner = layout().props.children.props.children;
    const groups = nodes(inner.type(inner.props)).filter(node => node.type === 'Protected');
    const privateGroup = groups.find(node => nodes(node.props.children).some(child => child.props?.name === '(cuidador-autenticado)'));
    assert.equal(privateGroup.props.guard, allowed);
  }
});

test('new profile names trim edges, allow arbitrary human names and reject empty or over 60', () => {
  for (const value of ['', ' \t\n', 'x'.repeat(61)]) assert.ok(creationUtils.validateProfileName(value));
  for (const value of ['x'.repeat(60), ' María-José 李 7 ', '123']) assert.equal(creationUtils.validateProfileName(value), undefined);
  assert.deepEqual(creationUtils.createProfileInput(' Persona ', null), { nombre: 'Persona', avatar: null });
  assert.throws(() => creationUtils.createProfileInput('Persona', 'person-99'));
});

class HttpError extends Error {
  constructor(status, codigo, fields = []) { super('safe'); this.status = status; this.codigo = codigo; this.fields = fields; }
}
function creationService(post) {
  return load('services/profiles.ts', { './private-http': { getAuthenticatedHttpClient: () => ({ post }), PrivateHttpError: HttpError },
    '@/utils/profiles': utils, '@/utils/create-profile': creationUtils });
}
test('POST only includes name/avatar and accepts only a validated real 201', async () => {
  let called; const signal = new AbortController().signal;
  const api = creationService(async (...args) => { called = args; return { status: 201, data: profile(12) }; });
  assert.deepEqual(await api.createProfile(' Persona ', null, signal), profile(12));
  assert.deepEqual(called, ['/api/perfiles', { nombre: 'Persona', avatar: null }, { signal, authReplaySafe: true }]);
  for (const response of [{ status: 200, data: profile() }, { status: 201, data: {} }]) {
    const malformed = creationService(async () => response);
    await assert.rejects(malformed.createProfile('Persona', null), error => error.kind === 'uncertain');
  }
});
test('creation surfaces limit and validation safely; transport/5xx never repeat the operation', async () => {
  for (const [failure, kind] of [[new HttpError(409, 'LIMITE_PERFILES_ALCANZADO'), 'limit'],
    [new HttpError(400, 'SOLICITUD_INVALIDA', ['nombre']), 'validation'], [new HttpError(403), 'access'],
    [new HttpError(503), 'uncertain'], [new Error('private transport detail'), 'uncertain']]) {
    let calls = 0;
    const api = creationService(async () => { calls++; throw failure; });
    await assert.rejects(api.createProfile('Persona', null), error => error.kind === kind && !error.message.includes('private'));
    assert.equal(calls, 1);
  }
});

function creationScreenFixture() {
  let stateCursor = 0, refCursor = 0, focus, created;
  const states = [], refs = [], requests = [], navigations = [];
  const snapshot = { status: 'authenticated', caregiver: { idCuidador: 3 } };
  const errors = creationService(async () => {});
  const native = { StyleSheet: { create: value => value }, Text: 'Text', View: 'View', TextInput: 'Input', Pressable: 'Pressable',
    Keyboard: { dismiss() {} }, AccessibilityInfo: { announceForAccessibility() {} } };
  const screen = load('app/(cuidador-autenticado)/(creacion-perfil)/crear-perfil.tsx', { ...styling,
    'react-native': native,
    react: { useState: initial => { const i = stateCursor++; if (!(i in states)) states[i] = initial;
      return [states[i], value => { states[i] = value; }]; }, useRef: value => { const i = refCursor++; return refs[i] ||= { current: value }; },
      useCallback: fn => fn, useEffect: fn => fn() },
    'expo-router': { Redirect: 'Redirect', router: { replace: value => navigations.push(value) }, useFocusEffect: fn => { focus = fn; } },
    '@/context/session': { useSession: () => ({ manager: { revision: () => 1, getSnapshot: () => snapshot } }) },
    '@/context/profile-creation': { useProfileCreation: () => ({ created, complete: value => { created = value; } }) },
    '@/components/carer/account-avatar': { AccountAvatar: 'Avatar' }, '@/components/carer/avatar-selector': { AvatarSelector: 'Selector' },
    '@/components/carer/profile-flow-layout': { ProfileFlowLayout: 'Flow' }, '@/utils/create-profile': creationUtils,
    '@/services/profiles': { CreateProfileError: errors.CreateProfileError, createProfile: (...args) => new Promise((resolve, reject) => requests.push({ args, resolve, reject })) },
  }).default;
  const render = () => { stateCursor = 0; refCursor = 0; return screen(); };
  const enter = value => nodes(render()).find(node => node.type === 'Input').props.onChangeText(value);
  const submit = () => nodes(render()).find(node => node.type === 'Button' && node.props.label === 'Continuar').props.onPress();
  render(); const cleanup = focus();
  return { render, enter, submit, cleanup, requests, navigations, errors };
}
test('creation screen blocks duplicate taps and confirms only the persisted DTO', async () => {
  const f = creationScreenFixture();
  assert.equal(nodes(f.render()).find(node => node.type === 'Button').props.disabled, true);
  f.enter('Persona'); f.submit(); f.submit(); assert.equal(f.requests.length, 1);
  f.requests[0].resolve(profile(12)); await new Promise(r => setImmediate(r));
  assert.equal(f.render().type, 'Redirect'); assert.equal(f.render().props.href, '/perfil-creado');
  f.cleanup();
});
test('uncertain creation cannot submit again; late completion after leaving never opens confirmation', async () => {
  const f = creationScreenFixture(); f.enter('Persona'); f.submit();
  f.requests[0].reject(new f.errors.CreateProfileError('uncertain')); await new Promise(r => setImmediate(r));
  assert.ok(textOf(f.render()).includes('No pudimos confirmar'));
  f.submit(); assert.equal(f.requests.length, 1);
  nodes(f.render()).find(node => node.type === 'Button' && node.props.label === 'Revisar Mis perfiles').props.onPress();
  assert.deepEqual(f.navigations, ['/perfiles']); f.cleanup();
  const late = creationScreenFixture(); late.enter('Persona'); late.submit(); late.cleanup();
  assert.ok(late.requests[0].args[2].aborted);
  late.requests[0].resolve(profile(12)); await new Promise(r => setImmediate(r));
  assert.notEqual(late.render().type, 'Redirect'); assert.deepEqual(late.navigations, []);
});
test('confirmation needs its in-memory result, never fetches, and Comenzar replaces it with detail by ID', () => {
  let created; const navigation = [];
  const screen = load('app/(cuidador-autenticado)/(creacion-perfil)/perfil-creado.tsx', { ...styling,
    'expo-router': { Redirect: 'Redirect', router: { replace: (...args) => navigation.push(args) } },
    'react-native-svg': { default: 'Svg', Path: 'Path' },
    '@/components/carer/account-avatar': { AccountAvatar: 'Avatar' },
    '@/components/carer/profile-flow-layout': { ProfileFlowLayout: 'Flow' },
    '@/context/profile-creation': { useProfileCreation: () => ({ created }) }, '@/utils/profiles': utils,
  }).default;
  assert.equal(screen().props.href, '/perfiles');
  created = profile(12); assert.ok(textOf(screen()).includes(created.nombre));
  nodes(screen()).find(node => node.type === 'Button').props.onPress();
  assert.deepEqual(navigation, [[profileNavigation.profileHref(12), { withAnchor: true }]]);
});

test('confirmation result exists only in its provider memory and is tied to owner and session revision', () => {
  let stored; let value; let epoch = 1; let caregiver = { idCuidador: 3 };
  const context = { Provider: 'Provider' };
  const exports = load('context/profile-creation.tsx', {
    react: { createContext: () => context, useContext: () => value,
      useState: () => [stored || null, next => { stored = next; }] },
    '@/context/session': { useSession: () => ({ caregiver, manager: { revision: () => epoch } }) },
  });
  function render() { value = exports.ProfileCreationProvider({ children: 'Flow' }).props.value; }
  render(); assert.equal(exports.useProfileCreation().created, undefined);
  value.complete(profile(12)); render(); assert.deepEqual(exports.useProfileCreation().created, profile(12));
  epoch++; assert.equal(exports.useProfileCreation().created, undefined);
  epoch--; caregiver = { idCuidador: 4 }; assert.equal(exports.useProfileCreation().created, undefined);
  caregiver = { idCuidador: 3 }; stored = null; render(); assert.equal(exports.useProfileCreation().created, undefined);
});

test('detail IDs are bounded integers and Perfiles selection includes only its child paths', () => {
  for (const invalid of [undefined, ['12'], '', '-1', '0', '12.1', 'abc', '2147483648']) assert.equal(profileNavigation.validProfileId(invalid), undefined);
  assert.equal(profileNavigation.validProfileId('12'), 12);
  assert.equal(profileNavigation.isProfilesDestination('/perfiles/12'), true);
  assert.equal(profileNavigation.isProfilesDestination('/perfiles'), true);
  assert.equal(profileNavigation.isProfilesDestination('/perfiles-otro'), false);
});

test('detail GET reuses private transport and rejects wrong IDs, malformed success and unsafe server detail', async () => {
  let called; let result = { status: 200, data: profile(12) }; let failure;
  const api = load('services/profiles.ts', { './private-http': { PrivateHttpError: HttpError,
    getAuthenticatedHttpClient: () => ({ get: async (...args) => { called = args; if (failure) throw failure; return result; } }) },
    '@/utils/profiles': utils, '@/utils/create-profile': creationUtils });
  const signal = new AbortController().signal;
  assert.deepEqual(await api.getProfile(12, signal), profile(12)); assert.deepEqual(called, ['/api/perfiles/12', { signal }]);
  result = { status: 200, data: profile(20) }; await assert.rejects(api.getProfile(12), error => error.kind === 'network');
  result = { status: 200, data: {} }; await assert.rejects(api.getProfile(12), error => error.kind === 'network');
  failure = new HttpError(404, 'PERFIL_NO_ENCONTRADO'); await assert.rejects(api.getProfile(12), error => error.kind === 'not-found');
  failure = new Error('private detail'); await assert.rejects(api.getProfile(12), error => error.kind === 'network' && !error.message.includes('private'));
});

test('detail screen renders real data only after GET, handles recovery/404 and has a clean avatar', () => {
  let state = { status: 'loading' }; let id = '12'; let retries = 0;
  const navigations = [];
  const screen = load('app/(cuidador-autenticado)/(principal)/perfiles/[idPerfilUsuario]/index.tsx', { ...styling,
    'expo-router': { Stack: { Screen: 'Screen' }, router: { dismissTo: value => navigations.push(value), push: value => navigations.push(value) }, useLocalSearchParams: () => ({ idPerfilUsuario: id }) },
    '@/components/carer/area-header': { AreaHeader: 'Header' }, '@/components/carer/profile-actions': { ProfileActions: 'Actions' },
    '@/components/carer/profile-avatar': { ProfileAvatar: 'Avatar' },
    '@/hooks/use-profile-detail': { useProfileDetail: value => { assert.equal(value, profileNavigation.validProfileId(id)); return { state, reload: () => retries++ }; } },
  }).default;
  assert.ok(textOf(screen()).includes('Cargando perfil')); assert.ok(!nodes(screen()).some(node => node.type === 'Avatar'));
  assert.equal(nodes(screen()).find(node => node.type === 'Screen').props.options.title, 'Perfil');
  state = { status: 'ready', profile: profile(12) };
  assert.ok(textOf(screen()).includes('Persona real')); assert.equal(nodes(screen()).filter(node => node.type === 'Avatar').length, 1);
  assert.ok(!nodes(screen()).some(node => node.type === 'Pressable')); // no edit/check/camera affordance
  assert.equal(nodes(screen()).find(node => node.type === 'Actions').props.id, 12);
  nodes(screen()).find(node => node.type === 'Actions').props.onCreateActivities(12);
  assert.deepEqual(navigations.pop(), profileNavigation.activitiesHref(12));
  state = { status: 'error' }; nodes(screen()).find(node => node.type === 'Button' && node.props.label === 'Reintentar').props.onPress(); assert.equal(retries, 1);
  state = { status: 'not-found' }; assert.ok(textOf(screen()).includes('No pudimos encontrar este perfil.'));
  assert.ok(!nodes(screen()).some(node => node.type === 'Button' && node.props.label === 'Reintentar'));
  nodes(screen()).find(node => node.type === 'Button').props.onPress(); assert.deepEqual(navigations, ['/perfiles']);
});

test('profile actions have extension callbacks but default to accessible disabled cards without fake handlers', () => {
  const actions = load('components/carer/profile-actions.tsx', { ...styling, './area-icon': { AreaIcon: 'Icon' } }).ProfileActions;
  const unavailable = nodes(actions({ id: 12 })).filter(node => node.type === 'Pressable');
  assert.equal(unavailable.length, 3);
  for (const card of unavailable) { assert.equal(card.props.disabled, true); assert.equal(card.props.onPress, undefined); assert.equal(card.props.accessibilityState.disabled, true); }
  let owner;
  const ready = nodes(actions({ id: 12, onCreateActivities: id => { owner = id; } })).filter(node => node.type === 'Pressable');
  ready[0].props.onPress(); assert.equal(owner, 12); assert.equal(ready[1].props.disabled, true);
});

test('profile detail loader does not reuse data of another ID, coalesces requests and ignores blurred/logout responses', async () => {
  const refs = []; let cursor = 0; let result; let focus; let id = 12; let epoch = 1;
  let snapshot = { status: 'authenticated', caregiver: { idCuidador: 3 } };
  const requests = [];
  class DetailError extends Error { constructor(kind) { super(kind); this.kind = kind; } }
  const hook = load('hooks/use-profile-detail.ts', {
    react: { useRef: initial => { const i = cursor++; return refs[i] ||= { current: initial }; }, useCallback: fn => fn,
      useState: () => [result, next => { result = next; }] }, 'expo-router': { useFocusEffect: fn => { focus = fn; } },
    '@/context/session': { useSession: () => ({ manager: { revision: () => epoch, getSnapshot: () => snapshot }, caregiver: snapshot.caregiver }) },
    '@/services/profiles': { ProfileDetailError: DetailError, getProfile: (id, signal) => new Promise((resolve, reject) => requests.push({ id, signal, resolve, reject })) },
  }).useProfileDetail;
  const render = () => { cursor = 0; return hook(id); };
  let current = render(); let blur = focus(); void current.reload(); assert.equal(requests.length, 1);
  requests[0].resolve(profile(12)); await new Promise(r => setImmediate(r)); assert.equal(render().state.profile.idPerfilUsuario, 12);
  blur(); id = 20; assert.equal(render().state.status, 'loading'); blur = focus();
  requests[1].reject(new DetailError('not-found')); await new Promise(r => setImmediate(r)); assert.equal(render().state.status, 'not-found');
  void render().reload(); blur(); assert.equal(requests[2].signal.aborted, true);
  requests[2].resolve(profile(20)); await new Promise(r => setImmediate(r)); assert.equal(render().state.status, 'loading');
  render(); blur = focus(); epoch++; snapshot = { status: 'anonymous', caregiver: null }; requests[3].resolve(profile(20));
  await new Promise(r => setImmediate(r)); assert.notEqual(render().state.status, 'ready'); blur();
  id = undefined; render(); const total = requests.length; focus(); assert.equal(requests.length, total); assert.equal(render().state.status, 'not-found');
});

test('bottom navigation keeps Perfiles selected inside detail and still allows returning to the list', () => {
  let pathname = '/perfiles/12/actividades'; const navigations = [];
  const bar = load('components/carer/area-navigation.tsx', { ...styling,
    'expo-router': { usePathname: () => pathname, router: { dismissTo: value => navigations.push(value) } },
    '@/constants/carer-navigation': load('constants/carer-navigation.ts'), '@/context/session': { useSession: () => ({ caregiver: { nombre: 'Cuidador', avatarId: null } }) },
    './account-avatar': { AccountAvatar: 'Avatar' },
    '@/components/bottom-navigation': load('components/bottom-navigation.tsx',styling),
  }).AreaNavigation;
  let tab = nodes(bar().type(bar().props)).find(node => node.props?.accessibilityLabel === 'Perfiles');
  assert.equal(tab.props.accessibilityState.selected, true); tab.props.onPress(); assert.deepEqual(navigations, ['/perfiles']);
  pathname = '/perfiles'; tab = nodes(bar().type(bar().props)).find(node => node.props?.accessibilityLabel === 'Perfiles'); tab.props.onPress(); assert.equal(navigations.length, 1);
});

test('installed Expo router history removes confirmation and Android back resolves to the profiles anchor', () => {
  const expoRoot = path.dirname(require.resolve('expo-router/package.json'));
  const { StackRouter } = require(path.join(expoRoot, 'build/react-navigation/routers/StackRouter.js'));
  const parserPath = path.join(expoRoot, 'build/fork/getStateFromPath.js');
  const parserRequire = require('node:module').createRequire(parserPath);
  const parser = {};
  // Only replace the native barrel import; run Expo's actual group-aware path parser.
  new Function('require', 'exports', fs.readFileSync(parserPath, 'utf8'))(id => id === '../react-navigation/native'
    ? require(path.join(expoRoot, 'build/react-navigation/core/validatePathConfig.js')) : parserRequire(id), parser);
  const { getStateFromPath } = parser;
  const principal = load('app/(cuidador-autenticado)/(principal)/_layout.tsx', { ...styling,
    'expo-router': { Stack: { Screen: 'Screen' }, router: {} },
    '@/components/carer/area-layout': { CarerAreaLayout: 'Layout' }, '@/components/carer/area-header': { AreaHeader: 'Header' } });
  assert.equal(principal.unstable_settings.anchor, 'perfiles');
  const profileLayout = load('app/(cuidador-autenticado)/(principal)/perfiles/[idPerfilUsuario]/_layout.tsx', { ...styling,
    'expo-router': { Stack: { Screen: 'Screen' }, router: {}, useLocalSearchParams: () => ({ idPerfilUsuario: '12' }) },
    '@/components/carer/area-header': { AreaHeader: 'Header' } });
  assert.equal(profileLayout.unstable_settings.anchor, 'index');
  // Build the actual file-based tree as well as testing the navigation state below.
  const appRoot = path.join(__dirname, '../src/app');
  const context = key => ({ default: () => null, unstable_settings:
    key.endsWith('(principal)/_layout.tsx') ? principal.unstable_settings
      : key.endsWith('[idPerfilUsuario]/_layout.tsx') ? profileLayout.unstable_settings : undefined });
  context.keys = () => fs.readdirSync(appRoot, { recursive: true }).filter(file => /\.tsx$/.test(file))
    .map(file => './' + file.split(path.sep).join('/'));
  const manifest = require(path.join(expoRoot, 'build/getRoutesCore.js')).getRoutes(context, { platform: 'android', importMode: 'sync' });
  const area = manifest.children.find(route => route.route === '(cuidador-autenticado)').children.find(route => route.route === '(principal)');
  const profileNode = area.children.find(route => route.route === 'perfiles/[idPerfilUsuario]');
  assert.equal(area.initialRouteName, 'perfiles'); assert.equal(profileNode.initialRouteName, 'index');
  assert.deepEqual(profileNode.children.map(route => route.route).sort(), ['actividades', 'ajustes', 'index', 'nueva-actividad', 'vincular-dispositivo']);
  const childRouter = StackRouter({ initialRouteName: principal.unstable_settings.anchor });
  const childOptions = { routeNames: ['perfiles', 'perfiles/[idPerfilUsuario]'], routeParamList: {}, routeGetIdList: {} };
  const parentRouter = StackRouter({ initialRouteName: '(principal)' });
  const parentOptions = { routeNames: ['(principal)', '(creacion-perfil)'], routeParamList: {}, routeGetIdList: {} };
  const child = childRouter.getInitialState(childOptions);
  let root = parentRouter.getInitialState(parentOptions);
  root.routes[0].state = child;
  root = parentRouter.getStateForAction(root, { type: 'PUSH', payload: { name: '(creacion-perfil)' } }, parentOptions);
  root.routes[root.index].state = { index: 0, routes: [{ name: 'perfil-creado' }] };
  const config = { screens: {
    '(principal)': { path: '(principal)', initialRouteName: principal.unstable_settings.anchor,
      screens: { perfiles: 'perfiles', 'perfiles/[idPerfilUsuario]': { path: 'perfiles/:idPerfilUsuario',
        initialRouteName: profileLayout.unstable_settings.anchor, screens: { index: '', actividades: 'actividades' } } } },
    '(creacion-perfil)': { path: '(creacion-perfil)', screens: { 'crear-perfil': 'crear-perfil', 'perfil-creado': 'perfil-creado' } },
  } };
  const exports = {};
  const source = fs.readFileSync(path.join(expoRoot, 'build/global-state/getNavigationAction.js'), 'utf8');
  new Function('require', 'exports', source)(id => {
    if (id === './stateUtils') return require(path.join(expoRoot, 'build/global-state/stateUtils.js'));
    return { './store': { store: { assertIsReady() {}, navigationRef: { current: { getRootState: () => root } },
      linking: { getStateFromPath, config }, getRouteInfo: () => ({}), redirects: [] } },
      '../getRoutesRedirects': { applyRedirects: href => href }, '../link/href': { resolveHrefStringWithSegments: href => href },
      '../navigationParams': { appendInternalExpoRouterParams: params => params } }[id];
  }, exports);
  const action = exports.getNavigateAction('/perfiles/12', {}, 'REPLACE', true);
  root = parentRouter.getStateForAction(root, action, parentOptions);
  assert.ok(!root.routes.some(route => route.name === '(creacion-perfil)'));
  const params = root.routes[root.index].params;
  assert.equal(params.initial, false); assert.equal(params.screen, 'perfiles/[idPerfilUsuario]');
  assert.equal(params.params.idPerfilUsuario, '12');
  assert.equal(params.params.screen, 'index');
  // React Navigation honors initial:false by retaining the anchor below the incoming screen.
  let target = childRouter.getInitialState(childOptions);
  target = childRouter.getStateForAction(target, { type: 'NAVIGATE', payload: { name: params.screen, params: params.params } }, childOptions);
  assert.deepEqual(target.routes.map(route => route.name), ['perfiles', 'perfiles/[idPerfilUsuario]']);
  target = childRouter.getStateForAction(target, { type: 'GO_BACK' }, childOptions);
  assert.deepEqual(target.routes.map(route => route.name), ['perfiles']);
  const direct = getStateFromPath('/perfiles/12', config);
  assert.deepEqual(direct.routes[0].state.routes.map(route => route.name), ['perfiles', 'perfiles/[idPerfilUsuario]']);
  const activitiesLink = getStateFromPath('/perfiles/12/actividades', config);
  const profileBranch = activitiesLink.routes[0].state.routes.at(-1);
  assert.equal(profileBranch.params.idPerfilUsuario, '12');
  assert.deepEqual(profileBranch.state.routes.map(route => route.name), ['index', 'actividades']);
  const profileRouter = StackRouter({ initialRouteName: profileLayout.unstable_settings.anchor });
  const profileOptions = { routeNames: ['index', 'actividades'], routeParamList: {}, routeGetIdList: {} };
  let profileStack = profileRouter.getRehydratedState(profileBranch.state, profileOptions);
  profileStack = profileRouter.getStateForAction(profileStack, { type: 'GO_BACK' }, profileOptions);
  assert.deepEqual(profileStack.routes.map(route => route.name), ['index']);
  profileStack = profileRouter.getStateForAction(profileStack, { type: 'PUSH', payload: { name: 'actividades' } }, profileOptions);
  assert.deepEqual(profileStack.routes.map(route => route.name), ['index', 'actividades']);
  profileStack = profileRouter.getStateForAction(profileStack, { type: 'GO_BACK' }, profileOptions);
  assert.equal(profileStack.routes[profileStack.index].name, 'index');
  // Existing profile: an ordinary push in the same stack has exactly the same back destination.
  let existing = childRouter.getStateForAction(child, { type: 'PUSH', payload: { name: 'perfiles/[idPerfilUsuario]', params: { idPerfilUsuario: '12' } } }, childOptions);
  existing = childRouter.getStateForAction(existing, { type: 'GO_BACK' }, childOptions);
  assert.deepEqual(existing.routes.map(route => route.name), ['perfiles']);
});

test('activity contract distinguishes empty and real summaries, rejects invalid data and drops internal fields', () => {
  assert.deepEqual(activityUtils.parseActivities({ actividades: [] }), { actividades: [] });
  const activity = { idActividad: 7, nombre: 'Desayunar', hora: '07:00', codigoIcono: 'bread' };
  assert.deepEqual(activityUtils.parseActivities({ actividades: [{ ...activity, perfilUsuario: { id: 999 } }] }), { actividades: [activity] });
  for (const value of [null, {}, { actividades: null }, { actividades: '[]' }, { actividades: [null] },
    { actividades: [{ ...activity, idActividad: 0 }] }, { actividades: [{ ...activity, idActividad: 2147483648 }] },
    { actividades: [{ ...activity, nombre: ' ' }] }, { actividades: [{ ...activity, nombre: 'a'.repeat(81) }] },
    { actividades: [activity, activity] }]) assert.throws(() => activityUtils.parseActivities(value));
});

test('activities service uses private GET with cancellation and never converts failure into an empty list', async () => {
  let called; let response = { status: 200, data: { actividades: [] } }; let failure;
  const api = load('services/activities.ts', { './private-http': { PrivateHttpError: HttpError,
    getAuthenticatedHttpClient: () => ({ get: async (...args) => { called = args; if (failure) throw failure; return response; } }) },
    '@/utils/activities': activityUtils });
  const signal = new AbortController().signal;
  assert.deepEqual(await api.getActivities(12, signal), { actividades: [] });
  assert.deepEqual(called, ['/api/perfiles/12/actividades', { signal }]);
  response = { status: 200, data: { actividades: [{ idActividad: 7, nombre: 'Desayunar', hora: '07:00', codigoIcono: 'bread' }] } };
  assert.equal((await api.getActivities(12)).actividades.length, 1);
  response = { status: 200, data: {} }; await assert.rejects(api.getActivities(12), error => error.kind === 'invalid-response');
  response = { status: 204 }; await assert.rejects(api.getActivities(12), error => error.kind === 'invalid-response');
  failure = new HttpError(404, 'PERFIL_NO_ENCONTRADO'); await assert.rejects(api.getActivities(12), error => error.kind === 'not-found');
  for (const error of [new HttpError(503), new HttpError(401), new Error('secret detail'), new Error('ERR_CANCELED')]) {
    failure = error; await assert.rejects(api.getActivities(12), value => value.kind === 'network' && !value.message.includes('secret'));
  }
});

test('activities screen shows the intentional empty state only after loading, not on failures or existing data', () => {
  let state = { status: 'loading' }; let retries = 0; const navigations = [];
  const screen = load('app/(cuidador-autenticado)/(principal)/perfiles/[idPerfilUsuario]/actividades.tsx', { ...styling,
    'expo-router': { Stack: { Screen: 'Screen' }, router: { dismissTo: href => navigations.push(href), push: href => navigations.push(href) }, useLocalSearchParams: () => ({ idPerfilUsuario: '12' }) },
    '@/components/carer/area-header': { AreaHeader: 'Header' }, '@/components/carer/profile-avatar': { ProfileAvatar: 'Avatar' },
    '@/components/carer/activities-empty-illustration': { ActivitiesEmptyIllustration: 'Illustration' },
    '@/components/carer/activity-summary-card': { ActivitySummaryCard: 'ActivityCard' },
    '@/components/carer/create-activity-button': { CreateActivityButton: 'CreateActivity', activityFabSize: 56 },
    '@/hooks/use-profile-activities': { useProfileActivities: id => { assert.equal(id, 12); return { state, reload: () => retries++ }; } },
  }).default;
  assert.ok(textOf(screen()).includes('Cargando actividades'));
  assert.ok(!textOf(screen()).includes('Aún no hay')); assert.ok(!nodes(screen()).some(node => node.type === 'CreateActivity'));
  state = { status: 'ready', profile: profile(12), data: { actividades: [] } };
  assert.ok(textOf(screen()).includes('Aún no hay actividades'));
  assert.ok(textOf(screen()).includes('Agrega las actividades que formarán su rutina diaria'));
  assert.equal(nodes(screen()).find(node => node.type === 'CreateActivity').props.id, 12);
  nodes(screen()).find(node => node.type === 'CreateActivity').props.onCreateActivity(12);
  assert.deepEqual(navigations.pop(), profileNavigation.newActivityHref(12));
  const header = nodes(screen()).find(node => node.type === 'Screen').props.options.header();
  assert.equal(textOf(header.props.title), 'Actividades de Persona real');
  assert.equal(header.props.rightContent.props.children.props.name, 'Persona real');
  assert.equal(header.props.rightContent.props.children.props.avatar, null);
  header.props.onBack(); assert.deepEqual(navigations.pop(), profileNavigation.profileHref(12));
  state = { ...state, data: { actividades: [{ idActividad: 7, nombre: 'Desayunar' }] } };
  const list=nodes(screen()).find(node=>node.type==='List');
  assert.equal(list.props.renderItem({item:state.data.actividades[0],index:0}).props.activity.idActividad,7);
  assert.equal(list.props.renderItem({item:state.data.actividades[0],index:0}).props.index,0);
  assert.equal(list.props.keyExtractor(state.data.actividades[0]),'7');
  assert.ok(!textOf(screen()).includes('Aún no hay')); assert.ok(!textOf(screen()).includes('Desayunar'));
  assert.ok(!nodes(screen()).some(node => node.type === 'Illustration'));
  assert.ok(nodes(screen()).some(node => node.type === 'CreateActivity'));
  assert.equal(nodes(screen()).find(node => node.type === 'CreateActivity').props.floating,true);
  assert.ok(!nodes(screen()).some(node=>node.type==='ScrollView'));
  assert.ok(list.props.contentContainerStyle.paddingBottom>=56+tokens.spacing.lg*2);
  state={...state,data:{actividades:Array.from({length:12},(_,index)=>({idActividad:index+1,nombre:'Actividad '+index,hora:'07:00',codigoIcono:'bread'}))}};
  const many=nodes(screen()).find(node=>node.type==='List');
  assert.equal(many.props.data.length,12);assert.equal(many.props.data[11].idActividad,12);
  assert.equal(many.props.renderItem({item:many.props.data[11],index:11}).props.index,11);
  assert.equal(nodes(screen()).filter(node=>node.type==='CreateActivity').length,1);
  state = { status: 'error' };
  assert.ok(!textOf(screen()).includes('Aún no hay'));
  nodes(screen()).find(node => node.props?.label === 'Reintentar').props.onPress(); assert.equal(retries, 1);
  state = { status: 'not-found' };
  assert.ok(!nodes(screen()).some(node => node.props?.label === 'Reintentar'));
  nodes(screen()).find(node => node.props?.label === 'Volver a Mis perfiles').props.onPress();
  assert.equal(navigations.pop(), '/perfiles');
  for (const copy of ['Hoy', '0 de 0', '%']) assert.ok(!textOf(screen()).includes(copy));
});

function activitiesHookFixture() {
  const refs = []; let cursor = 0; let saved; let focus; let id = 12; let epoch = 0;
  let snapshot = { status: 'authenticated', caregiver: { idCuidador: 3 } };
  const profiles = []; const activities = [];
  class LoadError extends Error { constructor(kind) { super(kind); this.kind = kind; } }
  const hook = load('hooks/use-profile-activities.ts', {
    react: { useRef: value => { const index = cursor++; return refs[index] ||= { current: value }; },
      useState: () => [saved, value => { saved = value; }], useCallback: value => value },
    'expo-router': { useFocusEffect: value => { focus = value; } },
    '@/context/session': { useSession: () => ({ manager: { revision: () => epoch, getSnapshot: () => snapshot }, caregiver: snapshot.caregiver }) },
    '@/services/profiles': { ProfileDetailError: LoadError, getProfile: (id, signal) => new Promise((resolve, reject) => profiles.push({ id, signal, resolve, reject })) },
    '@/services/activities': { ActivitiesError: LoadError, getActivities: (id, signal) => new Promise((resolve, reject) => activities.push({ id, signal, resolve, reject })) },
  }).useProfileActivities;
  return { profiles, activities, LoadError, render: () => { cursor = 0; return hook(id); },
    focus: () => focus(), setId: value => { id = value; }, logout: () => { epoch++; snapshot = { status: 'anonymous', caregiver: null }; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('activities loader waits for both real requests, coalesces loads and separates empty from populated results', async () => {
  const f = activitiesHookFixture(); f.render(); const blur = f.focus();
  void f.render().reload(); assert.equal(f.profiles.length, 1); assert.equal(f.activities.length, 0);
  f.profiles[0].resolve(profile(12)); await tick();
  assert.equal(f.render().state.status, 'loading'); assert.equal(f.activities.length, 1);
  assert.equal(f.profiles[0].signal, f.activities[0].signal);
  f.activities[0].resolve({ actividades: [] }); await tick();
  assert.equal(f.render().state.status, 'ready'); assert.deepEqual(f.render().state.data, { actividades: [] });
  void f.render().reload(); assert.equal(f.render().state.status, 'loading');
  f.profiles[1].resolve(profile(12)); await tick(); f.activities[1].resolve({ actividades: [{ idActividad: 7, nombre: 'Desayunar' }] }); await tick();
  assert.equal(f.render().state.data.actividades.length, 1); blur();
});

test('activities loader handles 404, network or invalid responses, retries and rejects invalid route IDs without requests', async () => {
  const f = activitiesHookFixture(); f.render(); const blur = f.focus();
  f.profiles[0].reject(new f.LoadError('not-found')); await tick();
  assert.equal(f.render().state.status, 'not-found'); assert.equal(f.activities.length, 0);
  void f.render().reload(); f.profiles[1].resolve(profile(12)); await tick();
  f.activities[0].reject(new f.LoadError('invalid-response')); await tick(); assert.equal(f.render().state.status, 'error');
  void f.render().reload(); f.profiles[2].resolve(profile(12)); await tick();
  f.activities[1].reject(new f.LoadError('not-found')); await tick(); assert.equal(f.render().state.status, 'not-found');
  void f.render().reload(); f.profiles[3].reject(new Error('network')); await tick(); assert.equal(f.render().state.status, 'error');
  blur(); f.setId(undefined); f.render(); const cleanup = f.focus();
  assert.equal(f.render().state.status, 'not-found'); assert.equal(f.profiles.length, 4); cleanup();
});

test('activities loader cancels on blur, blocks a late second request and isolates ID and session changes', async () => {
  const f = activitiesHookFixture(); f.render(); let blur = f.focus(); blur();
  assert.equal(f.profiles[0].signal.aborted, true); f.profiles[0].resolve(profile(12)); await tick(); assert.equal(f.activities.length, 0);
  f.render(); blur = f.focus(); f.profiles[1].resolve(profile(12)); await tick(); blur();
  assert.equal(f.activities[0].signal.aborted, true); f.activities[0].resolve({ actividades: [] }); await tick();
  assert.notEqual(f.render().state.status, 'ready');
  f.setId(20); f.render(); blur = f.focus(); assert.equal(f.profiles[2].id, 20);
  f.profiles[2].resolve(profile(20)); await tick(); f.logout(); f.activities[1].resolve({ actividades: [] }); await tick();
  assert.notEqual(f.render().state.status, 'ready'); blur();
});

test('Nueva actividad has one optional extension callback and is otherwise disabled with no fake handler', () => {
  const button = load('components/carer/create-activity-button.tsx', { ...styling }).CreateActivityButton;
  const disabled = button({ id: 12 }); assert.equal(disabled.props.disabled, true); assert.equal(disabled.props.onPress, undefined);
  assert.equal(disabled.props.label, 'Nueva actividad');
  let passed; const enabled = button({ id: 12, onCreateActivity: id => { passed = id; } });
  assert.equal(enabled.props.disabled, false); enabled.props.onPress(); assert.equal(passed, 12);
});

test('shared header preserves account defaults and accepts a passive avatar and a profile back label', () => {
  const back = () => {}; const avatar = jsx('Avatar', {});
  const header = load('components/carer/area-header.tsx', { ...styling,
    react: { useRef: () => ({ current: null }), useState: () => [false, () => {}] },
    '@/context/session': { useSession: () => ({ manager: {} }) }, './notification-bell': { NotificationBell: 'Bell' },
  }).AreaHeader;
  const original = nodes(header({ title: 'Mis perfiles' }));
  assert.ok(original.some(node => node.props?.accessibilityLabel === 'Opciones de cuenta'));
  assert.ok(original.some(node => node.type === 'Bell'));
  const custom = nodes(header({ title: 'Actividades', onBack: back, backLabel: 'Volver al perfil', rightContent: avatar }));
  assert.equal(custom.find(node => node.props?.accessibilityLabel === 'Volver al perfil').props.onPress, back);
  assert.ok(custom.some(node => node.type === 'Avatar')); assert.ok(!custom.some(node => node.type === 'Bell'));
});
