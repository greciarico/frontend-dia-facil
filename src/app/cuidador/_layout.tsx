import { Stack } from 'expo-router';

import { CarerRegistrationProvider } from '@/context/carer-registration';
import { useSession } from '@/context/session';

export default function CarerLayout() {
  const { status, stage } = useSession();
  return <CarerRegistrationProvider><Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={status === 'anonymous'}>
      <Stack.Screen name="paso-1" />
    </Stack.Protected>
    {/* Keep the registration screen mounted until its persisted session can navigate to Step 4. */}
    <Stack.Protected guard={status === 'anonymous' || status === 'authenticated' && stage === 'onboarding'}>
      <Stack.Screen name="paso-3" />
    </Stack.Protected>
    <Stack.Protected guard={status === 'anonymous' || status === 'authenticated' && stage === 'otp'}><Stack.Screen name="paso-2" /></Stack.Protected>
    <Stack.Protected guard={status === 'authenticated' && stage === 'onboarding'}><Stack.Screen name="paso-4" /></Stack.Protected>
  </Stack></CarerRegistrationProvider>;
}
