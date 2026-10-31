export type TextSize = 'PEQUENO' | 'MEDIANO' | 'GRANDE';
export type AppearancePreferences = { tamanoTexto: TextSize; altoContraste: boolean };
export type CarerAccessibilityPreferences = AppearancePreferences;
export type AccessibilityPreferences = AppearancePreferences & { lecturaVoz: boolean };
export type AccessibilityPatch = Partial<AccessibilityPreferences>;
export function parseAccessibility(value: unknown): AccessibilityPreferences {
  const v = value as AccessibilityPreferences;
  if (!v || !['PEQUENO', 'MEDIANO', 'GRANDE'].includes(v.tamanoTexto) || typeof v.altoContraste !== 'boolean' || typeof v.lecturaVoz !== 'boolean') throw new Error('Respuesta de ajustes inválida.');
  return { tamanoTexto: v.tamanoTexto, altoContraste: v.altoContraste, lecturaVoz: v.lecturaVoz };
}
export function parseCarerAccessibility(value: unknown): CarerAccessibilityPreferences {
  const v = value as CarerAccessibilityPreferences;
  if (!v || !['PEQUENO', 'MEDIANO', 'GRANDE'].includes(v.tamanoTexto) || typeof v.altoContraste !== 'boolean') throw new Error('Respuesta de ajustes inválida.');
  return { tamanoTexto: v.tamanoTexto, altoContraste: v.altoContraste };
}
export const textSizeFactors: Record<TextSize, number> = { PEQUENO: 0.9, MEDIANO: 1, GRANDE: 1.25 };
/** Native font scaling remains independent. Only explicitly styled sizes are transformed. */
export function profileTextStyle(style: { fontSize?: number; lineHeight?: number }, size: TextSize) {
  const factor = textSizeFactors[size];
  return { ...(typeof style.fontSize === 'number' ? { fontSize: Math.max(12, style.fontSize * factor) } : {}),
    ...(typeof style.lineHeight === 'number' ? { lineHeight: style.lineHeight * factor } : {}) };
}
