const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), test = require('node:test'), ts = require('typescript');
const jsx = (type, props) => ({ type, props });
function load(file, modules = {}) {
  const out = {};
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(id => { assert.ok(id in modules, 'Missing adapter ' + id); return modules[id]; }, out);
  return out;
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const initial = { tamanoTexto: 'MEDIANO', altoContraste: false, lecturaVoz: true };
const utils = load('utils/accessibility.ts');
const tokens = load('theme/tokens.ts');
test('semantic values validate without accepting legacy pixel sizes, nulls or missing fields', () => {
  assert.deepEqual(utils.parseAccessibility(initial), initial);
  for (const tamanoTexto of ['PEQUENO', 'MEDIANO', 'GRANDE']) assert.equal(utils.parseAccessibility({ ...initial, tamanoTexto }).tamanoTexto, tamanoTexto);
  for (const bad of [null, {}, { ...initial, tamanoTexto: 16 }, { ...initial, lecturaVoz: null }, { ...initial, altoContraste: 'false' }]) assert.throws(() => utils.parseAccessibility(bad));
});
test('AppText scales explicit sizes once, leaves inherited text/native scaling intact and caregiver unchanged', () => {
  let preference = null;
  const flatten = style => Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]).filter(Boolean));
  const { AppText } = load('components/app-text.tsx', {
    react: { forwardRef: fn => fn }, 'react/jsx-runtime': { jsx },
    'react-native': { Text: 'Text', StyleSheet: { flatten } },
    '@/theme/profile-appearance': { useProfileAppearance: () => preference }, '@/utils/accessibility': utils,
  });
  let tree = AppText({ style: { fontSize: 16, lineHeight: 24 }, children: 'Texto' });
  assert.deepEqual(flatten(tree.props.style), { fontSize: 16, lineHeight: 24 });
  preference = { ...initial, tamanoTexto: 'GRANDE' };
  tree = AppText({ style: [{ fontSize: 16 }, { lineHeight: 24 }], children: 'Texto' });
  assert.deepEqual(flatten(tree.props.style), { fontSize: 20, lineHeight: 30 });
  assert.equal(tree.props.allowFontScaling, undefined); assert.equal(tree.props.maxFontSizeMultiplier, undefined);
  assert.deepEqual(flatten(AppText({ style: { fontFamily: 'Nunito' } }).props.style), { fontFamily: 'Nunito' });
  assert.equal(utils.profileTextStyle({ fontSize: 12 }, 'PEQUENO').fontSize, 12);
});
function contrast(a, b) {
  const luminance = c => c.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((v, x, i) => v + x * [.2126, .7152, .0722][i], 0);
  const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
test('profile contrast selects the existing dark readable palette regardless of system theme, without altering normal themes', () => {
  let scheme = 'light', preferences = null;
  const { useAppTheme } = load('theme/use-theme.ts', { 'react-native': { useColorScheme: () => scheme }, './tokens': tokens,
    './profile-appearance': { useProfileAppearance: () => preferences } });
  assert.equal(useAppTheme(), tokens.themes.light);
  preferences = { ...initial, altoContraste: true };
  for (scheme of ['light', 'dark']) {
    const theme = useAppTheme(), c = theme.colors;
    assert.equal(theme.scheme, 'dark'); assert.equal(theme.highContrast, true);
    assert.equal(theme, tokens.highContrastTheme);
    assert.notEqual(c.surface.default, c.background.primary);
    assert.notEqual(c.surface.elevated, c.background.primary);
    assert.notEqual(c.border.decorative, c.text.primary);
    assert.ok(contrast(c.text.primary, c.background.primary) >= 7);
    assert.ok(contrast(c.text.secondary, c.surface.default) >= 7);
    assert.ok(contrast(c.action.primary, c.action.onPrimary) >= 7);
    assert.ok(contrast(c.border.control, c.surface.default) >= 3);
  }
  preferences = null; assert.equal(useAppTheme(), tokens.themes.dark);
});
const { AccessibilityEditor } = load('services/accessibility-editor.ts');
test('autosave blocks duplicates, updates only chosen field and reset uses one operation', async () => {
  let stored = { ...initial }, writes = 0, resets = 0; const pending = deferred();
  const editor = new AccessibilityEditor({ revision: () => 1, get: async () => stored,
    patch: async value => { writes++; await pending.promise; stored = { ...stored, ...value }; return stored; },
    reset: async () => { resets++; return initial; } });
  editor.enter(); await tick();
  const request = editor.change({ tamanoTexto: 'GRANDE' }); editor.change({ altoContraste: true });
  assert.equal(writes, 1); assert.equal(editor.getSnapshot().value.tamanoTexto, 'GRANDE');
  pending.resolve(); await request; assert.equal(editor.getSnapshot().busy, false);
  await editor.reset(); assert.equal(resets, 1); assert.deepEqual(editor.getSnapshot().value, initial);
});
test('known write rejection rolls back; lost response reconciles with GET without replay', async () => {
  let remote = { ...initial }, calls = 0, reads = 0, mode = 'reject';
  const editor = new AccessibilityEditor({ revision: () => 1, get: async () => { reads++; return remote; }, reset: async () => initial,
    patch: async patch => { calls++; if (mode === 'reject') throw { status: 400 }; remote = { ...remote, ...patch }; throw Error('response lost'); } });
  editor.enter(); await tick(); await editor.change({ altoContraste: true });
  assert.equal(editor.getSnapshot().value.altoContraste, false);
  mode = 'lost'; await editor.change({ altoContraste: true });
  assert.equal(calls, 2); assert.equal(reads, 2); assert.equal(editor.getSnapshot().value.altoContraste, true); assert.equal(editor.getSnapshot().uncertain, false);
});
test('unknown write plus failed reconciliation blocks writes until explicit successful GET; stale results ignored', async () => {
  let fail = false, writes = 0, epoch = 1, remote = initial;
  const editor = new AccessibilityEditor({ revision: () => epoch, get: async () => { if (fail) throw Error(); return remote; },
    reset: async () => initial, patch: async () => { writes++; throw Error(); } });
  editor.enter(); await tick(); fail = true; await editor.change({ lecturaVoz: false });
  assert.equal(editor.getSnapshot().uncertain, true); assert.equal(editor.getSnapshot().value.lecturaVoz, false);
  await editor.change({ altoContraste: true }); assert.equal(writes, 1);
  fail = false; remote = { ...initial, lecturaVoz: false }; await editor.load(); assert.equal(editor.getSnapshot().uncertain, false);
  const d = deferred(); const late = new AccessibilityEditor({ revision: () => epoch, get: () => d.promise });
  late.enter(); const before = late.getSnapshot(); epoch++; late.leave(); d.resolve(initial); await tick(); assert.equal(late.getSnapshot(), before);
});
test('API paths use existing private clients; user configuration never takes a profile ID', async () => {
  const calls = []; const client = Object.fromEntries(['get', 'patch', 'post'].map(method => [method, async (...args) => { calls.push([method, ...args]); return { data: initial }; }]));
  const api = load('services/accessibility.ts', { './private-http': { getAuthenticatedHttpClient: () => client }, './device-access': { createUserHttpClient: () => client }, '@/utils/accessibility': utils });
  await api.getProfileAccessibility(12); await api.patchProfileAccessibility(12, { lecturaVoz: false }); await api.resetProfileAccessibility(12); await api.getUserAccessibility();
  assert.deepEqual(calls.map(c => c.slice(0, 2)), [['get', '/api/perfiles/12/accesibilidad'], ['patch', '/api/perfiles/12/accesibilidad'], ['post', '/api/perfiles/12/accesibilidad/restablecer'], ['get', '/api/usuario/accesibilidad']]);
  assert.equal(calls[1][3].authReplaySafe, true); assert.equal(calls[3][2].signal, undefined);
});
const speechServices = load('services/step-speech.ts');
const { StepSpeech, ContentSpeechSession, activitySpeechMessage, stepSpeechMessage } = speechServices;
test('speech messages contain only the requested detail phrase or numbered instruction, with no duplicated punctuation', () => {
  assert.equal(activitySpeechMessage('desayunar'), 'Es hora de desayunar.');
  assert.equal(stepSpeechMessage(3, 5, 'Sirve la comida'), 'Paso 3 de 5. Sirve la comida.');
  assert.equal(stepSpeechMessage(3, 5, 'Sirve la comida.'), 'Paso 3 de 5. Sirve la comida.');
});
test('a late blur or native callback from the previous route cannot cancel the new route speech', async () => {
  const spoken = []; let stops = 0;
  const engine = { stop: async () => { stops++; }, speak: (text, options) => spoken.push({ text, options }) };
  const detail = new StepSpeech(engine), guide = new StepSpeech(engine);
  detail.play(activitySpeechMessage('desayunar')); await tick();
  detail.stop(); guide.play(stepSpeechMessage(1, 5, 'Lávate las manos')); detail.stop(); await tick();
  const count = stops; detail.stop(); spoken[0].options.onError(); await tick();
  assert.equal(stops, count); assert.equal(guide.getSnapshot().speaking, true);
  assert.equal(spoken.length, 2); assert.equal(spoken.at(-1).text, 'Paso 1 de 5. Lávate las manos.');
  guide.stop(); await tick(); assert.equal(stops, count + 1);
});
test('focus and content readiness converge once; pending rapid changes and effect cleanup never enqueue stale messages', async () => {
  const spoken = [], d = deferred(); let first = true;
  const speech = new StepSpeech({ stop: () => first ? (first = false, d.promise) : Promise.resolve(), speak: text => spoken.push(text) });
  const session = new ContentSpeechSession(speech);
  session.focus(); session.update({ identity: '12:1:guide', enabled: true });
  session.update({ identity: '12:1:guide', enabled: true, content: { key: '1', text: 'Paso 1' } }); await tick();
  session.update({ identity: '12:1:guide', enabled: true, content: { key: '2', text: 'Paso 2' } });
  session.update({ identity: '12:1:guide', enabled: true, content: { key: '3', text: 'Paso 3' } });
  session.focus(); d.resolve(); await tick(); assert.deepEqual(spoken, ['Paso 3']);
  session.blur(); session.focus(); session.blur(); session.focus(); await tick(); assert.deepEqual(spoken, ['Paso 3', 'Paso 3']);
  session.update({ identity: '12:1:guide', enabled: false, content: { key: '4', text: 'Paso 4' } });
  session.repeat(); await tick(); assert.equal(spoken.length, 2);
});
test('returning focus waits for the post-focus content instead of reading and cancelling an old cached snapshot', async () => {
  const spoken = []; const session = new ContentSpeechSession(new StepSpeech({ stop: async () => {}, speak: text => spoken.push(text) }));
  const state = { identity: '12:1:detail', enabled: true, content: { key: 'activity:7', text: 'Es hora de desayunar.' } };
  const first = session.focus(); session.update(state, first); await tick(); assert.equal(spoken.length, 1);
  session.blur(); const next = session.focus(true); await tick(); assert.equal(spoken.length, 1);
  session.update(state, first); await tick(); assert.equal(spoken.length, 1);
  session.update({ ...state, content: undefined }, next); await tick(); assert.equal(spoken.length, 1);
  session.update(state, next); session.update({ ...state, content: { ...state.content } }, next); await tick(); assert.equal(spoken.length, 2);
});
test('content speech icon is hidden without voice and always repeats instead of exposing a stop-only action', () => {
  let repeats = 0;
  const Control = load('components/user/content-speech-control.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { View: 'View', Pressable: 'Pressable', StyleSheet: { create: x => x } },
    '@/theme/use-theme': { useAppTheme: () => tokens.highContrastTheme }, '@/theme/tokens': tokens,
    '@/components/app-text': { AppText: 'Text' }, '@/components/carer/area-icon': { AreaIcon: 'Icon' },
  }).ContentSpeechControl;
  const speech = { enabled: false, speaking: false, error: false, repeat: () => repeats++ };
  assert.equal(Control({ speech, label: 'Volver a escuchar este paso' }), null);
  speech.enabled = true; speech.speaking = true;
  const tree = Control({ speech, label: 'Volver a escuchar este paso' });
  const button = tree.props.children[0]; assert.equal(button.props.accessibilityLabel, 'Volver a escuchar este paso');
  button.props.onPress(); button.props.onPress(); assert.equal(repeats, 2);
});
test('step voice avoids the explicit duplicate TalkBack announcement while preserving accessible step navigation', () => {
  let voice = true; const announced = [];
  const Steps = load('components/user/guide-steps.tsx', {
    react: { useEffect: fn => fn(), useRef: () => ({ current: null }) }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', FlatList: 'List', Pressable: 'Pressable', StyleSheet: { create: x => x }, AccessibilityInfo: { announceForAccessibility: text => announced.push(text) } },
    '@/components/app-text': { AppText: 'Text' }, '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.highContrastTheme },
    '@/theme/profile-appearance': { useProfileAppearance: () => ({ ...initial, lecturaVoz: voice }) },
  }).GuideSteps;
  const args = { steps: [{ idPasoActividad: 4, descripcion: 'Come', alcanzado: true }], current: 0, disabled: false, onSelect() {} };
  Steps(args); assert.deepEqual(announced, []);
  voice = false; Steps(args); assert.deepEqual(announced, ['Paso 1 de 1. Come']);
});
test('speech is Spanish and serial; repeated taps restart the complete message', async () => {
  const spoken = []; let stops = 0;
  const speech = new StepSpeech({ stop: async () => { stops++; }, speak: (text, options) => spoken.push({ text, options }) });
  assert.equal(spoken.length, 0); speech.play('Lávate las manos'); await tick();
  assert.equal(spoken[0].text, 'Lávate las manos'); assert.equal(spoken[0].options.language, 'es');
  speech.play('Lávate las manos'); await tick(); assert.equal(spoken.length, 2); assert.equal(speech.getSnapshot().speaking, true); assert.equal(stops, 2);
});
test('speech cleanup cancels delayed start and old callbacks cannot stop a new instruction', async () => {
  const d = deferred(), spoken = []; let first = true;
  const speech = new StepSpeech({ stop: () => { if (first) { first = false; return d.promise; } return Promise.resolve(); }, speak: (text, options) => spoken.push({ text, options }) });
  speech.play('Paso anterior'); await tick(); speech.stop(); d.resolve(); await tick(); assert.equal(spoken.length, 0);
  speech.play('Paso 1'); await tick(); speech.stop(); speech.play('Paso 2'); await tick();
  spoken[0].options.onDone(); assert.equal(speech.getSnapshot().speaking, true);
  spoken[1].options.onError(); assert.equal(speech.getSnapshot().error, true); speech.play('Paso 2'); await tick(); assert.equal(spoken.length, 3);
});

function hookHarness() {
  let cursor = 0, jobs = []; const slots = [];
  const react = {
    createContext: initial => ({ Provider: 'Provider', initial }), useContext: context => context.initial,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { fn, deps }; return slots[i].fn; },
    useMemo: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useSyncExternalStore: (_, snapshot) => snapshot(),
    useEffect: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) {
      const old = slots[i]; slots[i] = { deps }; jobs.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); });
    } },
  };
  return { react, render: fn => { cursor = 0; const tree = fn(); const run = jobs; jobs = []; run.forEach(fn => fn()); return tree; },
    unmount: () => slots.forEach(slot => slot?.cleanup?.()) };
}
test('user provider deduplicates initial/foreground/focus requests, retains known settings and ignores late identity responses', async () => {
  const h = hookHarness(), requests = []; let foreground, epoch = 1;
  const modules = { react: h.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, left: 0, right: 0, bottom: 24 }) },
    'react-native': { View: 'View', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x }, AppState: {
      addEventListener: (_, fn) => { foreground = fn; return { remove() {} }; },
    } }, '@/services/device-access': { deviceAccess: { revision: () => epoch } },
    '@/services/accessibility': { getUserAccessibility: signal => { const d = deferred(); requests.push({ ...d, signal }); return d.promise; } },
    '@/theme/profile-appearance': { ProfileAppearanceContext: { Provider: 'Appearance' } },
    '@/theme/use-theme': { useAppTheme: () => tokens.themes.light }, '@/theme/tokens': tokens,
    '@/components/app-text': { AppText: 'Text' }, '@/components/carer/continue-button': { ContinueButton: 'Button' } };
  const { UserAccessibilityProvider } = load('context/user-accessibility.tsx', modules);
  const child = { type: 'Guide', props: { selectedStep: 3 } }, render = () => h.render(() => UserAccessibilityProvider({ children: child }));
  let tree = render(); const refresh = tree.props.children.props.value;
  assert.equal(requests.length, 1); refresh(); foreground('active'); assert.equal(requests.length, 1);
  requests[0].resolve(initial); await tick(); tree = render(); assert.deepEqual(tree.props.value, initial);
  refresh(); requests[1].reject(Error()); await tick(); tree = render();
  assert.deepEqual(tree.props.value, initial); const boundary = tree.props.children.props.children;
  assert.equal(boundary.props.children, child); assert.equal(boundary.props.error, true);
  foreground('background'); assert.equal(requests.length, 2); foreground('active');
  requests[2].resolve({ ...initial, tamanoTexto: 'GRANDE' }); await tick(); tree = render(); assert.equal(tree.props.value.tamanoTexto, 'GRANDE');
  refresh(); epoch++; h.unmount(); assert.equal(requests[3].signal.aborted, true);
  requests[3].resolve({ ...initial, altoContraste: true }); await tick(); assert.equal(render().props.value.altoContraste, false);
  const fresh = hookHarness(); const freshProvider = load('context/user-accessibility.tsx', { ...modules, react: fresh.react }).UserAccessibilityProvider;
  assert.equal(fresh.render(() => freshProvider({ children: child })).props.value, null); fresh.unmount();
});
test('route speech reads on focus/content change, not rerenders or refetch, and cleans up on background, preference and identity', async () => {
  const h = hookHarness(); let enabled = true, appState, blur, focus, lastDeps, revision = 1, linked = true, profile = 12;
  const spoken = []; let stops = 0;
  const hook = load('hooks/use-content-speech.ts', {
    react: h.react,
    'expo-router': { useFocusEffect: fn => { if (fn !== lastDeps) { blur?.(); focus = fn; blur = fn(); lastDeps = fn; } } },
    'react-native': { AppState: { currentState: 'active', addEventListener: (_, fn) => { appState = fn; return { remove() {} }; } } },
    'expo-speech': { stop: async () => { stops++; }, speak: (text, options) => spoken.push({ text, options }) },
    '@/services/step-speech': speechServices, '@/theme/profile-appearance': { useProfileAppearance: () => ({ ...initial, lecturaVoz: enabled }) },
    '@/context/device-access': { useDeviceAccess: () => ({ status: linked ? 'linked' : 'unlinked', profile: { idPerfilUsuario: profile } }) },
    '@/services/device-access': { deviceAccess: { revision: () => revision } },
  }).useContentSpeech;
  let content; const render = () => h.render(() => hook('guia:7', content));
  render(); await tick(); assert.equal(spoken.length, 0);
  content = { key: 'step:1', text: stepSpeechMessage(1, 5, 'Lávate las manos') }; render(); await tick(); assert.equal(spoken.length, 1);
  for (let i = 0; i < 3; i++) { content = { ...content }; render(); } await tick(); assert.equal(spoken.length, 1);
  content = undefined; render(); await tick(); content = { key: 'step:1', text: stepSpeechMessage(1, 5, 'Lávate las manos') }; render(); await tick(); assert.equal(spoken.length, 1);
  content = { key: 'step:2', text: stepSpeechMessage(2, 5, 'Prepara la mesa') }; render(); await tick(); assert.equal(spoken.length, 2);
  content = { key: 'step:1', text: stepSpeechMessage(1, 5, 'Lávate las manos') }; render(); await tick(); assert.equal(spoken.length, 3);
  render().repeat(); await tick(); assert.equal(spoken.length, 4); assert.equal(spoken.at(-1).text, content.text);
  appState('background'); await tick(); assert.equal(render().speaking, false); appState('active'); await tick(); assert.equal(spoken.length, 4);
  enabled = false; assert.equal(render().enabled, false); await tick(); const count = spoken.length;
  render().repeat(); await tick(); assert.equal(spoken.length, count);
  enabled = true; render(); await tick(); assert.equal(spoken.length, count + 1);
  blur(); await tick(); blur = focus(); render(); await tick(); assert.equal(spoken.length, count + 2);
  profile = 20; revision++; assert.equal(render().enabled, false); await tick(); assert.equal(spoken.length, count + 2);
  linked = false; revision++; render(); await tick(); assert.equal(render().speaking, false);
  h.unmount(); await tick(); assert.ok(stops > 0);
});
test('caregiver settings autosave absolute changes, expose selected radio state and confirm reset without editing profile', () => {
  const h = hookHarness(), calls = [];
  const state = { status: 'ready', value: initial, busy: false, uncertain: false };
  const Screen = load('app/(cuidador-autenticado)/(principal)/perfiles/[idPerfilUsuario]/ajustes.tsx', {
    react: h.react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'expo-router': { useLocalSearchParams: () => ({ idPerfilUsuario: '12' }) },
    'react-native-svg': { __esModule: true, default: 'Svg', Circle: 'Circle', Path: 'Path' },
    'react-native': { ActivityIndicator: 'Spinner', Pressable: 'Pressable', ScrollView: 'Scroll', Switch: 'Switch', Text: 'Text', View: 'View', StyleSheet: { create: x => x } },
    '@/hooks/use-profile-detail': { useProfileDetail: id => { assert.equal(id, 12); return { state: { status: 'ready', profile: { nombre: 'Persona real', avatar: null } } }; } },
    '@/hooks/use-accessibility-editor': { useAccessibilityEditor: () => ({ state, editor: { change: value => calls.push(value), reset: () => calls.push('reset'), load() {} } }) },
    '@/components/carer/profile-avatar': { ProfileAvatar: 'Avatar' }, '@/components/carer/area-icon': { AreaIcon: 'Icon' },
    '@/components/carer/continue-button': { ContinueButton: 'Button' }, '@/components/carer/activity-dialog': { ActivityDialog: 'Dialog' },
    '@/components/carer/step-dialog-actions': { StepDialogActions: 'Actions' }, '@/utils/profile-navigation': { validProfileId: Number },
    '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.themes.light },
  }).default;
  const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : [];
  const render = () => h.render(Screen); let tree = render();
  const flatten = value => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
  const structure = tree => nodes(tree).filter(n => !['Icon', 'Svg', 'Circle', 'Path'].includes(n.type)).map(n => n.type);
  const normalStructure = structure(tree);
  const radios = nodes(tree).filter(n => n.props?.accessibilityRole === 'radio');
  assert.equal(flatten(radios[0].props.style).borderWidth, undefined);
  assert.equal(flatten(radios[1].props.style).backgroundColor, tokens.themes.light.colors.action.primary);
  assert.equal(flatten(radios[0].props.style).backgroundColor, 'transparent');
  const assertSelectedCircle = (tree, label) => {
    const options = nodes(tree).filter(n => n.props?.accessibilityRole === 'radio');
    assert.equal(nodes(tree).filter(n => n.type === 'Circle').length, 1);
    const selected = options.find(n => n.props.accessibilityLabel === label);
    assert.equal(selected.props.accessibilityState.checked, true);
    const svg = nodes(selected).find(n => n.type === 'Svg');
    assert.equal(svg.props.width, tokens.sizes.iconSmall); assert.equal(svg.props.height, tokens.sizes.iconSmall);
    assert.equal(svg.props.viewBox, '0 0 24 24');
    const circle = nodes(svg).find(n => n.type === 'Circle'), check = nodes(svg).find(n => n.type === 'Path');
    assert.deepEqual([circle.props.cx, circle.props.cy, circle.props.r], [12, 12, 12]);
    assert.equal(circle.props.fill, tokens.colors.background.primary); assert.equal(check.props.stroke, tokens.colors.purple.default);
    return svg;
  };
  assertSelectedCircle(tree, 'Mediano');
  for (const [value, label] of [['GRANDE', 'Grande'], ['MEDIANO', 'Mediano'], ['PEQUENO', 'Pequeño'], ['GRANDE', 'Grande']]) {
    state.value = { ...initial, tamanoTexto: value }; state.busy = true; assertSelectedCircle(render(), label);
    state.busy = false; assertSelectedCircle(render(), label);
  }
  state.value = initial; tree = render(); assertSelectedCircle(tree, 'Mediano');
  const readSwitch = nodes(tree).find(n => n.type === 'Switch' && n.props.accessibilityLabel === 'Lectura de voz');
  assert.equal(readSwitch.props.trackColor.true, tokens.themes.light.colors.switch.on);
  assert.equal(readSwitch.props.trackColor.false, tokens.themes.light.colors.switch.off);
  assert.equal(readSwitch.props.thumbColor, tokens.themes.light.colors.switch.thumb);
  assert.equal(readSwitch.props.ios_backgroundColor, tokens.themes.light.colors.switch.off);
  state.busy = true; state.value = { ...initial, tamanoTexto: 'GRANDE' }; tree = render();
  assert.deepEqual(structure(tree), normalStructure);
  const busySwitch = nodes(tree).find(n => n.type === 'Switch' && n.props.accessibilityLabel === 'Lectura de voz');
  assert.equal(busySwitch.props.disabled, false); assert.equal(busySwitch.props.accessibilityState.disabled, true);
  assert.deepEqual(busySwitch.props.trackColor, readSwitch.props.trackColor);
  busySwitch.props.onValueChange(false); assert.equal(calls.length, 0);
  assert.equal(nodes(tree).find(n => n.props?.accessibilityRole === 'radio' && n.props.accessibilityLabel === 'Grande').props.accessibilityState.checked, true);
  state.busy = false; state.value = initial; tree = render();
  assert.equal(nodes(tree).find(n => n.props?.accessibilityRole === 'radio' && n.props.accessibilityLabel === 'Mediano').props.accessibilityState.checked, true);
  nodes(tree).find(n => n.props?.accessibilityLabel === 'Grande').props.onPress(); assert.deepEqual(calls.pop(), { tamanoTexto: 'GRANDE' });
  nodes(tree).find(n => n.type === 'Switch' && n.props.accessibilityLabel === 'Lectura de voz').props.onValueChange(false); assert.deepEqual(calls.pop(), { lecturaVoz: false });
  nodes(tree).find(n => n.props?.accessibilityLabel === 'Restablecer ajustes').props.onPress(); tree = render();
  nodes(tree).find(n => n.type === 'Actions').props.onCancel(); assert.ok(!nodes(render()).some(n => n.type === 'Dialog')); assert.equal(calls.length, 0);
  nodes(render()).find(n => n.props?.accessibilityLabel === 'Restablecer ajustes').props.onPress(); tree = render();
  nodes(tree).find(n => n.type === 'Actions').props.onConfirm(); assert.deepEqual(calls, ['reset']);
  state.uncertain = true; tree = render(); assert.ok(nodes(tree).filter(n => n.type === 'Switch' || n.props?.accessibilityRole === 'radio').every(n => n.props.disabled));
  assert.ok(!nodes(tree).some(n => n.type === 'Icon' && ['pencil', 'camera'].includes(n.props.name)));
});

const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : [];
const flatten = value => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
test('dark activity cards retain all five positional families, original image rendering and readable completed states', () => {
  const surfaces = load('utils/activity-icon-surface.ts', { '@/theme/tokens': tokens });
  const Card = load('components/carer/activity-summary-card.tsx', {
    react: { useState: value => [value, () => {}] }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Pressable: 'Pressable', StyleSheet: { create: x => x } },
    'expo-image': { Image: 'Image' }, '@/components/app-text': { AppText: 'Text' }, '@/constants/activity-icons': { resolveActivityIcon: () => 'original-png' },
    '@/utils/activity-draft': { formatActivityTime: () => '7:00 a. m.' }, '@/utils/activity-icon-surface': surfaces,
    '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.highContrastTheme },
    './account-layout': { accountStyles: { body: {}, small: {} } }, './area-icon': { AreaIcon: 'Icon' },
  }).ActivitySummaryCard;
  const backgrounds = new Set();
  for (let index = 0; index < 10; index++) {
    const family = surfaces.getActivityVisualFamily(index, true);
    assert.deepEqual(family, surfaces.getActivityVisualFamily(index % 5, true));
    assert.ok(contrast(tokens.highContrastTheme.colors.text.primary, family.light) >= 7);
    assert.ok(contrast(tokens.highContrastTheme.colors.text.secondary, family.light) >= 7);
    assert.ok(contrast(family.default, tokens.highContrastTheme.colors.action.onPrimary) >= 3);
    const card = Card({ activity: { nombre: 'Actividad', hora: '07:00', codigoIcono: 'bread' }, index, status: 'completada', appearance: 'agenda' });
    assert.equal(flatten(card.props.style).backgroundColor, family.light); backgrounds.add(family.light);
    const image = nodes(card).find(n => n.type === 'Image'); assert.equal(image.props.source, 'original-png'); assert.equal(image.props.contentFit, 'contain');
    assert.equal(flatten(nodes(card).filter(n => n.props?.importantForAccessibility === 'no-hide-descendants')[1].props.style).backgroundColor, family.default);
    assert.ok(card.props.accessibilityLabel.includes('completada'));
  }
  assert.equal(backgrounds.size, 5);
});
test('dark guide visually distinguishes current, reached and future without unlocking new steps', () => {
  const Steps = load('components/user/guide-steps.tsx', {
    react: { useEffect() {}, useRef: () => ({ current: null }) }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', FlatList: 'List', Pressable: 'Pressable', StyleSheet: { create: x => x }, AccessibilityInfo: {} },
    '@/components/app-text': { AppText: 'Text' }, '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.highContrastTheme },
    '@/theme/profile-appearance': { useProfileAppearance: () => initial },
  }).GuideSteps;
  const steps = [true, true, false].map((alcanzado, i) => ({ idPasoActividad: i + 1, descripcion: 'Paso', alcanzado }));
  const tree = Steps({ steps, current: 1, disabled: false, onSelect() {} });
  const list = nodes(tree).find(n => n.type === 'List');
  const buttons = steps.map((item, index) => list.props.renderItem({ item, index }));
  assert.deepEqual(buttons.map(b => b.props.disabled), [false, false, true]);
  const marks = buttons.map(b => flatten(b.props.children.props.style));
  assert.equal(new Set(marks.map(m => m.backgroundColor)).size, 3);
  assert.ok(marks[1].height > marks[0].height); assert.notEqual(marks[0].borderColor, marks[2].borderColor);
});
test('detail hides the reading affordance only when voice is disabled, without changing its instruction or actions', () => {
  const h = hookHarness(); let voice = false;
  const Content = load('components/user/activity-detail.tsx', {
    react: { ...h.react, useLayoutEffect: h.react.useEffect }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', StyleSheet: { create: x => x } }, 'expo-image': { Image: 'Image' },
    '@/components/app-text': { AppText: 'Text' }, '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.highContrastTheme },
    '@/theme/profile-appearance': { useEffectiveFontScale: () => 1, useProfileAppearance: () => ({ ...initial, lecturaVoz: voice }) },
    '@/components/carer/area-icon': { AreaIcon: 'Icon' }, '@/components/carer/continue-button': { ContinueButton: 'Button' },
    './content-speech-control': { ContentSpeechControl: 'SpeechControl' },
    '@/constants/activity-icons': { resolveActivityIcon: () => null }, '@/utils/activity-draft': { formatActivityTime: () => '7:00 a. m.' },
    '@/utils/user-agenda': { formatAgendaDate: () => 'Fecha real' }, '@/utils/user-activity': { eligibleForDirectCompletion: () => false },
  }).UserActivityDetailContent;
  const render = () => h.render(() => Content({ speech: { enabled: voice, speaking: false, error: false, repeat() {} }, detail: { fecha: '2026-10-31', actividad: { nombre: 'Desayunar', hora: '07:00', codigoIcono: null, estado: 'PENDIENTE', guiaInicialCompletada: false } } }));
  let tree = render(); assert.equal(nodes(tree).filter(n => n.type === 'SpeechControl').length, 0);
  assert.ok(nodes(tree).some(n => n.type === 'Text' && JSON.stringify(n.props.children).includes('Es hora de')));
  const actions = nodes(tree).filter(n => n.type === 'Button').map(n => n.props.label);
  voice = true; tree = render(); assert.equal(nodes(tree).filter(n => n.type === 'SpeechControl').length, 1);
  assert.deepEqual(nodes(tree).filter(n => n.type === 'Button').map(n => n.props.label), actions);
});
test('detail reading stays content-sized and bounded in every text size/theme; compact mode preserves repeat and the guide default', () => {
  const h = hookHarness(); let theme = tokens.themes.light, size = 'MEDIANO', name = 'Desayunar', repeats = 0;
  const shared = { 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Pressable: 'Pressable', StyleSheet: { create: x => x } },
    '@/components/app-text': { AppText: 'Text' }, '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => theme },
    '@/components/carer/area-icon': { AreaIcon: 'Icon' } };
  const Control = load('components/user/content-speech-control.tsx', shared).ContentSpeechControl;
  const Content = load('components/user/activity-detail.tsx', { ...shared,
    react: { ...h.react, useLayoutEffect: h.react.useEffect }, 'expo-image': { Image: 'Image' },
    '@/theme/profile-appearance': { useEffectiveFontScale: () => utils.textSizeFactors[size], useProfileAppearance: () => ({ ...initial, tamanoTexto: size }) },
    '@/components/carer/continue-button': { ContinueButton: 'Button' }, './content-speech-control': { ContentSpeechControl: 'SpeechControl' },
    '@/constants/activity-icons': { resolveActivityIcon: () => null }, '@/utils/activity-draft': { formatActivityTime: () => '7:00 a. m.' },
    '@/utils/user-agenda': { formatAgendaDate: () => 'Fecha real' }, '@/utils/user-activity': { eligibleForDirectCompletion: () => false },
  }).UserActivityDetailContent;
  const speech = { enabled: true, speaking: true, error: false, repeat: () => repeats++ };
  let geometry;
  for (theme of [tokens.themes.light, tokens.themes.dark, tokens.highContrastTheme]) for (size of ['PEQUENO', 'MEDIANO', 'GRANDE']) for (name of ['Desayunar', 'Estudiar', 'Actividad con un nombre considerablemente largo para comprobar el ajuste de texto']) {
    const tree = h.render(() => Content({ speech, detail: { fecha: '2026-10-31', actividad: { nombre: name, hora: '07:00', codigoIcono: null, estado: 'PENDIENTE', guiaInicialCompletada: false } } }));
    const message = nodes(tree).find(n => n.type === 'Text' && Array.isArray(n.props.children) && n.props.children[0] === 'Es hora de ');
    const row = nodes(tree).find(n => Array.isArray(n.props?.children) && n.props.children.includes(message));
    const style = flatten(row.props.style), textStyle = flatten(message.props.style);
    assert.equal(style.width, undefined); assert.equal(style.maxWidth, '100%'); assert.equal(style.alignSelf, 'center');
    assert.equal(textStyle.flexGrow, 0); assert.equal(textStyle.flexShrink, 1); assert.equal(textStyle.minWidth, 0);
    assert.equal(message.props.numberOfLines, undefined); assert.equal(message.props.adjustsFontSizeToFit, undefined); assert.equal(message.props.children[1], name);
    const { backgroundColor, ...shape } = style; geometry ??= shape; assert.deepEqual(shape, geometry);
    const control = nodes(tree).find(n => n.type === 'SpeechControl'); assert.equal(control.props.compact, true);
    const rendered = Control(control.props), button = nodes(rendered).find(n => n.type === 'Pressable');
    assert.equal(flatten(rendered.props.style).flexGrow, 0); assert.equal(flatten(button.props.style).width, tokens.sizes.touchTarget);
    assert.ok(flatten(button.props.style).minHeight >= tokens.sizes.touchTarget); assert.equal(button.props.onPress, speech.repeat);
    button.props.onPress();
  }
  assert.equal(repeats, 27);
  const normal = Control({ speech, label: 'Volver a escuchar este paso' });
  assert.equal(flatten(nodes(normal).find(n => n.type === 'Pressable').props.style).width, undefined);
});
test('contrast icon fills one half, and the user navigation theme/status bar use the effective palette with inherited fonts', () => {
  const Icon = load('components/carer/area-icon.tsx', { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native-svg': { default: 'Svg', Path: 'Path' }, '@/theme/tokens': tokens }).AreaIcon;
  const icon = Icon({ name: 'contrast', color: '#6552B7' });
  assert.equal(nodes(icon).filter(n => n.type === 'Path' && n.props.fill === '#6552B7').length, 1);
  const h = hookHarness(), fonts = { regular: { fontFamily: 'Nunito' } };
  const Layout = load('app/(usuario-autenticado)/_layout.tsx', {
    react: h.react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-router': { Stack: 'Stack', ThemeProvider: 'NavigationTheme', DarkTheme: { colors: {} }, DefaultTheme: { colors: {} }, useTheme: () => ({ fonts }) },
    'react-native': { View: 'View', StyleSheet: { create: x => x } }, 'react-native-safe-area-context': { SafeAreaView: 'Safe' },
    '@/context/device-access': { useDeviceAccess: () => ({ profile: { idPerfilUsuario: 12 } }) }, '@/services/device-access': { deviceAccess: { revision: () => 1 } },
    '@/context/user-accessibility': { UserAccessibilityProvider: 'Preferences', useRefreshAccessibility: () => () => {} },
    '@/components/user/area-navigation': { UserAreaNavigation: 'Navigation' }, '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.highContrastTheme },
  }).default;
  const area = Layout().props.children.type; const tree = h.render(area);
  assert.equal(tree.props.value.fonts, fonts); assert.equal(tree.props.value.colors.background, tokens.derivedColors.dark.background);
  assert.equal(nodes(tree).find(n => n.type === 'StatusBar').props.style, 'light');
});
