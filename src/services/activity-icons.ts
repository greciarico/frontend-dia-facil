import { getAuthenticatedHttpClient } from './private-http';
import { parseActivityIconOptions } from '@/utils/activity-icon-options';

export class ActivityIconsError extends Error {
  constructor(readonly kind: 'network' | 'invalid-response') { super('No pudimos cargar los iconos. Inténtalo de nuevo.'); }
}
export async function getActivityIcons(signal: AbortSignal, name?: string) {
  let response;
  try {
    response = await getAuthenticatedHttpClient().get('/api/iconos-actividad', { signal,
      ...(name === undefined ? {} : { params: { nombre: name } }) });
  } catch { throw new ActivityIconsError('network'); }
  try {
    if (response.status !== 200) throw new Error();
    const icons = parseActivityIconOptions(response.data);
    if (name !== undefined && icons.length > 3) throw new Error();
    return icons;
  } catch { throw new ActivityIconsError('invalid-response'); }
}
