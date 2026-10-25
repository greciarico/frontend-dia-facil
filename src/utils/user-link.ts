import { parseProfiles } from './profiles';
import type { UserProfile } from './profiles';

export const validDeviceToken = (value: unknown): value is string => typeof value === 'string' && /^du_[A-Za-z0-9_-]{43}$/.test(value);
export function normalizeLinkCode(value: string) { return value.replace(/\s/g, '').toUpperCase(); }
export const linkCodeLength = 19;
export function normalizeManualLinkCode(value: string) { return normalizeLinkCode(value).slice(0, linkCodeLength); }
/** Sending syntax only; backend decides whether this code was issued and is still valid. */
export const validLinkCode = (value: string) => /^DF-[A-Z0-9]{16}$/.test(value);
export type UserLink = { estado: 'PENDIENTE'; perfil: null } | { estado: 'VINCULADO'; perfil: UserProfile };
export function parseUserLink(value: unknown): UserLink {
  if (!value || typeof value !== 'object') throw new Error('Respuesta no válida.');
  const raw = value as { estado?: unknown; perfil?: unknown };
  if (raw.estado === 'PENDIENTE' && raw.perfil === null) return { estado: 'PENDIENTE', perfil: null };
  if (raw.estado !== 'VINCULADO') throw new Error('Respuesta no válida.');
  return { estado: 'VINCULADO', perfil: parseProfiles({ perfiles: [raw.perfil], maximoPerfilesActivos: 4 }).perfiles[0] };
}
