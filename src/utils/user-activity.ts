import { parseActivities } from './activities';
import { parseAgendaDay, type AgendaActivity, type AgendaDay } from './user-agenda';

export type UserActivity = AgendaActivity & { guiaInicialCompletada: boolean };
export type UserActivityDetail = AgendaDay & { actividad: UserActivity };
export function validActivityId(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : undefined;
}
export function userActivityHref(id: number) {
  return { pathname: '/actividades/[idActividad]' as const, params: { idActividad: String(id) } };
}
export function parseUserActivityDetail(value: unknown): UserActivityDetail {
  const day = parseAgendaDay(value);
  const raw = value as UserActivityDetail;
  const activity = raw.actividad;
  const base = parseActivities({ actividades: [activity] }).actividades[0];
  if (typeof activity.guiaInicialCompletada !== 'boolean' || !['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA'].includes(activity.estado)) {
    throw new Error('Detalle de actividad inválido.');
  }
  return { ...day, actividad: { ...base, estado: activity.estado, guiaInicialCompletada: activity.guiaInicialCompletada } };
}
/** Domain eligibility only. This increment does not expose any completion command. */
export function eligibleForDirectCompletion(activity: UserActivity) {
  return activity.guiaInicialCompletada && activity.estado !== 'COMPLETADA';
}
