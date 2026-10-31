import { AppText as Text } from '@/components/app-text';
import { StyleSheet, View } from 'react-native';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { AreaIcon } from './area-icon';

export function ActivitySectionHeading({ icon, title, description }: {
  icon: 'pencil' | 'imagePlus' | 'clock' | 'steps'; title: string; description?: string;
}) {
  const { colors } = useAppTheme();
  return <View style={styles.header}>
    <View style={[styles.icon, { backgroundColor: colors.welcome.intro }]}>
      <AreaIcon name={icon} color={colors.action.primary} size={sizes.iconSmall} />
    </View>
    <View style={styles.text}>
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
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
  title: { fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
});
