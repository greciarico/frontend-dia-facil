import { create, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

import { getApiUrl } from '@/config/env';
import { sessionManager } from './session';
import { SessionFailure } from './session-manager';

type PrivateConfig = InternalAxiosRequestConfig & { _retried?: boolean; _access?: string; _epoch?: number; authReplaySafe?: boolean };
export type PrivateRequestOptions = AxiosRequestConfig & { authReplaySafe?: boolean };
/** Deliberately drops server detail, Axios config, headers and request/response bodies. */
export class PrivateHttpError extends Error {
  constructor(readonly status?: number, readonly codigo?: string, readonly fields: string[] = []) {
    super('No pudimos completar la solicitud.');
  }
}
function safeHttpError(error: { response?: { status?: number; data?: { codigo?: unknown; errores?: unknown } } }) {
  const data = error.response?.data;
  const allowed = ['SOLICITUD_INVALIDA', 'LIMITE_PERFILES_ALCANZADO', 'PERFIL_NO_ENCONTRADO', 'SERVICIO_NO_DISPONIBLE', 'ERROR_INTERNO', 'ACCESO_DENEGADO',
    'ICONO_NO_ENCONTRADO', 'PICTOGRAMA_INVALIDO', 'CONFLICTO_CREACION', 'PICTOGRAMAS_NO_DISPONIBLES'];
  const codigo = typeof data?.codigo === 'string' && allowed.includes(data.codigo) ? data.codigo : undefined;
  const fields = Array.isArray(data?.errores) ? [...new Set(data.errores.flatMap(field =>
    field && typeof field === 'object' && (['nombre', 'avatar', 'hora', 'codigoIcono', 'pasos'].includes(field.campo)
      || /^pasos\[\d+\]\.descripcion$/.test(field.campo)) ? [field.campo as string] : []))] : [];
  return new PrivateHttpError(error.response?.status, codigo, fields);
}
let client: ReturnType<typeof create> | undefined;
export function getAuthenticatedHttpClient() {
  if (client) return client;
  client = create({ baseURL: getApiUrl(), timeout: 20_000,
    headers: { Accept: 'application/json, application/problem+json', 'Content-Type': 'application/json' } });
  client.interceptors.request.use(async (config: PrivateConfig) => {
    // Never attach credentials to an absolute URL supplied by a caller.
    if (!config.url?.startsWith('/') || config.url.startsWith('//')) throw new SessionFailure('invalid');
    config.baseURL = getApiUrl();
    const access = await sessionManager.access();
    config._access = access; config._epoch = sessionManager.revision();
    config.headers.set('Authorization', 'Bearer ' + access); return config;
  });
  client.interceptors.response.use(response => response, async error => {
    const config = error.config as PrivateConfig | undefined;
    if (config && config._epoch !== sessionManager.revision()) throw new SessionFailure('canceled');
    if (error.response?.status !== 401 || !config) throw safeHttpError(error);
    const renewable = error.response.data?.codigo === 'SESION_REQUIERE_RENOVACION';
    if (!renewable) await sessionManager.recoverRejected(config._access || '', false);
    const method = config.method?.toLowerCase();
    if (config._retried || !(['get', 'head'].includes(method || '') || config.authReplaySafe)) throw new SessionFailure('network');
    config._retried = true;
    await sessionManager.recoverRejected(config._access || '', true);
    return client!(config);
  });
  return client;
}
