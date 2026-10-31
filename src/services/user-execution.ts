import { createUserHttpClient } from './device-access';
import { DeviceFailure } from './device-access-manager';
import { parseGuide, parseExecutionFinished, type Guide, type ExecutionFinished } from '@/utils/user-execution';

let client: ReturnType<typeof createUserHttpClient> | undefined;
const http = () => client ??= createUserHttpClient();
const base = (id: number) => `/api/usuario/actividades/${id}`;
export async function getGuide(id: number, signal?: AbortSignal, execution?: number): Promise<Guide> {
  const guide = parseGuide((await http().get(execution ? `${base(id)}/ejecuciones/${execution}` : `${base(id)}/guia`, { signal })).data);
  if (guide.actividad.idActividad !== id || execution !== undefined && guide.idEjecucion !== execution) throw new Error('Respuesta inválida.');
  return guide;
}
export type ExecutionOperation<T> = { write(): Promise<T>; recover(): Promise<T> };
export class UnconfirmedExecution extends Error {
  constructor(readonly snapshot?: Guide) { super('No pudimos confirmar el resultado. Comprueba tu conexión y vuelve a consultar.'); }
}
function known(error: unknown) { return error instanceof DeviceFailure && ['guide-conflict', 'not-found', 'invalid-access', 'rate', 'canceled'].includes(error.kind); }
export function recoveredOperation<T>(write: () => Promise<T>, read: () => Promise<Guide>, confirm: (guide: Guide) => T | undefined): ExecutionOperation<T> {
  const recover = async () => {
    try { const guide = await read(), result = confirm(guide); if (result === undefined) throw new UnconfirmedExecution(guide); return result; }
    catch (error) { if (error instanceof UnconfirmedExecution || known(error)) throw error; throw new UnconfirmedExecution(); }
  };
  return { recover, write: async () => {
    try { return await write(); } catch (error) { if (known(error)) throw error; return recover(); }
  } };
}
function sameDay(guide: Guide, fecha: string) { if (guide.fecha !== fecha || !guide.vigente) throw new DeviceFailure('guide-conflict', 'DIA_AGENDA_CAMBIADO'); }
function finished(guide: Guide, fecha: string): ExecutionFinished | undefined {
  if (guide.fecha === fecha && guide.estado === 'COMPLETADA') return parseExecutionFinished(guide);
  sameDay(guide, fecha); return undefined;
}
export function startGuideOperation(id: number, fecha: string): ExecutionOperation<Guide> {
  return recoveredOperation(async () => {
    const guide = parseGuide((await http().post(`${base(id)}/guia`, { fecha })).data);
    if (guide.actividad.idActividad !== id || guide.fecha !== fecha || guide.estado === 'PENDIENTE') throw new Error('Respuesta inválida.'); return guide;
  }, () => getGuide(id), guide => { sameDay(guide, fecha); return guide.estado === 'PENDIENTE' ? undefined : guide; });
}
export function advanceOperation(id: number, execution: number, step: number, fecha: string): ExecutionOperation<Guide> {
  return recoveredOperation(async () => {
    const guide = parseGuide((await http().put(`${base(id)}/ejecuciones/${execution}/pasos/${step}/completar`)).data);
    if (guide.actividad.idActividad !== id || guide.idEjecucion !== execution || guide.fecha !== fecha) throw new Error('Respuesta inválida.'); return guide;
  }, () => getGuide(id, undefined, execution), guide => {
    if (guide.estado === 'COMPLETADA') return guide;
    sameDay(guide, fecha); const index = guide.pasos.findIndex(p => p.idPasoActividad === step);
    return index >= 0 && guide.pasos[index].completado && guide.pasos[index + 1]?.alcanzado ? guide : undefined;
  });
}
export function finishGuideOperation(id: number, execution: number, step: number, fecha: string): ExecutionOperation<ExecutionFinished> {
  return finishOperation(id, fecha, () => http().post(`${base(id)}/ejecuciones/${execution}/finalizar-guiada`, { idPasoActual: step }), execution);
}
export function finishDirectOperation(id: number, fecha: string): ExecutionOperation<ExecutionFinished> {
  return finishOperation(id, fecha, () => http().post(`${base(id)}/finalizar-directa`, { fecha }));
}
function finishOperation(id: number, fecha: string, write: () => Promise<{ data: unknown }>, execution?: number) {
  return recoveredOperation(async () => {
    const result = parseExecutionFinished((await write()).data);
    if (result.actividad.idActividad !== id || result.fecha !== fecha || execution !== undefined && result.idEjecucion !== execution) throw new Error('Respuesta inválida.'); return result;
  }, () => getGuide(id, undefined, execution), guide => finished(guide, fecha));
}
