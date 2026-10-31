import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CarerAccessibilityProvider, useCarerAccessibilityFocusListeners } from '@/context/carer-accessibility';
import { useAppTheme } from '@/theme/use-theme';

export default function AuthenticatedCarerLayout() {
  return <CarerAccessibilityProvider><CarerArea /></CarerAccessibilityProvider>;
}
function CarerArea() {
  const { colors, scheme } = useAppTheme(), inherited = useTheme(), listeners = useCarerAccessibilityFocusListeners();
  const navigation = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return <ThemeProvider value={{ ...navigation, fonts: inherited.fonts, colors: { ...navigation.colors, primary: colors.action.primary,
    background: colors.background.primary, card: colors.surface.default, text: colors.text.primary, border: colors.border.decorative } }}>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenListeners={listeners} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background.primary } }}>
    <Stack.Screen name="(principal)" /><Stack.Screen name="(creacion-perfil)" />
    </Stack>
  </ThemeProvider>;
}
