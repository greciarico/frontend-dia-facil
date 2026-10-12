import { useColorScheme } from 'react-native';

import { themes } from './tokens';

export function useAppTheme() {
  const scheme = useColorScheme();
  return themes[scheme === 'dark' ? 'dark' : 'light'];
}
