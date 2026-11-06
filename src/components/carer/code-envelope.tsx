import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, runOnJS, useAnimatedStyle, useReducedMotion,
  useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { layout, motion, spacing } from '@/theme/tokens';

export function CodeEnvelope({ accepted = false, onComplete }: { accepted?: boolean; onComplete?: () => void }) {
  const initialReducedMotion = useReducedMotion();
  const [reduced, setReduced] = useState(initialReducedMotion);
  const tilt = useSharedValue(0);
  const card = useSharedValue(0);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; listener.remove(); };
  }, []);
  useEffect(() => {
    if (!accepted || !onComplete) return;
    if (reduced) { onComplete(); return; }
    const options = { duration: motion.carerTiltDuration, reduceMotion: ReduceMotion.System };
    tilt.value = withSequence(withTiming(motion.carerTiltDegrees, options),
      withTiming(-motion.carerTiltDegrees, options), withTiming(0, options));
    card.value = withTiming(-spacing['2xl'], { duration: motion.carerSuccessDuration, reduceMotion: ReduceMotion.System },
      finished => { if (finished) runOnJS(onComplete)(); });
    return () => { cancelAnimation(tilt); cancelAnimation(card); };
  }, [accepted, reduced, onComplete, tilt, card]);
  const envelopeStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: card.value }] }));
  return (
    <Animated.View style={[styles.envelope, envelopeStyle]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Image source={require('@/assets/illustrations/carer-code-back.svg')} contentFit="contain" style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
        <Image source={require('@/assets/illustrations/carer-code-card.svg')} contentFit="contain" style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Image source={require('@/assets/illustrations/carer-code-front.svg')} contentFit="contain" style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  envelope: { width: layout.carer.illustrationWidth, maxWidth: '100%', aspectRatio: layout.carer.codeIllustrationRatio },
});
