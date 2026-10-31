import { colors, highContrastActivityFamilies } from '@/theme/tokens';

const families = [colors.yellow, colors.green, colors.orange, colors.blue,
  { ...colors.purple, hover: colors.purple.hoverLight }] as const;

/** Visual position only: never persisted or associated with an activity ID. */
export function getActivityVisualFamily(index: number, highContrast = false) {
  return highContrast ? highContrastActivityFamilies[index % families.length] : families[index % families.length];
}

/** Zero-based visual list position, independent of activity identity or persistence. */
export function getActivityIconSurface(index: number) {
  return getActivityVisualFamily(index).light;
}
