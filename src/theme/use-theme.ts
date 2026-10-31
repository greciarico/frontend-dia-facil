import { useColorScheme } from 'react-native';

import { themes, highContrastTheme } from './tokens';
import { useAppearance } from './profile-appearance';

export function useAppTheme() {
  const scheme = useColorScheme();
  const preferences = useAppearance();
  return preferences?.altoContraste ? highContrastTheme : themes[scheme === 'dark' ? 'dark' : 'light'];
}
