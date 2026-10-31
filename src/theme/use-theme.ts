import { useColorScheme } from 'react-native';

import { themes, highContrastTheme } from './tokens';
import { useProfileAppearance } from './profile-appearance';

export function useAppTheme() {
  const scheme = useColorScheme();
  const preferences = useProfileAppearance();
  return preferences?.altoContraste ? highContrastTheme : themes[scheme === 'dark' ? 'dark' : 'light'];
}
