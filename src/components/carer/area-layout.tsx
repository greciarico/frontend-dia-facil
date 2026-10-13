import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { AreaHeader } from './area-header';
import { AreaNavigation } from './area-navigation';

export function CarerAreaLayout({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useAppTheme();
  return <SafeAreaView style={[styles.page, { backgroundColor: colors.background.primary }]}>
    <AreaHeader title={title} />
    <View style={styles.content}>{children}</View>
    <View style={styles.navigation}><AreaNavigation /></View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1 }, content: { flex: 1 },
  navigation: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md } });
