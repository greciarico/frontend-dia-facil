import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { VideoView, useVideoPlayer, type VideoPlayer } from 'expo-video';
import { AppText } from '@/components/app-text';
import { EditorialVideoController, visibleVideoFraction, type EditorialVideoPort } from '@/utils/editorial-video';
import { radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { AreaIcon } from './area-icon';
import { ContinueButton } from './continue-button';

const videos = [
  { source: require('@/assets/accessibility/videos/visual-support.mp4'), title: 'Comprender de forma visual',
    description: 'Los apoyos visuales pueden facilitar la comprensión y la participación en las actividades cotidianas.' },
  { source: require('@/assets/accessibility/videos/caregiver-support.mp4'), title: 'Acompañar hacia la autonomía',
    description: 'El apoyo de un cuidador puede acompañar a la persona mientras desarrolla sus actividades con mayor independencia.' },
] as const;

function setup(player: VideoPlayer) {
  player.muted = true; player.volume = 0; player.loop = false; player.staysActiveInBackground = false;
  player.showNowPlayingNotification = false; player.allowsExternalPlayback = false; player.keepScreenOnWhilePlaying = false;
}
function port(player: VideoPlayer, source: number): EditorialVideoPort {
  return { pause: () => player.pause(), play: () => { player.muted = true; player.volume = 0; player.play(); },
    reset: () => { player.currentTime = 0; }, ready: () => player.status === 'readyToPlay', failed: () => player.status === 'error',
    atEnd: () => player.duration > 0 && player.currentTime >= player.duration - 0.25,
    reload: () => player.replaceAsync(source),
    listen: handlers => {
      const events = [player.addListener('statusChange', ({ status }) => { if (status === 'error') handlers.error(); else handlers.status(); }),
        player.addListener('playToEnd', handlers.ended)];
      return () => events.forEach(event => event.remove());
    } };
}
export type AccessibilityMediaHandle = { measureVisibility(): void };
export const AccessibilityMediaCarousel = forwardRef<AccessibilityMediaHandle, { viewportRef: RefObject<ScrollView | null>; blocked: boolean }>(
  function AccessibilityMediaCarousel({ viewportRef, blocked }, ref) {
    const { colors } = useAppTheme(), focused = useIsFocused();
    const first = useVideoPlayer(videos[0].source, setup), second = useVideoPlayer(videos[1].source, setup);
    const controller = useMemo(() => new EditorialVideoController([port(first, videos[0].source), port(second, videos[1].source)]), [first, second]);
    const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
    const [width, setWidth] = useState(0), [foreground, setForeground] = useState({ active: AppState.currentState === 'active', revision: 0 });
    const [reduced, setReduced] = useState<boolean | null>(null);
    const [renderedFrames, setRenderedFrames] = useState<readonly boolean[]>([false, false]);
    const frame = useRef<View>(null), pager = useRef<ScrollView>(null), alive = useRef(false);
    const pending = useRef(false), dirty = useRef(false), sequence = useRef(0), dragging = useRef(false);
    const allowed = focused && foreground.active && !blocked;
    const invalidateMeasurement = useCallback(() => { ++sequence.current; pending.current = false; dirty.current = false; }, []);
    const measure = useCallback(function measure() {
      if (!alive.current || !frame.current || !viewportRef.current) return;
      if (pending.current) { dirty.current = true; return; }
      pending.current = true; dirty.current = false; const request = ++sequence.current;
      frame.current.measureInWindow((_x, y, _w, height) => {
        if (!alive.current || request !== sequence.current) return;
        const viewport = viewportRef.current?.getNativeScrollRef();
        if (!viewport) { pending.current = false; return; }
        viewport.measureInWindow((_vx, vy, _vw, vh) => {
          if (!alive.current || request !== sequence.current) return;
          pending.current = false; controller.visibility(visibleVideoFraction({ y, height }, { y: vy, height: vh }));
          if (dirty.current) measure();
        });
      });
    }, [controller, viewportRef]);
    useImperativeHandle(ref, () => ({ measureVisibility: measure }), [measure]);
    useEffect(() => {
      alive.current = true; controller.enter();
      let motionRevision = 0, mounted = true;
      const revision = motionRevision;
      void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted && revision === motionRevision) setReduced(value); }).catch(() => { if (mounted && revision === motionRevision) setReduced(true); });
      const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { if (mounted) { ++motionRevision; setReduced(value); } });
      const app = AppState.addEventListener('change', value => {
        if (!mounted) return;
        if (value !== 'active') { controller.environment(false, true); invalidateMeasurement(); }
        setForeground(previous => ({ active: value === 'active', revision: previous.revision + 1 }));
      });
      return () => { mounted = false; alive.current = false; invalidateMeasurement(); motion.remove(); app.remove(); controller.leave(); };
    }, [controller, invalidateMeasurement]);
    useEffect(() => {
      invalidateMeasurement();
      controller.environment(allowed, reduced !== false);
      if (allowed) measure();
    }, [allowed, foreground.revision, reduced, controller, measure, invalidateMeasurement]);
    useEffect(() => {
      if (width > 0) {
        const selected = controller.getSnapshot().selected;
        dragging.current = false; controller.select(selected);
        pager.current?.scrollTo({ x: selected * width, animated: false });
      }
      measure();
    }, [width, measure, controller]);
    const choose = (index: number) => { controller.select(index); pager.current?.scrollTo({ x: index * width, animated: false }); };
    const settle = (x: number) => { dragging.current = false; controller.select(Math.max(0, Math.min(1, Math.round(x / width)))); };
    const selected = videos[state.selected];
    const playbackLabel = state.mode === 'playing' ? 'Pausar video' : state.mode === 'manual-paused' ? 'Reanudar video'
      : state.mode === 'ended' ? 'Volver a reproducir video' : 'Reproducir video';
    const showPlay = !state.error && !state.loading && (state.mode === 'manual-paused' || state.mode === 'ended' || state.mode === 'ready' && reduced !== false);
    return <View style={styles.section}>
      <View ref={frame} collapsable={false} style={[styles.frame, { backgroundColor: colors.surface.elevated }]} onLayout={event => { setWidth(event.nativeEvent.layout.width); measure(); }}>
        {width > 0 && <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} directionalLockEnabled
          onScrollBeginDrag={() => { dragging.current = true; controller.beginDrag(); }}
          onScrollEndDrag={event => {
            const x = event.nativeEvent.contentOffset.x;
            if (!event.nativeEvent.velocity?.x && Math.abs(x - Math.round(x / width) * width) < 1) settle(x);
          }}
          onMomentumScrollEnd={event => { if (dragging.current) settle(event.nativeEvent.contentOffset.x); }}>
          {[first, second].map((player, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={playbackLabel}
            accessible={index === state.selected} importantForAccessibility={index === state.selected ? 'yes' : 'no-hide-descendants'}
            accessibilityState={{ disabled: index !== state.selected || !state.visible || !allowed || state.error }}
            disabled={index !== state.selected || !state.visible || !allowed || state.error} onPress={() => controller.toggle()}
            style={{ width, height: width * 9 / 16 }}>
            <VideoView player={player} style={StyleSheet.absoluteFill} pointerEvents="none"
              onFirstFrameRender={() => { if (alive.current) setRenderedFrames(previous => previous[index] ? previous : previous.map((rendered, i) => rendered || i === index)); }}
              nativeControls={false} contentFit="contain" surfaceType="textureView" fullscreenOptions={{ enable: false }} allowsPictureInPicture={false}
              startsPictureInPictureAutomatically={false} accessible={false} importantForAccessibility="no-hide-descendants" />
            {index === state.selected && showPlay && <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, styles.playOverlay]}>
              <View style={[styles.playCircle, { backgroundColor: colors.action.primary }]}><AreaIcon name="play" color={colors.action.onPrimary} /></View>
            </View>}
          </Pressable>)}
        </ScrollView>}
        {state.loading && !state.error && !renderedFrames[state.selected] && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.playOverlay]}>
          <ActivityIndicator accessibilityLabel="Cargando video" color={colors.action.primary} />
        </View>}
      </View>
      <AppText accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{selected.title}</AppText>
      <AppText style={[styles.body, { color: colors.text.secondary }]}>{selected.description}</AppText>
      {state.error && <AppText accessibilityRole="alert" style={[styles.body, { color: colors.text.primary }]}>No pudimos reproducir el video. Puedes intentarlo otra vez.</AppText>}
      {state.error && <ContinueButton size="modal" variant="secondary" label="Reintentar"
        disabled={!state.visible || !allowed} onPress={() => void controller.retry()} />}
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Video anterior" disabled={state.selected === 0 || width === 0}
          accessibilityState={{ disabled: state.selected === 0 || width === 0 }} onPress={() => choose(0)} style={styles.control}>
          <AreaIcon name="back" color={state.selected === 0 ? colors.text.disabled : colors.action.primary} />
        </Pressable>
        <AppText accessibilityLiveRegion="polite" style={[styles.position, styles.body, { color: colors.text.secondary }]}>{state.selected + 1} de 2</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Video siguiente" disabled={state.selected === 1 || width === 0}
          accessibilityState={{ disabled: state.selected === 1 || width === 0 }} onPress={() => choose(1)} style={styles.control}>
          <AreaIcon name="chevron" color={state.selected === 1 ? colors.text.disabled : colors.action.primary} />
        </Pressable>
      </View>
    </View>;
  });
const styles = StyleSheet.create({ section: { gap: spacing.md },
  frame: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', borderRadius: radii.card },
  playOverlay: { alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: typography.family.bold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg },
  body: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  control: { width: sizes.touchTarget, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  position: { textAlign: 'center', flexShrink: 1 },
});
