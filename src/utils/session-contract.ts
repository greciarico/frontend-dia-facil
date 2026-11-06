import { carerAvatarIds, type CarerAvatarId } from '@/constants/carer-avatars';

export type Caregiver = { idCuidador: number; nombre: string | null; avatarId: CarerAvatarId | null };
export type SessionTokens = { tokenType: 'Bearer'; accessToken: string; accessExpiresAt: string;
  refreshToken: string; refreshExpiresAt: string; sessionExpiresAt: string };
export type SessionGrant = { cuidador: Caregiver; sesion: SessionTokens };
export function parseCaregiver(data: unknown): Caregiver {
  const c = data as Partial<Caregiver> | null;
  if (!c || !Number.isInteger(c.idCuidador) || (c.idCuidador ?? 0) <= 0
    || !(c.nombre === null || typeof c.nombre === 'string')
    || !(c.avatarId === null || carerAvatarIds.includes(c.avatarId as CarerAvatarId))) throw new Error('Invalid caregiver response');
  return { idCuidador: c.idCuidador!, nombre: c.nombre!, avatarId: c.avatarId! };
}
export function parseSessionGrant(data: unknown): SessionGrant {
  const grant = data as Partial<SessionGrant> | null;
  const tokens = grant?.sesion;
  if (!tokens || tokens.tokenType !== 'Bearer' || !/^a_[A-Za-z0-9_-]{43}$/.test(tokens.accessToken)
    || !/^r_[A-Za-z0-9_-]{43}$/.test(tokens.refreshToken)) throw new Error('Invalid session response');
  const dates = [tokens.accessExpiresAt, tokens.refreshExpiresAt, tokens.sessionExpiresAt];
  if (!dates.every(value => typeof value === 'string')) throw new Error('Invalid session expiry');
  const times = dates.map(Date.parse);
  if (!times.every(Number.isFinite) || times[0] > times[1] || times[1] > times[2]) throw new Error('Invalid session expiry');
  return { cuidador: parseCaregiver(grant?.cuidador), sesion: { ...tokens } };
}
