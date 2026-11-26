import { getAuthenticatedHttpClient, PrivateHttpError, type PrivateRequestOptions } from './private-http';
import { parseEditableActivity, type EditActivityInput } from '@/utils/activity-edit';

const path = (profile: number, id: number) => `/api/perfiles/${profile}/actividades/${id}`;

export class ActivityEditError extends Error {
  constructor(readonly kind: 'not-found' | 'conflict' | 'rejected' | 'uncertain') {
    super(kind === 'not-found' ? 'Esta actividad no está disponible.'
      : kind === 'conflict' ? 'La actividad cambió en otra sesión.'
      : kind === 'rejected' ? 'No pudimos guardar los cambios. Revisa los datos e inténtalo de nuevo.'
      : 'No pudimos confirmar el guardado. Consulta la versión guardada antes de reintentar.');
  }
}

export async function getEditableActivity(profile: number, id: number, expectedRevision: number, signal: AbortSignal) {
  try {
    const { data } = await getAuthenticatedHttpClient().get(path(profile, id), { signal, expectedRevision } as PrivateRequestOptions);
    return parseEditableActivity(data, id);
  } catch (error) {
    if (error instanceof PrivateHttpError && error.status === 404) throw new ActivityEditError('not-found');
    throw error;
  }
}

export async function updateActivity(profile: number, id: number, revision: number, input: EditActivityInput,
                                     expectedRevision: number, signal: AbortSignal) {
  try {
    const { data } = await getAuthenticatedHttpClient().put(path(profile, id), { ...input, revision },
      { signal, expectedRevision, authReplaySafe: true } as PrivateRequestOptions);
    return parseEditableActivity(data, id);
  } catch (error) {
    if (error instanceof PrivateHttpError) {
      if (error.status === 404) throw new ActivityEditError('not-found');
      if (error.status === 409 && error.codigo === 'ACTIVIDAD_MODIFICADA') throw new ActivityEditError('conflict');
      if (error.status === 400 || error.status === 409 || error.status === 401 || error.status === 403)
        throw new ActivityEditError('rejected');
    }
    throw new ActivityEditError('uncertain');
  }
}
