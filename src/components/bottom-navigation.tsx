import { AppText as Text } from '@/components/app-text';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useEffectiveFontScale } from '@/theme/profile-appearance';
import { borders, layout, radii, shadows, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export type NavigationItem = { id: string; label: string; selected: boolean; onPress?: () => void; icon: (color: string) => ReactNode };
export function BottomNavigation({ items, appearance = 'default' }: { items: NavigationItem[]; appearance?: 'default' | 'user' }) {
  const { colors } = useAppTheme();
  const fontScale = useEffectiveFontScale();
  const user = appearance === 'user';
  return <View style={[styles.bar, user && fontScale <= layout.welcome.stackAboveFontScale && styles.userBar,
    { backgroundColor: user ? colors.surface.default : colors.surface.elevated, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
    {items.map(item => {
      const color = item.selected ? colors.action.primary : item.onPress || user ? colors.text.secondary : colors.text.disabled;
      return <Pressable key={item.id} disabled={!item.onPress} onPress={item.onPress} accessibilityRole="tab"
        accessibilityLabel={item.label} accessibilityState={{ selected: item.selected, disabled: !item.onPress }}
        accessibilityHint={!item.onPress ? 'Disponible próximamente.' : undefined}
        style={[styles.item, { backgroundColor: item.selected ? colors.profiles.information : user ? colors.surface.default : 'transparent' }]}>
        {item.icon(color)}<Text style={[styles.label, { color }]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  userBar: { maxWidth: layout.userAgenda.navigationMaxWidth },
  bar: { flexDirection: 'row', width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.md,
    gap: spacing.xs, borderRadius: radii.card, borderWidth: borders.default, shadowOffset: { width: 0, height: shadows.card.offsetY },
    shadowOpacity: shadows.card.opacity, shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  item: { flex: 1, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, borderRadius: radii.control },
  label: { fontFamily: typography.family.regular, fontSize: typography.size.xs, lineHeight: typography.lineHeight.xs, textAlign: 'center' },
});
