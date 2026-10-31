import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import { textSizeFactors, type AppearancePreferences, type AccessibilityPreferences } from '@/utils/accessibility';

/** Usuario preferences, including voice; absent outside its authenticated profile scope. */
export const ProfileAppearanceContext = createContext<AccessibilityPreferences | null>(null);
export const useProfileAppearance = () => useContext(ProfileAppearanceContext);
/** Account appearance contains no voice field or Usuario identity. Providers have disjoint authenticated scopes. */
export const AppearanceContext = createContext<AppearancePreferences | null>(null);
export function useAppearance() {
  const profile = useProfileAppearance(), account = useContext(AppearanceContext);
  return profile ?? account;
}
export function useEffectiveFontScale() {
  const preferences = useAppearance();
  return useWindowDimensions().fontScale * (preferences ? textSizeFactors[preferences.tamanoTexto] : 1);
}
