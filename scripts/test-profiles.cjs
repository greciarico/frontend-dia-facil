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
      Pressable: 'Pressable', ScrollView: 'ScrollView', ActivityIndicator: 'Spinner' },
    'expo-image': { Image: 'Image' },
    ...modules,
  };
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(id => {
    if (id.startsWith('@/assets/') || id.includes('Nunito_')) return id;
    assert.ok(id in defaults, `Missing test adapter: ${id}`);
    return defaults[id];
  }, exports);
  return exports;
}
const avatars = load('constants/carer-avatars.ts');
const utils = load('utils/profiles.ts', { '@/constants/carer-avatars': avatars });
const tokens = load('theme/tokens.ts');
const styling = { '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.themes.light },
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
  });
  assert.deepEqual(await service.getProfiles(signal), response());
  assert.deepEqual(called, ['/api/perfiles', { signal }]);
});

test('screen distinguishes loading, recoverable error, empty and real profiles without fabricated progress', () => {
  let state = { status: 'loading' }; let retried = 0;
  const screen = load('app/(cuidador-autenticado)/perfiles.tsx', { ...styling,
    '@/hooks/use-profiles': { useProfiles: () => ({ state, reload: () => retried++ }) } }).default;
  assert.ok(textOf(screen()).includes('Cargando perfiles'));
  state = { status: 'error' };
  const error = screen(); assert.ok(!textOf(error).includes('Aún no tienes'));
  nodes(error).find(node => node.type === 'Button').props.onPress(); assert.equal(retried, 1);
  state = { status: 'ready', data: response() };
  assert.ok(textOf(screen()).includes('Aún no tienes'));
  assert.equal(nodes(screen()).find(node => node.type === 'CreateButton').props.first, true);
  state = { status: 'ready', data: { perfiles: [profile()], maximoPerfilesActivos: 2 } };
  assert.equal(nodes(screen()).filter(node => node.type === 'Card').length, 1);
  assert.ok(nodes(screen()).some(node => node.type === 'CreateButton'));
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

test('creation, profile access and unimplemented navigation remain disabled and carry no fake routes', () => {
  const create = load('components/carer/create-profile-button.tsx', styling).CreateProfileButton;
  assert.equal(nodes(create({ first: true })).find(node => node.type === 'Button').props.disabled, true);
  assert.equal(nodes(create({})).find(node => node.type === 'Button').props.disabled, true);
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
    const inner = layout().props.children;
    const groups = nodes(inner.type(inner.props)).filter(node => node.type === 'Protected');
    const privateGroup = groups.find(node => nodes(node.props.children).some(child => child.props?.name === '(cuidador-autenticado)'));
    assert.equal(privateGroup.props.guard, allowed);
  }
});
