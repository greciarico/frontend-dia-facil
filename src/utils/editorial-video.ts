export type EditorialVideoMode = 'outside' | 'ready' | 'playing' | 'manual-paused' | 'ended';
export type EditorialVideoState = { selected: number; mode: EditorialVideoMode; visible: boolean; loading: boolean; error: boolean };
export type EditorialVideoPort = {
  pause(): void; play(): void; reset(): void; ready(): boolean; failed(): boolean; atEnd(): boolean; reload(): Promise<void>;
  listen(events: { status(): void; error(): void; ended(): void }): () => void;
};
export function visibleVideoFraction(frame: { y: number; height: number }, viewport: { y: number; height: number }) {
  if (![frame.y, frame.height, viewport.y, viewport.height].every(Number.isFinite) || frame.height <= 0 || viewport.height <= 0) return 0;
  return Math.max(0, Math.min(1, (Math.min(frame.y + frame.height, viewport.y + viewport.height) - Math.max(frame.y, viewport.y)) / Math.min(frame.height, viewport.height)));
}

/** One owner for two native players. Only explicit context changes reset manual intent. */
export class EditorialVideoController {
  private state: EditorialVideoState = { selected: 0, mode: 'outside', visible: false, loading: true, error: false };
  private subscribers = new Set<() => void>();
  private active = false;
  private allowed = false;
  private reduced = true;
  private dragging = false;
  private manualStart = false;
  private epoch = 0;
  private unlisten?: () => void;
  constructor(private readonly players: readonly EditorialVideoPort[]) {}
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.subscribers.add(fn); return () => { this.subscribers.delete(fn); }; };
  private update(patch: Partial<EditorialVideoState>) {
    const next = { ...this.state, ...patch };
    if (Object.keys(next).every(key => next[key as keyof EditorialVideoState] === this.state[key as keyof EditorialVideoState])) return;
    this.state = next; this.subscribers.forEach(fn => fn());
  }
  private pauseAll(reset = false) {
    for (const player of this.players) { try { player.pause(); if (reset) player.reset(); } catch { /* A hook may already have released its native player on unmount. */ } }
  }
  private watch(retrying = false) {
    this.unlisten?.(); this.unlisten = undefined;
    const epoch = ++this.epoch, player = this.players[this.state.selected];
    const current = () => this.active && epoch === this.epoch;
    this.unlisten = player.listen({
      status: () => { if (current()) { this.update({ loading: !player.ready() }); this.maybeStart(); } },
      error: () => { if (current()) { this.pauseAll(); this.manualStart = false; this.update({ error: true, loading: false }); } },
      ended: () => { if (current() && this.state.mode === 'playing' && player.atEnd()) {
        this.pauseAll(); this.manualStart = false; this.update({ mode: 'ended' });
      } },
    });
    this.update(player.failed() && !retrying ? { loading: false, error: true } : { loading: !player.ready() });
  }
  enter() { this.active = true; this.watch(); }
  leave() {
    this.active = false; this.allowed = false; ++this.epoch; this.unlisten?.(); this.unlisten = undefined;
    this.pauseAll(true);
  }
  environment(allowed: boolean, reduced: boolean) {
    if (!this.active) return;
    const changed = allowed !== this.allowed, newlyReduced = reduced && !this.reduced;
    this.allowed = allowed; this.reduced = reduced;
    if (!allowed || changed) {
      this.pauseAll(true); this.dragging = false; this.manualStart = false;
      this.update({ visible: false, mode: 'outside' }); this.watch();
    } else if (newlyReduced && this.state.mode === 'playing' && !this.manualStart) {
      this.pauseAll(); this.update({ mode: 'ready' });
    }
    this.maybeStart();
  }
  visibility(fraction: number) {
    if (!this.active || !this.allowed) return;
    const visible = this.state.visible ? fraction > 0.35 : fraction >= 0.65;
    if (visible === this.state.visible) return;
    this.pauseAll(true); this.manualStart = false;
    this.update({ visible, mode: visible ? 'ready' : 'outside' }); this.watch(); this.maybeStart();
  }
  private maybeStart() {
    if (!this.active || !this.allowed || !this.state.visible || this.dragging || this.state.error || this.state.mode !== 'ready') return;
    if (this.reduced && !this.manualStart) return;
    const player = this.players[this.state.selected];
    if (!player.ready()) return;
    this.pauseAll(); this.update({ mode: 'playing', loading: false });
    try { player.play(); } catch { this.update({ error: true, loading: false }); }
  }
  toggle() {
    if (!this.active || !this.allowed || !this.state.visible || this.dragging || this.state.error) return;
    if (this.state.mode === 'playing') {
      this.pauseAll(); this.manualStart = false; this.update({ mode: 'manual-paused' });
    } else {
      if (this.state.mode === 'ended') this.players[this.state.selected].reset();
      this.manualStart = true; this.update({ mode: 'ready' }); this.maybeStart();
    }
  }
  beginDrag() { if (this.active) { this.dragging = true; this.pauseAll(); } }
  select(index: number) {
    if (!this.active || !Number.isInteger(index) || index < 0 || index >= this.players.length) return;
    this.dragging = false;
    if (index === this.state.selected) {
      if (this.state.mode === 'playing') { this.update({ mode: 'ready' }); this.maybeStart(); }
      return;
    }
    this.pauseAll(true); this.manualStart = false;
    this.update({ selected: index, mode: this.state.visible ? 'ready' : 'outside', error: false });
    this.watch(); this.maybeStart();
  }
  async retry() {
    if (!this.active || !this.allowed || !this.state.visible || !this.state.error) return;
    this.pauseAll(true); this.manualStart = true; this.update({ loading: true, error: false, mode: 'ready' }); this.watch(true);
    const epoch = this.epoch, player = this.players[this.state.selected];
    try { await player.reload(); if (this.active && epoch === this.epoch) { this.update({ loading: !player.ready() }); this.maybeStart(); } }
    catch { if (this.active && epoch === this.epoch) this.update({ error: true, loading: false }); }
  }
}
