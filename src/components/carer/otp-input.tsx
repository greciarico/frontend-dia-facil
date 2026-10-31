import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { KeyboardAwareTextInput } from '@/components/forms/keyboard-aware-form';

import { borders, layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { updateOtp } from '@/utils/carer-otp';

export function OtpInput({ digits, onChange, disabled, error }: {
  digits: string[]; onChange: (digits: string[]) => void; disabled: boolean; error?: string;
}) {
  const { colors } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const refs = useRef<(TextInput | null)[]>([]);
  const [focused, setFocused] = useState(0);
  return (
    <View style={styles.cells}>
      {digits.map((digit, index) => <KeyboardAwareTextInput key={index} ref={input => { refs.current[index] = input; }}
        value={digit} editable={!disabled} keyboardType="number-pad" inputMode="numeric"
        autoComplete={index === 0 ? 'one-time-code' : 'off'} textContentType={index === 0 ? 'oneTimeCode' : 'none'}
        autoCorrect={false} selectTextOnFocus maxLength={6} caretHidden
        accessibilityState={{ disabled }}
        accessibilityLabel={`Dígito ${index + 1} de 6`} accessibilityHint={error || 'Puedes pegar el código completo.'}
        onFocus={() => setFocused(index)} onChangeText={text => {
          const next = updateOtp(digits, index, text);
          onChange(next.digits);
          if (text) refs.current[next.focus]?.focus();
        }} onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
            const next = [...digits]; next[index - 1] = ''; onChange(next); refs.current[index - 1]?.focus();
          }
        }} style={[styles.cell, { minWidth: sizes.touchTarget * Math.max(1, fontScale),
          color: colors.text.primary, backgroundColor: colors.surface.default,
          borderColor: error ? colors.status.error : focused === index ? colors.border.selected : colors.border.control }]} />)}
    </View>
  );
}
const styles = StyleSheet.create({
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center',
    paddingTop: spacing['3xl'], marginHorizontal: -spacing.lg },
  cell: { flexGrow: 1, flexBasis: sizes.touchTarget, minWidth: sizes.touchTarget,
    minHeight: layout.carer.codeCellHeight, borderRadius: radii.control, borderWidth: borders.default,
    paddingVertical: spacing.md, textAlign: 'center', fontFamily: typography.family.bold,
    fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'] },
});
