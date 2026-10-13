import type { Caregiver, SessionGrant } from '@/utils/session-contract';

type Stored = { version: 1; active: string | null; pendingRevocations: string[] };
export type SessionSnapshot = { status: 'booting' | 'anonymous' | 'authenticated' | 'restore-error' | 'storage-error';
  caregiver: Caregiver | null; stage: 'ready' | 'otp' | 'onboarding'; skippedAvatar: boolean; message?: string };
export class SessionFailure extends Error {
  constructor(readonly kind: 'invalid' | 'renewable' | 'network' | 'storage' | 'canceled') {
    super(kind === 'invalid' ? 'Tu sesión terminó. Verifica tu correo para volver a entrar.'
      : kind === 'storage' ? 'No pudimos guardar el estado de tu sesión. Inténtalo de nuevo.'
        : kind === 'canceled' ? 'Operación cancelada.' : 'No pudimos comprobar tu sesión. Revisa tu conexión e inténtalo de nuevo.');
  }
}
type Dependencies = {
  read: () => Promise<string | null>; write: (value: string | null) => Promise<void>;
  renew: (refresh: string) => Promise<SessionGrant>; revoke: (refresh: string) => Promise<void>;
  current: (access: string) => Promise<Caregiver>;
};
const empty = (): Stored => ({ version: 1, active: null, pendingRevocations: [] });
export class SessionManager {
  private stored: Stored | null = null;
  private io: Promise<unknown> = Promise.resolve();
  private refreshFlight: Promise<string> | null = null;
  private revocationFlight: Promise<void> | null = null;
  private restoreFlight: Promise<void> | null = null;
  private restoring = false;
  private epoch = 0;
  private grant: SessionGrant | null = null;
  private pendingGrant: { grant: SessionGrant; stage: SessionSnapshot['stage']; skipped: boolean } | null = null;
  private pendingLogout = false;
  private listeners = new Set<() => void>();
  private snapshot: SessionSnapshot = { status: 'booting', caregiver: null, stage: 'ready', skippedAvatar: false };
  constructor(private readonly deps: Dependencies) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(value: SessionSnapshot) { this.snapshot = value; this.listeners.forEach(listener => listener()); }
  private async load() {
    if (this.stored) return;
    try {
      const raw = await this.deps.read();
      if (!raw) { this.stored = empty(); return; }
      const data = JSON.parse(raw) as Stored;
      if (data.version !== 1 || !(data.active === null || /^r_[A-Za-z0-9_-]{43}$/.test(data.active))
        || !Array.isArray(data.pendingRevocations) || !data.pendingRevocations.every(t => typeof t === 'string' && /^r_[A-Za-z0-9_-]{43}$/.test(t))) throw new Error();
      this.stored = data;
    } catch { throw new SessionFailure('storage'); }
  }
  private mutate(change: (current: Stored) => Stored) {
    const task = this.io.then(async () => {
      await this.load();
      const next = change(this.stored!);
      try { await this.deps.write(!next.active && !next.pendingRevocations.length ? null : JSON.stringify(next)); }
      catch { throw new SessionFailure('storage'); }
      this.stored = next;
    });
    this.io = task.catch(() => undefined); return task;
  }
  async flushRevocations() {
    if (this.revocationFlight) return this.revocationFlight;
    const task = (async () => {
      await this.io; await this.load();
      for (const token of [...this.stored!.pendingRevocations]) {
        try {
          await this.deps.revoke(token);
          await this.mutate(current => ({ ...current, pendingRevocations: current.pendingRevocations.filter(t => t !== token) }));
        } catch { break; }
      }
    })();
    this.revocationFlight = task;
    try { await task; } finally { if (this.revocationFlight === task) this.revocationFlight = null; }
  }
  async establish(grant: SessionGrant, stage: SessionSnapshot['stage'], skipped = false) {
    const epoch = this.epoch;
    this.pendingGrant = { grant, stage, skipped };
    try {
      await this.mutate(current => {
        if (this.epoch !== epoch) throw new SessionFailure('canceled');
        return { ...current, active: grant.sesion.refreshToken };
      });
      if (epoch !== this.epoch) throw new SessionFailure('canceled');
      this.grant = grant; this.pendingGrant = null;
      if (!this.restoring) this.publish({ status: 'authenticated', caregiver: grant.cuidador, stage, skippedAvatar: skipped });
    } catch (error) {
      if (epoch === this.epoch) this.publish({ ...this.snapshot, status: 'storage-error', message: new SessionFailure('storage').message });
      throw error;
    }
  }
  async refresh(): Promise<string> {
    if (this.refreshFlight) return this.refreshFlight;
    const epoch = this.epoch;
    const task = (async () => {
      await this.io; await this.load();
      if (!this.stored!.active || this.pendingLogout) throw new SessionFailure('invalid');
      try {
        const grant = await this.deps.renew(this.stored!.active);
        if (epoch !== this.epoch) throw new SessionFailure('canceled');
        await this.establish(grant, this.snapshot.stage, this.snapshot.skippedAvatar);
        return grant.sesion.accessToken;
      } catch (error) {
        if (epoch !== this.epoch) throw new SessionFailure('canceled');
        if (error instanceof SessionFailure && error.kind === 'invalid') await this.invalidate();
        else if (!(error instanceof SessionFailure && error.kind === 'storage')) {
          this.publish({ ...this.snapshot, status: 'restore-error', message: new SessionFailure('network').message });
        }
        throw error;
      }
    })();
    this.refreshFlight = task;
    try { return await task; } finally { if (this.refreshFlight === task) this.refreshFlight = null; }
  }
  async restore() {
    if (this.restoreFlight) return this.restoreFlight;
    const task = this.restoreOnce(); this.restoreFlight = task;
    try { await task; } finally { if (this.restoreFlight === task) this.restoreFlight = null; }
  }
  private async restoreOnce() {
    const epoch = this.epoch; this.restoring = true;
    try {
      await this.io; await this.load();
      void this.flushRevocations().catch(() => undefined);
      if (!this.stored!.active) {
        this.publish({ status: 'anonymous', caregiver: null, stage: 'ready', skippedAvatar: false }); return;
      }
      const token = await this.refresh();
      const caregiver = await this.validateAccess(token);
      if (epoch === this.epoch) this.publish({ status: 'authenticated', caregiver, stage: 'ready', skippedAvatar: false });
    } catch (error) {
      if (epoch !== this.epoch) return;
      if (error instanceof SessionFailure && error.kind === 'invalid') { await this.invalidate(); return; }
      if (error instanceof SessionFailure && error.kind === 'canceled') return;
      this.publish({ ...this.snapshot, status: error instanceof SessionFailure && error.kind === 'storage' ? 'storage-error' : 'restore-error',
        message: error instanceof SessionFailure ? error.message : new SessionFailure('network').message });
    } finally { this.restoring = false; }
  }
  async retry() {
    if (this.pendingLogout) { await this.logout(); return; }
    if (this.pendingGrant) { const p = this.pendingGrant; await this.establish(p.grant, p.stage, p.skipped); return; }
    await this.restore();
  }
  private async invalidate() {
    this.epoch++;
    this.grant = null; this.pendingGrant = null;
    try {
      await this.mutate(current => ({ ...current, active: null }));
      this.publish({ status: 'anonymous', caregiver: null, stage: 'ready', skippedAvatar: false });
    } catch (error) {
      this.publish({ status: 'storage-error', caregiver: null, stage: 'ready', skippedAvatar: false, message: new SessionFailure('storage').message });
      throw error;
    }
  }
  async logout() {
    this.epoch++; this.pendingLogout = true;
    const unpersisted = this.pendingGrant?.grant.sesion.refreshToken;
    this.grant = null; this.pendingGrant = null;
    try {
      await this.mutate(current => ({ ...current, active: null,
        pendingRevocations: [...new Set([...current.pendingRevocations, ...[current.active, unpersisted].filter((t): t is string => !!t)])] }));
      this.pendingLogout = false;
      this.publish({ status: 'anonymous', caregiver: null, stage: 'ready', skippedAvatar: false });
      void this.flushRevocations().catch(() => undefined);
    } catch (error) {
      this.publish({ status: 'storage-error', caregiver: null, stage: 'ready', skippedAvatar: false, message: new SessionFailure('storage').message });
      throw error;
    }
  }
  async access() {
    if (this.snapshot.status !== 'authenticated' || !this.grant) throw new SessionFailure('invalid');
    if (Date.now() >= Date.parse(this.grant.sesion.accessExpiresAt)) return this.refresh();
    return this.grant.sesion.accessToken;
  }
  async recoverRejected(token: string, renewable: boolean) {
    if (this.grant && token !== this.grant.sesion.accessToken) return this.access();
    if (!renewable) { await this.invalidate(); throw new SessionFailure('invalid'); }
    return this.refresh();
  }
  async check() {
    const token = await this.access();
    try { return await this.validateAccess(token); }
    catch (error) {
      if (error instanceof SessionFailure && error.kind === 'invalid') await this.invalidate();
      throw error;
    }
  }
  private async validateAccess(token: string) {
    try { return await this.deps.current(token); }
    catch (error) {
      if (error instanceof SessionFailure && error.kind === 'renewable') return this.deps.current(await this.refresh());
      throw error;
    }
  }
  finishOnboarding() { this.publish({ ...this.snapshot, stage: 'ready', skippedAvatar: false }); }
  revision() { return this.epoch; }
}
