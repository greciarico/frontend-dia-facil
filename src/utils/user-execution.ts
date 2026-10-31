import { parseAgendaDay, type AgendaDay } from './user-agenda';
import { parseStepPictogram, type StepPictogram } from './activity-draft';

export type ExecutionActivity = { idActividad: number; nombre: string; guiaInicialCompletada: boolean };
export type GuideStep = { idPasoActividad: number; posicion: number; descripcion: string; pictograma: StepPictogram; alcanzado: boolean; completado: boolean };
export type Guide = AgendaDay & { vigente: boolean; idEjecucion: number | null; estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';
  modoFinalizacion: 'GUIADA' | 'DIRECTA' | null; actividad: ExecutionActivity; pasos: GuideStep[] };
export type ExecutionFinished = { fecha: string; idEjecucion: number; estado: 'COMPLETADA'; modoFinalizacion: 'GUIADA' | 'DIRECTA'; actividad: ExecutionActivity };
const id = (value: unknown): value is number => Number.isInteger(value) && Number(value) > 0 && Number(value) <= 2147483647;
function activity(value: ExecutionActivity): ExecutionActivity {
  if (!value || !id(value.idActividad) || typeof value.nombre !== 'string' || !value.nombre.trim() || value.nombre.length > 80 || typeof value.guiaInicialCompletada !== 'boolean') throw new Error('Respuesta inválida.');
  return { idActividad: value.idActividad, nombre: value.nombre, guiaInicialCompletada: value.guiaInicialCompletada };
}
export function parseGuide(value: unknown): Guide {
  const day = parseAgendaDay(value), raw = value as Guide;
  if (typeof raw.vigente !== 'boolean' || !['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA'].includes(raw.estado)
    || !(raw.idEjecucion === null || id(raw.idEjecucion)) || ![null, 'GUIADA', 'DIRECTA'].includes(raw.modoFinalizacion)
    || (raw.estado === 'PENDIENTE') !== (raw.idEjecucion === null) || (raw.estado === 'COMPLETADA') !== (raw.modoFinalizacion !== null)
    || !Array.isArray(raw.pasos) || !raw.pasos.length) throw new Error('Respuesta inválida.');
  const ids = new Set<number>(); let closed = false;
  const pasos = raw.pasos.map((p, index) => {
    if (!p || !id(p.idPasoActividad) || ids.has(p.idPasoActividad) || p.posicion !== index + 1 || typeof p.descripcion !== 'string' || !p.descripcion.trim()
      || p.descripcion.length > 120 || typeof p.alcanzado !== 'boolean' || typeof p.completado !== 'boolean' || p.completado && !p.alcanzado
      || closed && p.alcanzado || raw.estado === 'PENDIENTE' && p.alcanzado) throw new Error('Respuesta inválida.');
    ids.add(p.idPasoActividad); if (!p.alcanzado || !p.completado) closed = true;
    return { idPasoActividad: p.idPasoActividad, posicion: p.posicion, descripcion: p.descripcion, pictograma: parseStepPictogram(p.pictograma), alcanzado: p.alcanzado, completado: p.completado };
  });
  if (raw.estado === 'EN_PROGRESO' && !pasos[0].alcanzado) throw new Error('Respuesta inválida.');
  return { ...day, vigente: raw.vigente, idEjecucion: raw.idEjecucion, estado: raw.estado, modoFinalizacion: raw.modoFinalizacion, actividad: activity(raw.actividad), pasos };
}
export function parseExecutionFinished(value: unknown): ExecutionFinished {
  const raw = value as ExecutionFinished;
  if (!raw || !id(raw.idEjecucion) || raw.estado !== 'COMPLETADA' || !['GUIADA', 'DIRECTA'].includes(raw.modoFinalizacion)
    || typeof raw.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.fecha) || !Number.isFinite(Date.parse(raw.fecha + 'T12:00:00Z'))
    || new Date(raw.fecha + 'T12:00:00Z').toISOString().slice(0, 10) !== raw.fecha) throw new Error('Respuesta inválida.');
  return { fecha: raw.fecha, idEjecucion: raw.idEjecucion, estado: raw.estado, modoFinalizacion: raw.modoFinalizacion, actividad: activity(raw.actividad) };
}
export function reachedFrontier(guide: Guide) { return guide.pasos.reduce((max, step, index) => step.alcanzado ? index : max, -1); }
export function guideHref(idActividad: number) { return { pathname: '/actividades/guia/[idActividad]' as const, params: { idActividad: String(idActividad) } }; }
