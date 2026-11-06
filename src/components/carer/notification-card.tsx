import { useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { AreaIcon } from './area-icon';
import { resolveActivityIcon } from '@/constants/activity-icons';
import { notificationDate, type CarerNotification } from '@/utils/help-notifications';
import { radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export function NotificationCard({ item, busy, onPress, highlighted = false }: { item: CarerNotification; busy: boolean; onPress: () => void; highlighted?: boolean }) {
  const { colors } = useAppTheme(), [failed, setFailed] = useState(false);
  const help = item.tipo !== 'ACTIVIDAD_COMPLETADA', icon = resolveActivityIcon(item.codigoIcono ?? '');
  return <Pressable accessibilityRole="button" accessibilityLabel={`${item.leida ? 'Leída' : 'No leída'}. ${item.titulo}. ${item.mensaje}. ${notificationDate(item.fechaCreacion)}`}
    accessibilityHint={item.leida ? undefined : 'Toca para marcar como leída.'} accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={onPress}
    style={({ pressed }) => [styles.card, { backgroundColor: highlighted || pressed ? colors.profiles.information : help ? colors.destructive.surface : colors.surface.default,
      borderColor: help ? colors.destructive.default : item.leida ? colors.border.decorative : colors.border.control }]}>
    <View importantForAccessibility="no-hide-descendants" style={[styles.icon, { backgroundColor: colors.profiles.information }]}>
      {icon && !failed ? <Image source={icon} contentFit="contain" style={{ width: sizes.touchTarget, height: sizes.touchTarget }} onError={() => setFailed(true)} />
        : <AreaIcon name={help ? 'phone' : 'check'} color={colors.action.primary} />}
    </View>
    <View style={styles.text}>
      <AppText style={[styles.title, { color: colors.text.primary }]}>{item.titulo}</AppText>
      {!!item.mensaje && <AppText style={[styles.copy, { color: colors.text.secondary }]}>{item.mensaje}</AppText>}
      <AppText style={[styles.date, { color: colors.text.secondary }]}>{notificationDate(item.fechaCreacion)}</AppText>
      {!item.leida && <AppText style={[styles.date, { color: colors.action.primary }]}>No leída</AppText>}
    </View>
    {busy && <ActivityIndicator color={colors.action.primary} />}
  </Pressable>;
}
const styles = StyleSheet.create({ card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.card, borderWidth: 1, minHeight: 100 },
  icon: { width: sizes.touchTarget + spacing.md, height: sizes.touchTarget + spacing.md, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: spacing.xs }, title: { fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  date: { fontFamily: typography.family.regular, fontSize: typography.size.xs, lineHeight: typography.lineHeight.xs } });
