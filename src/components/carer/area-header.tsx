import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { AreaIcon } from './area-icon';
import { NotificationBell } from './notification-bell';

export function AreaHeader({ title, onBack, showNotifications = true, backLabel = 'Volver a Mis perfiles', rightContent }: {
  title: ReactNode; onBack?: () => void; showNotifications?: boolean; backLabel?: string; rightContent?: ReactNode;
}) {
  const { colors } = useAppTheme();
  return <View style={styles.header}>
    {onBack ? <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.options}>
      <AreaIcon name="back" color={colors.text.primary} />
    </Pressable> : <View style={styles.options} />}
    <AppText accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{title}</AppText>
    {rightContent !== undefined ? <View style={styles.options}>{rightContent}</View>
      : showNotifications ? <NotificationBell /> : <View style={styles.options} />}
  </View>;
}
const styles = StyleSheet.create({
  header: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  options: { width: sizes.touchTarget, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl },
});
