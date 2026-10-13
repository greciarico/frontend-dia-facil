import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { SessionProvider, useSession } from '@/context/session';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return <SessionProvider><AppLayout /></SessionProvider>;
}
function AppLayout() {
  const session = useSession();
  const theme = useAppTheme();
  // Direct files keep unapproved weights and italic variants out of the mobile bundle.
  const [loaded, error] = useFonts({
    [typography.family.regular]: require('@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf'),
    [typography.family.medium]: require('@expo-google-fonts/nunito/500Medium/Nunito_500Medium.ttf'),
    [typography.family.semibold]: require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf'),
    [typography.family.bold]: require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
  });
  useEffect(() => {
    if ((loaded && session.status !== 'booting') || error) void SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, error, session.status]);
  useEffect(() => {
    if (loaded && session.status === 'anonymous') router.replace('/');
  }, [loaded, session.status]);
  if (!loaded && !error) return null;
  if (error) {
    return (
      <SafeAreaView style={[styles.error, { backgroundColor: theme.colors.background.primary }]}>
        <Text accessibilityRole="alert" style={{ color: theme.colors.text.primary, fontSize: typography.size.md }}>
          No pudimos cargar la tipografía. Cierra y vuelve a abrir DiaFacil.
        </Text>
      </SafeAreaView>
    );
  }
  const navigation = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...navigation, colors: { ...navigation.colors,
      primary: theme.colors.action.primary, background: theme.colors.background.primary,
      card: theme.colors.surface.default, text: theme.colors.text.primary, border: theme.colors.border.decorative,
    }, fonts: {
      regular: { ...navigation.fonts.regular, fontFamily: typography.family.regular },
      medium: { ...navigation.fonts.medium, fontFamily: typography.family.medium },
      bold: { ...navigation.fonts.bold, fontFamily: typography.family.bold },
      heavy: { ...navigation.fonts.heavy, fontFamily: typography.family.bold },
    } }}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background.primary } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={session.status === 'authenticated' && session.stage === 'ready'}>
          <Stack.Screen name="(cuidador-autenticado)" />
        </Stack.Protected>
        <Stack.Protected guard={session.status === 'anonymous' || session.status === 'authenticated' && session.stage !== 'ready'}>
          <Stack.Screen name="cuidador" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({ error: { flex: 1, padding: spacing['2xl'], justifyContent: 'center' } });
