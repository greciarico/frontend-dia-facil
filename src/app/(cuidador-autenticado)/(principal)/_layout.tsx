import { Stack } from 'expo-router';
import { CarerAreaLayout } from '@/components/carer/area-layout';
import { AreaHeader } from '@/components/carer/area-header';
import { useAppTheme } from '@/theme/use-theme';

export const unstable_settings = { anchor: 'perfiles' };

export default function PrincipalLayout() {
  const { colors } = useAppTheme();
  return <CarerAreaLayout title="Mis perfiles" showHeader={false}><Stack screenOptions={{ headerShown: true,
    header: () => <AreaHeader title="Mis perfiles" />, contentStyle: { backgroundColor: colors.background.primary } }}>
    <Stack.Screen name="perfiles" />
    <Stack.Screen name="perfiles/[idPerfilUsuario]" options={{ headerShown: false }} />
  </Stack></CarerAreaLayout>;
}
