import { Pressable, StyleSheet, Text } from 'react-native';
import { radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { AreaIcon } from './area-icon';
export function ActivitySecondaryAction({ label, icon, onPress, disabled = false, destructive = false }: {
  label: string; icon: 'sparkles' | 'plus' | 'trash' | 'imagePlus' | 'grid' | 'back'; onPress: () => void; disabled?: boolean; destructive?: boolean;
}) {
  const { colors } = useAppTheme();
  const color = disabled ? colors.text.disabled : destructive ? colors.status.error : colors.action.primary;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1,
      backgroundColor: destructive ? colors.status.errorSurface : colors.welcome.intro }]}>
    <AreaIcon name={icon} color={color} size={sizes.iconSmall} />
    <Text style={[styles.label, { color }]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: sizes.touchTarget, padding: spacing.sm, borderRadius: radii.control,
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  label: { flexShrink: 1, textAlign: 'center', fontFamily: typography.family.semibold,
    fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
});
