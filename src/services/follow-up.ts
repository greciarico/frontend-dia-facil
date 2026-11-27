import { getAuthenticatedHttpClient, type PrivateRequestOptions } from './private-http';
import { parseActivities, type ActivitySummary } from '@/utils/activities';
import { parseStepPictogram, type StepPictogram } from '@/utils/activity-draft';

export type FollowUpActivity = ActivitySummary & {
  revision: number; estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA'; pasosCompletados: number; totalPasos: number;
};
export type FollowUpDay = {
  fecha: string; fechaMinima: string; fechaActual: string; zonaHoraria: string; actualizarEnSegundos: number;
  tieneActividadesActivas: boolean; tieneHistorial: boolean; cobertura: 'COMPLETA' | 'PARCIAL';
  resumen: { total: number; completadas: number; enProgreso: number; pendientes: number; porcentaje: number | null } | null;
  actividades: FollowUpActivity[];
};
export type FollowUpDetail = { fecha: string; actividad: FollowUpActivity;
  pasos: { posicion: number; descripcion: string; estado: 'PENDIENTE' | 'COMPLETADO' | 'SIN_REGISTRO'; pictograma: StepPictogram }[] };

const path = (profile: number) => `/api/perfiles/${profile}/seguimiento`;
const iso = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
function activity(raw: FollowUpActivity): FollowUpActivity {
  const base = parseActivities({ actividades: [raw] }).actividades[0];
  if (!count(raw.revision) || raw.revision < 1 || !['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA'].includes(raw.estado)
    || !count(raw.pasosCompletados) || !count(raw.totalPasos) || raw.pasosCompletados > raw.totalPasos)
    throw new Error('Respuesta de seguimiento inválida.');
  return { ...base, revision: raw.revision, estado: raw.estado, pasosCompletados: raw.pasosCompletados, totalPasos: raw.totalPasos };
}
export function parseFollowUpDay(data: FollowUpDay, date?: string): FollowUpDay {
  if (!data || !iso(data.fecha) || !iso(data.fechaMinima) || !iso(data.fechaActual)
    || data.fecha !== (date ?? data.fechaActual) || data.fecha < data.fechaMinima || data.fecha > data.fechaActual
    || !count(data.actualizarEnSegundos) || data.actualizarEnSegundos < 1 || typeof data.zonaHoraria !== 'string'
    || typeof data.tieneActividadesActivas !== 'boolean' || typeof data.tieneHistorial !== 'boolean'
    || !['COMPLETA', 'PARCIAL'].includes(data.cobertura) || !Array.isArray(data.actividades))
    throw new Error('Respuesta de seguimiento inválida.');
  const actividades = data.actividades.map(activity);
  if (new Set(actividades.map(item => item.idActividad)).size !== actividades.length)
    throw new Error('Respuesta de seguimiento inválida.');
  const r = data.resumen;
  if (data.cobertura === 'COMPLETA' ? !r || ![r.total, r.completadas, r.enProgreso, r.pendientes].every(count)
    || r.total !== actividades.length || r.total !== r.completadas + r.enProgreso + r.pendientes
    || (r.total === 0 ? r.porcentaje !== null : !count(r.porcentaje) || r.porcentaje > 100) : r != null)
    throw new Error('Resumen inválido.');
  return { ...data, actividades };
}
export async function getFollowUp(profile: number, date: string | undefined, expectedRevision: number, signal: AbortSignal) {
  const options: PrivateRequestOptions = { signal, expectedRevision, params: date ? { fecha: date } : undefined };
  const { data } = await getAuthenticatedHttpClient().get(path(profile), options);
  return parseFollowUpDay(data, date);
}
export async function getFollowUpDetail(profile: number, id: number, date: string, expectedRevision: number, signal: AbortSignal): Promise<FollowUpDetail> {
  const options: PrivateRequestOptions = { signal, expectedRevision, params: { fecha: date } };
  const { data } = await getAuthenticatedHttpClient().get(`${path(profile)}/${id}`, options);
  if (data?.fecha !== date || !Array.isArray(data.pasos)) throw new Error('Detalle inválido.');
  const definition = activity(data.actividad);
  if (definition.idActividad !== id || definition.totalPasos !== data.pasos.length) throw new Error('Detalle inválido.');
  const pasos = data.pasos.map((step: FollowUpDetail['pasos'][number], index: number) => {
    if (step?.posicion !== index + 1 || typeof step.descripcion !== 'string'
      || !['PENDIENTE', 'COMPLETADO', 'SIN_REGISTRO'].includes(step.estado)) throw new Error('Paso inválido.');
    return { ...step, pictograma: parseStepPictogram(step.pictograma) };
  });
  return { fecha: date, actividad: definition, pasos };
}
