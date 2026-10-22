import Svg, { Path } from 'react-native-svg';
import { sizes } from '@/theme/tokens';

const paths = {
  back: 'm15 5-7 7 7 7',
  close: 'M6 6l12 12M18 6 6 18',
  camera: 'M3 7h4l2-3h6l2 3h4v14H3ZM16 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  activities: 'M4 5h16v16H4ZM8 2v6m8-6v6M4 10h16M8 14h2m4 0h2m-8 4h2',
  accessibility: 'M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  device: 'M7 2h10v20H7ZM10 5h4m-3 14h2',
  profiles: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M13 3.1a4 4 0 0 1 0 7.8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  support: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 20h4',
  more: 'M12 4h.01M12 12h.01M12 20h.01',
  plus: 'M12 3v18M3 12h18',
  chevron: 'm9 4 8 8-8 8',
  info: 'M9 18h6m-5 3h4M9 15c0-3-3-3-3-7a6 6 0 0 1 12 0c0 4-3 4-3 7M10 8l2 2 2-2m-2 2v5',
  pencil: 'm15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z',
  imagePlus: 'M14 3H3v18h18V10M3 17l6-6 5 5 3-3 4 4M18 2v6m-3-3h6M7 7h.01',
  sparkles: 'm10 3 2.5 6.5L19 12l-6.5 2.5L10 21l-2.5-6.5L1 12l6.5-2.5ZM20 2v6m-3-3h6',
  grid: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  steps: 'm3 5 2 2 3-4m3 2h10M3 12l2 2 3-4m3 2h10M3 19l2 2 3-4m3 2h10',
  drag: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
} as const;
export function AreaIcon({ name, color, size = sizes.icon }: { name: keyof typeof paths; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
    <Path d={paths[name]} fill="none" stroke={color} strokeWidth={sizes.stroke} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
