import { create, type AxiosInstance } from 'axios';

import { getApiUrl } from '@/config/env';

let client: AxiosInstance | undefined;

/** No configuration is required until an actual API consumer requests this client. */
export function getHttpClient(): AxiosInstance {
  client ??= create({
    baseURL: getApiUrl(),
    timeout: 20_000,
    headers: { Accept: 'application/json, application/problem+json', 'Content-Type': 'application/json' },
  });
  return client;
}
