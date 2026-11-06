import { parseActivities, type ActivitySummary } from './activities';
import { parseProfile, type UserProfile } from './profiles';

export type AgendaActivity = ActivitySummary & { estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' };
export type AgendaDay = { fecha: string; zonaHoraria: string; actualizarEnSegundos: number };
export type UserAgenda = AgendaDay & { perfil: UserProfile; actividades: AgendaActivity[] };
export function parseAgendaDay(value: unknown): AgendaDay {
  if (!value || typeof value !== 'object') throw new Error('Agenda inválida.');
  const raw = value as AgendaDay;
  if (typeof raw.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.fecha)
    || !Number.isFinite(Date.parse(raw.fecha + 'T12:00:00Z')) || new Date(raw.fecha + 'T12:00:00Z').toISOString().slice(0, 10) !== raw.fecha
    || typeof raw.zonaHoraria !== 'string' || !raw.zonaHoraria
    || !Number.isInteger(raw.actualizarEnSegundos) || raw.actualizarEnSegundos <= 0 || raw.actualizarEnSegundos > 90_000) throw new Error('Agenda inválida.');
  // Reject an unknown zone rather than silently displaying the handset's calendar day.
  new Intl.DateTimeFormat('es', { timeZone: raw.zonaHoraria }).format();
  return { fecha: raw.fecha, zonaHoraria: raw.zonaHoraria, actualizarEnSegundos: raw.actualizarEnSegundos };
}
export function parseUserAgenda(value: unknown): UserAgenda {
  const day = parseAgendaDay(value);
  const raw = value as UserAgenda;
  const base = parseActivities(raw);
  return { ...day, perfil: parseProfile(raw.perfil),
    actividades: base.actividades.map((activity, index) => {
      const estado = raw.actividades[index].estado;
      if (!['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA'].includes(estado)) throw new Error('Agenda inválida.');
      return { ...activity, estado };
    }) };
}
export function formatAgendaDate(fecha: string) {
  const text = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(fecha + 'T12:00:00Z'));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
export const agendaStatusLabel = (estado: AgendaActivity['estado']) => estado === 'COMPLETADA' ? 'completada' : estado === 'EN_PROGRESO' ? 'en progreso' : 'pendiente';
