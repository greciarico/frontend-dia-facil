import { forwardRef } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { useProfileAppearance } from '@/theme/profile-appearance';
import { profileTextStyle } from '@/utils/accessibility';

/** Nested text without a size inherits its parent; never multiply inherited sizes twice. */
export const AppText = forwardRef<Text, TextProps>(function AppText({ style, ...props }, ref) {
  const preferences = useProfileAppearance();
  const scaled = preferences ? profileTextStyle(StyleSheet.flatten(style) ?? {}, preferences.tamanoTexto) : undefined;
  return <Text ref={ref} {...props} style={[style, scaled]} />;
});
