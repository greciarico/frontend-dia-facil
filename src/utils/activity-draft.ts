export type StepPictogram = { idPictograma?: number; nombre: string; fuente?: 'ARASAAC'; idArasaac?: number; urlImagen?: string } | null;
export function sameStepPictogram(a: StepPictogram, b: StepPictogram) {
  if (!a || !b) return a === b;
  return a.idArasaac !== undefined || b.idArasaac !== undefined
    ? a.idArasaac === b.idArasaac : a.idPictograma === b.idPictograma;
}
export function parseStepPictogram(value: unknown): StepPictogram {
  if (value === null) return null;
  if (!object(value) || typeof value.nombre !== 'string' || !value.nombre.trim() || value.nombre.length > 80) throw new Error('invalid-response');
  const local = id(value.idPictograma) ? value.idPictograma : undefined;
  if (value.idPictograma !== undefined && !local) throw new Error('invalid-response');
  if (value.idArasaac !== undefined && value.idArasaac !== null) {
    if (!id(value.idArasaac) || value.fuente !== 'ARASAAC'
      || value.urlImagen !== `https://static.arasaac.org/pictograms/${value.idArasaac}/${value.idArasaac}_300.png`) throw new Error('invalid-response');
    return { ...(local ? { idPictograma: local } : {}), nombre: value.nombre, fuente: 'ARASAAC', idArasaac: value.idArasaac, urlImagen: value.urlImagen };
  }
  if (!local || value.fuente === 'ARASAAC') throw new Error('invalid-response');
  // Legacy relative URLs are intentionally not renderable.
  return { idPictograma: local, nombre: value.nombre };
}
export type TemplateStep = { orden: number; descripcion: string; pictograma: StepPictogram };
export type ActivityTemplate = { idPlantillaActividad: number; nombre: string; pasos: TemplateStep[] };
export type DraftStep = TemplateStep & { key: string };
export type StepsDraft = { steps: DraftStep[]; personalized: boolean; source: string | null; nextKey: number; editing: boolean };
export const initialStepsDraft: StepsDraft = { steps: [], personalized: false, source: null, nextKey: 1, editing: false };
export const maximumStepOrder = 65535; // SMALLINT UNSIGNED, not a product limit.
export function stepDescriptionError(value: string): string | undefined {
  if (!value.trim()) return 'Escribe qué debe hacer en este paso.';
  if (value.length > 120) return 'El paso debe tener como máximo 120 caracteres.';
}
function id(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647; }
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object'; }
export function parseActivityTemplate(value: unknown): ActivityTemplate | null {
  if (!object(value) || !('plantilla' in value)) throw new Error('invalid-response');
  if (value.plantilla === null) return null;
  const t = value.plantilla;
  if (!object(t) || !id(t.idPlantillaActividad) || typeof t.nombre !== 'string' || !t.nombre.trim() || t.nombre.length > 80
    || !Array.isArray(t.pasos) || t.pasos.length > maximumStepOrder) throw new Error('invalid-response');
  let previous = 0;
  const pasos = t.pasos.map((p: unknown): TemplateStep => {
    if (!object(p) || typeof p.orden !== 'number' || !Number.isInteger(p.orden) || p.orden <= previous || p.orden > maximumStepOrder
      || typeof p.descripcion !== 'string' || stepDescriptionError(p.descripcion)) throw new Error('invalid-response');
    previous = p.orden;
    const pictograma = parseStepPictogram(p.pictograma);
    return { orden: p.orden, descripcion: p.descripcion, pictograma };
  });
  return { idPlantillaActividad: t.idPlantillaActividad, nombre: t.nombre, pasos };
}
export function templateFingerprint(template: ActivityTemplate) { return JSON.stringify(template); }
export function stepsMatchTemplate(steps: DraftStep[], template: ActivityTemplate) {
  return steps.length === template.pasos.length && steps.every((step, index) => {
    const proposed = template.pasos[index];
    return step.descripcion === proposed.descripcion && sameStepPictogram(step.pictograma, proposed.pictograma);
  });
}
type DraftAction = { type: 'suggest'; template: ActivityTemplate | null } | { type: 'apply'; template: ActivityTemplate }
  | { type: 'editing'; open: boolean } | { type: 'save'; key?: string; description: string; pictograma?: StepPictogram }
  | { type: 'remove'; key: string } | { type: 'move'; key: string; direction: -1 | 1 }
  | { type: 'removeMany'; keys: string[] }
  | { type: 'reorder'; keys: string[] };
export function stepsDraftReducer(state: StepsDraft, action: DraftAction): StepsDraft {
  if (action.type === 'editing') return state.editing === action.open ? state : { ...state, editing: action.open };
  if (action.type === 'suggest' || action.type === 'apply') {
    const template = action.template;
    if (!template || (action.type === 'suggest' && (state.personalized || state.editing || state.source === templateFingerprint(template)))) return state;
    let nextKey = state.nextKey;
    return { ...state, source: templateFingerprint(template), nextKey: nextKey + template.pasos.length,
      steps: template.pasos.map((step, index) => ({ ...step, pictograma: step.pictograma ? { ...step.pictograma } : null,
        orden: index + 1, key: `step-${nextKey++}` })) };
  }
  let steps = [...state.steps];
  if (action.type === 'removeMany') {
    const selected = new Set(action.keys);
    const remaining = steps.filter(step => !selected.has(step.key));
    if (remaining.length === steps.length) return state;
    return { ...state, personalized: true, steps: remaining.map((step, index) => ({ ...step, orden: index + 1 })) };
  }
  if (action.type === 'reorder') {
    if (action.keys.length !== steps.length || new Set(action.keys).size !== steps.length) return state;
    const byKey = new Map(steps.map(step => [step.key, step]));
    if (action.keys.some(key => !byKey.has(key)) || action.keys.every((key, index) => key === steps[index].key)) return state;
    return { ...state, personalized: true, steps: action.keys.map((key, index) => ({ ...byKey.get(key)!, orden: index + 1 })) };
  }
  if (action.type === 'save') {
    if (stepDescriptionError(action.description)) return state;
    const description = action.description.trim();
    if (action.key) {
      const index = steps.findIndex(step => step.key === action.key);
      if (index < 0) return state;
      const pictograma = action.pictograma === undefined ? steps[index].pictograma : action.pictograma;
      if (steps[index].descripcion === description && sameStepPictogram(steps[index].pictograma, pictograma)) return state;
      steps[index] = { ...steps[index], descripcion: description, pictograma: pictograma ? { ...pictograma } : null };
    } else {
      if (steps.length >= maximumStepOrder) return state;
      steps.push({ key: `step-${state.nextKey}`, descripcion: description, orden: steps.length + 1,
        pictograma: action.pictograma ? { ...action.pictograma } : null });
      return { ...state, steps, nextKey: state.nextKey + 1, personalized: true };
    }
  } else {
    const index = steps.findIndex(step => step.key === action.key);
    if (index < 0) return state;
    if (action.type === 'remove') steps.splice(index, 1);
    else {
      const target = index + action.direction;
      if (target < 0 || target >= steps.length) return state;
      [steps[index], steps[target]] = [steps[target], steps[index]];
    }
  }
  return { ...state, personalized: true, steps: steps.map((step, index) => ({ ...step, orden: index + 1 })) };
}
export type StepSelectionAction = { type: 'toggle'; key: string } | { type: 'clear' } | { type: 'prune'; validKeys: string[] };
export function stepSelectionReducer(state: Set<string>, action: StepSelectionAction): Set<string> {
  if (action.type === 'clear') return state.size ? new Set() : state;
  if (action.type === 'prune') {
    const valid = new Set(action.validKeys);
    const remaining = new Set([...state].filter(key => valid.has(key)));
    return remaining.size === state.size ? state : remaining;
  }
  const next = new Set(state);
  if (next.has(action.key)) next.delete(action.key); else next.add(action.key);
  return next;
}
export function formatActivityTime(minutes: number | null) {
  if (minutes === null) return 'Selecciona una hora';
  const hour = Math.floor(minutes / 60);
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'a. m.' : 'p. m.'}`;
}
export function localTimeDate(minutes: number | null) {
  const date = new Date();
  date.setHours(Math.floor((minutes ?? 0) / 60), (minutes ?? 0) % 60, 0, 0);
  return date;
}
export function localTimeMinutes(date: Date) { return date.getHours() * 60 + date.getMinutes(); }
