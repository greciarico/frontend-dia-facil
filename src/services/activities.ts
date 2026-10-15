import { getAuthenticatedHttpClient, PrivateHttpError } from './private-http';
import { parseActivities } from '@/utils/activities';

export class ActivitiesError extends Error {
  constructor(readonly kind: 'not-found' | 'network' | 'invalid-response') {
    super(kind === 'not-found' ? 'No pudimos encontrar este perfil.'
      : 'No pudimos cargar las actividades. Inténtalo de nuevo.');
  }
}

export async function getActivities(id: number, signal?: AbortSignal) {
  try {
    const response = await getAuthenticatedHttpClient().get(`/api/perfiles/${id}/actividades`, { signal });
    if (response.status !== 200) throw new ActivitiesError('invalid-response');
    try { return parseActivities(response.data); }
    catch { throw new ActivitiesError('invalid-response'); }
  } catch (error) {
    if (error instanceof ActivitiesError) throw error;
    if (error instanceof PrivateHttpError && error.status === 404) throw new ActivitiesError('not-found');
    throw new ActivitiesError('network');
  }
}
