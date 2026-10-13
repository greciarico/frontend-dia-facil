import { Stack } from 'expo-router';

import { CarerRegistrationProvider } from '@/context/carer-registration';

export default function CarerLayout() {
  return <CarerRegistrationProvider><Stack screenOptions={{ headerShown: false }} /></CarerRegistrationProvider>;
}
