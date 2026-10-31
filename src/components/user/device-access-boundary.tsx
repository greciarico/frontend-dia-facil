import { ActivityIndicator, Text } from 'react-native';
import { useDeviceAccess } from '@/context/device-access';
import { deviceAccess } from '@/services/device-access';
import { ContinueButton } from '@/components/carer/continue-button';
import { ConnectionLayout, userConnectionStyles } from './connection-layout';
import { useAppTheme } from '@/theme/use-theme';

export function DeviceAccessBoundary() {
  const state = useDeviceAccess(); const { colors } = useAppTheme();
  return <ConnectionLayout title={state.status === 'booting' ? 'Conectando con tu agenda' : 'No pudimos comprobar tu conexión'}>
    {state.status === 'booting' ? <ActivityIndicator color={colors.action.primary} accessibilityLabel="Comprobando conexión" /> : <>
      <Text accessibilityRole="alert" style={[userConnectionStyles.copy, { color: colors.text.secondary }]}>{state.message}</Text>
      <ContinueButton label="Reintentar" onPress={() => void deviceAccess.restore()} />
    </>}
  </ConnectionLayout>;
}
