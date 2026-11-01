import { useEffect } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/app-text';
import { motion, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

const AnimatedAppText = Animated.createAnimatedComponent(AppText);

/** Transform-only, ordered emphasis. Static in dialogs; no typography/layout mutations. */
export function AccessibilityTextSample({ active = false }: { active?: boolean }) {
  const { colors } = useAppTheme(), focused = useIsFocused(), reduced = useReducedMotion();
  const small = useSharedValue(1), medium = useSharedValue(1), large = useSharedValue(1);
  useEffect(() => {
    let mounted = true, stopped = false;
    const settle = () => { for (const scale of [small, medium, large]) { cancelAnimation(scale); scale.set(1); } };
    const reduction = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { if (value) { stopped = true; settle(); } });
    const foreground = AppState.addEventListener('change', state => { if (state !== 'active') { stopped = true; settle(); } });
    settle();
    if (active && focused && !reduced && AppState.currentState === 'active') {
      void AccessibilityInfo.isReduceMotionEnabled().then(value => {
        if (!mounted || stopped || value || AppState.currentState !== 'active') return;
        const options = { duration: motion.accessibilityTextPulseDuration, reduceMotion: ReduceMotion.System };
        [small, medium, large].forEach((scale, index) => {
          scale.set(withDelay(index * 2 * options.duration, withSequence(ReduceMotion.System,
            withTiming(1.06, options), withTiming(1, options)), ReduceMotion.System));
        });
      }).catch(() => undefined);
    }
    return () => { mounted = false; reduction.remove(); foreground.remove(); settle(); };
  }, [active, focused, reduced, small, medium, large]);
  const smallTransform = useAnimatedStyle(() => ({ transform: [{ scale: small.get() }] }));
  const mediumTransform = useAnimatedStyle(() => ({ transform: [{ scale: medium.get() }] }));
  const largeTransform = useAnimatedStyle(() => ({ transform: [{ scale: large.get() }] }));
  return <View style={styles.letters} accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
    <AnimatedAppText style={[styles.small, { color: colors.action.primary }, smallTransform]}>Aa</AnimatedAppText>
    <AnimatedAppText style={[styles.medium, { color: colors.action.primary }, mediumTransform]}>Aa</AnimatedAppText>
    <AnimatedAppText style={[styles.large, { color: colors.action.primary }, largeTransform]}>Aa</AnimatedAppText>
  </View>;
}
const styles = StyleSheet.create({
  letters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'center', gap: spacing.md },
  small: { fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  medium: { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'] },
  large: { fontFamily: typography.family.bold, fontSize: typography.size['4xl'], lineHeight: typography.lineHeight['4xl'] },
});
