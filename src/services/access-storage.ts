import * as SecureStore from 'expo-secure-store';

export const caregiverStorageKey = 'diafacil.cuidador.session.v1';
export const deviceStorageKey = 'diafacil.usuario.vinculacion.v1';
let writes: Promise<unknown> = Promise.resolve();
export const readAccess = (key: string) => SecureStore.getItemAsync(key);
/** Serialize both domains' durable writes to enforce one active experience per installation. */
export function writeAccess(key: string, value: string | null) {
  const task = writes.then(async () => {
    if (value && JSON.parse(value).active) {
      const other = await readAccess(key === deviceStorageKey ? caregiverStorageKey : deviceStorageKey);
      if (other && JSON.parse(other).active) throw new Error('Ya existe otro acceso activo.');
    }
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value, { requireAuthentication: false,
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  });
  writes = task.catch(() => undefined); return task;
}
