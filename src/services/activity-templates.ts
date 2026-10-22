import { getAuthenticatedHttpClient } from './private-http';
import { parseActivityTemplate } from '@/utils/activity-draft';
export class ActivityTemplateError extends Error {
  constructor(readonly kind: 'network' | 'invalid-response') { super('No pudimos consultar los pasos sugeridos.'); }
}
export async function getActivityTemplate(name: string, signal: AbortSignal) {
  let response;
  try { response = await getAuthenticatedHttpClient().get('/api/plantillas-actividad/sugerencia', { params: { nombre: name }, signal }); }
  catch { throw new ActivityTemplateError('network'); }
  try {
    if (response.status !== 200) throw new Error();
    return parseActivityTemplate(response.data);
  } catch { throw new ActivityTemplateError('invalid-response'); }
}
