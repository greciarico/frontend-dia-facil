import { validDeviceToken, validLinkCode, type UserLink } from '@/utils/user-link';
import type { UserProfile } from '@/utils/profiles';

export class DeviceFailure extends Error {
  constructor(readonly kind: 'invalid-code' | 'invalid-access' | 'revoked' | 'network' | 'rate' | 'storage' | 'canceled' | 'not-found' | 'guide-conflict', readonly code?: string) {
    super(kind === 'guide-conflict' ? 'Consulta nuevamente la actividad para continuar.' : kind === 'not-found' ? 'Esta actividad no está disponible.' : kind === 'invalid-code' ? 'El código no es válido.' : kind === 'rate' ? 'Espera un momento antes de intentarlo nuevamente.'
      : kind === 'storage' ? 'No pudimos guardar tu conexión de forma segura. Inténtalo de nuevo.'
        : 'No pudimos conectar tu agenda. Revisa tu conexión e inténtalo de nuevo.');
  }
}
export type DeviceSnapshot = { status: 'booting' | 'unlinked' | 'pending' | 'linked' | 'revoking' | 'error';
  profile?: UserProfile; stage: 'ready' | 'confirmation'; message?: string; paused?: boolean; remoteExit?: boolean };
type Stored = { version: 2; active: string | null; proofs: string[]; paused: boolean };
type StorageStage = 'storage-read' | 'storage-format' | 'storage-clear' | 'storage-write';
type Dependencies = { diagnostic?: (stage: StorageStage) => void; read(): Promise<string | null>; write(value: string | null): Promise<void>;
  prepare(): Promise<string>; current(token: string): Promise<UserLink>;
  bind(token: string, code: string, proofs: string[]): Promise<UserLink & { credencialDispositivo?: string }> };
export const DEVICE_CHECK_INTERVAL_MS = 10_000;

export class DeviceAccessManager {
  private stored?: Stored;
  private io: Promise<unknown> = Promise.resolve();
  private operation?: Promise<unknown>;
  private checking?: Promise<void>;
  private loading?: Promise<void>;
  private epoch = 0;
  private foreground = false;
  private timer?: ReturnType<typeof setTimeout>;
  private delay = DEVICE_CHECK_INTERVAL_MS;

  setForeground(active: boolean) {
    this.foreground = active;
    clearTimeout(this.timer);
    if (active && this.snapshot.status !== 'unlinked') void this.restore();
  }

  confirmed() {
    this.delay = DEVICE_CHECK_INTERVAL_MS;
    this.schedule();
  }

  private schedule() {
    clearTimeout(this.timer);
    if (this.foreground && this.snapshot.status === 'linked')
      this.timer = setTimeout(() => void this.restore(), this.delay);
  }

  revoked() {
    if (this.snapshot.status === 'revoking') return;
    this.epoch++;
    clearTimeout(this.timer);
    this.publish({ status: 'revoking', stage: 'ready' });
  }

  async finishRevocation() {
    await this.mutate(stored => ({ ...stored, active: null,
      proofs: stored.proofs.filter(token => token !== stored.active), paused: false }));
    this.unsaved = undefined;
    this.publish({ status: 'unlinked', stage: 'ready', remoteExit: true });
  }
  private unsaved?: string;
  private listeners = new Set<() => void>();
  private snapshot: DeviceSnapshot = { status: 'booting', stage: 'ready' };
  constructor(private readonly deps: Dependencies) {}
  getSnapshot = () => this.snapshot;
  revision = () => this.epoch;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(state: DeviceSnapshot) { this.snapshot = state; this.schedule(); this.listeners.forEach(fn => fn()); }
  private async load() {
    if (this.stored) return;
    if (this.loading) return this.loading;
    const work = (async () => {
      let stage: StorageStage = 'storage-read';
      try {
      const raw = await this.deps.read();
      stage = 'storage-format';
      const value = raw ? JSON.parse(raw) : { version: 2, active: null, proofs: [], paused: false };
      if (value.version === 1) {
        value.proofs = value.pendingRevocations; value.paused = false; value.version = 2;
      }
      if (value.version !== 2 || !(value.active === null || validDeviceToken(value.active))
        || !Array.isArray(value.proofs) || !value.proofs.every(validDeviceToken) || typeof value.paused !== 'boolean') throw new Error();
      this.stored = { version: 2, active: value.active, proofs: [...new Set<string>(value.proofs)], paused: value.paused };
    } catch { this.deps.diagnostic?.(stage); throw new DeviceFailure('storage'); } })();
    this.loading = work;
    try { await work; } finally { if (this.loading === work) this.loading = undefined; }
  }
  private mutate(change: (stored: Stored) => Stored) {
    const task = this.io.then(async () => {
      await this.load(); const next = change(this.stored!);
      const value = !next.active && !next.proofs.length && !next.paused ? null : JSON.stringify(next);
      try { await this.deps.write(value); }
      catch { this.deps.diagnostic?.(value === null ? 'storage-clear' : 'storage-write'); throw new DeviceFailure('storage'); }
      this.stored = next;
    });
    this.io = task.catch(() => undefined); return task;
  }
  private linked(value: UserLink, confirmation = false) {
    this.publish(value.estado === 'VINCULADO' ? { status: 'linked', profile: value.perfil, stage: confirmation ? 'confirmation' : this.snapshot.stage }
      : { status: 'pending', stage: 'ready' });
  }
  async restore(): Promise<void> {
    if (this.checking) return this.checking;
    if (this.operation || this.snapshot.status === 'revoking') return;
    const epoch = this.epoch;
    const work = (async () => {
      try {
        await this.io; await this.load();
        if (epoch !== this.epoch) return;
        if (!this.stored!.active) { this.publish({ status: 'unlinked', stage: 'ready', paused: this.stored!.paused }); return; }
        const value = await this.deps.current(this.stored!.active);
        if (epoch === this.epoch) { this.linked(value); this.confirmed(); }
      } catch (error) {
        if (epoch !== this.epoch) return;
        if (error instanceof DeviceFailure && error.kind === 'revoked') this.revoked();
        else if (error instanceof DeviceFailure && error.kind === 'invalid-access') await this.invalidate();
        else if (this.snapshot.status === 'linked') { this.delay = Math.min(this.delay * 2, 120_000); this.schedule(); }
        else this.publish({ ...this.snapshot, status: 'error', message: error instanceof DeviceFailure ? error.message : new DeviceFailure('network').message });
      }
    })(); this.checking = work;
    try { await work; } finally { if (this.checking === work) this.checking = undefined; }
  }
  async connect(code: string): Promise<void> {
    if (this.snapshot.status === 'revoking') throw new DeviceFailure('revoked');
    if (this.operation) return this.operation as Promise<void>;
    if (!validLinkCode(code)) throw new DeviceFailure('invalid-code');
    const epoch = this.epoch;
    const current = () => { if (epoch !== this.epoch) throw new DeviceFailure('canceled'); };
    const work = (async () => {
      await this.checking;
      await this.io; await this.load(); current();
      // A new explicit connection must resolve the code, never confirm a previously linked profile.
      if (this.stored!.active) {
        const old = this.stored!.active;
        const value = await this.deps.current(old); current();
        if (value.estado === 'VINCULADO') await this.mutate(stored => { current(); return { ...stored, active: null, proofs: [...new Set([...stored.proofs, old])] }; });
      }
      if (!this.stored!.active) {
        const token = this.unsaved || await this.deps.prepare(); current();
        if (!validDeviceToken(token)) throw new DeviceFailure('network'); this.unsaved = token;
        await this.mutate(stored => { current(); return { ...stored, active: token, paused: false }; }); current(); this.unsaved = undefined;
      }
      const token = this.stored!.active!;
      if (this.snapshot.status !== 'linked') this.publish({ status: 'pending', stage: 'ready' });
      let state = await this.deps.current(token); current();
      if (state.estado === 'VINCULADO') {
        // A previous unknown operation may have completed between preflight GETs.
        // Retain its proof, but never confirm that profile for a newly entered code.
        await this.mutate(stored => { current(); return { ...stored, active: null, proofs: [...new Set([...stored.proofs, token])] }; });
        throw new DeviceFailure('network');
      }
      try {
        const result = await this.deps.bind(token, code, this.stored!.proofs); current();
        const canonical = result.credencialDispositivo;
        if (canonical && (!validDeviceToken(canonical) || !this.stored!.proofs.includes(canonical))) throw new DeviceFailure('network');
        if (canonical) await this.mutate(stored => { current(); return { ...stored, active: canonical, paused: false }; });
        current(); state = result;
      }
      catch (error) {
        current();
        if (error instanceof DeviceFailure && ['invalid-code', 'rate', 'invalid-access'].includes(error.kind)) throw error;
        // An unknown POST outcome is recovered by GET, never by automatic replay.
        state = await this.deps.current(token); current();
        if (state.estado !== 'VINCULADO') throw new DeviceFailure('network');
      }
      if (state.estado !== 'VINCULADO') throw new DeviceFailure('network'); this.linked(state, true);
    })(); this.operation = work;
    try { await work; }
    catch (error) {
      if (epoch === this.epoch && error instanceof DeviceFailure) {
        if (error.kind === 'revoked') this.revoked();
        else if (error.kind === 'invalid-access') await this.invalidate();
      }
      throw error;
    } finally { if (this.operation === work) this.operation = undefined; }
  }
  finish() { if (this.snapshot.status === 'linked') this.publish({ ...this.snapshot, stage: 'ready' }); }
  async invalidate() {
    this.epoch++;
    try { await this.mutate(stored => ({ ...stored, proofs: stored.proofs.filter(token => token !== stored.active), active: null, paused: false })); this.publish({ status: 'unlinked', stage: 'ready' }); }
    catch { this.publish({ status: 'error', stage: 'ready', message: new DeviceFailure('storage').message }); }
  }
  async logout(paused = false) {
    this.epoch++; this.unsaved = undefined;
    await this.mutate(stored => ({ ...stored, active: null, paused,
      proofs: [...new Set([...stored.proofs, ...(stored.active ? [stored.active] : [])])] }));
    this.publish({ status: 'unlinked', stage: 'ready', paused });
  }
  async token() {
    await this.io; await this.load();
    if (this.snapshot.status !== 'linked' || !this.stored!.active) throw new DeviceFailure('invalid-access');
    return this.stored!.active;
  }
}
