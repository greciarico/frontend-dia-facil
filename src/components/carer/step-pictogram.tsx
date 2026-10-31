import { useState } from 'react';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import type { StepPictogram } from '@/utils/activity-draft';
import { accountStyles } from './account-layout';
import { AreaIcon } from './area-icon';

export function StepPictogramImage({ pictogram, large = false, size }: { pictogram: StepPictogram; large?: boolean; size?: number }) {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState<string>();
  const uri = pictogram?.urlImagen;
  const dimension = size ?? (large ? sizes.touchTarget * 1.5 : sizes.icon + spacing.sm);
  return <View style={{ width: dimension, height: dimension, alignItems: 'center', justifyContent: 'center' }}>
    {uri && uri !== failed ? <Image source={{ uri }} contentFit="contain" cachePolicy="disk"
      accessible accessibilityLabel={pictogram.nombre} onError={() => setFailed(uri)} style={{ width: dimension, height: dimension }} />
      : <View accessible accessibilityLabel="Pictograma no disponible"><AreaIcon name="imagePlus" color={colors.text.secondary} /></View>}
  </View>;
}
export function ArasaacAttribution() {
  const { colors } = useAppTheme();
  return <Text style={[accountStyles.small, styles.attribution, { color: colors.text.secondary }]}>
    Pictogramas: Sergio Palao · <Link href="https://arasaac.org" accessibilityRole="link" style={{ color: colors.action.primary }}>ARASAAC</Link>
    {' · Gobierno de Aragón · '}<Link href="https://arasaac.org/terms-of-use" accessibilityRole="link"
      accessibilityLabel="Condiciones de licencia CC BY-NC-SA de ARASAAC" style={{ color: colors.action.primary }}>CC BY-NC-SA</Link>.
  </Text>;
}
const styles = StyleSheet.create({ attribution: { marginTop: spacing.sm } });
