import { getAuthenticatedHttpClient, PrivateHttpError } from './private-http';
import { parseActivities } from '@/utils/activities';
import type { ActivityInput } from '@/utils/create-activity';
import type { PrivateRequestOptions } from './private-http';

export class CreateActivityError extends Error {
  constructor(readonly kind: 'validation' | 'not-found' | 'icon' | 'pictogram' | 'conflict' | 'unavailable' | 'uncertain' | 'access') {
    super(kind === 'validation' ? 'Revisa el nombre, la hora, el ícono y los pasos.'
      : kind === 'not-found' ? 'Este perfil ya no está disponible.'
      : kind === 'icon' ? 'Selecciona un ícono del catálogo.'
      : kind === 'pictogram' ? 'Cambia el pictograma no válido o deja el paso sin imagen.'
      : kind === 'conflict' ? 'No pudimos completar la creación. Inténtalo de nuevo.'
      : kind === 'unavailable' ? 'No pudimos validar los pictogramas. Inténtalo de nuevo.'
      : kind === 'access' ? 'No pudimos verificar tu acceso. Inténtalo de nuevo.'
      : 'No pudimos confirmar si la actividad se creó. Revisa las actividades antes de intentarlo de nuevo.');
  }
}
export async function createActivity(id: number, input: ActivityInput, signal?: AbortSignal) {
  try {
    // Only a renewable 401 rejected before execution may replay; never transport/5xx.
    const config: PrivateRequestOptions = { signal, authReplaySafe: true };
    const response = await getAuthenticatedHttpClient().post(`/api/perfiles/${id}/actividades`, input, config);
    if (response.status !== 201) throw new CreateActivityError('uncertain');
    return parseActivities({ actividades: [response.data] }).actividades[0];
  } catch (error) {
    if (error instanceof CreateActivityError) throw error;
    if (error instanceof PrivateHttpError) {
      if (error.status === 404 && error.codigo === 'PERFIL_NO_ENCONTRADO') throw new CreateActivityError('not-found');
      if (error.status === 400 && error.codigo === 'SOLICITUD_INVALIDA') throw new CreateActivityError('validation');
      if (error.status === 400 && error.codigo === 'ICONO_NO_ENCONTRADO') throw new CreateActivityError('icon');
      if (error.status === 400 && error.codigo === 'PICTOGRAMA_INVALIDO') throw new CreateActivityError('pictogram');
      if (error.status === 409 && error.codigo === 'CONFLICTO_CREACION') throw new CreateActivityError('conflict');
      if (error.status === 503 && error.codigo === 'PICTOGRAMAS_NO_DISPONIBLES') throw new CreateActivityError('unavailable');
      if (error.status === 401 || error.status === 403) throw new CreateActivityError('access');
    }
    throw new CreateActivityError('uncertain');
  }
}

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
