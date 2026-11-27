const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
function load(file, modules = {}) {
  const out = {};
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  new Function('require', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(
    id => { assert.ok(id in modules, 'Missing adapter ' + id); return modules[id]; }, out);
  return out;
}
const asOf = '2026-11-26';
const day = (fecha = asOf) => ({ fecha, fechaActual: asOf, fechaMinima: '2026-11-01', zonaHoraria: 'America/Lima',
  actualizarEnSegundos: 60, tieneActividadesActivas: true, tieneHistorial: true,
  cobertura: 'COMPLETA', resumen: { total: 0, completadas: 0, enProgreso: 0, pendientes: 0, porcentaje: null },
  actividades: [] });

test('follow-up accepts a reliable zero, partial history and more than ten activities', () => {
  const { parseFollowUpDay } = load('services/follow-up.ts', {
    './private-http': {}, '@/utils/activities': load('utils/activities.ts'), '@/utils/activity-draft': load('utils/activity-draft.ts'),
  });
  assert.equal(parseFollowUpDay(day()).resumen.porcentaje, null);
  const past = { ...day('2026-11-11'), cobertura: 'PARCIAL', resumen: null };
  assert.equal(parseFollowUpDay(past, past.fecha).resumen, null);
  assert.throws(() => parseFollowUpDay({ ...past, resumen: day().resumen }, past.fecha));
  assert.throws(() => parseFollowUpDay(past, '2026-11-12'));
  const rows = Array.from({ length: 12 }, (_, index) => ({
    idActividad: index + 1, revision: 1, nombre: 'Rutina', hora: '08:00', codigoIcono: null,
    estado: index === 0 ? 'EN_PROGRESO' : 'PENDIENTE', pasosCompletados: 0, totalPasos: 1,
  }));
  const result = parseFollowUpDay({ ...day(), actividades: rows,
    resumen: { total: 12, completadas: 0, enProgreso: 1, pendientes: 11, porcentaje: 0 } });
  assert.equal(result.actividades.length, 12);
  assert.equal(result.resumen.porcentaje, 0);
});

test('follow-up empty states keep their actions and the summary exposes each status', () => {
  const jsx = (type, props) => ({ type, props });
  const tokens = load('theme/tokens.ts');
  const onRoutine = () => {};
  let fontScale = 1;
  const screen = load('components/carer/activity-follow-up.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    react: { useState: () => [], useRef: () => ({}), useEffect() {} },
    'react-native': { View: 'View', Pressable: 'Pressable', FlatList: 'List', StyleSheet: { create: value => value },
      Platform: { OS: 'android' }, RefreshControl: 'RefreshControl' },
    '@react-native-community/datetimepicker': {},
    '@/components/app-text': { AppText: 'Text' }, '@/context/session': {}, '@/services/follow-up': {},
    '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => tokens.themes.light },
    '@/theme/profile-appearance': { useEffectiveFontScale: () => fontScale },
    '@/utils/user-agenda': { formatAgendaDate: () => 'Jueves, 26 de noviembre' },
    './account-layout': { accountStyles: {} }, './activity-dialog': {}, './activity-summary-card': { ActivitySummaryCard: 'Card' },
    './activity-empty-state': { ActivityEmptyState: 'Empty' }, './area-icon': { AreaIcon: 'Icon' },
    './continue-button': { ContinueButton: 'Button' }, './step-pictogram': {},
  }).ActivityFollowUp;
  const render = data => screen({ data, onRoutine, status: 'ready' }).props.children[0].props;
  const noRoutine = render({ ...day(), tieneActividadesActivas: false, tieneHistorial: false });
  const empty = noRoutine.ListEmptyComponent.props.children.props;
  assert.equal(noRoutine.ListHeaderComponent, null);
  assert.equal(empty.title, 'Aún no hay seguimiento');
  assert.equal(empty.action.props.onPress, onRoutine);
  assert.equal(empty.action.props.variant, undefined);
  assert.equal(empty.action.props.leadingIcon, undefined);
  const emptyDate = render(day());
  assert.equal(emptyDate.ListEmptyComponent.props.children.props.title, 'No hay actividades para este día');
  assert.equal(emptyDate.ListEmptyComponent.props.children.props.action, undefined);
  const calendar = emptyDate.ListHeaderComponent.props.children[0];
  const dateButton = calendar.type(calendar.props).props.children[0].props.children[1];
  assert.equal(dateButton.props.accessibilityLabel, 'Seleccionar fecha. Hoy, jueves, 26 de noviembre');
  const result = render({ ...day(), resumen: { total: 4, completadas: 1, enProgreso: 1, pendientes: 2, porcentaje: 25 } });
  const progress = result.ListHeaderComponent.props.children.at(-1);
  const stats = progress.props.children.at(-1).props.children;
  assert.deepEqual(stats.map(stat => stat.type(stat.props).props.accessibilityLabel),
    ['1 completada', '1 en progreso', '2 pendientes']);
  for (const [estado, label, icon, color] of [
    ['COMPLETADA', 'Completada', 'completed', tokens.themes.light.colors.status.success],
    ['EN_PROGRESO', 'En progreso', 'inProgress', tokens.themes.light.colors.action.primary],
    ['PENDIENTE', 'Pendiente', 'pending', tokens.themes.light.colors.text.secondary],
  ]) {
    const card = result.renderItem({ item: { estado, pasosCompletados: 3, totalPasos: 5 }, index: 1 });
    assert.equal(card.props.appearance, undefined);
    assert.equal(card.props.onActions, undefined);
    assert.equal(typeof card.props.onPress, 'function');
    const content = card.props.followUp.content;
    const [statusText, progress] = content.type(content.props).props.children;
    const indicator = card.props.followUp.indicator;
    assert.equal(indicator.props.status, icon);
    assert.equal(indicator.type(indicator.props).props.style[1].borderColor, color);
    assert.equal(statusText.props.children, label);
    assert.equal(statusText.props.style[2].color, color);
    if (estado === 'EN_PROGRESO') {
      assert.equal(progress.props.children[0].props.children, '3 de 5 pasos completados');
      assert.equal(progress.props.children[1].props.children.props.style[1].width, '60%');
    } else {
      assert.equal(progress, undefined);
    }
  }
  fontScale = 2;
  assert.equal(stats[0].type(stats[0].props).props.style[1].flexBasis, '100%');
});

test('changing dates aborts earlier reads and keeps the first tab choice', async () => {
  const slots = [];
  const requests = [];
  const manager = { revision: () => 1 };
  let cursor = 0, focus;
  const hook = load('hooks/use-follow-up.ts', {
    react: {
      useCallback: fn => fn,
      useRef: value => { const index = cursor++; return slots[index] ??= { current: value }; },
      useState: () => { const index = cursor++; return [slots[index], value => {
        slots[index] = typeof value === 'function' ? value(slots[index]) : value;
      }]; },
    },
    'expo-router': { useFocusEffect: fn => { focus = fn; } },
    'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
    '@/context/session': { useSession: () => ({ manager }) },
    '@/services/follow-up': { getFollowUp: (_id, date, _revision, signal) => new Promise(resolve => requests.push({ date, signal, resolve })) },
  }).useFollowUp;
  const render = date => { cursor = 0; return hook(12, date, true); };
  const tick = () => new Promise(resolve => setImmediate(resolve));
  assert.equal(render().initialRoutine, undefined);
  let blur = focus();
  requests[0].resolve({ ...day(), tieneActividadesActivas: false, tieneHistorial: false });
  await tick();
  assert.equal(render().initialRoutine, true);
  blur();
  render('2026-11-25'); blur = focus(); blur();
  render('2026-11-24'); blur = focus();
  requests[2].resolve(day('2026-11-24'));
  requests[1].resolve(day('2026-11-25'));
  await tick();
  assert.equal(requests[1].signal.aborted, true);
  assert.equal(render('2026-11-24').state.data.fecha, '2026-11-24');
  assert.equal(render('2026-11-24').initialRoutine, true);
  blur();
});
