import { Stack, router, useLocalSearchParams } from 'expo-router';
import { AreaHeader } from '@/components/carer/area-header';
import { useAppTheme } from '@/theme/use-theme';
import { activitiesHref, profileHref, validProfileId } from '@/utils/profile-navigation';

export const unstable_settings = { anchor: 'index' };

export default function ProfileLayout() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ idPerfilUsuario?: string }>();
  const id = validProfileId(params.idPerfilUsuario);
  return <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background.primary } }}>
    <Stack.Screen name="ajustes" options={{ header: () => <AreaHeader title="Ajustes" showNotifications={false}
      backLabel="Volver al perfil" onBack={() => router.dismissTo(id ? profileHref(id) : '/perfiles')} /> }} />
    <Stack.Screen name="index" options={{ header: () => <AreaHeader title="Perfil" showNotifications={false}
      onBack={() => router.dismissTo('/perfiles')} /> }} />
    <Stack.Screen name="actividades" options={{ header: () => <AreaHeader title="Actividades" showNotifications={false}
      backLabel="Volver al perfil" onBack={() => router.dismissTo(id ? profileHref(id) : '/perfiles')} /> }} />
    <Stack.Screen name="vincular-dispositivo" options={{ header: () => <AreaHeader title="Vincular dispositivo" showNotifications={false}
      backLabel="Volver al perfil" onBack={() => router.dismissTo(id ? profileHref(id) : '/perfiles')} /> }} />
    <Stack.Screen name="nueva-actividad" options={{ header: () => <AreaHeader title="Nueva actividad" showNotifications={false}
      backLabel="Volver a las actividades" onBack={() => router.dismissTo(id ? activitiesHref(id) : '/perfiles')} /> }} />
  </Stack>;
}
