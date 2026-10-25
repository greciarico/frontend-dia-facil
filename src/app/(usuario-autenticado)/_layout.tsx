import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserAreaNavigation } from '@/components/user/area-navigation';
import { spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
export const unstable_settings = { anchor: 'mi-agenda' };
export default function UserLayout() {
  const { colors } = useAppTheme();
  return <SafeAreaView style={[styles.page, { backgroundColor: colors.background.primary }]}>
    <View style={styles.content}><Stack screenOptions={{ headerShown: false }} /></View>
    <View style={styles.navigation}><UserAreaNavigation /></View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1 }, content: { flex: 1 }, navigation: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm } });
