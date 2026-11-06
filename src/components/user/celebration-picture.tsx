import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { layout, motion, spacing } from '@/theme/tokens';

/** One entrance per mount. Blur or reduced motion settles the image immediately. */
export function CelebrationPicture() {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0), offset = useSharedValue(reduced ? 0 : spacing.md), scale = useSharedValue(reduced ? 1 : 0.9);
  const settle = useCallback(() => {
    cancelAnimation(opacity); cancelAnimation(offset); cancelAnimation(scale);
    opacity.set(1); offset.set(0); scale.set(1);
  }, [opacity, offset, scale]);
  useEffect(() => {
    let mounted = true;
    if (!reduced) {
      const options = { duration: motion.userCelebrationDuration, reduceMotion: ReduceMotion.System };
      opacity.set(0); offset.set(spacing.md); scale.set(0.9);
      opacity.set(withTiming(1, options)); offset.set(withTiming(0, options));
      scale.set(withSequence(ReduceMotion.System,
        withTiming(1.05, { ...options, duration: options.duration * 0.6 }),
        withTiming(1, { ...options, duration: options.duration * 0.4 })));
    }
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted && value) settle(); }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { if (value) settle(); });
    return () => { mounted = false; listener.remove(); settle(); };
  }, [reduced, opacity, offset, scale, settle]);
  useFocusEffect(useCallback(() => () => settle(), [settle]));
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateY: offset.get() }, { scale: scale.get() }] }));
  return <Animated.View style={[styles.frame, animated]} accessible={false} importantForAccessibility="no-hide-descendants">
    <Image source={require('@/assets/illustrations/user-happy.png')} contentFit="contain" accessible={false} style={styles.image} />
  </Animated.View>;
}
const styles = StyleSheet.create({
  frame: { width: '100%', maxWidth: layout.carer.illustrationWidth, alignSelf: 'center' },
  image: { width: '100%', aspectRatio: layout.userOnboarding.illustrationRatio },
});
