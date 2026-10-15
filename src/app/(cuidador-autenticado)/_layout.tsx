import { Stack } from 'expo-router';
import { useAppTheme } from '@/theme/use-theme';

export default function AuthenticatedCarerLayout() {
  const { colors } = useAppTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background.primary } }}>
    <Stack.Screen name="(principal)" /><Stack.Screen name="(creacion-perfil)" />
  </Stack>;
}
