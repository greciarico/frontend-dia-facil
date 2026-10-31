type SpeechEngine = { stop(): Promise<void>; speak(text: string, options: {
  language: string; onDone(): void; onStopped(): void; onError(): void;
}): void };
type Channel = { queue: Promise<void>; owner?: StepSpeech; revision: number };
const channels = new WeakMap<SpeechEngine, Channel>();
/** One native queue per engine: an old screen cannot stop its successor's audio. */
export class StepSpeech {
  private generation = 0;
  private channel: Channel;
  private state = { speaking: false, error: false };
  private listeners = new Set<() => void>();
  constructor(private readonly engine: SpeechEngine) {
    this.channel = channels.get(engine) ?? { queue: Promise.resolve(), revision: 0 };
    channels.set(engine, this.channel);
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(speaking: boolean, error = false) {
    if (this.state.speaking === speaking && this.state.error === error) return;
    this.state = { speaking, error }; this.listeners.forEach(fn => fn());
  }
  private cancelLocal() { ++this.generation; this.publish(false); }
  stop() {
    this.cancelLocal();
    const channel = this.channel;
    if (channel.owner !== this) return;
    channel.owner = undefined; const revision = ++channel.revision;
    channel.queue = channel.queue.then(async () => {
      if (channel.revision === revision && !channel.owner) await this.engine.stop();
    }).catch(() => {});
  }
  play(text: string) {
    const channel = this.channel;
    if (channel.owner && channel.owner !== this) channel.owner.cancelLocal();
    channel.owner = this; ++channel.revision;
    const generation = ++this.generation; this.publish(true);
    const current = () => generation === this.generation && channel.owner === this;
    const finish = (error = false) => { if (current()) this.publish(false, error); };
    channel.queue = channel.queue.then(async () => {
      if (!current()) return;
      await this.engine.stop();
      if (!current()) return;
      this.engine.speak(text, { language: 'es', onDone: () => finish(), onStopped: () => finish(), onError: () => finish(true) });
    }).catch(() => finish(true));
  }
}

export type SpokenContent = { key: string; text: string };
type ContentState = { identity: string; enabled: boolean; content?: SpokenContent };
/** Survives transient loading; only focus entry, enabling voice or a different visible key reads automatically. */
export class ContentSpeechSession {
  private state: ContentState = { identity: '', enabled: false };
  private focused = false;
  private entry = 0;
  private waitingForEntry = false;
  private lastKey?: string;
  constructor(readonly speech: StepSpeech, private foreground = true) {}
  update(next: ContentState, entry = this.entry) {
    if (entry !== this.entry) return;
    this.waitingForEntry = false;
    if (next.identity !== this.state.identity || next.enabled !== this.state.enabled) {
      this.lastKey = undefined; this.speech.stop();
    }
    if (this.state.content && this.state.content.key !== next.content?.key) this.speech.stop();
    this.state = next; this.readNewContent();
  }
  focus(deferRead = false) {
    if (!this.focused) {
      this.focused = true; ++this.entry; this.lastKey = undefined;
      this.waitingForEntry = deferRead;
      if (!deferRead) this.readNewContent();
    }
    return this.entry;
  }
  blur() { this.focused = false; this.lastKey = undefined; this.speech.stop(); }
  setForeground(value: boolean) {
    this.foreground = value;
    if (!value) this.speech.stop(); else this.readNewContent();
  }
  private available() { return this.focused && !this.waitingForEntry && this.foreground && this.state.enabled && !!this.state.content; }
  private readNewContent() {
    if (this.available() && this.state.content!.key !== this.lastKey) this.repeat();
  }
  repeat = () => {
    if (!this.available()) return;
    this.lastKey = this.state.content!.key; this.speech.play(this.state.content!.text);
  };
}

const sentence = (text: string) => /[.!?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;
export const activitySpeechMessage = (name: string) => sentence(`Es hora de ${name}`);
export const stepSpeechMessage = (position: number, total: number, description: string) => sentence(`Paso ${position} de ${total}. ${description}`);
