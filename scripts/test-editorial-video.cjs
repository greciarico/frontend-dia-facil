const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), test = require('node:test'), ts = require('typescript');
const exportsObject = {};
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/editorial-video.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(exportsObject);
const { EditorialVideoController, visibleVideoFraction } = exportsObject;
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function fixture({ reduced = false, ready = true } = {}) {
  const log = [], players = [0, 1].map(index => ({
    position: 0, loaded: ready, playing: false, handlers: null, saved: [], reloadResult: Promise.resolve(),
    pause() { this.playing = false; log.push(`pause:${index}`); },
    play() { assert.ok(players.every((p, i) => i === index || !p.playing)); this.playing = true; log.push(`play:${index}`); },
    reset() { this.position = 0; log.push(`reset:${index}`); }, ready() { return this.loaded; }, failed() { return false; }, atEnd() { return this.position >= 20; },
    reload() { return this.reloadResult; },
    listen(handlers) { this.handlers = handlers; this.saved.push(handlers); return () => { if (this.handlers === handlers) this.handlers = null; }; },
  }));
  const controller = new EditorialVideoController(players); controller.enter(); controller.environment(true, reduced);
  return { controller, players, log, plays: () => log.filter(s => s.startsWith('play:')) };
}

test('visibility measures the audiovisual rect and handles small viewports and invalid native layouts', () => {
  assert.equal(visibleVideoFraction({ y: 0, height: 200 }, { y: 0, height: 500 }), 1);
  assert.equal(visibleVideoFraction({ y: 370, height: 200 }, { y: 0, height: 500 }), 0.65);
  assert.equal(visibleVideoFraction({ y: -130, height: 200 }, { y: 0, height: 500 }), 0.35);
  assert.equal(visibleVideoFraction({ y: -50, height: 200 }, { y: 0, height: 100 }), 1);
  assert.equal(visibleVideoFraction({ y: 500, height: 200 }, { y: 0, height: 100 }), 0);
  assert.equal(visibleVideoFraction({ y: NaN, height: 200 }, { y: 0, height: 100 }), 0);
  assert.equal(visibleVideoFraction({ y: 0, height: 0 }, { y: 0, height: 100 }), 0);
});

test('65/35 hysteresis starts once, ignores boundary jitter and resets only after a real exit', () => {
  const f = fixture(); f.controller.visibility(0.64); assert.equal(f.plays().length, 0);
  f.controller.visibility(0.65); assert.deepEqual(f.plays(), ['play:0']); f.players[0].position = 7;
  for (const ratio of [0.64, 0.66, 0.5, 0.36, 0.8]) f.controller.visibility(ratio);
  assert.equal(f.plays().length, 1); assert.equal(f.players[0].position, 7);
  f.controller.visibility(0.35); assert.equal(f.controller.getSnapshot().mode, 'outside'); assert.equal(f.players[0].position, 0);
  f.controller.visibility(0.6); assert.equal(f.plays().length, 1);
  f.controller.visibility(0.7); assert.equal(f.plays().length, 2); f.controller.leave();
});

test('manual pause survives scroll and readiness events, resumes in place and a completed video never loops', () => {
  const f = fixture(); f.controller.visibility(1); f.players[0].position = 8; f.controller.toggle();
  assert.equal(f.controller.getSnapshot().mode, 'manual-paused');
  f.controller.visibility(0.5); f.players[0].handlers.status(); assert.equal(f.plays().length, 1);
  f.controller.toggle(); assert.equal(f.players[0].position, 8); assert.equal(f.plays().length, 2);
  f.players[0].position = 20; f.players[0].handlers.ended();
  assert.equal(f.controller.getSnapshot().mode, 'ended'); assert.equal(f.controller.getSnapshot().selected, 0);
  f.controller.visibility(0.8); f.players[0].handlers.status(); assert.equal(f.plays().length, 2);
  f.controller.toggle(); assert.equal(f.players[0].position, 0); assert.equal(f.plays().length, 3); f.controller.leave();
});

test('changing pages stops and resets before playback; cancelled swipes preserve position and manual intention', () => {
  const f = fixture(); f.controller.visibility(1); f.players[0].position = 5;
  f.controller.beginDrag(); assert.ok(f.players.every(p => !p.playing)); f.controller.select(0);
  assert.equal(f.players[0].position, 5); assert.equal(f.players[0].playing, true);
  f.controller.toggle(); f.controller.beginDrag(); f.controller.select(0); assert.equal(f.controller.getSnapshot().mode, 'manual-paused');
  f.controller.select(1); assert.equal(f.players[0].position, 0); assert.equal(f.players[1].playing, true);
  f.players[1].position = 10; f.controller.select(0); assert.equal(f.players[1].position, 0); assert.equal(f.players[0].position, 0);
  assert.equal(f.plays().at(-1), 'play:0'); f.controller.leave();
});

test('reduced motion requires manual playback, while new reduction pauses autoplay and context return rechecks visibility', () => {
  const f = fixture({ reduced: true }); f.controller.visibility(1); assert.equal(f.plays().length, 0);
  f.controller.toggle(); assert.equal(f.plays().length, 1);
  f.controller.environment(false, true); assert.ok(f.players.every(p => !p.playing));
  f.controller.environment(true, true); assert.equal(f.plays().length, 1);
  f.controller.visibility(1); assert.equal(f.plays().length, 1); f.controller.leave();
  const a = fixture(); a.controller.visibility(1); a.controller.environment(true, true);
  assert.equal(a.controller.getSnapshot().mode, 'ready'); assert.ok(a.players.every(p => !p.playing)); a.controller.leave();
});

test('readiness is not artificial progress; inactive and stale events cannot start or complete another viewing', () => {
  const f = fixture({ ready: false }); f.controller.visibility(1); assert.equal(f.plays().length, 0);
  f.players[0].loaded = true; f.players[0].handlers.status(); assert.equal(f.plays().length, 1);
  const old = f.players[0].handlers; f.controller.select(1); old.ended(); old.error(); old.status();
  assert.equal(f.controller.getSnapshot().error, false); assert.equal(f.controller.getSnapshot().selected, 1);
  f.players[1].loaded = true; f.players[1].handlers.status(); assert.equal(f.plays().at(-1), 'play:1');
  f.players[1].handlers.ended(); assert.equal(f.controller.getSnapshot().mode, 'playing'); // Ignore an old end event before the new timeline reaches its end.
  const latest = f.players[1].handlers; f.controller.leave(); latest.status(); latest.ended(); assert.ok(f.players.every(p => !p.playing));
});

test('errors require explicit retry and late reloads cannot resume a hidden screen or another page', async () => {
  const f = fixture(); f.controller.visibility(1); f.players[0].handlers.error();
  assert.equal(f.controller.getSnapshot().error, true); assert.ok(f.players.every(p => !p.playing));
  f.controller.visibility(0.8); assert.equal(f.plays().length, 1);
  const d = deferred(); f.players[0].reloadResult = d.promise; const pending = f.controller.retry();
  f.controller.environment(false, false); d.resolve(); await pending; assert.ok(f.players.every(p => !p.playing)); f.controller.leave();
  const r = fixture({ reduced: true }); r.controller.visibility(1); r.players[0].handlers.error(); await r.controller.retry();
  assert.equal(r.plays().length, 1); r.controller.leave();
});

test('a pre-existing decoder error is visible when selecting a page, and explicit retry can recover it', async () => {
  const f = fixture(); f.players[1].failed = () => true; f.players[1].loaded = false;
  f.controller.visibility(1); f.controller.select(1); assert.equal(f.controller.getSnapshot().error, true);
  assert.equal(f.controller.getSnapshot().loading, false); assert.ok(f.players.every(p => !p.playing));
  f.players[1].reload = async () => { f.players[1].failed = () => false; f.players[1].loaded = true; };
  await f.controller.retry(); assert.equal(f.controller.getSnapshot().error, false); assert.equal(f.plays().at(-1), 'play:1'); f.controller.leave();
});

function load(file, modules = {}) {
  const out = {};
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(id => { assert.ok(id in modules, 'Missing adapter ' + id); return modules[id]; }, out);
  return out;
}
const jsx = (type, props) => ({ type, props });
const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : [];
const flatten = s => Object.assign({}, ...[s].flat(Infinity).filter(Boolean));
const tokens = load('theme/tokens.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));
function hookHarness() {
  let cursor = 0, jobs = [], changes = 0; const slots = [];
  const react = {
    forwardRef: fn => fn,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], v => { changes++; slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useMemo: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useCallback: (fn, deps) => react.useMemo(() => fn, deps), useSyncExternalStore: (_, snapshot) => snapshot(),
    useEffect: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) { const old = slots[i]; slots[i] = { deps }; jobs.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
    useImperativeHandle: (ref, fn, deps) => react.useEffect(() => { ref.current = fn(); return () => { ref.current = null; }; }, deps),
  };
  return { react, render: fn => { cursor = 0; const tree = fn(), run = jobs; jobs = []; run.forEach(f => f()); return tree; },
    unmount: () => slots.forEach(s => s?.cleanup?.()), changes: () => changes };
}
function mediaFixture({ theme = tokens.themes.light, motionAnswer = Promise.resolve(false) } = {}) {
  const h = hookHarness(), players = [], events = new Map(), ref = { current: null }, scrolls = [], nativeMeasures = [];
  let focused = true, blocked = false, delayed = false, frameY = 100;
  const app = { currentState: 'active', addEventListener: (name, fn) => { events.set(name, fn); return { remove: () => events.delete(name) }; } };
  const Media = load('components/carer/accessibility-media.tsx', {
    react: h.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', ScrollView: 'Scroll', Pressable: 'Pressable', ActivityIndicator: 'Spinner',
      StyleSheet: { create: x => x, absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, absoluteFillObject: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } }, AppState: app,
      AccessibilityInfo: { isReduceMotionEnabled: () => motionAnswer, addEventListener: (name, fn) => { events.set(name, fn); return { remove: () => events.delete(name) }; } } },
    'expo-router': { useIsFocused: () => focused },
    'expo-video': { VideoView: 'Video', useVideoPlayer: (source, setup) => h.react.useMemo(() => {
      const p = { source, status: 'readyToPlay', playing: false, currentTime: 0, duration: 20, listeners: new Map(), plays: 0, reloads: 0,
        pause() { this.playing = false; }, play() { assert.ok(players.every(other => !other.playing)); this.playing = true; this.plays++; },
        async replaceAsync() { this.reloads++; }, addListener(name, fn) { this.listeners.set(name, fn); return { remove: () => { if (this.listeners.get(name) === fn) this.listeners.delete(name); } }; } };
      setup(p); players.push(p); return p;
    }, []) },
    '@/components/app-text': { AppText: 'Text' }, '@/utils/editorial-video': exportsObject,
    '@/theme/tokens': tokens, '@/theme/use-theme': { useAppTheme: () => theme },
    './area-icon': { AreaIcon: 'Icon' }, './continue-button': { ContinueButton: 'Button' },
    '@/assets/accessibility/videos/visual-support.mp4': 101, '@/assets/accessibility/videos/caregiver-support.mp4': 102,
  }).AccessibilityMediaCarousel;
  const viewportRef = { current: { getNativeScrollRef: () => ({ measureInWindow: fn => fn(0, 0, 320, 600) }) } };
  const render = () => h.render(() => Media({ viewportRef, blocked }, ref));
  const frameHost = { measureInWindow: fn => { if (delayed) nativeMeasures.push(fn); else fn(0, frameY, 320, 180); } };
  let tree = render(); const frame = nodes(tree).find(n => n.props?.onLayout);
  frame.props.ref.current = frameHost; frame.props.onLayout({ nativeEvent: { layout: { width: 320 } } });
  tree = render(); nodes(tree).find(n => n.type === 'Scroll').props.ref.current = { scrollTo: value => scrolls.push(value) };
  return { h, ref, render, players, events, app, scrolls, nativeMeasures, focus: v => { focused = v; }, block: v => { blocked = v; },
    delayed: v => { delayed = v; }, frameY: v => { frameY = v; } };
}

test('video touch area keeps silent full pages, accessible pause/resume/replay and layout-free Play overlays in both themes', async () => {
  for (const theme of [tokens.themes.light, tokens.highContrastTheme]) {
    const f = mediaFixture({ theme }); await tick(); f.render(); let tree = f.render();
    assert.deepEqual(f.players.map(p => p.source), [101, 102]);
    for (const p of f.players) { assert.equal(p.muted, true); assert.equal(p.volume, 0); assert.equal(p.loop, false); assert.equal(p.staysActiveInBackground, false); }
    assert.equal(f.players[0].playing, true); assert.equal(f.players[1].playing, false);
    assert.equal(nodes(tree).find(n => n.type === 'Scroll').props.pagingEnabled, true);
    const views = nodes(tree).filter(n => n.type === 'Video'); assert.equal(views.length, 2);
    for (const v of views) {
      assert.equal(v.props.style.position, 'absolute'); assert.equal(v.props.pointerEvents, 'none'); assert.equal(v.props.contentFit, 'contain');
      assert.equal(v.props.nativeControls, false); assert.equal(v.props.fullscreenOptions.enable, false); assert.equal(v.props.allowsPictureInPicture, false);
    }
    const pages = nodes(tree).filter(n => n.type === 'Pressable' && n.props.accessible !== undefined);
    assert.deepEqual(pages.map(n => n.props.style), [{ width: 320, height: 180 }, { width: 320, height: 180 }]);
    assert.equal(pages.filter(n => n.props.accessible).length, 1); assert.equal(pages[1].props.importantForAccessibility, 'no-hide-descendants');
    const action = () => nodes(tree).find(n => n.type === 'Pressable' && n.props.accessible === true);
    assert.ok(!nodes(tree).some(n => n.type === 'Button'));
    assert.equal(action().props.accessibilityLabel, 'Pausar video');
    assert.ok(!nodes(tree).some(n => n.type === 'Icon' && n.props.name === 'play'));
    f.players[0].currentTime = 8; action().props.onPress(); tree = f.render();
    assert.equal(action().props.accessibilityLabel, 'Reanudar video');
    const overlay = nodes(tree).find(n => n.props?.pointerEvents === 'none' && n.type === 'View');
    assert.equal(flatten(overlay.props.style).position, 'absolute');
    const circle = flatten(overlay.props.children.props.style); assert.ok(circle.width >= tokens.sizes.touchTarget && circle.height >= tokens.sizes.touchTarget);
    f.frameY(510); f.ref.current.measureVisibility(); tree = f.render(); // 50% remains in the same viewing.
    assert.equal(action().props.accessibilityLabel, 'Reanudar video'); assert.equal(f.players[0].playing, false);
    action().props.onPress(); tree = f.render(); assert.equal(f.players[0].currentTime, 8); assert.equal(f.players[0].playing, true);
    assert.ok(!nodes(tree).some(n => n.type === 'Icon' && n.props.name === 'play'));
    f.players[0].currentTime = 20; f.players[0].listeners.get('playToEnd')(); tree = f.render();
    assert.equal(action().props.accessibilityLabel, 'Volver a reproducir video'); assert.ok(nodes(tree).some(n => n.type === 'Icon' && n.props.name === 'play'));
    action().props.onPress(); tree = f.render(); assert.equal(f.players[0].currentTime, 0); assert.equal(f.players[0].playing, true);
    nodes(tree).find(n => n.props?.accessibilityLabel === 'Video siguiente').props.onPress(); tree = f.render();
    assert.equal(f.players[0].playing, false); assert.equal(f.players[1].playing, true);
    assert.equal(nodes(tree).find(n => n.props?.children === 'Acompañar hacia la autonomía').type, 'Text');
    assert.deepEqual(f.scrolls.at(-1), { x: 320, animated: false });
    const swipe = nodes(tree).find(n => n.type === 'Scroll');
    swipe.props.onScrollBeginDrag(); assert.ok(f.players.every(p => !p.playing));
    nodes(tree).find(n => n.type === 'Pressable' && n.props.accessible === true).props.onPress();
    assert.ok(f.players.every(p => !p.playing)); // A gesture cannot toggle manual playback while paging.
    swipe.props.onScrollEndDrag({ nativeEvent: { contentOffset: { x: 320 }, velocity: { x: -1 } } });
    assert.ok(f.players.every(p => !p.playing)); // Wait for paging momentum even when release happens at a page boundary.
    swipe.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 0 } } });
    assert.equal(f.players[0].playing, true); assert.equal(f.players[1].playing, false);
    for (const n of nodes(tree).filter(n => n.type === 'Text')) { assert.equal(flatten(n.props.style).height, undefined); assert.equal(n.props.numberOfLines, undefined); }
    f.players[0].status = 'error'; f.players[0].listeners.get('statusChange')({ status: 'error' }); tree = f.render();
    assert.equal(nodes(tree).find(n => n.type === 'Button').props.label, 'Reintentar');
    assert.equal(nodes(tree).find(n => n.type === 'Pressable' && n.props.accessible === true).props.disabled, true);
    assert.ok(!nodes(tree).some(n => n.type === 'Icon' && n.props.name === 'play'));
    f.h.unmount(); assert.ok(f.players.every(p => !p.playing && p.listeners.size === 0)); assert.equal(f.events.size, 0);
  }
});

test('native measurements are coalesced; modal, focus and background gates reject stale viewport callbacks', async () => {
  const f = mediaFixture(); await tick(); f.render(); f.render();
  f.delayed(true); f.ref.current.measureVisibility(); f.ref.current.measureVisibility();
  assert.equal(f.nativeMeasures.length, 1); f.block(true); f.render(); assert.ok(f.players.every(p => !p.playing));
  f.nativeMeasures.shift()(0, 100, 320, 180); assert.ok(f.players.every(p => !p.playing));
  f.delayed(false); f.frameY(800); f.block(false); f.render(); assert.ok(f.players.every(p => !p.playing));
  f.frameY(100); f.ref.current.measureVisibility(); assert.equal(f.players[0].playing, true);
  f.events.get('change')('background'); assert.ok(f.players.every(p => !p.playing));
  f.app.currentState = 'active'; f.events.get('change')('active'); f.render(); assert.equal(f.players[0].playing, true);
  f.focus(false); f.render(); assert.ok(f.players.every(p => !p.playing)); f.h.unmount();
});

test('reduction changes outrank pending accessibility checks and unmounted media never updates state', async () => {
  const d = deferred(), f = mediaFixture({ motionAnswer: d.promise }); f.events.get('reduceMotionChanged')(true); f.render();
  d.resolve(false); await tick(); let tree = f.render(); assert.ok(f.players.every(p => !p.playing));
  assert.ok(nodes(tree).some(n => n.type === 'Icon' && n.props.name === 'play'));
  const play = nodes(tree).find(n => n.type === 'Pressable' && n.props.accessible === true);
  assert.equal(play.props.accessibilityLabel, 'Reproducir video'); play.props.onPress(); assert.equal(f.players[0].playing, true);
  const late = deferred(), l = mediaFixture({ motionAnswer: late.promise }); l.h.unmount(); const before = l.h.changes();
  late.resolve(false); await tick(); assert.equal(l.h.changes(), before); f.h.unmount();
});

test('initial loading is an in-frame overlay; repeated modal revalidation never inserts vertical loading or recreates either player', async () => {
  for (const theme of [tokens.themes.light, tokens.highContrastTheme]) {
    const f = mediaFixture({ theme }); await tick(); f.render(); let tree = f.render();
    const originalPlayers = [...f.players];
    const flowShape = tree => [tree.props.children].flat(Infinity).filter(Boolean).map(n => ({ type: n.type, style: flatten(n.props.style) }));
    const baseline = flowShape(tree);
    f.players[0].status = 'loading'; f.players[0].listeners.get('statusChange')({ status: 'loading' }); tree = f.render();
    assert.deepEqual(flowShape(tree), baseline);
    const frame = nodes(tree).find(n => n.props?.onLayout);
    const loadingOverlay = nodes(frame).find(n => n.props?.children?.type === 'Spinner');
    assert.ok(loadingOverlay); assert.equal(flatten(loadingOverlay.props.style).position, 'absolute');
    assert.equal(loadingOverlay.props.pointerEvents, 'none');
    assert.equal(loadingOverlay.props.children.props.accessibilityLabel, 'Cargando video');
    assert.equal(nodes(frame).filter(n => n.type === 'Spinner').length, nodes(tree).filter(n => n.type === 'Spinner').length);
    f.players[0].status = 'readyToPlay'; f.players[0].listeners.get('statusChange')({ status: 'readyToPlay' }); tree = f.render();
    assert.ok(!nodes(tree).some(n => n.type === 'Spinner'));
    for (const index of [0, 1]) {
      if (index === 1) { nodes(tree).find(n => n.props?.accessibilityLabel === 'Video siguiente').props.onPress(); tree = f.render(); }
      nodes(tree).filter(n => n.type === 'Video')[index].props.onFirstFrameRender(); tree = f.render();
      for (const paused of [false, true]) for (let repeat = 0; repeat < 3; repeat++) {
        if (paused) { nodes(tree).find(n => n.type === 'Pressable' && n.props.accessible === true).props.onPress(); tree = f.render(); }
        const shape = flowShape(tree);
        f.block(true); tree = f.render(); assert.ok(f.players.every(p => !p.playing));
        f.players[index].status = 'loading'; f.players[index].listeners.get('statusChange')({ status: 'loading' });
        f.block(false); tree = f.render();
        assert.deepEqual(flowShape(tree), shape);
        assert.ok(!nodes(tree).some(n => n.type === 'Spinner'));
        assert.equal(flatten(nodes(tree).find(n => n.props?.onLayout).props.style).aspectRatio, 16 / 9);
        f.players[index].status = 'readyToPlay'; f.players[index].listeners.get('statusChange')({ status: 'readyToPlay' }); tree = f.render();
        assert.deepEqual(flowShape(tree), shape); assert.equal(f.players[index].playing, true);
        assert.deepEqual(f.players, originalPlayers); assert.ok(f.players.every(p => p.reloads === 0));
      }
    }
    f.h.unmount();
  }
});
