import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export function ContinueButton({ label, onPress, loading = false, disabled = false, loadingLabel = 'Enviando…', leadingIcon }: {
  label: string; onPress?: () => void; loading?: boolean; disabled?: boolean; loadingLabel?: string; leadingIcon?: ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={loading ? loadingLabel : label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading}
      onPress={onPress} style={({ pressed }) => [styles.button, {
        backgroundColor: disabled && !loading ? colors.action.disabled : pressed ? colors.action.pressed : colors.action.primary }]}>
      {loading && <ActivityIndicator color={colors.action.onPrimary} accessible={false} />}
      {!loading && leadingIcon}
      <Text style={[styles.label, { color: disabled && !loading ? colors.text.secondary : colors.action.onPrimary }]}>
        {loading ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: { minHeight: sizes.touchTarget + spacing.md, padding: spacing.lg, borderRadius: radii.control,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  label: { fontFamily: typography.family.semibold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg, flexShrink: 1 },
});
