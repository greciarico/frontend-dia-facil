import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { layout, motion, radii, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

/** Decorative transition, not a measurement of backend progress. No numeric accessibility value. */
export function ConnectionProgress() {
  const { colors } = useAppTheme(); const initialReduced = useReducedMotion();
  const [reduced, setReduced] = useState(initialReduced); const [indeterminate, setIndeterminate] = useState(false);
  const [width, setWidth] = useState(0); const progress = useSharedValue(0);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { if (mounted) setReduced(value); });
    const timer = setTimeout(() => { if (mounted) setIndeterminate(true); }, motion.userConnectionTransitionDuration);
    return () => { mounted = false; clearTimeout(timer); listener.remove(); };
  }, []);
  useEffect(() => {
    cancelAnimation(progress); progress.value = reduced ? 1 : 0;
    if (!reduced) {
      const options = { duration: motion.userConnectionTransitionDuration, easing: Easing.linear, reduceMotion: ReduceMotion.System };
      progress.value = indeterminate ? withRepeat(withTiming(1, options), -1, false) : withTiming(1, options);
    }
    return () => cancelAnimation(progress);
  }, [progress, reduced, indeterminate]);
  const animated = useAnimatedStyle(() => indeterminate && !reduced
    ? { width: '35%', transform: [{ translateX: (progress.value * 1.35 - 0.35) * width }] }
    : { width: `${progress.value * 100}%`, transform: [{ translateX: 0 }] });
  return <View accessibilityRole="progressbar" accessibilityLabel="Conectando tu agenda" accessibilityState={{ busy: true }}
    style={[styles.track, { backgroundColor: colors.welcome.intro }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <Animated.View style={[styles.fill, { backgroundColor: colors.action.primary }, animated]} accessible={false} />
  </View>;
}

export function ConnectionCalendar() {
  const { colors } = useAppTheme();
  return <Svg width={layout.activities.emptyIllustrationSize} height={layout.activities.emptyIllustrationSize} viewBox="0 0 120 120" accessible={false}>
    <Rect x="12" y="16" width="96" height="96" rx="15" fill={colors.welcome.body} stroke={colors.action.primary} strokeWidth="8" />
    <Path d="M12 39h96M33 6v24m54-24v24" stroke={colors.action.primary} strokeWidth="10" />
    <Circle cx="43" cy="65" r="6" fill={colors.action.primary} /><Circle cx="77" cy="65" r="6" fill={colors.action.primary} />
  </Svg>;
}
const styles = StyleSheet.create({
  track: { width: '100%', maxWidth: layout.welcome.illustrationWidth, height: spacing.lg, borderRadius: radii.control,
    overflow: 'hidden', alignSelf: 'center', marginVertical: spacing['4xl'] },
  fill: { height: '100%', borderRadius: radii.control },
});
