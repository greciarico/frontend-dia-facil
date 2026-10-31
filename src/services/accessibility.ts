import { getAuthenticatedHttpClient, type PrivateRequestOptions } from './private-http';
import { createUserHttpClient } from './device-access';
import { parseAccessibility, type AccessibilityPatch } from '@/utils/accessibility';

const path = (id: number) => `/api/perfiles/${id}/accesibilidad`;
export async function getProfileAccessibility(id: number, signal?: AbortSignal) {
  return parseAccessibility((await getAuthenticatedHttpClient().get(path(id), { signal })).data);
}
export async function patchProfileAccessibility(id: number, patch: AccessibilityPatch, signal?: AbortSignal) {
  return parseAccessibility((await getAuthenticatedHttpClient().patch(path(id), patch, { signal, authReplaySafe: true } as PrivateRequestOptions)).data);
}
export async function resetProfileAccessibility(id: number, signal?: AbortSignal) {
  return parseAccessibility((await getAuthenticatedHttpClient().post(`${path(id)}/restablecer`, undefined, { signal, authReplaySafe: true } as PrivateRequestOptions)).data);
}
let userClient: ReturnType<typeof createUserHttpClient> | undefined;
export async function getUserAccessibility(signal?: AbortSignal) {
  userClient ??= createUserHttpClient();
  return parseAccessibility((await userClient.get('/api/usuario/accesibilidad', { signal })).data);
}
