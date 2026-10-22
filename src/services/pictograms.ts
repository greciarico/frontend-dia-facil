import { getAuthenticatedHttpClient } from './private-http';
import { parseStepPictogram, type StepPictogram } from '@/utils/activity-draft';

export type ArasaacPictogram = NonNullable<StepPictogram> & { fuente: 'ARASAAC'; idArasaac: number; urlImagen: string };
export function parsePictograms(value: unknown): ArasaacPictogram[] {
  if (!value || typeof value !== 'object' || !('pictogramas' in value) || !Array.isArray(value.pictogramas)) throw new Error('invalid-response');
  const seen = new Set<number>();
  return value.pictogramas.map((item: unknown) => {
    const pictogram = parseStepPictogram(item);
    if (!pictogram?.idArasaac || pictogram.fuente !== 'ARASAAC' || !pictogram.urlImagen || seen.has(pictogram.idArasaac)) throw new Error('invalid-response');
    seen.add(pictogram.idArasaac);
    return pictogram as ArasaacPictogram;
  });
}
export class PictogramsError extends Error {
  constructor(readonly kind: 'network' | 'invalid-response') { super('No pudimos consultar los pictogramas. Inténtalo de nuevo.'); }
}
export async function getPictograms(text: string, signal: AbortSignal) {
  let response;
  try { response = await getAuthenticatedHttpClient().get('/api/pictogramas/arasaac', { params: { texto: text }, signal }); }
  catch { throw new PictogramsError('network'); }
  try {
    if (response.status !== 200) throw new Error();
    return parsePictograms(response.data);
  } catch { throw new PictogramsError('invalid-response'); }
}
