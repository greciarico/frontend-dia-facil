import { getAuthenticatedHttpClient, type PrivateRequestOptions } from './private-http';
import { parseCarerAccessibility, type CarerAccessibilityPreferences } from '@/utils/accessibility';
const path = '/api/cuidador/accesibilidad';
export async function getCarerAccessibility(signal?: AbortSignal) {
  return parseCarerAccessibility((await getAuthenticatedHttpClient().get(path, { signal })).data);
}
export async function patchCarerAccessibility(value: Partial<CarerAccessibilityPreferences>, signal?: AbortSignal) {
  return parseCarerAccessibility((await getAuthenticatedHttpClient().patch(path, value, { signal, authReplaySafe: true } as PrivateRequestOptions)).data);
}
export async function resetCarerAccessibility(signal?: AbortSignal) {
  return parseCarerAccessibility((await getAuthenticatedHttpClient().post(`${path}/restablecer`, undefined, { signal, authReplaySafe: true } as PrivateRequestOptions)).data);
}
