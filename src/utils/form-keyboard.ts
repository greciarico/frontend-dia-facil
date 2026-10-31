export type MeasuredField = {
  measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
  isFocused(): boolean;
};
type Geometry = { offset: number; fieldY: number; fieldHeight: number; viewportY: number;
  viewportHeight: number; contentHeight: number; gap: number };
type KeyboardViewport = {
  measureViewport(callback: (x: number, y: number, width: number, height: number) => void): void;
  scrollTo(offset: number): void;
};

/** All coordinates are measured in the same native window, after the available viewport resizes. */
export function focusedFieldOffset(g: Geometry) {
  const top = g.viewportY + g.gap, bottom = g.viewportY + g.viewportHeight - g.gap;
  const delta = g.fieldHeight > bottom - top || g.fieldY < top ? g.fieldY - top
    : Math.max(0, g.fieldY + g.fieldHeight - bottom);
  return Math.max(0, Math.min(g.offset + delta, Math.max(0, g.contentHeight - g.viewportHeight)));
}

/** Presentation controller: no text values, validation, navigation or keyboard-height padding. */
export class FormKeyboardController {
  private active = false;
  private visible = false;
  private field: MeasuredField | null = null;
  private offset = 0;
  private original: number | null = null;
  private restoring = false;
  private contentHeight: number | null = null;
  private generation = 0;
  private frame: number | null = null;
  private viewport: Partial<KeyboardViewport> | null;
  constructor(private readonly deps: Partial<KeyboardViewport> & {
    requestFrame(callback: () => void): number;
    cancelFrame(id: number): void;
    gap: number;
  }) { this.viewport = deps; }
  attachViewport(viewport: KeyboardViewport | null) { this.viewport = viewport; this.generation++; this.schedule(); }
  activate() { this.active = true; }
  deactivate() {
    this.active = false; this.generation++;
    if (this.frame !== null) this.deps.cancelFrame(this.frame);
    this.frame = null;
  }
  focus(field: MeasuredField | null) {
    if (!field) return;
    if (this.original === null) this.original = this.offset;
    this.field = field; this.generation++; this.schedule();
  }
  blur(field: MeasuredField | null) {
    if (field === this.field) { this.field = null; this.generation++; }
  }
  shown() {
    if (!this.active) return;
    if (this.original === null) this.original = this.offset;
    this.visible = true; this.restoring = false; this.generation++; this.schedule();
  }
  hidden() {
    if (!this.active) return;
    this.visible = false; this.restoring = this.original !== null; this.generation++; this.schedule();
  }
  scrolled(offset: number) { this.offset = Math.max(0, offset); }
  contentChanged(height: number) { this.contentHeight = height; this.layoutChanged(); }
  layoutChanged() { this.generation++; this.schedule(); }
  private move(offset: number) {
    if (Math.abs(offset - this.offset) < 1) return;
    this.offset = offset; this.viewport?.scrollTo?.(offset);
  }
  private schedule() {
    if (!this.active || (!this.visible && !this.restoring) || this.frame !== null) return;
    this.frame = this.deps.requestFrame(() => { this.frame = null; this.measure(); });
  }
  private measure() {
    if (!this.active || this.contentHeight === null) return;
    const generation = this.generation;
    const current = () => this.active && generation === this.generation;
    this.viewport?.measureViewport?.((_x, viewportY, _width, viewportHeight) => {
      if (!current() || viewportHeight <= 0) return;
      if (this.restoring && !this.visible) {
        this.move(Math.min(this.original ?? this.offset, Math.max(0, this.contentHeight! - viewportHeight)));
        this.original = null; this.restoring = false; return;
      }
      const field = this.field;
      if (!this.visible || !field?.isFocused()) return;
      field.measureInWindow((_fx, fieldY, _fw, fieldHeight) => {
        if (!current() || field !== this.field || !field.isFocused() || fieldHeight <= 0) return;
        this.move(focusedFieldOffset({ offset: this.offset, fieldY, fieldHeight, viewportY,
          viewportHeight, contentHeight: this.contentHeight!, gap: this.deps.gap }));
      });
    });
  }
}
