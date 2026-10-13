import { Pressable, StyleSheet } from 'react-native';
import { AreaIcon } from './area-icon';
import { sizes } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export function NotificationBell({ onPress }: { onPress?: () => void }) {
  const { colors } = useAppTheme();
  return <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel="Notificaciones"
    accessibilityHint={!onPress ? 'Disponible próximamente.' : undefined} accessibilityState={{ disabled: !onPress }}
    style={[styles.circle, { backgroundColor: colors.profiles.information }]}>
    <AreaIcon name="bell" color={onPress ? colors.action.primary : colors.text.disabled} />
  </Pressable>;
}
const styles = StyleSheet.create({ circle: { width: sizes.touchTarget, height: sizes.touchTarget,
  borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' } });
