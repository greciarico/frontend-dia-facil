import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { layout, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { ActivitiesEmptyIllustration, type ActivitiesEmptyIllustrationKind } from './activities-empty-illustration';
import { accountStyles } from './account-layout';

export function ActivityEmptyState({ title, description, action, illustration }: {
  title: string;
  description: string;
  action?: ReactNode;
  illustration?: ActivitiesEmptyIllustrationKind;
}) {
  const { colors } = useAppTheme();
  return <View>
    <View style={styles.illustration}><ActivitiesEmptyIllustration kind={illustration} /></View>
    <AppText accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{title}</AppText>
    <AppText style={[accountStyles.body, styles.description, { color: colors.text.secondary }]}>{description}</AppText>
    {action && <View style={styles.action}>{action}</View>}
  </View>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center',
    paddingHorizontal: spacing['4xl'], paddingVertical: spacing['3xl'] },
  illustration: { alignItems: 'center', marginBottom: spacing['2xl'] },
  title: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl, textAlign: 'center' },
  description: { textAlign: 'center', marginTop: spacing.lg },
  action: { marginTop: spacing['5xl'] },
});

export const activityEmptyContent = styles.content;
