import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useAppearance } from '@/theme/profile-appearance';
import { profileTextStyle } from '@/utils/accessibility';

/** Same semantic scale as AppText, while retaining native font scaling and all input behavior. */
export const AppTextInput = forwardRef<TextInput, TextInputProps>(function AppTextInput({ style, ...props }, ref) {
  const preferences = useAppearance();
  const scaled = preferences ? profileTextStyle(StyleSheet.flatten(style) ?? {}, preferences.tamanoTexto) : undefined;
  return <TextInput ref={ref} {...props} style={[style, scaled]} />;
});
