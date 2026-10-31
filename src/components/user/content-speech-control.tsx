import { Pressable, StyleSheet, View } from 'react-native';
import type { useContentSpeech } from '@/hooks/use-content-speech';
import { useAppTheme } from '@/theme/use-theme';
import { sizes, spacing, typography } from '@/theme/tokens';
import { AppText } from '@/components/app-text';
import { AreaIcon } from '@/components/carer/area-icon';

export function ContentSpeechControl({ speech, label, compact = false }: { speech: ReturnType<typeof useContentSpeech>; label: string; compact?: boolean }) {
  const { colors } = useAppTheme();
  if (!speech.enabled) return null;
  return <View style={[styles.control, compact && styles.compactControl]}>
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      onPress={speech.repeat} style={[styles.target, compact && styles.compactTarget]}>
      <AreaIcon name="audio" color={colors.action.primary} />
    </Pressable>
    {speech.error && <AppText accessibilityRole="alert" style={[styles.error, { color: colors.text.primary }]}>No pudimos leer el mensaje. Puedes intentarlo otra vez.</AppText>}
  </View>;
}
const styles = StyleSheet.create({ control: { flexShrink: 1 }, target: { minWidth: sizes.touchTarget, minHeight: sizes.touchTarget,
  alignItems: 'center', justifyContent: 'center', padding: spacing.xs },
  // The compact label's existing padding accommodates the full touch target.
  compactControl: { alignItems: 'flex-start', flexGrow: 0, minWidth: sizes.touchTarget,
    marginHorizontal: -(sizes.touchTarget - sizes.icon) / 2, marginVertical: -(sizes.touchTarget - sizes.icon) / 2 },
  compactTarget: { width: sizes.touchTarget, alignSelf: 'flex-start', flexGrow: 0 },
  error: { fontFamily: typography.family.regular,
  fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm } });
