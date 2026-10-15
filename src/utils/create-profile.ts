import { carerAvatarIds, type CarerAvatarId } from '@/constants/carer-avatars';

export function validateProfileName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return 'Ingresa el nombre de la persona.';
  if (name.length > 60) return 'El nombre debe tener como máximo 60 caracteres.';
}
export function createProfileInput(name: string, avatar: CarerAvatarId | null) {
  if (validateProfileName(name) || avatar !== null && !carerAvatarIds.includes(avatar)) throw new Error('Invalid profile input');
  return { nombre: name.trim(), avatar };
}
