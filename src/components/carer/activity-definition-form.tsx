import { useReducer, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { activityInputError, activityTimeValue } from '@/utils/create-activity';
import type { EditableActivity, EditActivityInput } from '@/utils/activity-edit';
import { editSteps, initialEditDraft } from '@/utils/activity-edit';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { AppText as Text } from '@/components/app-text';
import { accountStyles } from '@/components/carer/account-layout';
import { ActivityIconSelector } from '@/components/carer/activity-icon-selector';
import { ActivitySectionHeading } from '@/components/carer/activity-section-heading';
import { ActivityTimeField } from '@/components/carer/activity-time-field';
import { ActivityStepsEditor } from '@/components/carer/activity-steps-editor';
import { useActivityIcons } from '@/hooks/use-activity-icons';
import { useActivityTemplate } from '@/hooks/use-activity-template';
import { initialStepsDraft, stepsDraftReducer } from '@/utils/activity-draft';
import { borders, radii, shadows, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { activityNameError, type ActivityIconOption } from '@/utils/activity-icon-options';

export function ActivityDefinitionForm({ initial, busy, intro, actions }: {
  initial?: EditableActivity; busy: boolean; intro: ReactNode;
  actions: (input: EditActivityInput | null, error?: string) => ReactNode;
}) {
  const { colors } = useAppTheme();
  const [name, setName] = useState(initial?.nombre ?? '');
  const [touched, setTouched] = useState(false);
  const [icon, setIcon] = useState<ActivityIconOption | null>(initial?.codigoIcono
    ? { codigo: initial.codigoIcono, nombre: initial.codigoIcono } : null);
  const [focused, setFocused] = useState(false);
  const [time, setTime] = useState<number | null>(() => {
    if (!initial) return null;
    const [hour, minute] = initial.hora.split(':').map(Number);
    return hour * 60 + minute;
  });
  const [steps, dispatchSteps] = useReducer(stepsDraftReducer, initial ? initialEditDraft(initial) : initialStepsDraft);
  const invalid = activityInputError(name, time, icon, steps.steps, initial !== undefined);
  const template = useActivityTemplate(name);
  const data = useActivityIcons(true, name);
  const selectedIcon = data.catalogue.status === 'ready' && icon ?
    data.catalogue.icons.find(option => option.codigo === icon.codigo) ?? icon : icon;
  const error = touched ? activityNameError(name) : undefined;
  const card = [styles.card, { backgroundColor: colors.surface.default, borderColor: colors.border.decorative, shadowColor: colors.shadow }];
  const header = <>
    {intro}
    <View style={card}>
      <ActivitySectionHeading icon="pencil" title="Nombre de la actividad" />
      <TextInput value={name} editable={!busy} onChangeText={setName} onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setTouched(true); }} maxLength={80}
        accessibilityLabel="Nombre de la actividad" accessibilityHint={error || 'Obligatorio. Máximo 80 caracteres.'}
        autoCapitalize="sentences" returnKeyType="done" placeholder="Ej. Estudiar, Desayunar, Caminar…"
        placeholderTextColor={colors.text.secondary}
        style={[styles.input, { color: colors.text.primary,
          borderColor: error ? colors.status.error : focused ? colors.border.control : colors.border.decorative }]} />
      {error && <Text accessibilityRole="alert" style={[accountStyles.small, { color: colors.status.error }]}>{error}</Text>}
    </View>
    <View style={card}>
      <ActivitySectionHeading icon="clock" title="Hora" />
      <ActivityTimeField value={time} onChange={setTime} />
    </View>
    <View style={card}>
      <ActivitySectionHeading icon="imagePlus" title="Elige un ícono"
        description="Te mostramos algunas sugerencias según el nombre de tu actividad." />
      <ActivityIconSelector {...data} value={selectedIcon} onChange={setIcon} />
    </View>
  </>;
  const input = invalid || steps.editing || time === null || !icon ? null : {
    nombre: name.trim(),
    hora: activityTimeValue(time),
    codigoIcono: icon.codigo,
    pasos: editSteps(steps.steps, initial),
  };
  return <ActivityStepsEditor draft={steps} dispatch={dispatchSteps}
    suggestion={initial && name.trim() === initial.nombre ? { status: 'ready', template: null } : template.state}
    retry={template.retry} busy={busy} displayName={data.query} formHeader={header} formActions={actions(input, invalid)} />;
}
const styles = StyleSheet.create({
  card: { borderRadius: radii.card, borderWidth: borders.default, padding: spacing['2xl'], gap: spacing.md,
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity,
    shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  input: { minHeight: sizes.touchTarget, borderWidth: borders.default, borderRadius: radii.control, padding: spacing.md,
    fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
});
