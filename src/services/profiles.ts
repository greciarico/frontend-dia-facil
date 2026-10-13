import { getAuthenticatedHttpClient } from './private-http';
import { parseProfiles } from '@/utils/profiles';

export async function getProfiles(signal?: AbortSignal) {
  const response = await getAuthenticatedHttpClient().get('/api/perfiles', { signal });
  return parseProfiles(response.data);
}
