import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { carerDestinations } from '@/constants/carer-navigation';
import { useSession } from '@/context/session';
import { borders, layout, radii, shadows, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { isProfilesDestination } from '@/utils/profile-navigation';
import { AccountAvatar } from './account-avatar';
import { AreaIcon } from './area-icon';

export function AreaNavigation() {
  const pathname = usePathname();
  const { caregiver } = useSession();
  const { colors } = useAppTheme();
  return <View style={[styles.bar, { backgroundColor: colors.surface.elevated, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
    {carerDestinations.map(item => {
      const selected = item.href === pathname || item.id === 'profiles' && isProfilesDestination(pathname);
      const color = selected ? colors.action.primary : item.href ? colors.text.secondary : colors.text.disabled;
      return <Pressable key={item.id} disabled={!item.href} onPress={() => { if (item.href && item.href !== pathname) router.dismissTo(item.href); }}
        accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected, disabled: !item.href }}
        accessibilityHint={!item.href ? 'Disponible próximamente.' : undefined}
        style={[styles.item, { backgroundColor: selected ? colors.profiles.information : 'transparent' }]}>
        {item.icon === 'account' ? <View importantForAccessibility="no-hide-descendants"><AccountAvatar
          name={caregiver?.nombre || ''} avatarId={caregiver?.avatarId || null} size={sizes.icon} /></View> : <AreaIcon name={item.icon} color={color} />}
        <Text style={[styles.label, { color }]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center',
    padding: spacing.md, gap: spacing.xs, borderRadius: radii.card, borderWidth: borders.default,
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity,
    shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  item: { flex: 1, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, borderRadius: radii.control },
  label: { fontFamily: typography.family.regular, fontSize: typography.size.xs, lineHeight: typography.lineHeight.xs, textAlign: 'center' },
});
