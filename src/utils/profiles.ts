import { carerAvatarIds, type CarerAvatarId } from '@/constants/carer-avatars';

export type UserProfile = { idPerfilUsuario: number; nombre: string; avatar: string | null };
export type ProfilesResponse = { perfiles: UserProfile[]; maximoPerfilesActivos: number };

export function parseProfiles(value: unknown): ProfilesResponse {
  if (!value || typeof value !== 'object') throw new Error('Invalid profiles response');
  const data = value as Partial<ProfilesResponse>;
  if (!Number.isSafeInteger(data.maximoPerfilesActivos) || data.maximoPerfilesActivos! <= 0 || !Array.isArray(data.perfiles)) {
    throw new Error('Invalid profiles response');
  }
  const ids = new Set<number>();
  const perfiles = data.perfiles.map(profile => {
    if (!profile || !Number.isSafeInteger(profile.idPerfilUsuario) || profile.idPerfilUsuario <= 0
      || ids.has(profile.idPerfilUsuario) || typeof profile.nombre !== 'string' || !profile.nombre.trim()
      || profile.nombre.length > 60 || !(profile.avatar === null || typeof profile.avatar === 'string' && profile.avatar.length <= 255)) {
      throw new Error('Invalid profile');
    }
    ids.add(profile.idPerfilUsuario);
    return { idPerfilUsuario: profile.idPerfilUsuario, nombre: profile.nombre, avatar: profile.avatar };
  });
  return { perfiles, maximoPerfilesActivos: data.maximoPerfilesActivos! };
}

export function profileAvatar(avatar: string | null): { local: CarerAvatarId | null; uri: string | null } {
  if (carerAvatarIds.includes(avatar as CarerAvatarId)) return { local: avatar as CarerAvatarId, uri: null };
  try {
    const url = new URL(avatar || '');
    if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) return { local: null, uri: url.href };
  } catch { /* Unknown representations retain the name initial. */ }
  return { local: null, uri: null };
}
