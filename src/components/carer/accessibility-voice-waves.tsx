import { useEffect } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { motion, radii, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

/** Decorative only: a finite pulse, never audio or a playback control. */
export function AccessibilityVoiceWaves({ active }: { active: boolean }) {
  const { colors } = useAppTheme(), focused = useIsFocused(), reduced = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    let mounted = true, stopped = false;
    const settle = () => { cancelAnimation(scale); scale.set(1); };
    const reduction = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { if (value) { stopped = true; settle(); } });
    const foreground = AppState.addEventListener('change', state => { if (state !== 'active') { stopped = true; settle(); } });
    settle();
    // Wait for the current accessibility setting; late answers cannot animate a hidden card.
    if (active && focused && !reduced && AppState.currentState === 'active') {
      void AccessibilityInfo.isReduceMotionEnabled().then(value => {
        if (!mounted || stopped || value || AppState.currentState !== 'active') return;
        const options = { duration: motion.userCelebrationDuration, reduceMotion: ReduceMotion.System };
        scale.set(withSequence(ReduceMotion.System, withTiming(1.12, options), withTiming(1, options)));
      }).catch(() => undefined);
    }
    return () => { mounted = false; reduction.remove(); foreground.remove(); settle(); };
  }, [active, focused, reduced, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.get() }] }));
  return <Animated.View style={[styles.waves, animated]} accessible={false} importantForAccessibility="no-hide-descendants">
    {[spacing.md, spacing['2xl'], spacing['3xl'], spacing['2xl'], spacing.md].map((height, index) =>
      <View key={index} style={{ width: spacing.xs, height, borderRadius: radii.control, backgroundColor: colors.action.primary }} />)}
  </Animated.View>;
}
const styles = StyleSheet.create({ waves: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm } });
