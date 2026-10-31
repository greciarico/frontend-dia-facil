import { Stack } from 'expo-router';
import { ProfileCreationProvider } from '@/context/profile-creation';
import { useAppTheme } from '@/theme/use-theme';
import { useCarerAccessibilityFocusListeners } from '@/context/carer-accessibility';

export default function ProfileCreationLayout() {
  const { colors } = useAppTheme(), listeners = useCarerAccessibilityFocusListeners();
  return <ProfileCreationProvider><Stack screenListeners={listeners} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background.primary } }}>
    <Stack.Screen name="crear-perfil" /><Stack.Screen name="perfil-creado" />
  </Stack></ProfileCreationProvider>;
}
