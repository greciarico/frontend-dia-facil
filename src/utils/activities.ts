export type ActivitySummary = { idActividad: number; nombre: string; hora: string; codigoIcono: string | null };
export type ProfileActivities = { actividades: ActivitySummary[] };

export function parseActivities(value: unknown): ProfileActivities {
  if (!value || typeof value !== 'object' || !('actividades' in value) || !Array.isArray(value.actividades)) {
    throw new Error('Respuesta de actividades inválida.');
  }
  const seen = new Set<number>();
  const actividades = value.actividades.map(item => {
    if (!item || typeof item !== 'object' || !Number.isInteger(item.idActividad)
      || item.idActividad <= 0 || item.idActividad > 2147483647 || seen.has(item.idActividad)
      || typeof item.nombre !== 'string' || !item.nombre.trim() || item.nombre.length > 80
      || typeof item.hora !== 'string' || !/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(item.hora)
      || (item.codigoIcono !== null && (typeof item.codigoIcono !== 'string'
        || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(item.codigoIcono) || item.codigoIcono.length > 60))) {
      throw new Error('Respuesta de actividades inválida.');
    }
    seen.add(item.idActividad);
    return { idActividad: item.idActividad as number, nombre: item.nombre as string, hora: item.hora as string, codigoIcono: item.codigoIcono as string | null };
  });
  return { actividades };
}
