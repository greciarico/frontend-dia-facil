import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAppTheme } from '@/theme/use-theme';

/** Local vector illustration; never encodes the pairing credential. */
export function DeviceLinkIllustration() {
  const { colors } = useAppTheme();
  return <Svg width="100%" height="100%" viewBox="0 0 240 150" accessible={false}>
    <Circle cx="120" cy="75" r="65" fill={colors.welcome.intro} />
    <Rect x="87" y="14" width="66" height="120" rx="12" fill={colors.action.primary} />
    <Rect x="93" y="22" width="54" height="100" rx="6" fill={colors.surface.default} />
    <Path d="M109 28h23M115 128h10M105 50h30v44h-30zM111 57h7v7h-7zm12 0h6v7h-6zm-12 13h7v7h-7zm12 9h6v8h-6z"
      stroke={colors.action.primary} strokeWidth="3" fill="none" strokeLinejoin="round" />
    <Circle cx="157" cy="111" r="25" fill={colors.surface.elevated} />
    <Path d="m151 112 12-12a7 7 0 0 1 10 10l-6 6m-5-6-12 12a7 7 0 0 1-10-10l6-6M61 45l-8-8m9 34-12-2m15 29-10 6m125-55 8-11m-3 40 13-4"
      stroke={colors.action.primary} strokeWidth="4" strokeLinecap="round" fill="none" />
  </Svg>;
}
