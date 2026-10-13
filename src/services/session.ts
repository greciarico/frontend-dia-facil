import { isAxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { parseCaregiver, parseSessionGrant } from '@/utils/session-contract';
import { getHttpClient } from './http';
import { SessionFailure, SessionManager } from './session-manager';

const key = 'diafacil.cuidador.session.v1';
function networkFailure(error: unknown, accessRequest = false): never {
  if (accessRequest && isAxiosError(error) && error.response?.status === 401
    && error.response.data?.codigo === 'SESION_REQUIERE_RENOVACION') throw new SessionFailure('renewable');
  if (isAxiosError(error) && error.response?.status === 401) throw new SessionFailure('invalid');
  throw new SessionFailure('network');
}
export const sessionManager = new SessionManager({
  read: () => SecureStore.getItemAsync(key),
  write: value => value === null ? SecureStore.deleteItemAsync(key)
    : SecureStore.setItemAsync(key, value, { requireAuthentication: false, keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
  renew: async refreshToken => {
    try { return parseSessionGrant((await getHttpClient().post('/api/auth/cuidadores/renovar-sesion', { refreshToken })).data); }
    catch (error) { return networkFailure(error); }
  },
  revoke: async refreshToken => {
    try { await getHttpClient().post('/api/auth/cuidadores/cerrar-sesion', { refreshToken }); }
    catch (error) { return networkFailure(error); }
  },
  current: async access => {
    try { return parseCaregiver((await getHttpClient().get('/api/auth/cuidadores/sesion', { headers: { Authorization: 'Bearer ' + access } })).data); }
    catch (error) { return networkFailure(error, true); }
  },
});
