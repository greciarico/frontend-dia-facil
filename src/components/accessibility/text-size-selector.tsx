import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from '@/components/app-text';
import { colors as palette, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import type { TextSize } from '@/utils/accessibility';

const choices: { value: TextSize; label: string }[] = [
  { value: 'PEQUENO', label: 'Pequeño' }, { value: 'MEDIANO', label: 'Mediano' }, { value: 'GRANDE', label: 'Grande' },
];
/** Presentation only: neither account nor PerfilUsuario persistence belongs here. */
export function TextSizeSelector({ value, disabled, onChange }: { value: TextSize; disabled: boolean; onChange: (value: TextSize) => void }) {
  const { colors } = useAppTheme();
  return <View style={[styles.choices, { borderColor: colors.border.decorative }]} accessibilityRole="radiogroup" accessibilityLabel="Tamaño del texto">
    {choices.map(choice => <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.label}
      accessibilityState={{ checked: value === choice.value, disabled }} disabled={disabled}
      onPress={() => onChange(choice.value)}
      style={[styles.choice, { backgroundColor: value === choice.value ? colors.action.primary : 'transparent' }]}>
      <AppText style={[styles.copy, styles.choiceText, { color: value === choice.value ? colors.action.onPrimary : colors.text.secondary }]}>{choice.label}</AppText>
      <View style={styles.checkSpace}>{value === choice.value && <Svg width={sizes.iconSmall} height={sizes.iconSmall} viewBox="0 0 24 24" accessible={false}>
        <Circle cx={12} cy={12} r={12} fill={palette.background.primary} />
        <Path d="m5 12 4 4L19 6" fill="none" stroke={palette.purple.default} strokeWidth={sizes.stroke} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>}</View>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: radii.control },
  choice: { flexGrow: 1, flexShrink: 1, minHeight: sizes.touchTarget, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    borderRadius: radii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  choiceText: { flexShrink: 1 }, checkSpace: { width: sizes.iconSmall, alignItems: 'center' },
});
