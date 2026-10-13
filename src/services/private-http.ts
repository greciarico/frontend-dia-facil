import { create, type InternalAxiosRequestConfig } from 'axios';

import { getApiUrl } from '@/config/env';
import { sessionManager } from './session';
import { SessionFailure } from './session-manager';

type PrivateConfig = InternalAxiosRequestConfig & { _retried?: boolean; _access?: string; _epoch?: number; authReplaySafe?: boolean };
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
    if (error.response?.status !== 401 || !config || config._epoch !== sessionManager.revision()) throw new SessionFailure('network');
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
