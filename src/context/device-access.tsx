import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { deviceAccess } from '@/services/device-access';
import { useSession } from './session';

export function DeviceAccessProvider({ children }: { children: ReactNode }) {
  const device = useDeviceAccess(); const caregiver = useSession();
  useEffect(() => { void deviceAccess.restore();
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      if (deviceAccess.getSnapshot().status !== 'unlinked') void deviceAccess.restore();
    });
    return () => listener.remove();
  }, []);
  useEffect(() => { if (device.status === 'unlinked' && caregiver.status === 'booting') void caregiver.manager.restore(); },
    [device.status, caregiver.status, caregiver.manager]);
  return children;
}
export function useDeviceAccess() {
  return useSyncExternalStore(deviceAccess.subscribe, deviceAccess.getSnapshot, deviceAccess.getSnapshot);
}
