const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
function load(file, modules = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  new Function('require', 'exports', ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(id => {
    assert.ok(id in modules, 'Missing adapter ' + id);
    return modules[id];
  }, exports);
  return exports;
}

test('deletion confirms the latest revision, coalesces submissions and reconciles a lost response by reading', async () => {
  const tokens = load('theme/tokens.ts');
  const sent = [], removed = [], slots = [];
  let reads = 0, cursor = 0, effect, closed = 0, resolveDelete, rejectDelete, ids = [7];
  let definition = { nombre: 'Rutina', revision: 1, estadoHoy: 'EN_PROGRESO' };
  const manager = { revision: () => 3 };
  const Dialog = load('components/carer/delete-activity-dialog.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    react: {
      useCallback: fn => fn, useEffect: fn => { effect = fn; },
      useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useState: () => { const i = cursor++; return [slots[i], value => { slots[i] = value; }]; },
    },
    'react-native': { ActivityIndicator: 'Spinner', StyleSheet: { create: value => value }, View: 'View' },
    '@/components/app-text': { AppText: 'Text' }, '@/context/session': { useSession: () => ({ manager }) },
    '@/services/activity-edit': { getEditableActivity: async () => { reads++; return definition; }, ActivityEditError: Error },
    '@/services/activity-delete': { deleteFailure: error => error.message, deleteActivity: (...args) => {
      sent.push(args); return new Promise((resolve, reject) => { resolveDelete = resolve; rejectDelete = reject; });
    } },
    '@/services/activities': { getActivities: async () => ({ actividades: ids.map(idActividad => ({ idActividad })) }) },
    '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.themes.light },
    './account-layout': { accountStyles: { small: {} } }, './activity-dialog': { ActivityDialog: 'Dialog' },
    './area-icon': { AreaIcon: 'Icon' }, './continue-button': { ContinueButton: 'Button' },
    './step-dialog-actions': { StepDialogActions: 'Actions' },
  }).DeleteActivityDialog;
  const render = () => { cursor = 0; return Dialog({ profileId: 12, activityId: 7, person: 'Ana',
    onClose: () => closed++, onRemoved: message => removed.push(message) }); };
  const actions = () => nodes(render()).find(node => node.type === 'Actions').props;
  const tick = () => new Promise(resolve => setImmediate(resolve));

  assert.equal(actions().disabled, true);
  const cleanup = effect();
  await tick();
  assert.equal(reads, 1);
  const confirmation = render();
  assert.equal(confirmation.props.title, '¿Estás seguro de que deseas eliminar “Rutina” de la rutina de Ana?');
  assert.equal(confirmation.props.description, 'Esta acción no se puede deshacer.');
  assert.equal(confirmation.props.decoration.props.children.props.name, 'trash');
  assert.equal(actions().label, 'Eliminar');
  assert.equal(actions().destructive, true);
  assert.equal(actions().secondaryVariant, undefined);
  assert.ok(nodes(render()).some(node => node.props.children === 'Actividad en progreso'));
  actions().onCancel();
  assert.equal(closed, 1);
  assert.equal(sent.length, 0);

  actions().onConfirm(); actions().onConfirm();
  assert.equal(sent.length, 1);
  assert.equal(actions().loading, true);
  definition = { ...definition, revision: 2, estadoHoy: 'COMPLETADA' };
  rejectDelete(new Error('conflict'));
  await tick();
  assert.equal(reads, 2);
  assert.equal(sent.length, 1);
  assert.ok(nodes(render()).some(node => node.props.children === 'Actividad completada'));
  actions().onConfirm();
  assert.deepEqual(sent[1].slice(0, 4), [12, 7, 2, 3]);
  rejectDelete(new Error('uncertain'));
  await tick();
  assert.equal(actions().disabled, true);
  ids = [];
  nodes(render()).find(node => node.props.label === 'Comprobar listado').props.onPress();
  await tick();
  assert.equal(sent.length, 2);
  assert.deepEqual(removed, ['La actividad ya no aparece en la rutina.']);
  cleanup();
  assert.equal(typeof resolveDelete, 'function');
});
