import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { deviceAccess } from '@/services/device-access';
import { useSession } from './session';

export function DeviceAccessProvider({ children }: { children: ReactNode }) {
  const device = useDeviceAccess(); const caregiver = useSession();
  useEffect(() => {
    deviceAccess.setForeground(AppState.currentState === 'active');
    if (AppState.currentState !== 'active') void deviceAccess.restore();
    const listener = AppState.addEventListener('change', state => {
      deviceAccess.setForeground(state === 'active');
    });
    return () => { listener.remove(); deviceAccess.setForeground(false); };
  }, []);
  useEffect(() => { if (device.status === 'unlinked' && caregiver.status === 'booting') void caregiver.manager.restore(); },
    [device.status, caregiver.status, caregiver.manager]);
  return children;
}
export function useDeviceAccess() {
  return useSyncExternalStore(deviceAccess.subscribe, deviceAccess.getSnapshot, deviceAccess.getSnapshot);
}
