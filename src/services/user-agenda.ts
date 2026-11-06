import { createUserHttpClient } from './device-access';
import { parseUserAgenda } from '@/utils/user-agenda';
import { parseUserActivityDetail } from '@/utils/user-activity';

let client: ReturnType<typeof createUserHttpClient> | undefined;
export async function getUserAgenda(signal: AbortSignal) {
  client ??= createUserHttpClient();
  return parseUserAgenda((await client.get('/api/usuario/agenda', { signal })).data);
}
export async function getUserActivityDetail(id: number, signal: AbortSignal) {
  client ??= createUserHttpClient();
  const detail = parseUserActivityDetail((await client.get(`/api/usuario/actividades/${id}`, { signal })).data);
  if (detail.actividad.idActividad !== id) throw new Error('Detalle de actividad inválido.');
  return detail;
}
