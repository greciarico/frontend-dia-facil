import { AppText as Text } from '@/components/app-text';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { usePictograms } from '@/hooks/use-pictograms';
import { borders, radii, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { sameStepPictogram, type StepPictogram } from '@/utils/activity-draft';
import { accountStyles } from './account-layout';
import { ActivitySecondaryAction } from './activity-secondary-action';
import { AreaIcon } from './area-icon';
import { StepPictogramImage } from './step-pictogram';
import { ActivitySectionHeading } from './activity-section-heading';

export function StepPictogramPicker({ text, selected, onSelect }: {
  text: string; selected: StepPictogram; onSelect: (pictogram: StepPictogram) => void;
}) {
  const { colors } = useAppTheme();
  const { state, query, retry } = usePictograms(text);
  const [gallery, setGallery] = useState({ query: '', count: 3 });
  const count = gallery.query === query ? gallery.count : 3;
  const results = state.status === 'ready' ? state.pictograms : [];
  const visible = results.slice(0, count);
  const outside = selected && !visible.some(p => sameStepPictogram(p, selected));
  const tile = (pictogram: NonNullable<StepPictogram>, interactive: boolean) => {
    const checked = sameStepPictogram(pictogram, selected);
    const content = <>
      <StepPictogramImage pictogram={pictogram} size={sizes.touchTarget} />
      <Text style={[accountStyles.small, { color: colors.text.primary, textAlign: 'center' }]}>{pictogram.nombre}</Text>
      {checked && <AreaIcon name="check" color={colors.action.primary} size={sizes.iconSmall} />}
    </>;
    const style = [styles.tile, { borderColor: checked ? colors.action.primary : colors.border.decorative,
      backgroundColor: colors.surface.default }];
    return interactive ? <Pressable key={pictogram.idArasaac} accessibilityRole="button" accessibilityLabel={pictogram.nombre}
      accessibilityState={{ selected: checked }} onPress={() => onSelect(pictogram)} style={style}>{content}</Pressable>
      : <View accessible accessibilityLabel={`Pictograma seleccionado: ${pictogram.nombre}`} accessibilityState={{ selected: true }} style={style}>{content}</View>;
  };
  return <View style={styles.section}>
    <ActivitySectionHeading icon="imagePlus" title="Elige un pictograma"
      description="Te mostramos algunas sugerencias según el nombre del paso." />
    {state.status === 'loading' && <View accessibilityState={{ busy: true }} style={styles.status}>
      <ActivityIndicator color={colors.action.primary} /><Text style={[accountStyles.small, { color: colors.text.secondary }]}>Buscando pictogramas…</Text>
    </View>}
    {(state.status === 'error' || state.status === 'invalid-response') && <>
      <Text accessibilityRole="alert" style={[accountStyles.small, { color: colors.status.error }]}>No pudimos consultar los pictogramas. Tu selección se conserva.</Text>
      <ActivitySecondaryAction label="Reintentar pictogramas" onPress={retry} icon="imagePlus" />
    </>}
    {state.status === 'ready' && results.length === 0 && <Text style={[accountStyles.small, { color: colors.text.secondary }]}>No encontramos pictogramas para este texto. Puedes continuar preparando el paso.</Text>}
    <View style={styles.grid}>{visible.map(p => tile(p, true))}</View>
    {outside && <View style={styles.section}>
      <Text style={[accountStyles.small, { color: colors.text.secondary }]}>Tu selección</Text>{tile(selected, false)}
    </View>}
    {results.length > count && <ActivitySecondaryAction label="Ver más pictogramas" icon="grid"
      onPress={() => setGallery({ query, count: count === 3 ? 12 : count + 12 })} />}
    {count > 3 && <ActivitySecondaryAction label="Cerrar galería" icon="back" onPress={() => setGallery({ query, count: 3 })} />}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: spacing.sm }, status: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { minWidth: sizes.touchTarget + spacing.lg + borders.default * 2, maxWidth: sizes.touchTarget * 2.5, flexBasis: '30%', flexGrow: 1,
    alignItems: 'center', justifyContent: 'center', padding: spacing.sm, gap: spacing.xs,
    borderWidth: borders.default, borderRadius: radii.control },
});
