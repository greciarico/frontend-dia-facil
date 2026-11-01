import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { AccessibilityInfo, findNodeHandle, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { AccountAvatar } from '@/components/carer/account-avatar';
import { AreaIcon } from '@/components/carer/area-icon';
import { LogoutDialog } from '@/components/carer/logout-dialog';
import { useSession } from '@/context/session';
import { useAppTheme } from '@/theme/use-theme';
import { layout, radii, shadows, sizes, spacing, typography } from '@/theme/tokens';

export default function MyAccountScreen() {
  const { caregiver } = useSession(), { colors } = useAppTheme();
  const [logout, setLogout] = useState(false), trigger = useRef<View>(null);
  const name = caregiver?.nombre?.trim() || 'Nombre no disponible';
  return <ScrollView contentContainerStyle={styles.page}>
    <View style={styles.profile}>
      <View accessible accessibilityLabel={`Avatar de ${name}`}>
        {caregiver?.nombre || caregiver?.avatarId ? <AccountAvatar name={caregiver.nombre || ''} avatarId={caregiver.avatarId} size={layout.carer.avatarSize} />
          : <View style={[styles.fallback, { backgroundColor: colors.background.purple }]}><AreaIcon name="accessibilityPerson" size={sizes.touchTarget} color={colors.action.primary} /></View>}
      </View>
      <AppText accessibilityRole="header" style={[styles.name, { color: colors.text.primary }]}>{name}</AppText>
      <AppText style={[styles.copy, { color: colors.text.secondary }]}>Cuidador</AppText>
    </View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/mi-perfil/accesibilidad')}
      style={[styles.card, { backgroundColor: colors.surface.elevated, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
      <View style={[styles.icon, { backgroundColor: colors.welcome.iconSurface }]}><AreaIcon name="accessibility" color={colors.action.primary} /></View>
      <View style={styles.text}><AppText style={[styles.label, { color: colors.text.primary }]}>Configurar accesibilidad</AppText>
        <AppText style={[styles.small, { color: colors.text.secondary }]}>Tamaño del texto y alto contraste.</AppText></View>
      <AreaIcon name="chevron" color={colors.action.primary} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Accesibilidad en DiaFácil" onPress={() => router.push('/mi-perfil/accesibilidad-diafacil')}
      style={[styles.card, { backgroundColor: colors.surface.elevated, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
      <View style={[styles.icon, { backgroundColor: colors.welcome.iconSurface }]}><AreaIcon name="accessibilityPerson" color={colors.action.primary} /></View>
      <View style={styles.text}><AppText style={[styles.label, { color: colors.text.primary }]}>Accesibilidad en DiaFácil</AppText>
        <AppText style={[styles.small, { color: colors.text.secondary }]}>Conoce cómo acompaña la app.</AppText></View>
      <AreaIcon name="chevron" color={colors.action.primary} />
    </Pressable>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel="Cerrar sesión" onPress={() => setLogout(true)}
      style={[styles.card, { backgroundColor: colors.surface.elevated, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
      <View style={[styles.icon, { backgroundColor: colors.destructive.surface }]}><AreaIcon name="logout" color={colors.destructive.default} /></View>
      <AppText style={[styles.label, styles.text, { color: colors.destructive.default }]}>Cerrar sesión</AppText>
    </Pressable>
    {logout && <LogoutDialog onClose={() => {
      setLogout(false); const target = findNodeHandle(trigger.current); if (target) AccessibilityInfo.setAccessibilityFocus(target);
    }} />}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.xl, gap: spacing.lg },
  profile: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  name: { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'], textAlign: 'center' },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  label: { fontFamily: typography.family.semibold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  small: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
  text: { flex: 1, gap: spacing.xs },
  icon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  fallback: { width: layout.carer.avatarSize, height: layout.carer.avatarSize, borderRadius: layout.carer.avatarSize / 2, alignItems: 'center', justifyContent: 'center' },
  card: { minHeight: sizes.touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.card,
    borderWidth: 1, shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity, shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
});
