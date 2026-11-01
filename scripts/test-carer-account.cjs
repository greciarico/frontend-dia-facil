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
const informationData = load('constants/accessibility-information.ts');
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
test('Mi perfil shows real identity, opens accessibility information, and keeps one confirmed logout entry without editing', () => {
  const h = harness(), paths = []; const caregiver = { idCuidador: 3, nombre: 'Nombre real', avatarId: 'person-01' };
  const Screen = load('app/(cuidador-autenticado)/(principal)/mi-perfil/index.tsx', { ...styling, react: h.react, 'expo-router': { router: { push: path => paths.push(path) } },
    'react-native': { ...rn, AccessibilityInfo: { setAccessibilityFocus() {} }, findNodeHandle: () => null },
    '@/context/session': { useSession: () => ({ caregiver }) }, '@/components/carer/account-avatar': { AccountAvatar: 'Avatar' }, '@/components/carer/logout-dialog': { LogoutDialog: 'Logout' } }).default;
  const render = () => h.render(Screen); let tree = render(); const avatar = nodes(tree).find(n => n.type === 'Avatar');
  assert.equal(avatar.props.name, caregiver.nombre); assert.equal(avatar.props.avatarId, caregiver.avatarId);
  const buttons = nodes(tree).filter(n => n.type === 'Pressable'); assert.equal(buttons.length, 3);
  assert.notEqual(buttons[1].props.disabled, true);
  assert.ok(nodes(buttons[1]).some(n => n.type === 'Icon' && n.props.name === 'chevron'));
  buttons[0].props.onPress(); assert.deepEqual(paths, ['/mi-perfil/accesibilidad']);
  buttons[1].props.onPress(); assert.equal(paths.at(-1), '/mi-perfil/accesibilidad-diafacil');
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

function informationFixture(theme = tokens.themes.light) {
  const h = harness(), focus = [];
  const components = load('components/carer/accessibility-information.tsx', { ...styling, react: h.react,
    'react-native': { ...rn, AccessibilityInfo: { setAccessibilityFocus: value => focus.push(value) }, findNodeHandle: node => node?.handle ?? null },
    'expo-image': { Image: 'Image' }, '@/theme/use-theme': { useAppTheme: () => theme },
    '@/constants/accessibility-information': informationData, '@/constants/activity-icons': { resolveActivityIcon: code => 'local:' + code },
    '@/assets/illustrations/user-account.png': 'existing-user-account',
    '@/utils/activity-icon-surface': load('utils/activity-icon-surface.ts', { '@/theme/tokens': tokens }),
    './activity-dialog': { ActivityDialog: 'Dialog' }, './area-icon': { AreaIcon: 'Icon' }, './continue-button': { ContinueButton: 'Button' },
    './accessibility-capability-demo': { AccessibilityCapabilityDemo: 'Demo' },
    './accessibility-media': { AccessibilityMediaCarousel: 'Media' },
    '@/assets/accessibility/images/visual-communication.webp': 'editorial-photo',
  });
  return { h, components, focus };
}

test('accessibility information distinguishes activity icons, step pictograms and the planned support feature', () => {
  const capabilities = informationData.accessibilityCapabilities;
  assert.deepEqual(capabilities.map(c => c.id), ['visual', 'steps', 'voice', 'text', 'contrast', 'help']);
  assert.deepEqual(capabilities.filter(c => c.planned).map(c => c.id), ['help']);
  assert.match(capabilities[0].description, /iconos.*actividades.*pictogramas.*pasos/);
  assert.match(capabilities[2].benefits.join(' '), /No incluye lectura de voz en el área del Cuidador/);
  assert.match(capabilities[5].description, /prevista.*próximo incremento/);
  assert.match(capabilities[5].benefits.join(' '), /todavía no están disponibles/);
  assert.equal(capabilities[5].title, 'Solicitar ayuda');
  assert.equal(capabilities[5].summary, 'Permite que la persona usuaria te avise cuando necesita ayuda durante una actividad.');
  assert.match(capabilities[5].description, /Podrás saber en qué actividad y paso/);
});

test('information preserves its hero, orders local media and editorial photo, suspends video for details and keeps six accessible dialogs', () => {
  for (const theme of [tokens.themes.light, tokens.highContrastTheme]) {
    const { h, components } = informationFixture(theme);
    const page = h.render(components.AccessibilityInformation);
    assert.equal(nodes(page).find(n => n.type === 'Image').props.source, 'existing-user-account');
    assert.ok(nodes(page).some(n => n.type === components.AccessibilityCapabilitiesCarousel));
    const contents = nodes(page), media = contents.find(n => n.type === 'Media');
    const capabilities = contents.find(n => n.type === components.AccessibilityCapabilitiesCarousel);
    const photo = contents.find(n => n.type === 'Image' && n.props.source === 'editorial-photo');
    assert.ok(contents.indexOf(media) < contents.indexOf(capabilities) && contents.indexOf(capabilities) < contents.indexOf(photo));
    assert.equal(photo.props.contentFit, 'contain'); assert.equal(flatten(photo.props.style).aspectRatio, 1949 / 704);
    assert.equal(photo.props.onPress, undefined); assert.ok(photo.props.accessibilityLabel);
    assert.equal(media.props.blocked, false); capabilities.props.onDetailVisibilityChange(true);
    assert.equal(nodes(h.render(components.AccessibilityInformation)).find(n => n.type === 'Media').props.blocked, true);
    capabilities.props.onDetailVisibilityChange(false);
    assert.equal(nodes(h.render(components.AccessibilityInformation)).find(n => n.type === 'Media').props.blocked, false);
    for (const capability of informationData.accessibilityCapabilities) {
      let closed = 0;
      const dialog = components.CapabilityInformationDialog({ capability, onClose: () => closed++ });
      assert.equal(nodes(dialog).find(n => n.type === 'Demo').props.animateText, undefined);
      assert.equal(dialog.type, 'Dialog'); assert.equal(dialog.props.showClose, true); assert.equal(dialog.props.respectSafeArea, true);
      dialog.props.onClose(); nodes(dialog).find(n => n.type === 'Button').props.onPress(); assert.equal(closed, 2);
      assert.equal(nodes(dialog).find(n => n.type === 'Button').props.label, 'Entendido');
      assert.equal(nodes(dialog).filter(n => n.props?.children === 'Próximamente').length, capability.planned ? 1 : 0);
      for (const size of ['PEQUENO', 'MEDIANO', 'GRANDE']) for (const text of nodes(dialog).filter(n => n.type === 'Text')) {
        assert.equal(text.props.numberOfLines, undefined); assert.equal(text.props.adjustsFontSizeToFit, undefined);
        const style = flatten(text.props.style); assert.equal(style.height, undefined);
        assert.ok(utils.profileTextStyle(style, size).fontSize > 0);
      }
    }
  }
});

test('capability carousel supports buttons, swipe, rotation and modal return without resetting its position or losing focus', () => {
  const { h, components, focus } = informationFixture(), scrolls = [];
  const render = () => h.render(components.AccessibilityCapabilitiesCarousel);
  let tree = render(); tree.props.onLayout({ nativeEvent: { layout: { width: 360 } } }); tree = render();
  let scroll = nodes(tree).find(n => n.type === 'Scroll'); scroll.props.ref.current = { scrollTo: value => scrolls.push(value) };
  const buttons = () => nodes(tree).filter(n => n.type === 'Pressable');
  assert.equal(buttons()[0].props.disabled, true); buttons()[1].props.onPress(); tree = render();
  assert.equal(nodes(tree).find(n => n.props?.accessibilityLiveRegion === 'polite').props.children[0], 2);
  assert.deepEqual(scrolls.at(-1), { x: 344, animated: false });
  tree.props.onLayout({ nativeEvent: { layout: { width: 440 } } }); tree = render();
  assert.deepEqual(scrolls.at(-1), { x: 424, animated: false });
  const cards = nodes(tree).filter(n => n.props?.capability && n.props?.onOpen);
  assert.equal(cards.length, 6); assert.equal(cards[1].props.width, 408);
  cards[1].props.triggerRef({ handle: 42 }); cards[1].props.onOpen(); tree = render();
  const detail = nodes(tree).find(n => n.type === components.CapabilityInformationDialog);
  assert.equal(detail.props.capability.id, 'steps'); detail.props.onClose(); tree = render();
  assert.deepEqual(focus, [42]); assert.ok(!nodes(tree).some(n => n.type === components.CapabilityInformationDialog));
  assert.equal(nodes(tree).find(n => n.props?.accessibilityLiveRegion === 'polite').props.children[0], 2);
  nodes(tree).find(n => n.type === 'Scroll').props.onScroll({ nativeEvent: { contentOffset: { x: 2120 } } }); tree = render();
  assert.equal(buttons()[1].props.disabled, true); assert.equal(nodes(tree).find(n => n.props?.accessibilityLiveRegion === 'polite').props.children[0], 6);
  assert.ok(scrolls.every(s => s.animated === false)); h.unmount();
});

test('all six cards preserve the agenda family surfaces in high contrast, including the repeated sixth family', () => {
  const families = load('utils/activity-icon-surface.ts', { '@/theme/tokens': tokens });
  for (const theme of [tokens.themes.light, tokens.highContrastTheme]) {
    const { h, components } = informationFixture(theme);
    let tree = h.render(components.AccessibilityCapabilitiesCarousel);
    tree.props.onLayout({ nativeEvent: { layout: { width: 360 } } }); tree = h.render(components.AccessibilityCapabilitiesCarousel);
    const cards = nodes(tree).filter(n => n.props?.capability && n.props?.onOpen);
    for (const [index, card] of cards.entries()) {
      const rendered = card.type(card.props), expected = families.getActivityVisualFamily(index, theme.highContrast);
      assert.equal(flatten(rendered.props.style).backgroundColor, expected.light);
      assert.equal(flatten(rendered.props.style).borderColor, expected.stroke);
      const scene = nodes(rendered).find(n => n.props?.children?.type === 'Demo');
      assert.equal(flatten(scene.props.style).backgroundColor, expected.hover);
      assert.equal(scene.props.children.props.active, index === 0);
      assert.equal(scene.props.children.props.animateText, index === 0);
      if (index === 5) assert.ok(nodes(rendered).some(n => n.props?.children === 'Próximamente'));
    }
    assert.equal(families.getActivityVisualFamily(0, theme.highContrast).light, families.getActivityVisualFamily(5, theme.highContrast).light);
  }
});

test('compact demonstrations preserve horizontal flow, approved pictograms and scalable text in both themes', () => {
  for (const theme of [tokens.themes.light, tokens.highContrastTheme]) for (const size of ['PEQUENO', 'MEDIANO', 'GRANDE']) {
    const h = harness();
    const Demo = load('components/carer/accessibility-capability-demo.tsx', { ...styling, react: h.react,
      'expo-image': { Image: 'Image' }, '@/theme/use-theme': { useAppTheme: () => theme },
      '@/constants/activity-icons': { resolveActivityIcon: code => 'activity:' + code },
      '@/theme/profile-appearance': { useEffectiveFontScale: () => utils.textSizeFactors[size] },
      './area-icon': { AreaIcon: 'Icon' }, './accessibility-voice-waves': { AccessibilityVoiceWaves: 'Waves' },
      './step-pictogram': { StepPictogramImage: 'Pictogram' },
      './accessibility-text-sample': { AccessibilityTextSample: 'TextSample' },
      '@/assets/illustrations/im-user.png': 'local-user', '@/assets/illustrations/im-carer.png': 'local-carer',
    }).AccessibilityCapabilityDemo;
    for (const capability of informationData.accessibilityCapabilities) {
      const render = () => h.render(() => Demo({ capability, active: true }));
      let tree = render(); tree.props.onLayout({ nativeEvent: { layout: { width: 200 } } }); tree = render();
      assert.equal(tree.props.importantForAccessibility, 'no-hide-descendants');
      assert.ok(!nodes(tree).some(n => n.props?.onPress || n.props?.numberOfLines || n.props?.adjustsFontSizeToFit));
      for (const text of nodes(tree).filter(n => n.type === 'Text')) {
        const style = flatten(text.props.style); assert.equal(style.height, undefined);
        assert.ok(utils.profileTextStyle(style, size).fontSize > 0);
      }
      const images = nodes(tree).filter(n => n.type === 'Image'); assert.ok(images.every(n => n.props.contentFit === 'contain'));
      if (capability.id === 'visual') {
        assert.deepEqual(images.map(n => n.props.source), ['activity:bread', 'activity:open-book', 'activity:run']);
        assert.equal(nodes(tree).filter(n => n.type === 'Pictogram').length, 0);
        assert.ok(!nodes(tree).some(n => n.type === 'Icon' && n.props.name === 'send'));
        assert.equal(nodes(tree).filter(n => n.type === 'Text').length, 0);
      }
      if (capability.id === 'steps') {
        assert.equal(images.length, 0);
        assert.deepEqual(nodes(tree).filter(n => n.type === 'Text').map(n => n.props.children), ['1', '2']);
        assert.equal(nodes(tree).filter(n => n.type === 'Icon' && n.props.name === 'send').length, 1);
      }
      if (['visual', 'steps', 'help'].includes(capability.id)) assert.equal(flatten(tree.props.children.props.style).flexDirection, 'row');
      if (capability.id === 'steps') {
        const pictograms = nodes(tree).filter(n => n.type === 'Pictogram');
        assert.deepEqual(pictograms.map(n => n.props.pictogram.idArasaac), [2443, 5549]);
        assert.ok(pictograms.every(n => n.props.pictogram.urlImagen === `https://static.arasaac.org/pictograms/${n.props.pictogram.idArasaac}/${n.props.pictogram.idArasaac}_300.png`));
        assert.ok(pictograms.every(n => n.props.size <= tokens.layout.activities.iconSize));
      }
      if (capability.id === 'voice') assert.equal(nodes(tree).find(n => n.type === 'Waves').props.active, true);
      if (capability.id === 'text') {
        assert.equal(nodes(tree).find(n => n.type === 'TextSample').props.active, false); // Dialog/default stays static.
        const animated = h.render(() => Demo({ capability, active: true, animateText: true }));
        assert.equal(nodes(animated).find(n => n.type === 'TextSample').props.active, true);
      }
      if (capability.id === 'contrast') {
        assert.ok(nodes(tree).some(n => n.props?.children === 'Normal'));
        assert.ok(nodes(tree).some(n => n.props?.children === 'Alto contraste'));
        assert.ok(nodes(tree).some(n => flatten(n.props?.style).backgroundColor === tokens.themes.light.colors.background.primary));
        assert.ok(nodes(tree).some(n => flatten(n.props?.style).backgroundColor === tokens.highContrastTheme.colors.background.primary));
      }
      if (capability.id === 'help') assert.deepEqual(images.map(n => n.props.source), ['local-user', 'local-carer']);
    }
  }
});

function textSampleFixture({ theme = tokens.themes.light, reduced = false, answer = Promise.resolve(false) } = {}) {
  const h = harness(), events = new Map(), values = [], delays = [];
  let focused = true;
  const app = { currentState: 'active', addEventListener: (name, fn) => { events.set(name, fn); return { remove: () => events.delete(name) }; } };
  const Sample = load('components/carer/accessibility-text-sample.tsx', { ...styling, react: h.react,
    '@/theme/use-theme': { useAppTheme: () => theme }, 'expo-router': { useIsFocused: () => focused },
    'react-native': { ...rn, AppState: app, AccessibilityInfo: { isReduceMotionEnabled: () => answer,
      addEventListener: (name, fn) => { events.set(name, fn); return { remove: () => events.delete(name) }; } } },
    'react-native-reanimated': { __esModule: true, default: { createAnimatedComponent: component => component }, ReduceMotion: { System: 'system' }, useReducedMotion: () => reduced,
      useSharedValue: initial => h.react.useMemo(() => { const s = { value: initial, set: v => { s.value = v; }, get: () => s.value }; values.push(s); return s; }, []),
      cancelAnimation: () => {}, useAnimatedStyle: fn => fn(), withTiming: (to, config) => ({ to, config }),
      withSequence: (...sequence) => sequence, withDelay: (delay, sequence, reduceMotion) => { const run = { delay, sequence, reduceMotion }; delays.push(run); return run; } },
  }).AccessibilityTextSample;
  return { h, events, values, delays, app, focus: value => { focused = value; }, render: active => h.render(() => Sample({ active })) };
}

test('text sample pulses small then medium then large once, cancelling on exit, focus loss, background and reduced motion', async () => {
  const f = textSampleFixture(); f.render(false); await tick(); assert.equal(f.delays.length, 0);
  f.render(true); await tick(); assert.deepEqual(f.delays.map(v => v.delay), [0, 360, 720]);
  for (const run of f.delays) {
    assert.equal(run.reduceMotion, 'system'); assert.equal(run.sequence[0], 'system');
    assert.deepEqual(run.sequence.slice(1).map(v => v.to), [1.06, 1]);
    assert.ok(run.sequence.slice(1).every(v => v.config.duration === 180 && v.config.reduceMotion === 'system'));
  }
  f.render(true); await tick(); assert.equal(f.delays.length, 3);
  f.render(false); assert.ok(f.values.every(v => v.value === 1));
  f.render(true); await tick(); assert.equal(f.delays.length, 6); // Reentry is allowed.
  f.focus(false); f.render(true); assert.ok(f.values.every(v => v.value === 1));
  f.focus(true); f.render(true); await tick(); f.app.currentState = 'background'; f.events.get('change')('background');
  assert.ok(f.values.every(v => v.value === 1));
  f.events.get('reduceMotionChanged')(true); assert.ok(f.values.every(v => v.value === 1));
  f.h.unmount(); assert.equal(f.events.size, 0);
  const r = textSampleFixture({ reduced: true }); r.render(true); await tick(); assert.equal(r.delays.length, 0); r.h.unmount();
  for (const stop of ['unmount', 'reduction', 'background', 'hidden']) {
    const d = deferred(), late = textSampleFixture({ answer: d.promise }); late.render(true);
    if (stop === 'unmount') late.h.unmount();
    if (stop === 'hidden') late.render(false);
    if (stop === 'reduction') late.events.get('reduceMotionChanged')(true);
    if (stop === 'background') late.events.get('change')('background');
    d.resolve(false); await tick(); assert.equal(late.delays.length, 0); assert.ok(late.values.every(v => v.value === 1)); late.h.unmount();
  }
});

test('text sample keeps the same layout and typography while transforming in every size and theme', async () => {
  for (const theme of [tokens.themes.light, tokens.highContrastTheme]) for (const size of ['PEQUENO', 'MEDIANO', 'GRANDE']) {
    const f = textSampleFixture({ theme }); const before = f.render(false);
    const shape = tree => ({ row: flatten(tree.props.style), text: nodes(tree).filter(n => n.type === 'Text').map(n => {
      const { transform, ...style } = flatten(n.props.style);
      assert.deepEqual(Object.keys(transform[0]), ['scale']); assert.equal(style.height, undefined); assert.equal(style.width, undefined);
      return { ...style, ...utils.profileTextStyle(style, size) };
    }) });
    const expected = shape(before); f.render(true); await tick(); assert.deepEqual(shape(f.render(true)), expected);
    assert.equal(expected.text.length, 3); assert.ok(expected.text[0].fontSize < expected.text[1].fontSize && expected.text[1].fontSize < expected.text[2].fontSize);
    f.h.unmount();
  }
});

test('decorative voice waves animate once and cancel on visibility, focus, background, reduced motion and stale accessibility answers', async () => {
  function fixture({ reduced = false, answer = Promise.resolve(false) } = {}) {
    const h = harness(), events = new Map(), sequence = [], cancelled = [], shared = [];
    let focused = true;
    const app = { currentState: 'active', addEventListener: (name, fn) => { events.set(name, fn); return { remove: () => events.delete(name) }; } };
    const Waves = load('components/carer/accessibility-voice-waves.tsx', { ...styling, react: h.react,
      'react-native': { ...rn, AppState: app, AccessibilityInfo: { isReduceMotionEnabled: () => answer,
        addEventListener: (name, fn) => { events.set(name, fn); return { remove: () => events.delete(name) }; } } },
      'expo-router': { useIsFocused: () => focused },
      'react-native-reanimated': { default: { View: 'AnimatedView' }, ReduceMotion: { System: 'system' }, useReducedMotion: () => reduced,
        useSharedValue: value => h.react.useMemo(() => { const s = { value, set: v => { s.value = v; }, get: () => s.value }; shared.push(s); return s; }, []),
        cancelAnimation: value => cancelled.push(value), useAnimatedStyle: fn => fn(),
        withTiming: (value, config) => ({ value, config }), withSequence: (...values) => { sequence.push(values); return values; } },
    }).AccessibilityVoiceWaves;
    return { h, events, app, sequence, cancelled, shared, focus: value => { focused = value; }, render: active => h.render(() => Waves({ active })) };
  }
  const f = fixture(); f.render(false); await tick(); assert.equal(f.sequence.length, 0);
  f.render(true); await tick(); assert.equal(f.sequence.length, 1);
  assert.equal(f.sequence[0].length, 3); assert.ok(f.sequence[0].slice(1).every(v => v.config.reduceMotion === 'system'));
  f.render(true); await tick(); assert.equal(f.sequence.length, 1);
  f.events.get('change')('background'); assert.equal(f.shared[0].value, 1);
  f.focus(false); f.render(true); await tick(); assert.equal(f.sequence.length, 1);
  f.focus(true); f.render(true); await tick(); assert.equal(f.sequence.length, 2);
  f.events.get('reduceMotionChanged')(true); assert.equal(f.shared[0].value, 1);
  f.render(false); await tick(); assert.equal(f.sequence.length, 2);
  f.h.unmount(); assert.equal(f.events.size, 0); assert.ok(f.cancelled.length > 0);
  const r = fixture({ reduced: true }); r.render(true); await tick(); assert.equal(r.sequence.length, 0); r.h.unmount();
  for (const stop of ['unmount', 'reduction', 'background']) {
    const d = deferred(), late = fixture({ answer: d.promise }); late.render(true);
    if (stop === 'unmount') late.h.unmount();
    if (stop === 'reduction') late.events.get('reduceMotionChanged')(true);
    if (stop === 'background') late.events.get('change')('background');
    d.resolve(false); await tick(); assert.equal(late.sequence.length, 0); late.h.unmount();
  }
});

test('approved informational pictograms reuse disk cache and fall back safely after an image failure', () => {
  for (const idArasaac of [2443, 5549]) {
    const h = harness();
    const Pictogram = load('components/carer/step-pictogram.tsx', { ...styling, react: h.react,
      'expo-image': { Image: 'Image' }, 'expo-router': { Link: 'Link' },
      './account-layout': { accountStyles: { small: {} } }, './area-icon': { AreaIcon: 'Icon' },
    }).StepPictogramImage;
    const pictogram = { idArasaac, fuente: 'ARASAAC', nombre: 'Ejemplo aprobado', urlImagen: `https://static.arasaac.org/pictograms/${idArasaac}/${idArasaac}_300.png` };
    const render = () => h.render(() => Pictogram({ pictogram, size: 48 }));
    const tree = render(), image = nodes(tree).find(n => n.type === 'Image');
    assert.equal(image.props.source.uri, pictogram.urlImagen); assert.equal(image.props.contentFit, 'contain');
    assert.equal(image.props.cachePolicy, 'disk'); image.props.onError();
    const failed = render(); assert.ok(!nodes(failed).some(n => n.type === 'Image'));
    assert.ok(nodes(failed).some(n => n.props?.accessibilityLabel === 'Pictograma no disponible'));
    assert.equal(flatten(tree.props.style).height, flatten(failed.props.style).height);
    h.unmount();
  }
});
