import { getAuthenticatedHttpClient, PrivateHttpError, type PrivateRequestOptions } from './private-http';

export type DeletedActivity = {
  idActividad: number;
  resultado: 'BORRADA' | 'RETIRADA';
  estadoHoy: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';
};

export async function deleteActivity(profileId: number, activityId: number, revision: number,
                                     expectedRevision: number, signal: AbortSignal): Promise<DeletedActivity> {
  const options: PrivateRequestOptions = { signal, expectedRevision, authReplaySafe: true, params: { revision } };
  const { data } = await getAuthenticatedHttpClient().delete(`/api/perfiles/${profileId}/actividades/${activityId}`, options);
  if (data?.idActividad !== activityId || (data.resultado !== 'BORRADA' && data.resultado !== 'RETIRADA')
    || !['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA'].includes(data.estadoHoy)) throw new Error('Respuesta inválida.');
  return data;
}

export function deleteFailure(error: unknown) {
  if (!(error instanceof PrivateHttpError)) return 'uncertain';
  if (error.status === 409 && error.codigo === 'ACTIVIDAD_MODIFICADA') return 'conflict';
  if (error.status === 404) return 'missing';
  return error.status === 400 || error.status === 401 || error.status === 403 ? 'rejected' : 'uncertain';
}
