import type { ReactNode } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingLayout } from './onboarding-layout';
import { useAppTheme } from '@/theme/use-theme';
import { borders, layout, spacing, sizes, typography, radii } from '@/theme/tokens';
import { AreaIcon } from '@/components/carer/area-icon';

export function ConnectionLayout({ title, description, illustration, children, onBack, onboarding }: {
  title: ReactNode; description?: string; illustration?: ReactNode; children: ReactNode; onBack?: () => void;
  onboarding?: 'welcome' | 'connect' | 'loading' | 'success' | 'error';
}) {
  const { colors } = useAppTheme();
  if (onboarding) return <OnboardingLayout title={title} description={description} illustration={illustration}
    onBack={onBack} kind={onboarding}>{children}</OnboardingLayout>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.welcome.body }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
      {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} style={styles.back}>
        <AreaIcon name="back" color={colors.action.primary} /></Pressable>}
      {illustration && <View style={[styles.illustration, { backgroundColor: colors.welcome.hero }]}>{illustration}</View>}
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      {description && <Text style={[styles.description, { color: colors.text.secondary }]}>{description}</Text>}
      <View style={styles.content}>{children}</View>
    </ScrollView>
  </SafeAreaView>;
}
export const userConnectionStyles = StyleSheet.create({
  image: { width: '100%', maxWidth: layout.carer.illustrationWidth, aspectRatio: 1, alignSelf: 'center' },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
  input: { borderWidth: borders.default, borderRadius: radii.control, minHeight: sizes.touchTarget, padding: spacing.lg,
    fontFamily: typography.family.semibold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg },
});
const styles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing['2xl'], gap: spacing['2xl'] },
  back: { alignSelf: 'flex-start', minWidth: sizes.touchTarget, minHeight: sizes.touchTarget, justifyContent: 'center', alignItems: 'center' },
  illustration: { alignItems: 'center', padding: spacing.lg, borderRadius: radii.card },
  title: { fontFamily: typography.family.bold, fontSize: typography.size['3xl'], lineHeight: typography.lineHeight['3xl'], textAlign: 'center' },
  description: { fontFamily: typography.family.regular, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg, textAlign: 'center' },
  content: { flexGrow: 1, gap: spacing.lg, justifyContent: 'flex-end', paddingBottom: spacing.lg },
});
