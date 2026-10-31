const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
function load(file, modules = {}, timers = {}) {
  const exports = {};
  const defaults = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { StyleSheet: { create: x => x }, Text: 'Text', View: 'View', Pressable: 'Pressable',
      ActivityIndicator: 'Spinner', FlatList: 'List', Modal: 'Modal', ScrollView: 'Scroll', TextInput: 'Input',
      KeyboardAvoidingView: 'Keyboard', Platform: { OS: 'android' }, useWindowDimensions: () => ({ width: 360 }),
      findNodeHandle: () => null },
    'expo-image': { Image: 'Image' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    ...modules,
  };
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText)(id => { assert.ok(id in defaults, `Missing adapter ${id}`); return defaults[id]; }, exports,
    timers.setTimeout || setTimeout, timers.clearTimeout || clearTimeout);
  return exports;
}
const options = load('utils/activity-icon-options.ts');
const draftUtils = load('utils/activity-draft.ts');
const createUtils = load('utils/create-activity.ts', { './activity-draft': draftUtils,
  './activity-icon-options': load('utils/activity-icon-options.ts') });
test('approved Desayunar template populates all five image references without any per-step lookup', () => {
  const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../../backend_dia_facil/src/main/resources/db/datos-base.json'), 'utf8'));
  const template = source.plantillas[0];
  const byReference = new Map(source.pictogramas.map(p => [`arasaac:${p.idArasaac}`, p]));
  const response = { plantilla: { idPlantillaActividad: 90, nombre: template.nombre,
    pasos: template.pasos.map((step, index) => {
      const pictogram = byReference.get(step.pictograma);
      return { orden: step.orden, descripcion: step.descripcion, pictograma: { idPictograma: index + 100,
        nombre: pictogram.nombre, fuente: pictogram.fuente, idArasaac: pictogram.idArasaac,
        urlImagen: `https://static.arasaac.org/pictograms/${pictogram.idArasaac}/${pictogram.idArasaac}_300.png` } };
    }) } };
  const parsed = draftUtils.parseActivityTemplate(response);
  const state = draftUtils.stepsDraftReducer(draftUtils.initialStepsDraft, { type: 'apply', template: parsed });
  assert.deepEqual(state.steps.map(s => s.descripcion), ['Lávate las manos', 'Prepara la mesa', 'Sirve la comida', 'Come', 'Limpia y recoge']);
  assert.deepEqual(state.steps.map(s => s.pictograma.idArasaac), [2443, 5549, 36965, 2349, 8688]);
  assert.ok(state.steps.every(s => s.pictograma.urlImagen && s.pictograma.fuente === 'ARASAAC'));
  assert.ok(draftUtils.stepsMatchTemplate(state.steps, parsed));
  assert.notEqual(state.steps[0].pictograma, parsed.pasos[0].pictograma);
});
const pictogramFixture = (idArasaac = 123) => ({ fuente: 'ARASAAC', idArasaac, nombre: 'Acción de prueba',
  urlImagen: `https://static.arasaac.org/pictograms/${idArasaac}/${idArasaac}_300.png` });
const tokens = load('theme/tokens.ts');
const navigation = load('utils/profile-navigation.ts');
const styling = { '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.themes.light },
  './account-layout': { accountStyles: {} }, '@/components/carer/account-layout': { accountStyles: {} } };
const dialogActions = load('components/carer/step-dialog-actions.tsx', { ...styling,
  './continue-button': { ContinueButton: 'Button' } }).StepDialogActions;
const stepFormDialog = load('components/carer/step-form-dialog.tsx', { ...styling,
  '@/utils/activity-draft': draftUtils, './activity-dialog': { ActivityDialog: 'Dialog' },
  './activity-section-heading': { ActivitySectionHeading: 'Heading' },
  './step-dialog-actions': { StepDialogActions: 'DialogActions' },
  './step-pictogram-picker': { StepPictogramPicker: 'PictogramPicker' } }).StepFormDialog;
const deleteStepsDialog = load('components/carer/delete-steps-dialog.tsx', { ...styling,
  './activity-dialog': { ActivityDialog: 'Dialog' }, './area-icon': { AreaIcon: 'Icon' },
  './step-dialog-actions': { StepDialogActions: 'DialogActions' } }).DeleteStepsDialog;
const presentations = { StepForm: stepFormDialog, DeleteDialog: deleteStepsDialog, DialogActions: dialogActions };
const bread = { codigo: 'bread', nombre: 'Pan' };
const tick = () => new Promise(resolve => setImmediate(resolve));
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (Object.hasOwn(presentations, tree.type)) return [tree, ...nodes(presentations[tree.type](tree.props))];
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.formHeader), ...nodes(tree.props?.formActions),
    ...(tree.type === 'DragList' ? [...nodes(tree.props.ListHeaderComponent), ...nodes(tree.props.ListFooterComponent),
      ...tree.props.data.flatMap((item, index) => nodes(tree.props.renderItem({ item, getIndex: () => index, drag() {}, isActive: false })))] : [])];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree && Object.hasOwn(presentations, tree.type)) return text(presentations[tree.type](tree.props));
  return tree && typeof tree === 'object' ? text(tree.props?.children)
    + (tree.type === 'DragList' ? text(tree.props.ListHeaderComponent) + text(tree.props.ListFooterComponent) : '') : tree == null ? '' : String(tree);
}

test('name and icon contract reject invalid data without inventing restrictions or requiring suggestions', () => {
  assert.ok(options.activityNameError('   ')); assert.ok(options.activityNameError('a'.repeat(81)));
  assert.equal(options.activityNameError('  Leer con María-José  '), undefined);
  assert.equal(options.activityQuery('   Leer   un libro  '), 'Leer un libro');
  assert.deepEqual(options.parseActivityIconOptions({ iconos: [] }), []);
  assert.deepEqual(options.parseActivityIconOptions({ iconos: [bread] }), [bread]);
  for (const invalid of [null, {}, { iconos: null }, { iconos: [bread, bread] }, { iconos: [{ ...bread, nombre: '' }] },
    { iconos: [{ ...bread, codigo: '../bread.png' }] }]) assert.throws(() => options.parseActivityIconOptions(invalid));
});

test('API separates full catalogue from suggestions and rejects malformed responses with safe errors', async () => {
  const calls = []; let result = { status: 200, data: { iconos: [bread] } }; let failure;
  const api = load('services/activity-icons.ts', { '@/utils/activity-icon-options': options,
    './private-http': { getAuthenticatedHttpClient: () => ({ get: async (...args) => { calls.push(args); if (failure) throw failure; return result; } }) } });
  const signal = new AbortController().signal;
  assert.deepEqual(await api.getActivityIcons(signal), [bread]);
  assert.equal(calls[0][0], '/api/iconos-actividad'); assert.equal(calls[0][1].params, undefined);
  await api.getActivityIcons(signal, 'Desayunar'); assert.deepEqual(calls[1][1].params, { nombre: 'Desayunar' });
  assert.equal(calls[1][1].signal, signal);
  result = { status: 200, data: {} }; await assert.rejects(api.getActivityIcons(signal), e => e.kind === 'invalid-response');
  result = { status: 200, data: { iconos: ['a', 'b', 'c', 'd'].map(codigo => ({ codigo, nombre: codigo })) } };
  await assert.rejects(api.getActivityIcons(signal, 'abc'), e => e.kind === 'invalid-response');
  failure = new Error('private request details'); await assert.rejects(api.getActivityIcons(signal), e => e.kind === 'network' && !e.message.includes('private'));
});

function fixture() {
  const slots = []; const cleanups = []; const previousEffects = []; let effects = []; let cursor = 0;
  let name = ''; let enabled = true; let epoch = 1; let owner = 3;
  const timers = new Map(); let timerId = 0; const requests = [];
  class IconsError extends Error { constructor(kind) { super(kind); this.kind = kind; } }
  const manager = { revision: () => epoch };
  const hook = load('hooks/use-activity-icons.ts', {
    react: {
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial;
        return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
      useCallback: (fn, deps) => { const i = cursor++; const old = slots[i];
        if (!old || deps.some((value, index) => value !== old.deps[index])) slots[i] = { fn, deps }; return slots[i].fn; },
    },
    'expo-router': { useFocusEffect: fn => effects.push(fn) },
    '@/context/session': { useSession: () => ({ manager, caregiver: owner ? { idCuidador: owner } : null }) },
    '@/utils/activity-icon-options': options,
    '@/services/activity-icons': { ActivityIconsError: IconsError,
      getActivityIcons: (signal, name) => new Promise((resolve, reject) => requests.push({ signal, name, resolve, reject })) },
  }, { setTimeout: (fn, ms) => { assert.equal(ms, 250); const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id) });
  function render() {
    cursor = 0; effects = []; const result = hook.useActivityIcons(enabled, name);
    effects.forEach((effect, i) => { if (effect !== previousEffects[i]) { cleanups[i]?.(); cleanups[i] = effect(); previousEffects[i] = effect; } });
    return result;
  }
  return { render, requests, IconsError, timers,
    type: value => { name = value; return render(); }, enable: value => { enabled = value; return render(); },
    fire: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); },
    logout: () => { epoch++; owner = undefined; }, blur: () => cleanups.forEach(fn => fn?.()) };
}

test('dynamic suggestions start at three characters after debounce; stale results cannot overwrite newer results', async () => {
  const f = fixture(); f.render(); assert.equal(f.requests.length, 1); assert.equal(f.requests[0].name, undefined);
  f.requests[0].resolve([bread]); await tick(); assert.deepEqual(f.render().catalogue.icons, [bread]);
  f.type('de'); assert.equal(f.timers.size, 0); assert.equal(f.render().suggestions.status, 'idle');
  f.type('des'); assert.equal(f.requests.length, 1); assert.equal(f.timers.size, 1); f.fire();
  assert.equal(f.requests[1].name, 'des');
  f.type('desa'); assert.equal(f.requests[1].signal.aborted, true); f.fire();
  f.requests[2].resolve([]); await tick(); assert.deepEqual(f.render().suggestions.icons, []);
  f.requests[1].resolve([bread]); await tick(); assert.deepEqual(f.render().suggestions.icons, []);
  assert.deepEqual(f.render().catalogue.icons, [bread]); assert.equal(f.requests.filter(x => x.name === undefined).length, 1);
  f.type('de'); assert.equal(f.render().suggestions.status, 'idle'); f.blur();
});

test('shortening query cancels pending debounce; retry states remain separate and logout ignores late replies', async () => {
  const f = fixture(); f.render(); f.type('des'); f.type('de'); f.fire(); assert.equal(f.requests.length, 1);
  f.requests[0].reject(new f.IconsError('invalid-response')); await tick();
  assert.equal(f.render().catalogue.status, 'invalid-response');
  f.type('des'); f.fire(); f.requests[1].resolve([bread]); await tick();
  f.render().retryCatalogue(); f.render(); assert.equal(f.requests[2].name, undefined);
  assert.deepEqual(f.render().suggestions.icons, [bread]);
  f.type('dorm'); f.fire(); f.requests[3].reject(new f.IconsError('network')); await tick();
  assert.equal(f.render().suggestions.status, 'error'); f.render().retrySuggestions(); f.render(); f.fire();
  f.logout(); f.requests[2].resolve([bread]); f.requests[4].resolve([bread]); await tick();
  assert.notEqual(f.render().catalogue.status, 'ready'); assert.notEqual(f.render().suggestions.status, 'ready'); f.blur();
});

test('leaving the screen cancels catalogue and suggestions and ignores their late completion', async () => {
  const f = fixture(); f.render(); f.type('des'); f.fire(); f.blur();
  assert.ok(f.requests.every(request => request.signal.aborted));
  f.requests[0].resolve([bread]); f.requests[1].resolve([bread]); await tick();
  assert.notEqual(f.render().catalogue.status, 'ready'); assert.notEqual(f.render().suggestions.status, 'ready');
});

test('gallery remains available without suggestions, contains the full catalogue, and selection is explicit', () => {
  let stored = false; const changes = []; let theme = tokens.themes.light;
  const selector = load('components/carer/activity-icon-selector.tsx', { ...styling,
    '@/theme/use-theme': { useAppTheme: () => theme }, './area-icon': { AreaIcon: 'Icon' },
    react: { useState: initial => [stored || initial, value => { stored = value; }], useRef: () => ({ current: null }) },
    '@/constants/activity-icons': { resolveActivityIcon: code => code === 'unknown' ? undefined : 'local-png' },
  });
  const icons = Array.from({ length: 52 }, (_, index) => ({ codigo: `icon-${index}`, nombre: `Icono ${index}` }));
  const props = { catalogue: { status: 'ready', icons }, suggestions: { status: 'ready', icons: [] }, query: 'xyz',
    value: bread, onChange: icon => changes.push(icon), retryCatalogue() {}, retrySuggestions() {} };
  let tree = selector.ActivityIconSelector(props);
  assert.ok(text(tree).includes('No encontramos sugerencias')); assert.ok(!text(tree).includes('Icono seleccionado:'));
  assert.ok(text(tree).includes('Tu selección'));
  const retainedOption = nodes(tree).find(node => node.type === selector.ActivityIconOptionButton && node.props.readOnly);
  assert.ok(retainedOption.props.compact);
  const retained = selector.ActivityIconOptionButton(retainedOption.props);
  assert.equal(retained.props.accessibilityState.selected, true); assert.equal(retained.props.onPress, undefined);
  const retainedImage = nodes(retained).find(node => node.type === 'Image');
  assert.equal(retainedImage.props.style[1].width, tokens.sizes.touchTarget);
  const visible = selector.ActivityIconSelector({ ...props, suggestions: { status: 'ready', icons: [bread] } });
  assert.equal(nodes(visible).filter(node => node.type === selector.ActivityIconOptionButton).length, 1);
  assert.ok(!text(visible).includes('Tu selección'));
  nodes(tree).find(node => node.type === 'Pressable' && text(node).includes('Ver más')).props.onPress();
  tree = selector.ActivityIconSelector(props); assert.equal(nodes(tree).find(node => node.type === 'Modal').props.visible, true);
  const list = nodes(tree).find(node => node.type === 'List'); assert.equal(list.props.data.length, 52);
  list.props.renderItem({ item: icons[30] }).props.children.props.onSelect(icons[30]); assert.deepEqual(changes, [icons[30]]);
  stored = false;
  const unavailable = selector.ActivityIconOptionButton({ icon: { codigo: 'unknown', nombre: 'Desconocido' }, selected: false, onSelect() {} });
  assert.equal(unavailable.props.disabled, true);
  const selected = selector.ActivityIconOptionButton({ icon: bread, selected: true, onSelect: icon => changes.push(icon) });
  assert.equal(selected.props.accessibilityState.selected, true); assert.equal(selected.props.accessibilityLabel, 'Pan');
  selected.props.onPress(); assert.deepEqual(changes[1], bread);
  assert.equal(nodes(selected).find(node => node.type === 'Icon').props.name, 'check');
  theme = tokens.themes.dark;
  const darkSelected = selector.ActivityIconOptionButton({ icon: bread, selected: true, onSelect() {} });
  assert.equal(nodes(darkSelected).find(node => node.type === 'Icon').props.color, theme.colors.action.onPrimary);
  const idle = selector.ActivityIconSelector({ ...props, value: null, suggestions: { status: 'idle' } });
  assert.ok(!text(idle).includes('3 caracteres')); assert.ok(!text(idle).includes('No encontramos'));
  assert.ok(nodes(idle).some(node => node.type === 'Icon' && node.props.name === 'grid'));
  for (let count = 0; count <= 3; count++) {
    const suggested = selector.ActivityIconSelector({ ...props, value: null, query: 'Desayunar', suggestions: { status: 'ready', icons: icons.slice(0, count) } });
    const choices = nodes(suggested).filter(node => node.type === selector.ActivityIconOptionButton);
    assert.equal(choices.length, count); assert.ok(choices.every(node => node.props.compact));
    if (count) {
      assert.ok(nodes(suggested).some(node => node.type === 'Icon' && node.props.name === 'sparkles'));
      const name = nodes(suggested).find(node => node.type === 'Text' && node.props.children === 'Desayunar');
      assert.equal(name.props.style[0].fontFamily, tokens.typography.family.bold);
      assert.equal(name.props.style[1].color, theme.colors.action.primary);
    }
  }
});

test('new screen loads real profile, routes back to activities and keeps invalid creation disabled', () => {
  let state = { status: 'loading' }; const navigations = []; let hardware; let retried = 0;
  const parentValues = []; let formValues = []; let values = parentValues; let cursor = 0;
  const posted = []; let completed;
  const creation = { sending: false, error: null, submit: input => posted.push(input) };
  const native = { StyleSheet: { create: x => x }, Text: 'Text', View: 'View', ActivityIndicator: 'Spinner',
    Keyboard: { dismiss() {} },
    KeyboardAvoidingView: 'Keyboard', ScrollView: 'Scroll', TextInput: 'Input', Platform: { OS: 'android' },
    BackHandler: { addEventListener: (_event, callback) => { hardware = callback; return { remove() {} }; } } };
  const Screen = load('app/(cuidador-autenticado)/(principal)/perfiles/[idPerfilUsuario]/nueva-actividad.tsx', { ...styling,
    'react-native': native,
    'react-native-gesture-handler': { GestureHandlerRootView: 'GestureRoot' },
    react: { useCallback: fn => fn, useRef: initial => {const i=cursor++;if(!(i in values))values[i]={current:initial};return values[i];},
      useState: initial => { const i = cursor++; const store=values; if (!(i in store)) store[i] = initial;
      return [store[i], value => { store[i] = value; }]; },
      useReducer: (reducer, initial) => { const i = cursor++; const store=values;if (!(i in store)) store[i] = initial;
        return [store[i], action => { store[i] = reducer(store[i], action); }]; } },
    'expo-router': { Stack: { Screen: 'Screen' }, router: { dismissTo: value => navigations.push(value) },
      useLocalSearchParams: () => ({ idPerfilUsuario: '12' }), useFocusEffect: fn => fn() },
    '@/utils/profile-navigation': navigation, '@/utils/activity-icon-options': options,
    '@/utils/activity-draft': draftUtils,
    '@/utils/create-activity': createUtils,
    '@/hooks/use-create-activity': { useCreateActivity: (id, onCreated) => { assert.equal(id,12); completed=onCreated;return creation; } },
    '@/components/carer/activity-dialog': { ActivityDialog: 'Dialog' },
    '@/components/carer/activity-created-modal': { ActivityCreatedModal: 'CreatedModal' },
    '@/components/carer/step-dialog-actions': { StepDialogActions: 'Actions' },
    '@/components/carer/activity-icon-selector': { ActivityIconSelector: 'Selector' },
    '@/components/carer/activity-section-heading': { ActivitySectionHeading: 'SectionHeading' },
    '@/components/carer/activity-time-field': { ActivityTimeField: 'Time' },
    '@/components/carer/activity-steps-editor': { ActivityStepsEditor: 'Steps' },
    '@/components/carer/area-header': { AreaHeader: 'Header' }, '@/components/carer/continue-button': { ContinueButton: 'Button' },
    '@/components/carer/profile-avatar': { ProfileAvatar: 'Avatar' },
    '@/hooks/use-profile-detail': { useProfileDetail: id => { assert.equal(id, 12); return { state, reload: () => retried++ }; } },
    '@/hooks/use-activity-icons': { useActivityIcons: () => ({ catalogue: { status: 'ready', icons: [bread] }, suggestions: { status: 'ready', icons: [] } }) },
    '@/hooks/use-activity-template': { useActivityTemplate: () => ({ state: { status: 'ready', template: null }, retry() {} }) },
  }).default;
  const screen=()=>{cursor=0;values=parentValues;return Screen();};
  assert.ok(!nodes(screen()).some(node => node.type === 'Input'));
  state = { status: 'error' }; nodes(screen()).find(node => node.props?.label === 'Reintentar').props.onPress(); assert.equal(retried, 1);
  state = { status: 'not-found' }; assert.ok(text(screen()).includes('No pudimos encontrar'));
  state = { status: 'ready', profile: { idPerfilUsuario: 12, nombre: 'Persona real', avatar: null } };
  let tree = screen(); hardware(); assert.deepEqual(navigations.pop(), navigation.activitiesHref(12));
  nodes(tree).find(node => node.type === 'Screen').props.options.header().props.onBack();
  assert.deepEqual(navigations.pop(), navigation.activitiesHref(12));
  const form = nodes(tree).find(node => typeof node.type === 'function').type;
  const formProps=nodes(tree).find(node=>node.type===form).props;
  const render = () => { cursor = 0;values=formValues;return form(formProps); };
  const headings = nodes(render()).filter(node => node.type === 'SectionHeading');
  assert.deepEqual(headings.map(node => [node.props.icon, node.props.title]), [['pencil', 'Nombre de la actividad'], ['clock', 'Hora'], ['imagePlus', 'Elige un ícono']]);
  const iconHeading = headings[2];
  assert.equal(iconHeading.props.description, 'Te mostramos algunas sugerencias según el nombre de tu actividad.');
  const sectionHeading = load('components/carer/activity-section-heading.tsx', { ...styling, './area-icon': { AreaIcon: 'Icon' } }).ActivitySectionHeading;
  const headingTree = sectionHeading(iconHeading.props);
  assert.ok(text(headingTree).includes(iconHeading.props.description));
  assert.equal(nodes(headingTree).find(node => node.props?.accessibilityRole === 'header').props.children, 'Elige un ícono');
  tree = render(); nodes(tree).find(node => node.type === 'Input').props.onChangeText('Desayunar');
  nodes(render()).find(node => node.type === 'Selector').props.onChange(bread);
  nodes(render()).find(node => node.type === 'Input').props.onChangeText('Leer');
  tree = render(); assert.deepEqual(nodes(tree).find(node => node.type === 'Selector').props.value, bread);
  assert.ok(nodes(tree).find(node => node.type === 'Steps').props.formHeader);
  assert.equal(nodes(tree).find(node => node.props?.label === 'Crear actividad').props.disabled, true);
  nodes(render()).find(node=>node.type==='Time').props.onChange(420);
  nodes(render()).find(node=>node.type==='Steps').props.dispatch({type:'save',description:'Mi paso',pictograma:null});
  tree=render(); assert.equal(nodes(tree).find(node=>node.props?.label==='Crear actividad').props.disabled,false);
  nodes(tree).find(node=>node.props?.label==='Crear actividad').props.onPress();
  assert.deepEqual(posted[0],{nombre:'Leer',hora:'07:00',codigoIcono:'bread',pasos:[{descripcion:'Mi paso',idArasaac:null}]});
  creation.sending=true;tree=render();assert.equal(nodes(tree).find(node=>node.type==='Steps').props.busy,true);
  assert.equal(nodes(tree).find(node=>node.type==='Input').props.editable,false);
  assert.equal(nodes(tree).find(node=>node.props?.label==='Crear actividad').props.loading,true);
  creation.sending=false;creation.error={kind:'uncertain',message:'Respuesta desconocida'};
  tree=render();assert.ok(nodes(tree).some(node=>node.props?.label==='Ver actividades'));
  nodes(tree).find(node=>node.props?.label==='Crear actividad').props.onPress();
  tree=render();assert.equal(posted.length,1);
  nodes(tree).find(node=>node.type==='Actions').props.onCancel();
  assert.equal(nodes(render()).find(node=>node.type==='Input').props.value,'Leer');
  assert.equal(nodes(render()).find(node=>node.type==='Steps').props.draft.steps[0].descripcion,'Mi paso');
  completed();assert.equal(navigations.length,0);
  tree=screen();let modal=nodes(tree).find(node=>node.type==='CreatedModal');
  assert.equal(modal.props.profileName,'Persona real');
  assert.ok(!nodes(tree).some(node=>node.type===form)); // The sent form is unmounted.
  modal.props.onCreateAnother();modal.props.onViewActivities();assert.equal(navigations.length,0);
  tree=screen();assert.ok(nodes(tree).some(node=>node.type===form));
  formValues=[];creation.error=null; // Fresh hooks on a real React remount.
  tree=render();assert.equal(nodes(tree).find(node=>node.type==='Input').props.value,'');
  assert.equal(nodes(tree).find(node=>node.type==='Time').props.value,null);
  assert.equal(nodes(tree).find(node=>node.type==='Selector').props.value,null);
  assert.equal(nodes(tree).find(node=>node.type==='Steps').props.draft.steps.length,0);
  completed();modal=nodes(screen()).find(node=>node.type==='CreatedModal');
  modal.props.onViewActivities();modal.props.onViewActivities();
  assert.equal(navigations.length,1);assert.deepEqual(navigations.pop(),navigation.activitiesHref(12));
  assert.ok(!nodes(screen()).some(node=>node.type==='CreatedModal'||node.type===form));
});

const template = (id = 4, descriptions = ['Lávate las manos', 'Prepara la mesa']) => ({ idPlantillaActividad: id, nombre: 'Desayunar',
  pasos: descriptions.map((descripcion, i) => ({ orden: i + 1, descripcion, pictograma: i ? null : { idPictograma: 9, nombre: 'Lavarse las manos' } })) });

test('template parser validates the entire response and drops URLs/internal data before any draft mutation', () => {
  const real = template(); assert.deepEqual(draftUtils.parseActivityTemplate({ plantilla: real }), real);
  assert.equal(draftUtils.parseActivityTemplate({ plantilla: null }), null);
  const extra = structuredClone(real); extra.pasos[0].pictograma.urlImagen = '/not-renderable.png';
  assert.deepEqual(draftUtils.parseActivityTemplate({ plantilla: extra }), real);
  for (const invalid of [{}, { plantilla: {} }, { plantilla: { ...real, pasos: [{ ...real.pasos[0], descripcion: ' ' }] } },
    { plantilla: { ...real, pasos: [{ ...real.pasos[0], descripcion: 'a'.repeat(121) }] } },
    { plantilla: { ...real, pasos: [real.pasos[0], real.pasos[0]] } },
    { plantilla: { ...real, pasos: [{ ...real.pasos[0], pictograma: { idPictograma: -1, nombre: 'Incorrecto' } }] } }]) {
    assert.throws(() => draftUtils.parseActivityTemplate(invalid));
  }
});

test('unmodified draft copies a template independently, renumbers source gaps, preserves stable keys and waits for editors', () => {
  const original = template(); original.pasos[1].orden = 5;
  let state = draftUtils.stepsDraftReducer(draftUtils.initialStepsDraft, { type: 'suggest', template: original });
  assert.deepEqual(state.steps.map(s => s.orden), [1, 2]); assert.equal(state.personalized, false);
  assert.notEqual(state.steps[0], original.pasos[0]); assert.notEqual(state.steps[0].pictograma, original.pasos[0].pictograma);
  assert.equal(draftUtils.stepsDraftReducer(state, { type: 'suggest', template: original }), state);
  assert.equal(draftUtils.stepsDraftReducer(state, { type: 'suggest', template: null }), state);
  const editing = draftUtils.stepsDraftReducer(state, { type: 'editing', open: true });
  assert.equal(draftUtils.stepsDraftReducer(editing, { type: 'suggest', template: template(8) }), editing);
  const keys = state.steps.map(s => s.key);
  state = draftUtils.stepsDraftReducer(state, { type: 'suggest', template: template(8) });
  assert.ok(state.steps.every(s => !keys.includes(s.key))); assert.equal(state.personalized, false);
});

test('every effective customization permanently protects steps, including deleting all and explicitly applying a template', () => {
  const reduce = draftUtils.stepsDraftReducer;
  const base = reduce(draftUtils.initialStepsDraft, { type: 'suggest', template: template() });
  const mutations = [
    { type: 'save', key: base.steps[0].key, description: '  Un texto personalizado  ' },
    { type: 'save', description: 'Paso propio' }, { type: 'remove', key: base.steps[0].key },
    { type: 'move', key: base.steps[0].key, direction: 1 },
  ];
  for (const action of mutations) {
    let state = reduce(base, action); assert.equal(state.personalized, true);
    assert.equal(reduce(state, { type: 'suggest', template: template(9) }), state);
    state = reduce(state, { type: 'apply', template: template(9) }); assert.equal(state.personalized, true);
    assert.equal(reduce(state, { type: 'suggest', template: template() }), state);
    for (const step of [...state.steps]) state = reduce(state, { type: 'remove', key: step.key });
    assert.equal(state.steps.length, 0); assert.equal(reduce(state, { type: 'suggest', template: template() }), state);
  }
  let state = reduce(base, mutations[0]); assert.equal(state.steps[0].descripcion, 'Un texto personalizado');
  assert.deepEqual(state.steps[0].pictograma, base.steps[0].pictograma);
  state = reduce(state, mutations[1]); assert.equal(state.steps.at(-1).pictograma, null);
  assert.equal(reduce(base, { type: 'save', description: ' ' }), base);
  assert.equal(reduce(base, { type: 'save', description: 'a'.repeat(121) }), base);
  assert.equal(reduce(base, { type: 'save', key: base.steps[0].key, description: base.steps[0].descripcion }), base);
  assert.equal(reduce(base, { type: 'move', key: base.steps[0].key, direction: -1 }), base);
  const moved = reduce(base, mutations[3]); assert.deepEqual(moved.steps.map(s => s.key), [...base.steps].reverse().map(s => s.key));
  assert.deepEqual(moved.steps.map(s => s.orden), [1, 2]);
  assert.equal(draftUtils.stepDescriptionError('a'.repeat(120)), undefined);
});

test('local time is minute-only, handles midnight/noon, and never needs ISO or UTC conversion', () => {
  assert.equal(draftUtils.formatActivityTime(null), 'Selecciona una hora');
  assert.equal(draftUtils.formatActivityTime(0), '12:00 a. m.');
  assert.equal(draftUtils.formatActivityTime(720), '12:00 p. m.');
  assert.equal(draftUtils.formatActivityTime(1439), '11:59 p. m.');
  for (const minutes of [0, 1, 419, 720, 1439]) assert.equal(draftUtils.localTimeMinutes(draftUtils.localTimeDate(minutes)), minutes);
});

test('template API uses private GET and distinguishes no template from invalid/network responses', async () => {
  const calls = []; let result = { status: 200, data: { plantilla: template() } }; let failure;
  const api = load('services/activity-templates.ts', { '@/utils/activity-draft': draftUtils,
    './private-http': { getAuthenticatedHttpClient: () => ({ get: async (...args) => { calls.push(args); if (failure) throw failure; return result; } }) } });
  const signal = new AbortController().signal;
  assert.deepEqual(await api.getActivityTemplate('Desayunar', signal), template());
  assert.equal(calls[0][0], '/api/plantillas-actividad/sugerencia'); assert.equal(calls[0][1].signal, signal);
  assert.deepEqual(calls[0][1].params, { nombre: 'Desayunar' });
  result = { status: 200, data: { plantilla: null } }; assert.equal(await api.getActivityTemplate('Sin plantilla', signal), null);
  result = { status: 200, data: {} }; await assert.rejects(api.getActivityTemplate('Desayunar', signal), e => e.kind === 'invalid-response');
  failure = new Error('private'); await assert.rejects(api.getActivityTemplate('Desayunar', signal), e => e.kind === 'network' && !e.message.includes('private'));
});

function templateFixture() {
  const slots = []; let cursor = 0; let name = ''; let focus; let previous; let cleanup; let epoch = 1;
  const requests = []; const timers = new Map(); let timerId = 0;
  class TemplateError extends Error { constructor(kind) { super(kind); this.kind = kind; } }
  const manager = { revision: () => epoch };
  const hook = load('hooks/use-activity-template.ts', {
    react: { useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
      useCallback: (fn, deps) => { const i = cursor++; const old = slots[i];
        if (!old || deps.some((x, j) => x !== old.deps[j])) slots[i] = { fn, deps }; return slots[i].fn; } },
    'expo-router': { useFocusEffect: fn => { focus = fn; } },
    '@/context/session': { useSession: () => ({ manager, caregiver: { idCuidador: 3 } }) },
    '@/utils/activity-icon-options': options,
    '@/services/activity-templates': { ActivityTemplateError: TemplateError,
      getActivityTemplate: (query, signal) => new Promise((resolve, reject) => requests.push({ query, signal, resolve, reject })) },
  }, { setTimeout: (fn, ms) => { assert.equal(ms, 250); timers.set(++timerId, fn); return timerId; }, clearTimeout: i => timers.delete(i) });
  function render() { cursor = 0; const result = hook.useActivityTemplate(name);
    if (focus !== previous) { cleanup?.(); cleanup = focus(); previous = focus; } return result; }
  return { render, requests, TemplateError, type: value => { name = value; return render(); },
    fire: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); },
    blur: () => cleanup?.(), logout: () => { epoch++; } };
}

test('template queries debounce from three characters, reject stale replies, retry independently and ignore logout/blur', async () => {
  const f = templateFixture(); f.type('de'); f.fire(); assert.equal(f.requests.length, 0);
  f.type('des'); f.fire(); assert.equal(f.requests[0].query, 'des');
  f.type('desayunar'); assert.equal(f.requests[0].signal.aborted, true); f.fire();
  f.requests[1].resolve(template()); await tick(); assert.deepEqual(f.render().state.template, template());
  f.requests[0].resolve(null); await tick(); assert.deepEqual(f.render().state.template, template());
  f.type('Visitar'); f.fire(); f.requests[2].reject(new f.TemplateError('invalid-response')); await tick();
  assert.equal(f.render().state.status, 'invalid-response'); f.render().retry(); f.render(); f.fire();
  f.requests[3].resolve(null); await tick(); assert.equal(f.render().state.template, null);
  f.type('desayuno'); f.type('de'); f.fire(); assert.equal(f.requests.length, 4);
  f.type('desayuno'); f.fire(); f.logout(); f.requests[4].resolve(template()); await tick();
  assert.notEqual(f.render().state.status, 'ready'); f.blur();
  const late = templateFixture(); late.type('desayunar'); late.fire(); late.blur();
  assert.equal(late.requests[0].signal.aborted, true); late.requests[0].resolve(template()); await tick();
  assert.notEqual(late.render().state.status, 'ready');
});

test('step editor requires confirmation to replace/remove, provides accessible ordering and allows manual steps without templates', () => {
  let state = draftUtils.initialStepsDraft; let suggestion = { status: 'ready', template: template() };
  const slots = []; let cursor = 0; let focused = false; let blur;
  const actions = [];
  const dispatch = action => { actions.push(action); state = draftUtils.stepsDraftReducer(state, action); };
  const announcements = [];
  const editor = load('components/carer/activity-steps-editor.tsx', { ...styling,
    react: { useEffect: fn => fn(), useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
      useCallback: fn => fn, useMemo: fn => fn(),
      useReducer: (reducer, initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial;
        return [slots[i], action => { slots[i] = reducer(slots[i], action); }]; },
      useRef: initial => { const i = cursor++; return slots[i] ||= { current: initial }; } },
    'expo-router': { useFocusEffect: fn => { if (!focused) { blur = fn(); focused = true; } } },
    'react-native-draggable-flatlist': { __esModule: true, default: 'DragList' },
    'react-native': { StyleSheet: { create: x => x }, Text: 'Text', View: 'View', Pressable: 'Pressable', TextInput: 'Input',
      Keyboard: { dismiss() {} }, ActivityIndicator: 'Spinner', AccessibilityInfo: { announceForAccessibility: text => announcements.push(text) } },
    '@/utils/activity-draft': draftUtils, './activity-dialog': { ActivityDialog: 'Dialog' }, './area-icon': { AreaIcon: 'Icon' },
    './activity-secondary-action': { ActivitySecondaryAction: 'Secondary' },
    './step-pictogram': { StepPictogramImage: 'Pictogram', ArasaacAttribution: 'Attribution' },
    './step-pictogram-picker': { StepPictogramPicker: 'PictogramPicker' },
    './step-form-dialog': { StepFormDialog: 'StepForm' },
    './delete-steps-dialog': { DeleteStepsDialog: 'DeleteDialog' },
    './activity-section-heading': { ActivitySectionHeading: 'Heading' },
    './continue-button': { ContinueButton: 'Button' },
  }).ActivityStepsEditor;
  const render = () => { cursor = 0; return editor({ draft: state, dispatch, suggestion, displayName: 'Desayuno', retry() {} }); };
  const button = label => { const all = nodes(render()); return all.find(n => n.type === 'Button' && n.props.label.startsWith(label))
    || all.find(n => n.type === 'Secondary' && n.props.label.startsWith(label)); };
  const select = number => nodes(render()).find(n => n.props?.accessibilityLabel?.startsWith(`Seleccionar paso ${number}:`)).props.onPress();
  render(); assert.equal(state.steps.length, 2);
  assert.ok(!nodes(render()).some(n => n.type === 'Attribution'));
  assert.ok(text(render()).includes('Pasos sugeridos para “Desayuno”.'), text(render()));
  assert.ok(!text(render()).includes('Desayunar')); assert.equal(button('Usar pasos sugeridos'), undefined);
  select(1); assert.equal(state.personalized, false);
  nodes(render()).find(n => n.props?.accessibilityLabel?.startsWith('Deseleccionar paso 1')).props.onPress();
  assert.ok(button('Agregar paso'));
  nodes(render()).find(n => n.props?.accessibilityLabel?.startsWith('Editar paso 1')).props.onPress();
  const chosenPicto = { fuente: 'ARASAAC', idArasaac: 123, nombre: 'Acción de prueba', urlImagen: 'https://static.arasaac.org/pictograms/123/123_300.png' };
  nodes(render()).find(n => n.type === 'PictogramPicker').props.onSelect(chosenPicto);
  assert.equal(state.steps[0].pictograma.idPictograma, 9); // Still only in modal buffer.
  nodes(render()).find(n => n.type === 'Input').props.onChangeText('Mi paso'); button('Guardar cambios').props.onPress();
  assert.equal(state.steps[0].descripcion, 'Mi paso'); assert.equal(state.personalized, true);
  assert.deepEqual(state.steps[0].pictograma, chosenPicto);
  nodes(render()).find(n => n.props?.accessibilityLabel?.startsWith('Editar paso 1')).props.onPress();
  nodes(render()).find(n => n.type === 'PictogramPicker').props.onSelect(null); button('Cancelar').props.onPress();
  assert.deepEqual(state.steps[0].pictograma, chosenPicto);
  select(2);
  assert.ok(!text(render()).includes('Pasos sugeridos para “Desayuno”.'));
  suggestion = { status: 'ready', template: template(8, ['Otros pasos']) };
  render(); assert.equal(state.steps[0].descripcion, 'Mi paso'); button('Usar pasos sugeridos').props.onPress();
  assert.equal(slots[0].kind, 'apply'); assert.ok(text(render()).includes('para “Desayuno”'));
  button('Conservar mis pasos').props.onPress(); assert.equal(state.steps[0].descripcion, 'Mi paso');
  button('Usar pasos sugeridos').props.onPress(); button('Sustituir pasos').props.onPress();
  assert.equal(state.steps[0].descripcion, 'Otros pasos'); assert.equal(state.personalized, true);
  assert.ok(button('Agregar paso'));
  assert.equal(button('Usar pasos sugeridos'), undefined);
  select(1); assert.equal(button('Agregar paso'), undefined); assert.equal(button('Eliminar paso').props.destructive, true);
  assert.equal(slots[0], null); // selecting never edits
  button('Eliminar paso').props.onPress(); assert.equal(slots[0].kind, 'remove'); assert.equal(state.steps.length, 1);
  button('Cancelar').props.onPress(); assert.equal(state.steps.length, 1);
  assert.ok(nodes(render()).some(n => n.props?.accessibilityLabel?.startsWith('Deseleccionar paso 1')));
  button('Eliminar paso').props.onPress(); button('Eliminar').props.onPress(); assert.equal(state.steps.length, 0);
  suggestion = { status: 'ready', template: null }; button('Agregar paso').props.onPress();
  assert.equal(button('Guardar').props.disabled, true);
  nodes(render()).find(n => n.type === 'Input').props.onChangeText('  Paso propio  '); button('Guardar').props.onPress();
  assert.equal(state.steps[0].descripcion, 'Paso propio'); assert.equal(state.steps[0].pictograma, null);
  button('Agregar paso').props.onPress(); nodes(render()).find(n => n.type === 'Input').props.onChangeText('Segundo'); button('Guardar').props.onPress();
  const handle = nodes(render()).find(n => n.props?.accessibilityLabel === 'Reordenar paso 2');
  assert.ok(handle.props.accessibilityActions.some(a => a.label === 'Subir'));
  handle.props.onAccessibilityAction({ nativeEvent: { actionName: 'moveUp' } });
  assert.equal(state.steps[0].descripcion, 'Segundo'); assert.ok(announcements[0].includes('posición 1'));
  select(1); const key = state.steps[0].key;
  let list = nodes(render()).find(n => n.type === 'DragList'); list.props.onDragBegin(0);
  assert.equal(state.editing, true); list = nodes(render()).find(n => n.type === 'DragList');
  list.props.onDragEnd({ data: [...state.steps].reverse(), from: 0, to: 1 });
  assert.equal(state.editing, false); assert.equal(state.steps[1].key, key);
  assert.ok(nodes(render()).some(n => n.props?.accessibilityLabel?.startsWith('Deseleccionar paso 2')));
  assert.deepEqual(state.steps.map(s => s.orden), [1, 2]);
  select(1);
  assert.equal(button('Eliminar 2 pasos').props.destructive, true);
  assert.equal(nodes(render()).filter(n => n.props?.accessibilityRole === 'checkbox' && n.props.accessibilityState.checked).length, 2);
  button('Eliminar 2 pasos').props.onPress();
  assert.ok(nodes(render()).some(n => n.type === 'Dialog' && n.props.title.includes('estos 2 pasos')));
  assert.ok(text(render()).includes('Estos pasos se eliminarán de la actividad'));
  button('Cancelar').props.onPress();
  assert.equal(state.steps.length, 2); assert.ok(button('Eliminar 2 pasos'));
  button('Eliminar').props.onPress();
  const beforeDelete = actions.length;
  button('Eliminar').props.onPress();
  assert.equal(actions.slice(beforeDelete).filter(a => a.type === 'removeMany').length, 1);
  assert.equal(actions.slice(beforeDelete).filter(a => a.type === 'remove').length, 0);
  assert.equal(state.steps.length, 0); assert.ok(button('Agregar paso'));
  state = draftUtils.stepsDraftReducer(state, { type: 'apply', template: template(12) });
  const create = button('Crear actividad'); assert.equal(create.props.disabled, true); assert.equal(create.props.onPress, undefined);
  list = nodes(render()).find(n => n.type === 'DragList'); list.props.onDragBegin(0);
  const beforeLeaving = state.steps; blur();
  list.props.onDragEnd({ data: [...beforeLeaving].reverse(), from: 0, to: 1 });
  assert.equal(state.steps, beforeLeaving);
});

test('bulk removal is atomic, selection toggles/prunes by stable key, and idle editing returns the same state', () => {
  const base = draftUtils.stepsDraftReducer(draftUtils.initialStepsDraft, { type: 'suggest', template: template(4, ['Primero', 'Segundo', 'Tercero', 'Cuarto']) });
  let selected = draftUtils.stepSelectionReducer(new Set(), { type: 'toggle', key: base.steps[0].key });
  selected = draftUtils.stepSelectionReducer(selected, { type: 'toggle', key: base.steps[2].key });
  const deleted = draftUtils.stepsDraftReducer(base, { type: 'removeMany', keys: [...selected, 'missing'] });
  assert.deepEqual(deleted.steps.map(s => s.descripcion), ['Segundo', 'Cuarto']);
  assert.deepEqual(deleted.steps.map(s => s.orden), [1, 2]); assert.equal(deleted.personalized, true);
  assert.equal(draftUtils.stepsDraftReducer(base, { type: 'removeMany', keys: ['missing'] }), base);
  assert.equal(draftUtils.stepsDraftReducer(base, { type: 'removeMany', keys: [] }), base);
  assert.equal(draftUtils.stepsDraftReducer(base, { type: 'editing', open: false }), base);
  assert.equal(draftUtils.stepSelectionReducer(selected, { type: 'prune', validKeys: base.steps.map(s => s.key) }), selected);
  selected = draftUtils.stepSelectionReducer(selected, { type: 'toggle', key: base.steps[0].key });
  assert.deepEqual([...selected], [base.steps[2].key]);
  selected = draftUtils.stepSelectionReducer(selected, { type: 'prune', validKeys: deleted.steps.map(s => s.key) });
  assert.equal(selected.size, 0);
  assert.equal(draftUtils.stepsDraftReducer(deleted, { type: 'suggest', template: template(9) }), deleted);
});

test('reorder validates a permutation of current keys without overwriting content, and does not personalize cancelled/no-op drags', () => {
  const base = draftUtils.stepsDraftReducer(draftUtils.initialStepsDraft, { type: 'suggest', template: template() });
  const keys = base.steps.map(step => step.key);
  for (const invalid of [keys, [], [keys[0], keys[0]], ['missing', keys[1]]]) {
    assert.equal(draftUtils.stepsDraftReducer(base, { type: 'reorder', keys: invalid }), base);
  }
  const moved = draftUtils.stepsDraftReducer(base, { type: 'reorder', keys: [...keys].reverse() });
  assert.equal(moved.personalized, true); assert.deepEqual(moved.steps.map(s => s.key), [...keys].reverse());
  assert.deepEqual(moved.steps[1].pictograma, base.steps[0].pictograma);
  assert.equal(draftUtils.stepsMatchTemplate(base.steps, template()), true);
  assert.equal(draftUtils.stepsMatchTemplate(moved.steps, template()), false);
});

test('Android time picker only commits confirmed selections and ignores cancellation or late completion after leaving', () => {
  const slots = []; let cursor = 0; let focus; let chosen = null; const requests = []; let dismissed = 0;
  const component = load('components/carer/activity-time-field.tsx', { ...styling,
    react: { useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = value; }]; }, useRef: initial => { const i = cursor++; return slots[i] ||= { current: initial }; }, useCallback: fn => fn },
    'expo-router': { useFocusEffect: fn => { focus = fn; } }, '@/utils/activity-draft': draftUtils,
    '@react-native-community/datetimepicker': { default: 'Picker', DateTimePickerAndroid: { open: args => requests.push(args), dismiss: async () => { dismissed++; } } },
    './activity-dialog': { ActivityDialog: 'Dialog' }, './area-icon': { AreaIcon: 'Icon' }, './continue-button': { ContinueButton: 'Button' },
  }).ActivityTimeField;
  const render = () => { cursor = 0; return component({ value: chosen, onChange: value => { chosen = value; } }); };
  let tree = render(); const blur = focus();
  assert.ok(text(tree).includes('Selecciona una hora'));
  const open = () => nodes(render()).find(n => n.type === 'Pressable').props.onPress();
  open(); open(); assert.equal(requests.length, 1); requests[0].onDismiss(); assert.equal(chosen, null);
  open(); assert.equal(requests[1].mode, 'time'); requests[1].onValueChange({}, draftUtils.localTimeDate(720));
  assert.equal(chosen, 720); assert.ok(text(render()).includes('12:00 p. m.'));
  open(); blur(); assert.equal(dismissed, 1); requests[2].onValueChange({}, draftUtils.localTimeDate(0)); assert.equal(chosen, 720);
});

test('ARASAAC identity and image locators are validated separately from local IDs and legacy URLs', () => {
  const picto = pictogramFixture();
  assert.deepEqual(draftUtils.parseStepPictogram(picto), picto);
  assert.deepEqual(draftUtils.parseStepPictogram({ ...picto, idPictograma: 9 }), { ...picto, idPictograma: 9 });
  assert.deepEqual(draftUtils.parseStepPictogram({ idPictograma: 9, nombre: 'Legacy', urlImagen: '/old.png' }), { idPictograma: 9, nombre: 'Legacy' });
  for (const invalid of [{ ...picto, urlImagen: 'http://malicious.invalid/p.png' }, { ...picto, idArasaac: 124 },
    { ...picto, fuente: 'otra' }, { ...picto, idArasaac: -1 }, { ...picto, idPictograma: -1 }, { nombre: 'Sin identidad' }]) {
    assert.throws(() => draftUtils.parseStepPictogram(invalid));
  }
  const original = template(); original.pasos[0].pictograma = { ...picto, idPictograma: 9 };
  const parsed = draftUtils.parseActivityTemplate({ plantilla: original });
  assert.deepEqual(parsed.pasos[0].pictograma, original.pasos[0].pictograma);
});

test('saving only the pictogram personalizes the draft, copies selection, and preserves it through text edits and reorders', () => {
  const reduce = draftUtils.stepsDraftReducer;
  const base = reduce(draftUtils.initialStepsDraft, { type: 'suggest', template: template() });
  const picto = pictogramFixture(); const key = base.steps[0].key;
  const selected = reduce(base, { type: 'save', key, description: base.steps[0].descripcion, pictograma: picto });
  assert.equal(selected.personalized, true); assert.deepEqual(selected.steps[0].pictograma, picto);
  assert.notEqual(selected.steps[0].pictograma, picto); assert.equal(base.personalized, false);
  const renamed = reduce(selected, { type: 'save', key, description: 'Otro texto' });
  assert.deepEqual(renamed.steps[0].pictograma, picto);
  const reordered = reduce(renamed, { type: 'reorder', keys: renamed.steps.map(s => s.key).reverse() });
  assert.deepEqual(reordered.steps.find(s => s.key === key).pictograma, picto);
  assert.equal(reduce(reordered, { type: 'suggest', template: template(8) }), reordered);
  assert.equal(reduce(selected, { type: 'save', key, description: selected.steps[0].descripcion, pictograma: { ...picto } }), selected);
  assert.equal(draftUtils.sameStepPictogram(picto, { ...picto, idPictograma: 77 }), true);
  assert.equal(draftUtils.sameStepPictogram(picto, { idPictograma: 123, nombre: picto.nombre }), false);
});

test('pictogram API reuses private HTTP, validates all results, and distinguishes malformed/network responses', async () => {
  let response = { status: 200, data: { pictogramas: [pictogramFixture()] } }; let failure; const calls = [];
  const api = load('services/pictograms.ts', { '@/utils/activity-draft': draftUtils,
    './private-http': { getAuthenticatedHttpClient: () => ({ get: async (...args) => { calls.push(args); if (failure) throw failure; return response; } }) } });
  const signal = new AbortController().signal;
  assert.deepEqual(await api.getPictograms('lavar manos', signal), [pictogramFixture()]);
  assert.equal(calls[0][0], '/api/pictogramas/arasaac'); assert.deepEqual(calls[0][1], { params: { texto: 'lavar manos' }, signal });
  response = { status: 200, data: { pictogramas: [] } }; assert.deepEqual(await api.getPictograms('algo', signal), []);
  for (const invalid of [{}, { pictogramas: [pictogramFixture(), pictogramFixture()] }, { pictogramas: [{ nombre: 'Sin ID' }] }]) {
    response.data = invalid; await assert.rejects(api.getPictograms('algo', signal), e => e.kind === 'invalid-response');
  }
  failure = new Error('private text and token');
  await assert.rejects(api.getPictograms('algo', signal), e => e.kind === 'network' && !e.message.includes('private'));
});

test('picker exposes three suggestions, more related results, and explicit selection without overwriting on text changes', () => {
  const slots = []; let cursor = 0; let query = 'lavar'; let selected = pictogramFixture(999);
  let state = { status: 'ready', pictograms: [1, 2, 3, 4].map(pictogramFixture) };
  const picker = load('components/carer/step-pictogram-picker.tsx', { ...styling,
    react: { useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = value; }]; } },
    '@/hooks/use-pictograms': { usePictograms: () => ({ state, query, retry() {} }) },
    '@/utils/activity-draft': draftUtils, './area-icon': { AreaIcon: 'Icon' },
    './activity-secondary-action': { ActivitySecondaryAction: 'Secondary' },
    './step-pictogram': { StepPictogramImage: 'Pictogram', ArasaacAttribution: 'Attribution' },
    './activity-section-heading': { ActivitySectionHeading: 'Heading' },
  }).StepPictogramPicker;
  const render = () => { cursor = 0; return picker({ text: query, selected, onSelect: p => { selected = p; } }); };
  let tree = render(); assert.equal(nodes(tree).filter(n => n.type === 'Pressable').length, 3);
  assert.ok(nodes(tree).some(n => n.type === 'Heading' && n.props.title === 'Elige un pictograma'));
  assert.ok(!nodes(tree).some(n => n.type === 'Attribution'));
  assert.ok(text(tree).includes('Tu selección')); assert.equal(selected.idArasaac, 999);
  nodes(tree).find(n => n.type === 'Secondary' && n.props.label === 'Ver más pictogramas').props.onPress();
  tree = render(); assert.equal(nodes(tree).filter(n => n.type === 'Pressable').length, 4);
  nodes(tree).find(n => n.type === 'Pressable').props.onPress(); tree = render();
  assert.equal(selected.idArasaac, 1); assert.ok(!text(tree).includes('Tu selección'));
  assert.equal(nodes(tree).filter(n => n.type === 'Pressable' && n.props.accessibilityState.selected).length, 1);
  query = 'otro texto'; state = { status: 'ready', pictograms: [pictogramFixture(8)] }; tree = render();
  assert.equal(selected.idArasaac, 1); assert.ok(text(tree).includes('Tu selección'));
  state = { status: 'error' }; assert.ok(text(render()).includes('Tu selección se conserva'));
  state = { status: 'loading' }; assert.ok(!text(render()).includes('No encontramos'));
  state = { status: 'ready', pictograms: [] }; assert.ok(text(render()).includes('No encontramos'));
});

test('pictogram hook debounces, aborts stale queries, retries and ignores replies after logout/unmount', async () => {
  const slots = []; const cleanups = []; const previous = []; let cursor = 0; let effects = [];
  const timers = new Map(); let timerId = 0; const requests = [];
  let query = ''; let epoch = 1; let owner = 3;
  class PictogramsError extends Error { constructor(kind) { super(kind); this.kind = kind; } }
  const manager = { revision: () => epoch };
  const hook = load('hooks/use-pictograms.ts', {
    react: {
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial;
        return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
      useCallback: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { fn, deps }; return slots[i].fn; },
    },
    'expo-router': { useFocusEffect: fn => effects.push(fn) },
    '@/context/session': { useSession: () => ({ manager, caregiver: owner ? { idCuidador: owner } : null }) },
    '@/services/pictograms': { PictogramsError, getPictograms: (text, signal) => new Promise((resolve, reject) => requests.push({ text, signal, resolve, reject })) },
  }, { setTimeout: (fn, ms) => { assert.equal(ms, 250); const id = ++timerId; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id) });
  const render = () => { cursor = 0; effects = []; const result = hook.usePictograms(query);
    effects.forEach((fn, i) => { if (fn !== previous[i]) { cleanups[i]?.(); cleanups[i] = fn(); previous[i] = fn; } }); return result; };
  const fire = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); };
  assert.equal(render().state.status, 'idle'); query = 'ab'; render(); assert.equal(timers.size, 0);
  query = 'lavar'; render(); fire(); assert.equal(requests.length, 1);
  query = 'comer'; render(); assert.equal(requests[0].signal.aborted, true); fire();
  requests[0].resolve([pictogramFixture(1)]); await tick(); assert.equal(render().state.status, 'loading');
  requests[1].resolve([pictogramFixture(2)]); await tick(); assert.equal(render().state.pictograms[0].idArasaac, 2);
  query = 'servir'; render(); fire(); requests[2].reject(new PictogramsError('invalid-response')); await tick();
  assert.equal(render().state.status, 'invalid-response'); render().retry(); render(); fire();
  requests[3].resolve([]); await tick(); assert.deepEqual(render().state.pictograms, []);
  query = 'recoger'; render(); fire(); epoch++; owner = undefined; render();
  requests[4].resolve([pictogramFixture()]); await tick(); assert.equal(requests[4].signal.aborted, true);
  cleanups.forEach(fn => fn?.());
});

test('shared step form renders add/edit hierarchy, preloads values and preserves all controlled callbacks', () => {
  for (const mode of ['create', 'edit']) {
    const calls = []; const picto = pictogramFixture();
    const props = { mode, text: 'Texto actual', pictogram: picto, touched: false,
      onChangeText: value => calls.push(['text', value]), onBlur: () => calls.push(['blur']),
      onSelect: value => calls.push(['select', value]), onSave: () => calls.push(['save']), onClose: () => calls.push(['close']) };
    const tree = stepFormDialog(props); const all = nodes(tree);
    assert.equal(tree.props.title, mode === 'create' ? 'Agregar paso' : 'Editar paso');
    assert.equal(tree.props.description, mode === 'create' ? 'Completa la información para añadir este paso a la actividad.' : 'Actualiza la información de este paso.');
    assert.equal(tree.props.showClose, true); assert.equal(tree.props.avoidKeyboard, true);
    assert.ok(all.some(n => n.type === 'Heading' && n.props.title === 'Nombre del paso' && n.props.icon === 'pencil'));
    const input = all.find(n => n.type === 'Input');
    assert.equal(input.props.value, 'Texto actual'); assert.equal(input.props.maxLength, 120); assert.equal(input.props.multiline, true);
    assert.equal(input.props.accessibilityLabel, 'Nombre del paso');
    const picker = all.find(n => n.type === 'PictogramPicker');
    assert.equal(picker.props.text, props.text); assert.equal(picker.props.selected, picto);
    assert.ok(!all.some(n => n.type === 'Attribution'));
    input.props.onChangeText('Texto cambiado'); input.props.onBlur(); picker.props.onSelect(pictogramFixture(124));
    assert.deepEqual(calls.map(c => c[0]), ['text', 'blur', 'select']); // No save during input/selection.
    const save = all.find(n => n.type === 'Button' && n.props.label !== 'Cancelar');
    assert.equal(save.props.label, mode === 'create' ? 'Guardar' : 'Guardar cambios'); assert.equal(save.props.disabled, false);
    save.props.onPress(); all.find(n => n.type === 'Button' && n.props.label === 'Cancelar').props.onPress(); tree.props.onClose();
    assert.deepEqual(calls.slice(-3), [['save'], ['close'], ['close']]);
    for (const text of [' ', 'x'.repeat(121)]) {
      const invalid = nodes(stepFormDialog({ ...props, text, touched: true }));
      assert.equal(invalid.find(n => n.type === 'Button' && n.props.label !== 'Cancelar').props.disabled, true);
      assert.ok(invalid.some(n => n.props?.accessibilityRole === 'alert'));
    }
  }
});

test('delete confirmation uses one destructive action, singular/plural copy and a decorative vector trash', () => {
  for (const count of [1, 3]) {
    let confirmed = 0; let cancelled = 0;
    const tree = deleteStepsDialog({ count, onConfirm: () => confirmed++, onClose: () => cancelled++ });
    assert.equal(tree.props.centered, true); assert.equal(tree.props.showClose, true);
    assert.equal(tree.props.title, count === 1 ? '¿Estás seguro de que quieres eliminar este paso?' : '¿Estás seguro de que quieres eliminar estos 3 pasos?');
    assert.ok(text(tree).includes(count === 1 ? 'Este paso se eliminará' : 'Estos pasos se eliminarán'));
    const trash = nodes(tree.props.decoration).find(n => n.type === 'Icon');
    assert.equal(trash.props.name, 'trash'); assert.equal(trash.props.color, tokens.themes.light.colors.destructive.default);
    assert.equal(tree.props.compact, true);
    assert.equal(tree.props.decoration.props.style[1].backgroundColor, tokens.themes.light.colors.destructive.surface);
    assert.equal(tree.props.decoration.props.importantForAccessibility, 'no-hide-descendants');
    const buttons = nodes(tree).filter(n => n.type === 'Button');
    assert.deepEqual(buttons.map(n => n.props.label), ['Cancelar', 'Eliminar']);
    assert.equal(buttons[0].props.variant, 'destructive-outline');
    assert.ok(buttons.every(n => n.props.size === 'modal'));
    assert.equal(buttons[1].props.variant, 'destructive');
    buttons[0].props.onPress(); assert.equal(cancelled, 1); assert.equal(confirmed, 0);
    buttons[1].props.onPress(); assert.equal(confirmed, 1);
  }
});

test('dialog actions stay in reading order and stack for small screens or enlarged text', () => {
  let dimensions = { width: 390, fontScale: 1 };
  const actions = load('components/carer/step-dialog-actions.tsx', { ...styling,
    'react-native': { View: 'View', StyleSheet: { create: x => x }, useWindowDimensions: () => dimensions },
    './continue-button': { ContinueButton: 'Button' } }).StepDialogActions;
  const style = list => Object.assign({}, ...list.filter(Boolean));
  for (const [width, fontScale, direction] of [[390,1,'row'],[320,1,'column'],[390,1.5,'column']]) {
    dimensions = { width, fontScale };
    const tree = actions({ label: 'Guardar cambios', onConfirm() {}, onCancel() {} });
    assert.equal(style(tree.props.style).flexDirection, direction);
    assert.deepEqual(nodes(tree).filter(n => n.type === 'Button').map(n => n.props.label), ['Cancelar', 'Guardar cambios']);
  }
  const renewal = nodes(actions({ label: 'Sí, renovar', secondaryVariant: 'destructive-outline', onConfirm() {}, onCancel() {} }))
    .filter(n => n.type === 'Button');
  assert.deepEqual(renewal.map(n => n.props.variant), ['destructive-outline', 'primary']);
  assert.ok(renewal.every(n => n.props.size === 'modal'));
  const unchanged = nodes(actions({ label: 'Guardar cambios', onConfirm() {}, onCancel() {} })).filter(n => n.type === 'Button');
  assert.deepEqual(unchanged.map(n => n.props.variant), ['secondary', 'primary']);
});

test('button variants preserve primary defaults and modal targets, using separate destructive tokens with accessible large text', () => {
  const flatten = styles => Object.assign({}, ...styles.filter(Boolean));
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(value => parseInt(value,16)/255).map(value => value <= 0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4);
    return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  };
  for (const theme of Object.values(tokens.themes)) {
    const component = load('components/carer/continue-button.tsx', { ...styling,
      '@/theme/use-theme': { useAppTheme: () => theme } }).ContinueButton;
    const primary = component({ label: 'Continuar' });
    assert.equal(flatten(primary.props.style({ pressed: false })).backgroundColor, theme.colors.action.primary);
    assert.equal(flatten(primary.props.style({ pressed: true })).backgroundColor, theme.colors.action.pressed);
    assert.equal(primary.props.accessibilityRole, 'button');
    for (const variant of ['primary','secondary','destructive','destructive-outline']) {
      const tree = component({ label: 'Guardar cambios', variant, size: 'modal' });
      const surface = flatten(tree.props.style({ pressed: false }));
      const label = nodes(tree).find(n => n.type === 'Text'); const color = flatten(label.props.style).color;
      const a = luminance(color), b = luminance(surface.backgroundColor);
      const destructive = variant.startsWith('destructive');
      assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05) >= (destructive ? 3 : 4.5), `${theme.scheme} ${variant}`);
      if (destructive) {
        assert.ok(flatten(label.props.style).fontSize >= 19);
        assert.equal(flatten(label.props.style).fontFamily, tokens.typography.family.bold);
      } else assert.equal(flatten(label.props.style).fontSize, tokens.typography.size.md);
      assert.equal(surface.paddingHorizontal, tokens.spacing.md);
      assert.equal(surface.paddingVertical, tokens.spacing.sm);
      assert.ok(surface.minHeight >= tokens.sizes.touchTarget);
      assert.equal(surface.backgroundColor, variant === 'secondary' || variant === 'destructive-outline' ? theme.colors.surface.elevated : variant === 'destructive' ? theme.colors.destructive.default : theme.colors.action.primary);
      if (variant === 'destructive') assert.equal(color, '#FFFFFF');
      if (variant === 'destructive-outline') {
        assert.equal(color, theme.colors.destructive.default);
        assert.equal(surface.borderColor, theme.colors.destructive.default);
      }
      const disabled = component({ label: 'Acción', variant, disabled: true });
      assert.equal(disabled.props.disabled, true); assert.equal(disabled.props.accessibilityState.disabled, true);
    }
  }
});

test('dialog retains default presentation and accessible focus/back, with optional close and keyboard support for steps', () => {
  let platform = 'android'; let closed = 0; const focus = [];
  const dialog = load('components/carer/activity-dialog.tsx', { ...styling,
    react: { useRef: value => ({ current: value }) }, './area-icon': { AreaIcon: 'Icon' },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'Scroll', KeyboardAvoidingView: 'Keyboard',
      StyleSheet: { create: x => x }, Platform: { get OS() { return platform; } },
      findNodeHandle: node => node?.tag, AccessibilityInfo: { setAccessibilityFocus: tag => focus.push(tag) } },
  }).ActivityDialog;
  const plain = dialog({ title: 'Hora de la actividad', onClose: () => closed++, children: 'Contenido' });
  assert.equal(plain.props.animationType, 'none'); assert.ok(!nodes(plain).some(n => n.type === 'Pressable' || n.type === 'Keyboard'));
  const heading = nodes(plain).find(n => n.props?.accessibilityRole === 'header');
  heading.props.ref.current = { tag: 42 }; plain.props.onShow(); assert.deepEqual(focus, [42]);
  plain.props.onRequestClose(); assert.equal(closed, 1);
  for (const os of ['android','ios']) {
    platform = os;
    const tree = dialog({ title: 'Agregar paso', onClose: () => closed++, showClose: true, avoidKeyboard: true,
      description: 'Descripción auxiliar', children: 'Contenido' });
    assert.equal(nodes(tree).find(n => n.type === 'Keyboard').props.behavior, os === 'ios' ? 'padding' : 'height');
    const close = nodes(tree).find(n => n.type === 'Pressable');
    assert.equal(close.props.accessibilityLabel, 'Cancelar y cerrar diálogo');
    assert.ok(Object.assign({}, ...close.props.style({ pressed: false })).width >= tokens.sizes.touchTarget);
    close.props.onPress();
    nodes(tree).find(n => n.props?.accessibilityViewIsModal).props.onAccessibilityEscape();
  }
  assert.equal(closed, 5);
});

test('creation serializes only final definition data, requires one step, and accepts many steps without a product maximum', () => {
  const step = { key: 'temporary-99', orden: 20, descripcion: 'Texto final', pictograma: pictogramFixture(), selected: true };
  assert.deepEqual(createUtils.createActivityInput(' Desayuno ', 7 * 60, bread, [step]), {
    nombre: 'Desayuno', hora: '07:00', codigoIcono: 'bread', pasos: [{ descripcion: 'Texto final', idArasaac: 123 }],
  });
  assert.equal(createUtils.createActivityInput('A', 0, bread, [{ ...step, pictograma: null }]).hora, '00:00');
  assert.equal(createUtils.createActivityInput('A', 1439, bread, Array(1000).fill(step)).pasos.length, 1000);
  for (const args of [['',0,bread,[step]],['A',null,bread,[step]],['A',1440,bread,[step]],['A',0,null,[step]],
    ['A',0,bread,[]],['A',0,bread,[{...step,descripcion:' '}]],['A',0,bread,[{...step,pictograma:{idPictograma:2,nombre:'Legacy'}}]]]) {
    assert.ok(createUtils.activityInputError(...args)); assert.throws(() => createUtils.createActivityInput(...args));
  }
});

test('creation service posts once, validates 201, and treats transport/5xx/malformed success as uncertain', async () => {
  class HttpError extends Error { constructor(status,codigo){super('safe');this.status=status;this.codigo=codigo;} }
  const input=createUtils.createActivityInput('A',0,bread,[{key:'one',orden:1,descripcion:'Paso',pictograma:null}]);
  let calls=[];let failure;let response={status:201,data:{idActividad:27,nombre:'A',hora:'00:00',codigoIcono:'bread'}};
  const api=load('services/activities.ts',{'./private-http':{PrivateHttpError:HttpError,getAuthenticatedHttpClient:()=>({
    post:async(...args)=>{calls.push(args);if(failure)throw failure;return response;}})},'@/utils/activities':load('utils/activities.ts')});
  const signal=new AbortController().signal;
  assert.equal((await api.createActivity(12,input,signal)).idActividad,27);
  assert.deepEqual(calls[0],['/api/perfiles/12/actividades',input,{signal,authReplaySafe:true}]);
  for(const [status,codigo,kind] of [[400,'SOLICITUD_INVALIDA','validation'],[400,'ICONO_NO_ENCONTRADO','icon'],
    [400,'PICTOGRAMA_INVALIDO','pictogram'],[404,'PERFIL_NO_ENCONTRADO','not-found'],[409,'CONFLICTO_CREACION','conflict'],
    [503,'PICTOGRAMAS_NO_DISPONIBLES','unavailable'],[500,'ERROR_INTERNO','uncertain'],[401,'SESION_INVALIDA','access']]) {
    failure=new HttpError(status,codigo);const before=calls.length;
    await assert.rejects(api.createActivity(12,input),e=>e.kind===kind);assert.equal(calls.length,before+1);
  }
  failure=new Error('private body');await assert.rejects(api.createActivity(12,input),e=>e.kind==='uncertain'&&!e.message.includes('private'));
  failure=undefined;response={status:201,data:{}};await assert.rejects(api.createActivity(12,input),e=>e.kind==='uncertain');
  response={status:200,data:{}};await assert.rejects(api.createActivity(12,input),e=>e.kind==='uncertain');
});

test('creation hook blocks synchronous double submit, keeps errors local, and ignores late navigation after blur/session change', async () => {
  const slots=[];let cursor=0;let focus;let epoch=1;let status='authenticated';let created=0;const requests=[];
  class CreateError extends Error { constructor(kind){super(kind);this.kind=kind;} }
  const hook=load('hooks/use-create-activity.ts',{
    react:{useRef:initial=>{const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useCallback:fn=>fn,
      useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=v;}];}},
    'expo-router':{useFocusEffect:fn=>{focus=fn;}},
    '@/context/session':{useSession:()=>({manager:{revision:()=>epoch,getSnapshot:()=>({status})}})},
    '@/services/activities':{CreateActivityError:CreateError,createActivity:(id,input,signal)=>new Promise((resolve,reject)=>requests.push({id,input,signal,resolve,reject}))},
  }).useCreateActivity;
  const render=()=>{cursor=0;return hook(12,()=>created++);};
  render();const blur=focus();const input={nombre:'A',hora:'00:00',codigoIcono:'bread',pasos:[{descripcion:'Paso',idArasaac:null}]};
  let view=render();const a=view.submit(input);void view.submit(input);assert.equal(requests.length,1);assert.equal(render().sending,true);
  requests[0].reject(new CreateError('validation'));await a;assert.equal(render().error.kind,'validation');assert.equal(render().sending,false);
  assert.equal(input.pasos[0].descripcion,'Paso');assert.equal(created,0);
  const b=render().submit(input);epoch++;requests[1].resolve({idActividad:27});await b;assert.equal(created,0);
  // A separate focused attempt is abandoned; abort is never evidence of server rollback.
  const c=render().submit(input);blur();assert.equal(requests[2].signal.aborted,true);requests[2].resolve({idActividad:28});await c;assert.equal(created,0);
  render();focus();const d=render().submit(input);requests[3].resolve({idActividad:29});await d;
  assert.equal(created,1);assert.equal(render().error,null);
  await render().submit(input);assert.equal(requests.length,4); // Success remains terminal until navigation unmounts.
});

test('activity cards show real name/time and local icon fallback without completion or fake actions', () => {
  const surfaces=load('utils/activity-icon-surface.ts',{'@/theme/tokens':tokens});
  const component=load('components/carer/activity-summary-card.tsx',{...styling,
    './account-layout':{accountStyles:{body:{textAlign:'center'},small:{}}},
    react:{useState:initial=>[initial,()=>{}]},'@/constants/activity-icons':{resolveActivityIcon:code=>code==='bread'?'local-bread':undefined},
    '@/utils/activity-draft':draftUtils,'./area-icon':{AreaIcon:'Icon'},
    '@/utils/activity-icon-surface':surfaces,
  }).ActivitySummaryCard;
  const card=component({index:0,activity:{idActividad:27,nombre:'Desayuno',hora:'07:00',codigoIcono:'bread'}});
  assert.ok(text(card).includes('Desayuno'));assert.ok(text(card).includes('07:00 a. m.'));
  assert.equal(nodes(card).find(n=>n.type==='Image').props.source,'local-bread');
  assert.ok(!nodes(card).some(n=>n.props?.onPress||n.props?.accessibilityRole==='button'));
  const fallback=component({index:1,activity:{idActividad:28,nombre:'A',hora:'23:59',codigoIcono:null}});
  assert.ok(nodes(fallback).some(n=>n.type==='Icon'));assert.ok(!text(fallback).includes('%'));
  const flatten=styles=>Object.assign({},...styles.filter(Boolean));
  for(const tree of [card,fallback]) {
    for(const label of nodes(tree).filter(n=>n.type==='Text')) {
      assert.equal(flatten(label.props.style).textAlign,'left');
      assert.equal(label.props.numberOfLines,undefined);assert.equal(label.props.allowFontScaling,undefined);
    }
  }
  const first=nodes(card).find(n=>n.props?.importantForAccessibility==='no-hide-descendants');
  assert.equal(flatten(first.props.style).backgroundColor,tokens.colors.yellow.light);
  const changedId=component({index:0,activity:{idActividad:999,nombre:'Nombre largo que conserva espacio para el texto',hora:'23:59',codigoIcono:null}});
  const surface=nodes(changedId).find(n=>n.props?.importantForAccessibility==='no-hide-descendants');
  assert.equal(flatten(surface.props.style).backgroundColor,tokens.colors.yellow.light);
  assert.equal(flatten(surface.props.style).flexShrink,0);
});

test('activity icon surfaces repeat the five existing light families solely by zero-based position', () => {
  const {getActivityIconSurface}=load('utils/activity-icon-surface.ts',{'@/theme/tokens':tokens});
  const expected=[tokens.colors.yellow.light,tokens.colors.green.light,tokens.colors.orange.light,tokens.colors.blue.light,tokens.colors.purple.light];
  assert.deepEqual(Array.from({length:10},(_,index)=>getActivityIconSurface(index)),[...expected,...expected]);
  assert.equal(getActivityIconSurface(1002),expected[2]);
});

test('success modal uses the provided asset, profile name and non-destructive modal actions; close/back share View activities', () => {
  let another=0;let viewed=0;
  const modal=load('components/carer/activity-created-modal.tsx',{...styling,
    '@/assets/illustrations/carer-success.png':'@/assets/illustrations/carer-success.png',
    './activity-dialog':{ActivityDialog:'Dialog'},'./step-dialog-actions':{StepDialogActions:'Actions'},
  }).ActivityCreatedModal;
  const tree=modal({profileName:'Perfil real',onCreateAnother:()=>another++,onViewActivities:()=>viewed++});
  assert.equal(tree.props.centered,true);assert.equal(tree.props.showClose,true);
  assert.equal(tree.props.closeLabel,'Ver actividades y cerrar');
  assert.equal(text(tree.props.title),'¡Actividad creada\ncon éxito!');
  assert.equal(tree.props.description,'La actividad se ha agregado a la agenda de Perfil real.');
  assert.equal(tree.props.decoration.props.source,'@/assets/illustrations/carer-success.png');
  assert.ok(fs.existsSync(path.join(__dirname,'../assets/illustrations/carer-success.png')));
  assert.equal(tree.props.decoration.props.contentFit,'contain');
  const actions=nodes(tree).find(node=>node.type==='Actions');
  assert.equal(actions.props.secondaryLabel,'Crear otra');assert.equal(actions.props.label,'Ver actividades');
  assert.ok(!actions.props.destructive);
  const rendered=dialogActions(actions.props);const buttons=nodes(rendered).filter(node=>node.type==='Button');
  assert.deepEqual(buttons.map(node=>node.props.label),['Crear otra','Ver actividades']);
  assert.deepEqual(buttons.map(node=>node.props.variant),['secondary','primary']);
  buttons[0].props.onPress();assert.equal(another,1);assert.equal(viewed,0);
  buttons[1].props.onPress();tree.props.onClose();assert.equal(viewed,2);
  const Dialog=load('components/carer/activity-dialog.tsx',{...styling,
    react:{useRef:()=>({current:null})},'./area-icon':{AreaIcon:'Icon'},
  }).ActivityDialog;
  const native=Dialog(tree.props);
  native.props.onRequestClose();assert.equal(viewed,3);
  const close=nodes(native).find(n=>n.props?.accessibilityLabel==='Ver actividades y cerrar');
  close.props.onPress();assert.equal(viewed,4);
  nodes(native).find(n=>n.props?.accessibilityViewIsModal).props.onAccessibilityEscape();assert.equal(viewed,5);
});

test('FAB keeps one accessible creation entry, fixed circular target and semantic colors in both themes', () => {
  for(const theme of Object.values(tokens.themes)) {
    const component=load('components/carer/create-activity-button.tsx',{...styling,
      '@/theme/use-theme':{useAppTheme:()=>theme},'./area-icon':{AreaIcon:'Icon'},'./continue-button':{ContinueButton:'Button'},
    }).CreateActivityButton;
    const calls=[];const tree=component({id:12,floating:true,onCreateActivity:id=>calls.push(id)});
    assert.equal(tree.props.accessibilityRole,'button');assert.equal(tree.props.accessibilityLabel,'Nueva actividad');
    const style=Object.assign({},...tree.props.style({pressed:false}));
    assert.ok(style.width>=tokens.sizes.touchTarget);assert.equal(style.width,style.height);assert.equal(style.borderRadius,style.width/2);
    assert.equal(style.backgroundColor,theme.colors.action.primary);
    assert.equal(nodes(tree).find(n=>n.type==='Icon').props.name,'plus');
    assert.ok(!nodes(tree).some(n=>n.type==='Text'));
    tree.props.onPress();assert.deepEqual(calls,[12]);
    const full=component({id:12,onCreateActivity:id=>calls.push(id)});
    assert.equal(full.type,'Button');assert.equal(full.props.label,'Nueva actividad');
    const disabled=component({id:12,floating:true});assert.equal(disabled.props.disabled,true);assert.equal(disabled.props.onPress,undefined);
  }
});
