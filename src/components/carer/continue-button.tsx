import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { borders, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export function ContinueButton({ label, onPress, loading = false, disabled = false, loadingLabel = 'Enviando…', leadingIcon, variant = 'primary', size = 'screen' }: {
  label: string; onPress?: () => void; loading?: boolean; disabled?: boolean; loadingLabel?: string; leadingIcon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive' | 'destructive-outline'; size?: 'screen' | 'modal';
}) {
  const { colors } = useAppTheme();
  const outlined = variant === 'secondary' || variant === 'destructive-outline';
  const destructive = variant === 'destructive' || variant === 'destructive-outline';
  const foreground = destructive ? (outlined ? colors.destructive.default : colors.destructive.onDefault)
    : outlined ? colors.action.primary : colors.action.onPrimary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={loading ? loadingLabel : label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading}
      onPress={onPress} style={({ pressed }) => [styles.button, size === 'modal' && styles.modal, {
        backgroundColor: disabled && !loading ? colors.action.disabled
          : outlined ? (pressed ? (destructive ? colors.destructive.surface : colors.welcome.intro) : colors.surface.elevated)
          : variant === 'destructive' ? colors.destructive.default : pressed ? colors.action.pressed : colors.action.primary,
        ...(outlined ? { borderWidth: borders.default, borderColor: disabled ? colors.border.decorative : destructive ? colors.destructive.default : colors.action.primary } : {}),
        opacity: variant === 'destructive' && pressed && !disabled ? 0.8 : 1 }]}>
      {loading && <ActivityIndicator color={foreground} accessible={false} />}
      {!loading && leadingIcon}
      <Text style={[styles.label, size === 'modal' && styles.modalLabel, destructive && styles.destructiveLabel,
        { color: disabled && !loading ? colors.text.secondary : foreground }]}>
        {loading ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: { minHeight: sizes.touchTarget + spacing.md, padding: spacing.lg, borderRadius: radii.control,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  label: { fontFamily: typography.family.semibold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg, flexShrink: 1 },
  modal: { minHeight: sizes.touchTarget, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.sm },
  modalLabel: { fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
  // The specified destructive red supports AA large bold text against white.
  destructiveLabel: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl },
});
