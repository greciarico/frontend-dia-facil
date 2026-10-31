import { AppText as Text } from '@/components/app-text';
import { Pressable, StyleSheet, View } from 'react-native';
import { radii, shadows, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { AreaIcon } from './area-icon';

export type ProfileHomeActions = {
  onCreateActivities?: (id: number) => void;
  onConfigureAccessibility?: (id: number) => void;
  onLinkDevice?: (id: number) => void;
};
export function ProfileActions({ id, onCreateActivities, onConfigureAccessibility, onLinkDevice }: ProfileHomeActions & { id: number }) {
  const { colors } = useAppTheme();
  const actions = [
    { title: 'Crear sus actividades', description: 'Agrega su rutina diaria', icon: 'activities' as const, onPress: onCreateActivities },
    { title: 'Configurar accesibilidad', description: 'Ajusta tamaño de texto y contraste.', icon: 'accessibility' as const, onPress: onConfigureAccessibility },
    { title: 'Vincular dispositivo', description: 'Conecta su celular o tablet', icon: 'device' as const, onPress: onLinkDevice },
  ];
  return <View style={styles.list}>{actions.map(action => <Pressable key={action.icon} disabled={!action.onPress}
    onPress={action.onPress ? () => action.onPress?.(id) : undefined} accessibilityRole="button"
    accessibilityLabel={`${action.title}. ${action.description}`} accessibilityState={{ disabled: !action.onPress }}
    accessibilityHint={!action.onPress ? 'Disponible próximamente.' : undefined}
    style={[styles.card, { backgroundColor: colors.profiles.information, shadowColor: colors.shadow }]}>
    <View style={[styles.icon, { backgroundColor: colors.background.purple }]}><AreaIcon name={action.icon} color={colors.action.primary} /></View>
    <View style={styles.copy}><Text style={[styles.title, { color: colors.text.primary }]}>{action.title}</Text>
      <Text style={[styles.description, { color: colors.text.secondary }]}>{action.description}</Text></View>
    <AreaIcon name="chevron" color={action.onPress ? colors.action.primary : colors.text.disabled} />
  </Pressable>)}</View>;
}
const styles = StyleSheet.create({
  list: { gap: spacing.xl },
  card: { minHeight: sizes.touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
    borderRadius: radii.control, shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity,
    shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  icon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: spacing.xs },
  title: { fontFamily: typography.family.medium, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  description: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
});
