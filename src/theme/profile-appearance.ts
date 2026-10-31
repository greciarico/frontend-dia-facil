import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import { textSizeFactors, type AccessibilityPreferences } from '@/utils/accessibility';

/** Default null leaves caregiver/onboarding presentation unchanged. */
export const ProfileAppearanceContext = createContext<AccessibilityPreferences | null>(null);
export const useProfileAppearance = () => useContext(ProfileAppearanceContext);
export function useEffectiveFontScale() {
  const preferences = useProfileAppearance();
  return useWindowDimensions().fontScale * (preferences ? textSizeFactors[preferences.tamanoTexto] : 1);
}
