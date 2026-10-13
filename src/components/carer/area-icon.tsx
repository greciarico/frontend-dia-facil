import Svg, { Path } from 'react-native-svg';
import { sizes } from '@/theme/tokens';

const paths = {
  profiles: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M13 3.1a4 4 0 0 1 0 7.8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  support: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 20h4',
  more: 'M12 4h.01M12 12h.01M12 20h.01',
  plus: 'M12 3v18M3 12h18',
  chevron: 'm9 4 8 8-8 8',
  info: 'M9 18h6m-5 3h4M9 15c0-3-3-3-3-7a6 6 0 0 1 12 0c0 4-3 4-3 7M10 8l2 2 2-2m-2 2v5',
} as const;
export function AreaIcon({ name, color }: { name: keyof typeof paths; color: string }) {
  return <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" accessible={false}>
    <Path d={paths[name]} fill="none" stroke={color} strokeWidth={sizes.stroke} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
