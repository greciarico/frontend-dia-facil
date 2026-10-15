import { getAuthenticatedHttpClient, PrivateHttpError, type PrivateRequestOptions } from './private-http';
import { parseProfile, parseProfiles } from '@/utils/profiles';
import { createProfileInput } from '@/utils/create-profile';
import type { CarerAvatarId } from '@/constants/carer-avatars';

export class CreateProfileError extends Error {
  constructor(readonly kind: 'validation' | 'limit' | 'uncertain' | 'access', readonly field?: string) {
    super(kind === 'limit' ? 'Ya tienes el máximo de perfiles activos. Revisa Mis perfiles.'
      : kind === 'validation' ? field === 'avatar' ? 'Selecciona un avatar del catálogo o utiliza la inicial.' : 'Revisa el nombre. Es obligatorio y admite hasta 60 caracteres.'
        : kind === 'access' ? 'No pudimos verificar tu acceso. Vuelve a intentarlo.'
          : 'No pudimos confirmar si el perfil se creó. Revisa Mis perfiles antes de intentarlo de nuevo.');
  }
}

export async function createProfile(name: string, avatar: CarerAvatarId | null, signal?: AbortSignal) {
  const body = createProfileInput(name, avatar);
  // A 401 rejected before the command can be retried once; transport/5xx never replay POST.
  const config: PrivateRequestOptions = { signal, authReplaySafe: true };
  try {
    const response = await getAuthenticatedHttpClient().post('/api/perfiles', body, config);
    if (response.status !== 201) throw new CreateProfileError('uncertain');
    return parseProfile(response.data);
  } catch (error) {
    if (error instanceof CreateProfileError) throw error;
    if (error instanceof PrivateHttpError) {
      if (error.status === 409 && error.codigo === 'LIMITE_PERFILES_ALCANZADO') throw new CreateProfileError('limit');
      if (error.status === 400 && error.codigo === 'SOLICITUD_INVALIDA') throw new CreateProfileError('validation', error.fields[0]);
      if (error.status === 401 || error.status === 403) throw new CreateProfileError('access');
    }
    throw new CreateProfileError('uncertain');
  }
}

export async function getProfiles(signal?: AbortSignal) {
  const response = await getAuthenticatedHttpClient().get('/api/perfiles', { signal });
  return parseProfiles(response.data);
}

export class ProfileDetailError extends Error {
  constructor(readonly kind: 'not-found' | 'network') {
    super(kind === 'not-found' ? 'No pudimos encontrar este perfil.' : 'No pudimos cargar el perfil. Revisa tu conexión e inténtalo de nuevo.');
  }
}

export async function getProfile(id: number, signal?: AbortSignal) {
  try {
    const response = await getAuthenticatedHttpClient().get(`/api/perfiles/${id}`, { signal });
    if (response.status !== 200) throw new ProfileDetailError('network');
    const profile = parseProfile(response.data);
    if (profile.idPerfilUsuario !== id) throw new ProfileDetailError('network');
    return profile;
  } catch (error) {
    if (error instanceof PrivateHttpError && error.status === 404) throw new ProfileDetailError('not-found');
    throw new ProfileDetailError('network');
  }
}
