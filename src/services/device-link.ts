import { getAuthenticatedHttpClient, PrivateHttpError, type PrivateRequestOptions } from './private-http';

export type DeviceLink = { nombrePerfil: string; codigoVinculacion: string; dispositivosActivos: number; renovacionEnSegundos: number };
export class DeviceLinkError extends Error {
  constructor(readonly kind: 'not-found' | 'changed' | 'cooldown' | 'invalid-response' | 'network') { super('No pudimos consultar el código de vinculación.'); }
}
export function parseDeviceLink(value: unknown): DeviceLink {
  if (!value || typeof value !== 'object') throw new DeviceLinkError('invalid-response');
  const data = value as DeviceLink;
  if (typeof data.nombrePerfil !== 'string' || !data.nombrePerfil.trim() || data.nombrePerfil.length > 60
    || typeof data.codigoVinculacion !== 'string'
    || !/^DF-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{16}$/.test(data.codigoVinculacion)
    || !Number.isSafeInteger(data.dispositivosActivos) || data.dispositivosActivos < 0
    || !Number.isSafeInteger(data.renovacionEnSegundos) || data.renovacionEnSegundos < 0) throw new DeviceLinkError('invalid-response');
  return { nombrePerfil: data.nombrePerfil, codigoVinculacion: data.codigoVinculacion,
    dispositivosActivos: data.dispositivosActivos, renovacionEnSegundos: data.renovacionEnSegundos };
}
async function request(id: number, signal?: AbortSignal, codigoActual?: string) {
  try {
    const url = `/api/perfiles/${id}/vinculacion`;
    const config: PrivateRequestOptions = { signal, authReplaySafe: true };
    const response = codigoActual === undefined
      ? await getAuthenticatedHttpClient().get(url, { signal })
      : await getAuthenticatedHttpClient().post(`${url}/renovar-codigo`, { codigoActual }, config);
    if (response.status !== 200) throw new DeviceLinkError('invalid-response');
    return parseDeviceLink(response.data);
  } catch (error) {
    if (error instanceof DeviceLinkError) throw error;
    if (error instanceof PrivateHttpError && error.status === 404 && error.codigo === 'PERFIL_NO_ENCONTRADO') throw new DeviceLinkError('not-found');
    if (error instanceof PrivateHttpError && error.status === 409 && error.codigo === 'CODIGO_VINCULACION_CAMBIADO') throw new DeviceLinkError('changed');
    if (error instanceof PrivateHttpError && error.status === 429 && error.codigo === 'RENOVACION_PREMATURA') throw new DeviceLinkError('cooldown');
    throw new DeviceLinkError('network');
  }
}
export const getDeviceLink = (id: number, signal?: AbortSignal) => request(id, signal);
export const renewDeviceLink = (id: number, code: string, signal?: AbortSignal) => request(id, signal, code);
