import { isAxiosError, create } from 'axios';
import * as Device from 'expo-device';
import { getHttpClient } from './http';
import { getApiUrl } from '@/config/env';
import { deviceStorageKey, readAccess, writeAccess } from './access-storage';
import { DeviceAccessManager, DeviceFailure } from './device-access-manager';
import { parseUserLink, validDeviceToken } from '@/utils/user-link';

function failure(error: unknown): never {
  if (isAxiosError(error)) {
    if (error.response?.status === 404 && error.response.data?.codigo === 'ACTIVIDAD_NO_ENCONTRADA') throw new DeviceFailure('not-found');
    if (error.response?.status === 401) throw new DeviceFailure('invalid-access');
    if (error.response?.status === 422 && error.response.data?.codigo === 'CODIGO_VINCULACION_INVALIDO') throw new DeviceFailure('invalid-code');
    if (error.response?.status === 429) throw new DeviceFailure('rate');
  }
  throw new DeviceFailure('network');
}
const config = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });
export const deviceAccess = new DeviceAccessManager({
  read: () => readAccess(deviceStorageKey), write: value => writeAccess(deviceStorageKey, value),
  prepare: async () => {
    try {
      const result = await getHttpClient().post('/api/dispositivos/preparar-vinculacion');
      if (result.status !== 201 || !validDeviceToken(result.data?.credencialDispositivo)) throw new Error();
      return result.data.credencialDispositivo as string;
    } catch (error) { return failure(error); }
  },
  current: async token => {
    try { return parseUserLink((await getHttpClient().get('/api/dispositivos/vinculacion', config(token))).data); }
    catch (error) { return failure(error); }
  },
  bind: async (token, codigoVinculacion, credencialesPrevias) => {
    try { const data = (await getHttpClient().post('/api/dispositivos/vincular', {
      credencialesPrevias,
      codigoVinculacion, nombreDispositivo: (Device.modelName || 'Dispositivo móvil').slice(0, 80),
    }, config(token))).data;
      if (data.credencialDispositivo != null && !validDeviceToken(data.credencialDispositivo)) throw new Error();
      return { ...parseUserLink(data), credencialDispositivo: data.credencialDispositivo ?? undefined };
    } catch (error) { return failure(error); }
  },
});

/** Usuario APIs receive the profile exclusively from the device principal. */
export function createUserHttpClient() {
  const client = create({ baseURL: getApiUrl(), timeout: 20_000 });
  const revisions = new WeakMap<object, number>();
  client.interceptors.request.use(async request => {
    if (!request.url?.startsWith('/api/usuario/') || request.url.includes('://')) throw new DeviceFailure('invalid-access');
    const revision = deviceAccess.revision();
    const token = await deviceAccess.token();
    if (revision !== deviceAccess.revision()) throw new DeviceFailure('canceled');
    revisions.set(request, revision);
    request.baseURL = getApiUrl(); request.headers.set('Authorization', `Bearer ${token}`); return request;
  });
  client.interceptors.response.use(response => response, async error => {
    if (isAxiosError(error) && error.response?.status === 401 && error.config
      && revisions.get(error.config) === deviceAccess.revision()) await deviceAccess.invalidate();
    return failure(error);
  });
  return client;
}
