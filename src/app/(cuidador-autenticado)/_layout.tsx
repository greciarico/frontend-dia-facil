import { Stack } from 'expo-router';
import { CarerAreaLayout } from '@/components/carer/area-layout';
import { useAppTheme } from '@/theme/use-theme';

export default function AuthenticatedCarerLayout() {
  const { colors } = useAppTheme();
  return <CarerAreaLayout title="Mis perfiles"><Stack screenOptions={{ headerShown: false,
    contentStyle: { backgroundColor: colors.background.primary } }}><Stack.Screen name="perfiles" /></Stack></CarerAreaLayout>;
}
