/** Basic client feedback; the backend remains authoritative. */
export function validateCarerEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'Ingresa tu correo electrónico.';
  if (email.length > 150) return 'El correo debe tener como máximo 150 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Ingresa un correo electrónico válido.';
}
