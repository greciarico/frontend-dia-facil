import { AppTextInput as TextInput } from '@/components/app-text-input';
import { AppText as Text } from '@/components/app-text';
import { StyleSheet, View } from 'react-native';
import { borders, radii, shadows, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { stepDescriptionError, type StepPictogram } from '@/utils/activity-draft';
import { accountStyles } from './account-layout';
import { ActivityDialog } from './activity-dialog';
import { ActivitySectionHeading } from './activity-section-heading';
import { StepDialogActions } from './step-dialog-actions';
import { StepPictogramPicker } from './step-pictogram-picker';

/** Controlled presentation only. The existing editor owns the pending changes. */
export function StepFormDialog({ mode, text, pictogram, touched, onChangeText, onBlur, onSelect, onSave, onClose }: {
  mode: 'create' | 'edit'; text: string; pictogram: StepPictogram; touched: boolean;
  onChangeText: (text: string) => void; onBlur: () => void; onSelect: (pictogram: StepPictogram) => void;
  onSave: () => void; onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const error = stepDescriptionError(text);
  const card = [styles.card, { backgroundColor: colors.surface.default, borderColor: colors.border.decorative, shadowColor: colors.shadow }];
  return <ActivityDialog title={mode === 'create' ? 'Agregar paso' : 'Editar paso'} onClose={onClose} showClose avoidKeyboard
    description={mode === 'create' ? 'Completa la información para añadir este paso a la actividad.' : 'Actualiza la información de este paso.'}>
    <View style={card}>
      <ActivitySectionHeading icon="pencil" title="Nombre del paso" />
      <TextInput value={text} multiline maxLength={120} accessibilityLabel="Nombre del paso"
        accessibilityHint={touched && error ? error : 'Obligatorio. Máximo 120 caracteres.'}
        placeholder="¿Qué debe hacer?" placeholderTextColor={colors.text.secondary}
        onChangeText={onChangeText} onBlur={onBlur}
        style={[styles.input, { color: colors.text.primary, borderColor: touched && error ? colors.status.error : colors.border.control }]} />
      {touched && error && <Text accessibilityRole="alert" style={[accountStyles.small, { color: colors.status.error }]}>{error}</Text>}
    </View>
    <View style={card}><StepPictogramPicker text={text} selected={pictogram} onSelect={onSelect} /></View>
    <StepDialogActions label={mode === 'create' ? 'Guardar' : 'Guardar cambios'} disabled={!!error} onConfirm={onSave} onCancel={onClose} />
  </ActivityDialog>;
}
const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm, borderRadius: radii.card, borderWidth: borders.default,
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity,
    shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  input: { minHeight: sizes.touchTarget, padding: spacing.md, borderWidth: borders.default, borderRadius: radii.control,
    ...accountStyles.body, textAlign: 'left', textAlignVertical: 'top' },
});
