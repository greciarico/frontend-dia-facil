/** No insecure fallback: Expo SDK 57 already provides a native UUID generator. */
export function operationKey(): string {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  const native = (globalThis as typeof globalThis & { expo?: { uuidv4?: () => string } }).expo;
  if (typeof native?.uuidv4 === 'function') return native.uuidv4();
  throw new Error('No pudimos preparar tu solicitud de forma segura.');
}
