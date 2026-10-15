import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { layout } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

/** Local vector artwork; the surrounding screen provides the accessible description. */
export function ActivitiesEmptyIllustration() {
  const { colors } = useAppTheme();
  return <Svg width={layout.activities.emptyIllustrationSize} height={layout.activities.emptyIllustrationSize}
    viewBox="0 0 120 120" accessible={false} importantForAccessibility="no-hide-descendants">
    <Circle cx="60" cy="60" r="60" fill={colors.profiles.information} />
    <Rect x="31" y="39" width="57" height="50" rx="10" fill={colors.surface.elevated} stroke={colors.border.control} strokeWidth="2" />
    <Path d="M41 35h37a10 10 0 0 1 10 10v4H31v-4a10 10 0 0 1 10-10Z" fill={colors.action.primary} />
    <Path d="M45 32v9m29-9v9" stroke={colors.border.control} strokeWidth="5" strokeLinecap="round" />
    {[45, 59, 73].map(x => [56, 66, 76].map(y => <Rect key={`${x}-${y}`} x={x - 3} y={y} width="6" height="6" fill={colors.text.secondary} />))}
    <Circle cx="86" cy="87" r="16" fill={colors.action.primary} stroke={colors.profiles.information} strokeWidth="2" />
    <Path d="M86 78v18m-9-9h18" stroke={colors.action.onPrimary} strokeWidth="2" strokeLinecap="round" />
  </Svg>;
}
