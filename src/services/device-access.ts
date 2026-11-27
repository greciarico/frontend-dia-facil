import { isAxiosError, create } from 'axios';
import * as Device from 'expo-device';
import { getHttpClient } from './http';
import { getApiUrl } from '@/config/env';
import { deviceStorageKey, readAccess, writeAccess } from './access-storage';
import { DeviceAccessManager, DeviceFailure } from './device-access-manager';
import { parseUserLink, validDeviceToken } from '@/utils/user-link';

function failure(error: unknown): never {
  if (isAxiosError(error)) {
    const code = error.response?.data?.codigo;
    if (error.response?.status === 404 && ['ACTIVIDAD_NO_ENCONTRADA', 'EJECUCION_NO_ENCONTRADA'].includes(code)) throw new DeviceFailure('not-found', code);
    if (error.response?.status === 409 && ['DIA_AGENDA_CAMBIADO', 'GUIA_INICIAL_REQUERIDA', 'RECORRIDO_NO_PERMITIDO', 'GUIA_NO_DISPONIBLE'].includes(code)) throw new DeviceFailure('guide-conflict', code);
    if (error.response?.status === 401) throw new DeviceFailure(code === 'DISPOSITIVO_DESVINCULADO' ? 'revoked' : 'invalid-access');
    if (error.response?.status === 422 && error.response.data?.codigo === 'CODIGO_VINCULACION_INVALIDO') throw new DeviceFailure('invalid-code');
    if (error.response?.status === 429) throw new DeviceFailure('rate');
  }
  throw new DeviceFailure('network');
}
function deviceLabel() {
  const brand = Device.brand?.trim();
  const model = Device.modelName?.trim();
  return brand && model?.toLowerCase().startsWith(brand.toLowerCase()) ? model : [brand, model].filter(Boolean).join(' ');
}
const linkStatusPath = '/api/dispositivos/vinculacion';
const knownProblems = new Set(['VINCULACION_NO_VALIDA', 'DISPOSITIVO_DESVINCULADO', 'SERVICIO_NO_DISPONIBLE', 'ACCESO_DENEGADO', 'ERROR_INTERNO']);

function diagnose(stage: string, fields: Record<string, string | number | undefined> = {}) {
  if (typeof __DEV__ !== 'undefined' && __DEV__)
    console.info('[DF-12][restauración]', { stage, ...fields });
}
const config = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });
export const deviceAccess = new DeviceAccessManager({
  diagnostic: stage => diagnose(stage),
  read: () => readAccess(deviceStorageKey), write: value => writeAccess(deviceStorageKey, value),
  prepare: async () => {
    try {
      const result = await getHttpClient().post('/api/dispositivos/preparar-vinculacion');
      if (result.status !== 201 || !validDeviceToken(result.data?.credencialDispositivo)) throw new Error();
      return result.data.credencialDispositivo as string;
    } catch (error) { return failure(error); }
  },
  current: async token => {
    const start = Date.now();
    let stage = 'api-config';
    let origin: string | undefined;
    let status: number | undefined;
    try {
      const client = getHttpClient();
      if (typeof __DEV__ !== 'undefined' && __DEV__) origin = new URL(client.defaults.baseURL ?? getApiUrl()).origin;
      stage = 'http';
      const response = await client.get(linkStatusPath, config(token));
      status = response.status;
      stage = 'response-format';
      return parseUserLink(response.data);
    } catch (error) {
      const http = isAxiosError(error) ? error : undefined;
      const problem = http?.response?.data?.codigo;
      diagnose(stage, { origin, path: linkStatusPath, status: http?.response?.status ?? status,
        problem: typeof problem === 'string' && knownProblems.has(problem) ? problem : undefined,
        transport: stage === 'http' && !http?.response ? (http?.code === 'ECONNABORTED' || http?.code === 'ETIMEDOUT' ? 'timeout' : 'network') : undefined,
        durationMs: Date.now() - start });
      return failure(error);
    }
  },
  bind: async (token, codigoVinculacion, credencialesPrevias) => {
    try { const data = (await getHttpClient().post('/api/dispositivos/vincular', {
      credencialesPrevias,
      codigoVinculacion, nombreDispositivo: (deviceLabel() || 'Dispositivo móvil').slice(0, 80),
    }, config(token))).data;
      if (data.credencialDispositivo != null && !validDeviceToken(data.credencialDispositivo)) throw new Error();
      return { ...parseUserLink(data), credencialDispositivo: data.credencialDispositivo ?? undefined };
    } catch (error) { return failure(error); }
  },
});

/** Usuario APIs receive the profile exclusively from the device principal. */
export class HelpHttpError extends Error {
  constructor(readonly status?: number, readonly code?: string, readonly retryAfter = 60) { super('No pudimos registrar la ayuda.'); }
}
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
  client.interceptors.response.use(response => {
    if (revisions.get(response.config) !== deviceAccess.revision()) throw new DeviceFailure('canceled');
    deviceAccess.confirmed();
    return response;
  }, async error => {
    if (isAxiosError(error) && error.response?.status === 401 && error.config
      && revisions.get(error.config) === deviceAccess.revision()) {
      if (error.response.data?.codigo === 'DISPOSITIVO_DESVINCULADO') deviceAccess.revoked();
      else await deviceAccess.invalidate();
    }
    if (isAxiosError(error) && error.config?.url?.startsWith('/api/usuario/solicitudes-ayuda')) {
      if (revisions.get(error.config) !== deviceAccess.revision()) throw new DeviceFailure('canceled');
      const code = error.response?.data?.codigo;
      const allowed = ['SOLICITUD_NO_ENCONTRADA', 'AYUDA_PREMATURA', 'SOLICITUD_INVALIDA', 'DIA_AGENDA_CAMBIADO', 'EJECUCION_NO_ENCONTRADA', 'ACCESO_DENEGADO'];
      const raw = error.response?.headers?.['retry-after'];
      const seconds = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : 60;
      throw new HelpHttpError(error.response?.status, allowed.includes(code) ? code : undefined,
        Number.isSafeInteger(seconds) && seconds > 0 ? seconds : 60);
    }
    return failure(error);
  });
  return client;
}
