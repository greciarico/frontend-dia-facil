import { Stack } from 'expo-router';
import { ProfileCreationProvider } from '@/context/profile-creation';
import { useAppTheme } from '@/theme/use-theme';

export default function ProfileCreationLayout() {
  const { colors } = useAppTheme();
  return <ProfileCreationProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background.primary } }}>
    <Stack.Screen name="crear-perfil" /><Stack.Screen name="perfil-creado" />
  </Stack></ProfileCreationProvider>;
}
