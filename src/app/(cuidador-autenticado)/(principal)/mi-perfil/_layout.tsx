import { Stack, router } from 'expo-router';
import { AreaHeader } from '@/components/carer/area-header';
import { useCarerAccessibilityFocusListeners } from '@/context/carer-accessibility';
import { useAppTheme } from '@/theme/use-theme';
export const unstable_settings = { anchor: 'index' };
export default function MyAccountLayout() {
  const { colors } = useAppTheme(), listeners = useCarerAccessibilityFocusListeners();
  return <Stack screenListeners={listeners} screenOptions={{ contentStyle: { backgroundColor: colors.background.primary } }}>
    <Stack.Screen name="index" options={{ header: () => <AreaHeader title="Mi perfil" showNotifications={false} /> }} />
    <Stack.Screen name="accesibilidad" options={{ header: () => <AreaHeader title="Configurar accesibilidad" showNotifications={false}
      backLabel="Volver a Mi perfil" onBack={() => router.dismissTo('/mi-perfil')} /> }} />
    <Stack.Screen name="accesibilidad-diafacil" options={{ header: () => <AreaHeader title="Accesibilidad en DiaFácil" showNotifications={false}
      backLabel="Volver a Mi perfil" onBack={() => router.dismissTo('/mi-perfil')} /> }} />
  </Stack>;
}
