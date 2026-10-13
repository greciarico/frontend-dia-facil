export function validateCarerName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return 'Ingresa tu nombre para crear tu cuenta.';
  if (name.length > 100) return 'El nombre debe tener como máximo 100 caracteres.';
}

export function nameInitial(value: string): string {
  const first = Array.from(value.trim())[0];
  return first ? Array.from(first.toLocaleUpperCase())[0] : '';
}

export type PendingRegistration = { email: string; comprobanteRegistro: string };
export type RegistrationAction = { type: 'pending'; value: PendingRegistration } | { type: 'clear' };
export function registrationReducer(_state: PendingRegistration | null, action: RegistrationAction): PendingRegistration | null {
  return action.type === 'pending' ? action.value : null;
}

export function registrationInput(proof: string, name: string, avatarId: string | null, skipAvatar: boolean) {
  return { comprobanteRegistro: proof, nombre: name.trim(), avatarId: skipAvatar ? null : avatarId };
}
