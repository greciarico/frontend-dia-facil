import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { borders, layout, radii, shadows, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

type RoleCardProps = {
  title: string; description: string; illustration: ImageSource;
  variant: 'user' | 'carer'; selected: boolean; onSelect: () => void;
  onContinue?: () => void;
};

/** Only the two role options share this pattern, not a general component library. */
export function RoleCard({ title, description, illustration, variant, selected, onSelect, onContinue }: RoleCardProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface.default,
      shadowColor: colors.shadow, borderColor: selected ? colors.border.selected : colors.surface.default }]}>
      <Pressable accessibilityRole="radio" accessibilityLabel={title + '. ' + description}
        accessibilityHint="Selecciona cómo quieres usar DiaFacil."
        accessibilityState={{ checked: selected, selected }} onPress={onSelect}
        style={styles.selection}>
        <Image source={illustration} contentFit="contain" style={styles.illustration} accessible={false} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {title}{selected && onContinue ? ' ✓' : ''}
        </Text>
        <Text style={[styles.description, { color: colors.text.secondary }]}>{description}</Text>
      </Pressable>
      <Pressable accessibilityRole="button"
        accessibilityLabel={onContinue ? (selected ? 'Continuar como cuidador' : 'Seleccionar Soy cuidador') : 'Seleccionar Soy usuario'}
        accessibilityHint={onContinue && selected ? 'Abre el Paso 1 de la cuenta de cuidador.' : undefined}
        onPress={onContinue && selected ? onContinue : onSelect}
        style={[styles.arrow, { backgroundColor: selected ? colors.action.primary
        : variant === 'user' ? colors.welcome.userAction : colors.welcome.carerAction }]}>
        <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" accessible={false}>
          <Path d={selected && !onContinue ? 'M5 12l4 4 10-10' : 'M3 12h17m-6-6 6 6-6 6'} fill="none"
            stroke={selected ? colors.action.onPrimary : colors.action.primary}
            strokeWidth={sizes.stroke} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: layout.welcome.roleMinHeight, borderRadius: radii.card,
    borderWidth: borders.selected, padding: spacing.sm, alignItems: 'center',
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity,
    shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  illustration: { height: layout.welcome.roleIllustrationHeight, width: '100%' },
  selection: { alignSelf: 'stretch', alignItems: 'center', flexGrow: 1 },
  title: { fontFamily: typography.family.bold, fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm, textAlign: 'center', marginTop: spacing.xs },
  description: { fontFamily: typography.family.regular, fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.sm },
  arrow: { alignSelf: 'stretch', marginTop: 'auto', borderRadius: radii.control,
    minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
});
