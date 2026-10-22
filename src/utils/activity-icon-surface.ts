import { colors } from '@/theme/tokens';

const surfaces = [colors.yellow.light, colors.green.light, colors.orange.light, colors.blue.light, colors.purple.light] as const;

/** Zero-based visual list position, independent of activity identity or persistence. */
export function getActivityIconSurface(index: number) {
  return surfaces[index % surfaces.length];
}
