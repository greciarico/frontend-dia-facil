import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareTextInput } from '@/components/forms/keyboard-aware-form';

import { borders, layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { updateOtp } from '@/utils/carer-otp';

export function OtpInput({ digits, onChange, disabled, error }: {
  digits: string[]; onChange: (digits: string[]) => void; disabled: boolean; error?: string;
}) {
  const { colors } = useAppTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const refs = useRef<(TextInput | null)[]>([]);
  const [focused, setFocused] = useState(0);
  const gapCount = digits.length - 1;
  // Keep room for six equal fields, reducing the gaps before the touch targets.
  const gap = Math.min(rowWidth / (2 * digits.length), Math.max(spacing.xs,
    Math.min(spacing.sm, (rowWidth - digits.length * sizes.touchTarget) / gapCount)));
  return (
    <View style={[styles.cells, { gap }]} onLayout={event => setRowWidth(event.nativeEvent.layout.width)}>
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
        }} style={[styles.cell, {
          color: colors.text.primary, backgroundColor: colors.surface.default,
          borderColor: error ? colors.status.error : focused === index ? colors.border.selected : colors.border.control }]} />)}
    </View>
  );
}
const styles = StyleSheet.create({
  cells: { flexDirection: 'row', flexWrap: 'nowrap',
    paddingTop: spacing['3xl'], marginHorizontal: -spacing.lg },
  cell: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0,
    minHeight: layout.carer.codeCellHeight, borderRadius: radii.control, borderWidth: borders.default,
    paddingHorizontal: 0, paddingVertical: spacing.md, textAlign: 'center', fontFamily: typography.family.bold,
    fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'] },
});
