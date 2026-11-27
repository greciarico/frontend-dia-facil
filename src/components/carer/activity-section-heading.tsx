import type { ReactNode } from 'react';
import { AppText as Text } from '@/components/app-text';
import { StyleSheet, View } from 'react-native';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { AreaIcon } from './area-icon';

export function ActivitySectionHeading({ icon, title, description, trailing }: {
  icon: 'pencil' | 'imagePlus' | 'clock' | 'steps'; title: string; description?: string; trailing?: ReactNode;
}) {
  const { colors } = useAppTheme();
  return <View style={styles.header}>
    <View style={[styles.icon, { backgroundColor: colors.welcome.intro }]}>
      <AreaIcon name={icon} color={colors.action.primary} size={sizes.iconSmall} />
    </View>
    <View style={styles.text}>
      <View style={[styles.titleRow, trailing != null && styles.titleRowWithTrailing]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
        {trailing}
      </View>
      {description && <Text style={[accountStyles.small, { color: colors.text.secondary }]}>{description}</Text>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  icon: { width: layout.activities.sectionIconSize, height: layout.activities.sectionIconSize,
    borderRadius: layout.activities.sectionIconRadius, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minHeight: layout.activities.sectionIconSize, justifyContent: 'center', gap: spacing.xs },
  titleRow: { minHeight: layout.activities.sectionIconSize, justifyContent: 'center' },
  titleRowWithTrailing: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs },
  title: { flexShrink: 1, fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
});
