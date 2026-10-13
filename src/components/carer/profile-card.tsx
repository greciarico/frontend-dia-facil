import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { UserProfile } from '@/utils/profiles';
import { radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { AreaIcon } from './area-icon';
import { ProfileAvatar } from './profile-avatar';

export function ProfileCard({ profile, surface, onOpenProfile, details }: {
  profile: UserProfile; surface: string; onOpenProfile?: (id: number) => void; details?: ReactNode;
}) {
  const { colors } = useAppTheme();
  return <Pressable disabled={!onOpenProfile} onPress={() => onOpenProfile?.(profile.idPerfilUsuario)} accessibilityRole="button"
    accessibilityLabel={profile.nombre} accessibilityHint={!onOpenProfile ? 'Acceso al perfil disponible próximamente.' : 'Abrir este perfil.'}
    accessibilityState={{ disabled: !onOpenProfile }} style={[styles.card, { backgroundColor: surface }]}>
    <View importantForAccessibility="no-hide-descendants"><ProfileAvatar name={profile.nombre} avatar={profile.avatar} /></View>
    <View style={styles.text}><Text style={[styles.name, { color: colors.text.primary }]}>{profile.nombre}</Text>{details}</View>
    <AreaIcon name="chevron" color={onOpenProfile ? colors.action.primary : colors.text.disabled} />
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', minHeight: sizes.touchTarget, borderRadius: radii.card,
    padding: spacing.lg, gap: spacing.lg },
  text: { flex: 1 },
  name: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl },
});
