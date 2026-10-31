import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef } from 'react';
import { useDeviceAccess } from '@/context/device-access';
import { deviceAccess } from '@/services/device-access';
import { UserAccessibilityProvider, useRefreshAccessibility } from '@/context/user-accessibility';
import { UserAreaNavigation } from '@/components/user/area-navigation';
import { spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
export const unstable_settings = { anchor: 'mi-agenda' };
export default function UserLayout() {
  const device = useDeviceAccess();
  return <UserAccessibilityProvider key={`${device.profile?.idPerfilUsuario}:${deviceAccess.revision()}`}><UserArea /></UserAccessibilityProvider>;
}
function UserArea() {
  const { colors, scheme } = useAppTheme();
  const inheritedTheme = useTheme();
  const navigation = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const refresh = useRefreshAccessibility(), firstFocus = useRef(true);
  return <ThemeProvider value={{ ...navigation, fonts: inheritedTheme.fonts, colors: { ...navigation.colors, primary: colors.action.primary,
    background: colors.background.primary, card: colors.surface.default, text: colors.text.primary, border: colors.border.decorative } }}>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <SafeAreaView style={[styles.page, { backgroundColor: colors.background.primary }]}>
    <View style={styles.content}><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background.primary } }}
      screenListeners={{ focus: () => { if (firstFocus.current) firstFocus.current = false; else refresh(); } }} /></View>
    <View style={styles.navigation}><UserAreaNavigation /></View>
    </SafeAreaView>
  </ThemeProvider>;
}
const styles = StyleSheet.create({ page: { flex: 1 }, content: { flex: 1 }, navigation: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm } });
