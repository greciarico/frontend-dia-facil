import { Pressable, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { AreaIcon } from './area-icon';
import { sizes } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export function NotificationBell({ onPress }: { onPress?: () => void }) {
  const pathname = usePathname();
  onPress ??= () => { if (pathname !== '/notificaciones') router.push('/notificaciones'); };
  const { colors } = useAppTheme();
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Notificaciones"
    style={[styles.circle, { backgroundColor: colors.profiles.information }]}>
    <AreaIcon name="bell" color={colors.action.primary} />
  </Pressable>;
}
const styles = StyleSheet.create({ circle: { width: sizes.touchTarget, height: sizes.touchTarget,
  borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' } });
