import type { AppearancePreferences, AccessibilityPreferences } from '@/utils/accessibility';

type Dependencies<T extends AppearancePreferences> = { get(signal: AbortSignal): Promise<T>; patch(value: Partial<T>, signal: AbortSignal): Promise<T>;
  reset(signal: AbortSignal): Promise<T>; revision(): number };
export type AccessibilityEditorState<T extends AppearancePreferences = AccessibilityPreferences> = { status: 'loading' | 'ready' | 'error' | 'not-found'; value?: T; busy: boolean; uncertain: boolean; message?: string };
/** Server-authoritative autosave. Unknown writes are followed by GET, never replayed. */
export class AccessibilityEditor<T extends AppearancePreferences = AccessibilityPreferences> {
  private state: AccessibilityEditorState<T> = { status: 'loading', busy: false, uncertain: false };
  private listeners = new Set<() => void>();
  private generation = 0;
  private active = false;
  private controller?: AbortController;
  constructor(private readonly deps: Dependencies<T>, private readonly scope: 'perfil' | 'cuenta' = 'perfil') {}
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(state: AccessibilityEditorState<T>) { this.state = state; this.listeners.forEach(fn => fn()); }
  enter() { this.active = true; void this.load(); }
  leave() { this.active = false; ++this.generation; this.controller?.abort(); }
  async load() {
    const g = ++this.generation, revision = this.deps.revision(); this.controller?.abort(); this.controller = new AbortController();
    const current = () => this.active && g === this.generation && revision === this.deps.revision();
    this.publish({ ...this.state, busy: true, message: undefined });
    try {
      const value = await this.deps.get(this.controller.signal);
      if (current()) this.publish({ status: 'ready', value, busy: false, uncertain: false });
    } catch (error) {
      if (current()) this.publish({ ...this.state, status: (error as { status?: number }).status === 404 ? 'not-found' : this.state.value ? 'ready' : 'error',
        busy: false, message: 'No pudimos consultar los ajustes. Inténtalo nuevamente.' });
    }
  }
  change(patch: Partial<T>) { return this.write(patch); }
  reset() { return this.write(); }
  private async write(patch?: Partial<T>) {
    if (!this.active || this.state.status !== 'ready' || this.state.busy || this.state.uncertain || !this.state.value) return;
    const saved = this.state.value, g = ++this.generation, revision = this.deps.revision();
    this.controller?.abort(); this.controller = new AbortController(); const signal = this.controller.signal;
    const current = () => this.active && g === this.generation && revision === this.deps.revision();
    this.publish({ status: 'ready', value: patch ? { ...saved, ...patch } : saved, busy: true, uncertain: false });
    try {
      const value = await (patch ? this.deps.patch(patch, signal) : this.deps.reset(signal));
      if (current()) this.publish({ status: 'ready', value, busy: false, uncertain: false });
    } catch (error) {
      if (!current()) return;
      const status = (error as { status?: number }).status;
      if (status && status >= 400 && status < 500 && status !== 408) {
        this.publish({ status: status === 404 ? 'not-found' : 'ready', value: saved, busy: false, uncertain: false, message: 'No pudimos guardar el ajuste. Se conserva el valor anterior.' }); return;
      }
      try {
        const value = await this.deps.get(signal);
        if (current()) this.publish({ status: 'ready', value, busy: false, uncertain: false, message: this.scope === 'cuenta' ? 'Se muestran los ajustes actuales de la cuenta.' : 'Se muestran los ajustes actuales del perfil.' });
      } catch {
        if (current()) this.publish({ status: 'ready', value: this.state.value, busy: false, uncertain: true, message: 'No pudimos confirmar el cambio. Consulta los ajustes antes de continuar.' });
      }
    }
  }
}
