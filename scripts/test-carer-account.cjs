const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), test = require('node:test'), ts = require('typescript');
const jsx = (type, props, key) => ({ type, props, key });
function load(file, modules = {}) {
  const out = {};
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(id => { assert.ok(id in modules, 'Missing adapter ' + id); return modules[id]; }, out);
  return out;
}
const tokens = load('theme/tokens.ts'), utils = load('utils/accessibility.ts');
const { AccessibilityEditor } = load('services/accessibility-editor.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const defaults = { tamanoTexto: 'MEDIANO', altoContraste: false };
const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : [];
const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const rn = { View: 'View', ScrollView: 'Scroll', Pressable: 'Pressable', Switch: 'Switch', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x, flatten } };
const styling = { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': rn, '@/components/app-text': { AppText: 'Text' },
  '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.themes.light }, '@/components/carer/area-icon': { AreaIcon: 'Icon' } };
function harness() {
  let cursor = 0, jobs = [], changes = 0; const slots = [];
  const react = {
    createContext: value => ({ Provider: 'Context', value }), useContext: c => c.value,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { changes++; slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useCallback: (fn, deps) => react.useMemo(() => fn, deps),
    useSyncExternalStore: (_, snapshot) => snapshot(),
    useEffect: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) {
      const old = slots[i]; slots[i] = { deps }; jobs.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); });
    } },
  };
  return { react, render: fn => { cursor = 0; const result = fn(); const run = jobs; jobs = []; run.forEach(fn => fn()); return result; },
    unmount: () => slots.forEach(s => s?.cleanup?.()), changes: () => changes };
}
test('account DTO and HTTP use only two fields and the principal-scoped account endpoint', async () => {
  assert.deepEqual(utils.parseCarerAccessibility({ ...defaults, lecturaVoz: true }), defaults);
  for (const raw of [null, {}, { ...defaults, tamanoTexto: 20 }, { ...defaults, altoContraste: null }]) assert.throws(() => utils.parseCarerAccessibility(raw));
  const calls = [], client = Object.fromEntries(['get', 'patch', 'post'].map(method => [method, async (...args) => { calls.push([method, ...args]); return { data: defaults }; }]));
  const api = load('services/carer-accessibility.ts', { './private-http': { getAuthenticatedHttpClient: () => client }, '@/utils/accessibility': utils });
  await api.getCarerAccessibility(); await api.patchCarerAccessibility({ altoContraste: true }); await api.resetCarerAccessibility();
  assert.deepEqual(calls.map(c => c.slice(0, 2)), [['get', '/api/cuidador/accesibilidad'], ['patch', '/api/cuidador/accesibilidad'], ['post', '/api/cuidador/accesibilidad/restablecer']]);
  assert.deepEqual(calls[1][2], { altoContraste: true }); assert.equal(calls[1][3].authReplaySafe, true);
});
test('appearance scopes share scale/theme without giving caregiver a voice preference or overriding Usuario data', () => {
  const react = { createContext: value => ({ value }), useContext: c => c.value };
  const appearance = load('theme/profile-appearance.ts', { react, 'react-native': { useWindowDimensions: () => ({ fontScale: 2 }) }, '@/utils/accessibility': utils });
  assert.equal(appearance.useAppearance(), null);
  appearance.AppearanceContext.value = { tamanoTexto: 'GRANDE', altoContraste: true };
  assert.equal(appearance.useEffectiveFontScale(), 2.5); assert.equal(appearance.useProfileAppearance(), null);
  const theme = load('theme/use-theme.ts', { 'react-native': { useColorScheme: () => 'light' }, './tokens': tokens, './profile-appearance': appearance });
  assert.equal(theme.useAppTheme(), tokens.highContrastTheme);
  const profile = { tamanoTexto: 'PEQUENO', altoContraste: false, lecturaVoz: true };
  appearance.ProfileAppearanceContext.value = profile;
  assert.equal(appearance.useProfileAppearance(), profile); assert.equal(appearance.useEffectiveFontScale(), 1.8);
  assert.equal(theme.useAppTheme(), tokens.themes.light);
  appearance.ProfileAppearanceContext.value = null; appearance.AppearanceContext.value = null;
  assert.equal(theme.useAppTheme(), tokens.themes.light);
});
test('text input applies the same semantic scale, preserves callbacks/ref and keeps native scaling uncapped', () => {
  const change = () => {}, ref = {};
  const Input = load('components/app-text-input.tsx', { react: { forwardRef: fn => fn }, 'react/jsx-runtime': { jsx },
    'react-native': { TextInput: 'Input', StyleSheet: { flatten } }, '@/theme/profile-appearance': { useAppearance: () => ({ ...defaults, tamanoTexto: 'GRANDE' }) }, '@/utils/accessibility': utils }).AppTextInput;
  const tree = Input({ value: 'Draft', onChangeText: change, style: { fontSize: 16, lineHeight: 24 }, multiline: true }, ref);
  assert.deepEqual(flatten(tree.props.style), { fontSize: 20, lineHeight: 30 }); assert.equal(tree.props.onChangeText, change); assert.equal(tree.props.ref, ref);
  assert.equal(tree.props.maxFontSizeMultiplier, undefined); assert.equal(tree.props.allowFontScaling, undefined);
});
test('generic autosave retains account optimism, reconciles unknown results without replay and reset has no profile/voice fields', async () => {
  let value = defaults, reads = 0, writes = 0, failRead = false;
  const editor = new AccessibilityEditor({ revision: () => 1, get: async () => { reads++; if (failRead) throw Error(); return value; },
    patch: async patch => { writes++; value = { ...value, ...patch }; throw Error(); }, reset: async () => defaults }, 'cuenta');
  editor.enter(); await tick(); await editor.change({ altoContraste: true });
  assert.equal(writes, 1); assert.equal(reads, 2); assert.equal(editor.getSnapshot().value.altoContraste, true);
  assert.ok(editor.getSnapshot().message.includes('cuenta'));
  failRead = true; await editor.change({ tamanoTexto: 'GRANDE' }); assert.equal(editor.getSnapshot().uncertain, true);
  assert.equal(editor.getSnapshot().value.tamanoTexto, 'GRANDE'); await editor.reset(); assert.equal(editor.getSnapshot().uncertain, true);
  failRead = false; await editor.load(); await editor.reset(); assert.deepEqual(editor.getSnapshot().value, defaults);
  assert.equal('lecturaVoz' in editor.getSnapshot().value, false);
});
test('account provider deduplicates refresh, keeps children mounted on optimistic save/errors and discards late session responses', async () => {
  const h = harness(), reads = [], writes = []; let foreground, revision = 1, owner = 3;
  const manager = { revision: () => revision }, session = () => ({ manager, caregiver: { idCuidador: owner } });
  const Provider = load('context/carer-accessibility.tsx', { ...styling, react: h.react,
    'react-native': { ...rn, AppState: { addEventListener: (_, fn) => { foreground = fn; return { remove() {} }; } } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24 }) }, '@/context/session': { useSession: session },
    '@/services/accessibility-editor': { AccessibilityEditor }, '@/services/carer-accessibility': {
      getCarerAccessibility: signal => { const d = deferred(); reads.push({ ...d, signal }); return d.promise; },
      patchCarerAccessibility: (value, signal) => { const d = deferred(); writes.push({ ...d, value, signal }); return d.promise; }, resetCarerAccessibility: async () => defaults,
    }, '@/theme/profile-appearance': { AppearanceContext: { Provider: 'Appearance' } }, '@/components/carer/continue-button': { ContinueButton: 'Button' }, '@/components/carer/logout-dialog': { LogoutDialog: 'Logout' },
  }).CarerAccessibilityProvider;
  const child = { type: 'Form', props: { draft: 'unchanged' } }, outer = Provider({ children: child });
  const render = () => h.render(() => outer.type(outer.props));
  let tree = render(); assert.equal(reads.length, 1); tree.props.value.refresh(); foreground('active'); assert.equal(reads.length, 1);
  reads[0].resolve(defaults); await tick(); tree = render();
  const editor = tree.props.value.editor; assert.deepEqual(tree.props.children.props.value, defaults);
  assert.equal(tree.props.children.props.children.props.children, child);
  const saving = editor.change({ altoContraste: true }); tree = render(); assert.equal(writes.length, 1); assert.equal(tree.props.children.props.value.altoContraste, true);
  assert.equal(tree.props.children.props.children.props.children, child); tree.props.value.refresh(); assert.equal(reads.length, 1);
  writes[0].resolve({ ...defaults, altoContraste: true }); await saving; tree = render(); assert.equal(tree.props.value.editor, editor);
  foreground('active'); foreground('active'); assert.equal(reads.length, 2); reads[1].reject(Error()); await tick(); tree = render();
  assert.equal(tree.props.children.props.value.altoContraste, true); assert.equal(tree.props.children.props.children.props.children, child);
  tree.props.value.refresh(); assert.equal(reads.length, 3); const previous = editor.getSnapshot(); revision++; owner = 9;
  assert.notEqual(Provider({ children: child }).key, outer.key); h.unmount(); assert.equal(reads[2].signal.aborted, true);
  reads[2].resolve(defaults); await tick(); assert.equal(editor.getSnapshot(), previous);
});
test('Mi perfil shows real identity, a disabled information option, one confirmed logout entry and no editing', () => {
  const h = harness(), paths = []; const caregiver = { idCuidador: 3, nombre: 'Nombre real', avatarId: 'person-01' };
  const Screen = load('app/(cuidador-autenticado)/(principal)/mi-perfil/index.tsx', { ...styling, react: h.react, 'expo-router': { router: { push: path => paths.push(path) } },
    'react-native': { ...rn, AccessibilityInfo: { setAccessibilityFocus() {} }, findNodeHandle: () => null },
    '@/context/session': { useSession: () => ({ caregiver }) }, '@/components/carer/account-avatar': { AccountAvatar: 'Avatar' }, '@/components/carer/logout-dialog': { LogoutDialog: 'Logout' } }).default;
  const render = () => h.render(Screen); let tree = render(); const avatar = nodes(tree).find(n => n.type === 'Avatar');
  assert.equal(avatar.props.name, caregiver.nombre); assert.equal(avatar.props.avatarId, caregiver.avatarId);
  const buttons = nodes(tree).filter(n => n.type === 'Pressable'); assert.equal(buttons.length, 3);
  assert.equal(buttons[1].props.disabled, true); assert.equal(buttons[1].props.onPress, undefined);
  assert.ok(!nodes(buttons[1]).some(n => n.type === 'Icon' && n.props.name === 'chevron'));
  buttons[0].props.onPress(); assert.deepEqual(paths, ['/mi-perfil/accesibilidad']);
  assert.ok(!nodes(buttons[2]).some(n => n.type === 'Icon' && n.props.name === 'chevron'));
  buttons[2].props.onPress(); tree = render(); assert.equal(nodes(tree).filter(n => n.type === 'Logout').length, 1);
  nodes(tree).find(n => n.type === 'Logout').props.onClose(); assert.equal(nodes(render()).filter(n => n.type === 'Logout').length, 0);
  assert.ok(!nodes(tree).some(n => n.type === 'Icon' && ['pencil', 'camera'].includes(n.props.name)));
});
test('account accessibility contains two controls, autosaves only its values and requires confirmation for reset', () => {
  const h = harness(), calls = []; const state = { value: defaults, busy: false, uncertain: false };
  const Screen = load('app/(cuidador-autenticado)/(principal)/mi-perfil/accesibilidad.tsx', { ...styling, react: h.react,
    '@/context/carer-accessibility': { useCarerAccessibility: () => ({ state, editor: { change: value => calls.push(value), reset: () => calls.push('reset') } }) },
    '@/components/accessibility/text-size-selector': { TextSizeSelector: 'Selector' }, '@/components/carer/activity-dialog': { ActivityDialog: 'Dialog' }, '@/components/carer/step-dialog-actions': { StepDialogActions: 'Actions' } }).default;
  const render = () => h.render(Screen); let tree = render();
  const selector = nodes(tree).find(n => n.type === 'Selector'); selector.props.onChange('GRANDE');
  const switches = nodes(tree).filter(n => n.type === 'Switch'); assert.equal(switches.length, 1); switches[0].props.onValueChange(true);
  assert.deepEqual(calls, [{ tamanoTexto: 'GRANDE' }, { altoContraste: true }]);
  nodes(tree).find(n => n.props?.accessibilityLabel === 'Restablecer ajustes').props.onPress(); tree = render();
  nodes(tree).find(n => n.type === 'Actions').props.onCancel(); assert.equal(calls.length, 2);
  nodes(render()).find(n => n.props?.accessibilityLabel === 'Restablecer ajustes').props.onPress();
  nodes(render()).find(n => n.type === 'Actions').props.onConfirm(); assert.equal(calls.at(-1), 'reset');
  state.busy = true; tree = render(); assert.equal(nodes(tree).find(n => n.type === 'Selector').props.disabled, true);
  assert.equal(nodes(tree).find(n => n.type === 'Switch').props.disabled, false);
  nodes(tree).find(n => n.type === 'Switch').props.onValueChange(false); assert.equal(calls.length, 3);
});
test('logout dialog calls the existing manager once, cancellation has no effect and late completion does not update unmounted UI', async () => {
  const h = harness(), d = deferred(); let calls = 0, closed = 0;
  const Dialog = load('components/carer/logout-dialog.tsx', { ...styling, react: h.react, '@/context/session': { useSession: () => ({ manager: { logout: () => { calls++; return d.promise; } } }) },
    './account-layout': { accountStyles: { small: {} } }, './activity-dialog': { ActivityDialog: 'Dialog' }, './step-dialog-actions': { StepDialogActions: 'Actions' } }).LogoutDialog;
  const render = () => h.render(() => Dialog({ onClose: () => closed++ })); let tree = render();
  const actions = nodes(tree).find(n => n.type === 'Actions'); actions.props.onCancel(); assert.equal(closed, 1); assert.equal(calls, 0);
  actions.props.onConfirm(); actions.props.onConfirm(); assert.equal(calls, 1); actions.props.onCancel(); assert.equal(closed, 1);
  h.unmount(); const before = h.changes(); d.resolve(); await tick(); assert.equal(h.changes(), before);
});
test('caregiver navigation selects Mi perfil for its settings and leaves Apoyo and Notificacion disabled', () => {
  const destinations = load('constants/carer-navigation.ts');
  const Navigation = load('components/carer/area-navigation.tsx', { ...styling,
    'expo-router': { usePathname: () => '/mi-perfil/accesibilidad', router: {} }, '@/constants/carer-navigation': destinations,
    '@/context/session': { useSession: () => ({ caregiver: {} }) }, '@/utils/profile-navigation': { isProfilesDestination: path => path.startsWith('/perfiles') },
    '@/components/bottom-navigation': { BottomNavigation: 'Navigation' }, './account-avatar': { AccountAvatar: 'Avatar' }, './area-icon': { AreaIcon: 'Icon' } }).AreaNavigation;
  const items = Navigation().props.items; assert.deepEqual(items.filter(i => i.selected).map(i => i.id), ['account']);
  assert.equal(items.find(i => i.id === 'support').onPress, undefined); assert.equal(items.find(i => i.id === 'notifications').onPress, undefined);
});
