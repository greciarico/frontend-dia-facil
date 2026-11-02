export type PushIntent = { version: 1; tipo: 'NOTIFICACION_CUIDADOR'; idNotificacion: number; idRegistro: number; generacion: number; idCuidador: number };
export type PushRegistration = { idRegistro: number; generacion: number; idCuidador: number };
export function pushDecision(intent: PushIntent, owner: number | undefined, registration: PushRegistration | null, mounted: boolean): 'wait' | 'discard' | 'open' {
  if (!owner || !mounted) return 'wait';
  if (intent.idCuidador !== owner) return 'discard';
  if (!registration) return 'wait';
  return registration.idCuidador === owner && registration.idRegistro === intent.idRegistro && registration.generacion === intent.generacion ? 'open' : 'discard';
}
export function parsePushIntent(value: unknown): PushIntent | null {
  const v = value as PushIntent | null;
  if (!v || v.version !== 1 || v.tipo !== 'NOTIFICACION_CUIDADOR'
    || ![v.idNotificacion, v.idRegistro, v.generacion, v.idCuidador].every(n => Number.isSafeInteger(n) && n > 0)) return null;
  return { version: 1, tipo: v.tipo, idNotificacion: v.idNotificacion, idRegistro: v.idRegistro, generacion: v.generacion, idCuidador: v.idCuidador };
}
/** Bounded deduplication; failed network validation can retry the pending intent. */
export class PushIntents {
  pending: PushIntent | null = null;
  private seen = new Set<string>();
  private key(v: PushIntent) { return `${v.idCuidador}:${v.idRegistro}:${v.generacion}:${v.idNotificacion}`; }
  receive(value: unknown) {
    const v = parsePushIntent(value);
    if (!v || this.seen.has(this.key(v))) return;
    this.pending = v;
  }
  consume(v: PushIntent) {
    this.seen.add(this.key(v));
    if (this.seen.size > 128) this.seen.delete(this.seen.values().next().value!);
    if (this.pending === v) this.pending = null;
  }
}
