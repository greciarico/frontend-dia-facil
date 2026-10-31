export type ActivityIconOption = { codigo: string; nombre: string };
export const activitySuggestionDebounceMs = 250;

export function activityQuery(name: string) { return name.trim().replace(/\s+/g, ' '); }
export function activityNameError(name: string): string | undefined {
  if (!name.trim()) return 'Escribe el nombre de la actividad.';
  if (name.length > 80) return 'El nombre debe tener como máximo 80 caracteres.';
}

export function parseActivityIconOptions(value: unknown): ActivityIconOption[] {
  if (!value || typeof value !== 'object' || !('iconos' in value) || !Array.isArray(value.iconos)) throw new Error('invalid-response');
  const seen = new Set<string>();
  return value.iconos.map((item: unknown) => {
    if (!item || typeof item !== 'object' || !('codigo' in item) || !('nombre' in item)
      || typeof item.codigo !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(item.codigo) || item.codigo.length > 60
      || typeof item.nombre !== 'string' || !item.nombre.trim() || item.nombre.length > 80 || seen.has(item.codigo)) throw new Error('invalid-response');
    seen.add(item.codigo);
    return { codigo: item.codigo, nombre: item.nombre };
  });
}
