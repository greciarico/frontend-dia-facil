import { AppText as Text } from '@/components/app-text';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import DraggableFlatList, { type DragEndParams, type RenderItemParams } from 'react-native-draggable-flatlist';
import { AccessibilityInfo, ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import type { TemplateState } from '@/hooks/use-activity-template';
import { borders, layout, radii, shadows, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { maximumStepOrder, stepSelectionReducer, stepsDraftReducer, stepsMatchTemplate, templateFingerprint, type ActivityTemplate, type DraftStep, type StepsDraft, type StepPictogram } from '@/utils/activity-draft';
import { accountStyles } from './account-layout';
import { ActivityDialog } from './activity-dialog';
import { AreaIcon } from './area-icon';
import { ContinueButton } from './continue-button';
import { ActivitySecondaryAction } from './activity-secondary-action';
import { ActivitySectionHeading } from './activity-section-heading';
import { StepPictogramImage } from './step-pictogram';
import { StepFormDialog } from './step-form-dialog';
import { DeleteStepsDialog } from './delete-steps-dialog';

type Dialog = { kind: 'edit'; key?: string; text: string; touched: boolean; pictogram: StepPictogram }
  | { kind: 'remove'; keys: string[] } | { kind: 'apply'; template: ActivityTemplate; displayName: string };
const stepKey = (step: DraftStep) => step.key;
export function ActivityStepsEditor({ draft, dispatch, suggestion, retry, displayName, formHeader, formActions, busy = false }: {
  draft: StepsDraft; dispatch: Dispatch<Parameters<typeof stepsDraftReducer>[1]>; suggestion: TemplateState; retry: () => void;
  displayName: string; formHeader?: ReactNode; formActions?: ReactNode; busy?: boolean;
}) {
  const { colors } = useAppTheme();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const dialogOpen = dialog !== null;
  const [selectedKeys, select] = useReducer(stepSelectionReducer, new Set<string>());
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const gesture = useRef<string[] | null>(null);
  useFocusEffect(useCallback(() => {
    active.current = true;
    return () => { active.current = false; gesture.current = null; dispatch({ type: 'editing', open: false }); };
  }, [dispatch]));
  const candidate = suggestion.status === 'ready' ? suggestion.template : null;
  useEffect(() => {
    if (!busy && candidate && !draft.personalized && !draft.editing && draft.source !== templateFingerprint(candidate)) {
      dispatch({ type: 'suggest', template: candidate });
    }
  }, [busy, candidate, draft.editing, draft.personalized, draft.source, dispatch]);
  useEffect(() => {
    if (!selectedKeys.size) return;
    const valid = new Set(draft.steps.map(stepKey));
    if ([...selectedKeys].some(key => !valid.has(key))) select({ type: 'prune', validKeys: [...valid] });
  }, [draft.steps, selectedKeys]);
  const close = useCallback(() => { setDialog(null); dispatch({ type: 'editing', open: false }); }, [dispatch]);
  const show = useCallback((next: Dialog) => { dispatch({ type: 'editing', open: true }); setDialog(next); }, [dispatch]);
  const move = useCallback((key: string, direction: -1 | 1) => {
    const index = draft.steps.findIndex(step => step.key === key);
    if (busy || dragging || index < 0 || index + direction < 0 || index + direction >= draft.steps.length) return;
    dispatch({ type: 'move', key, direction });
    AccessibilityInfo.announceForAccessibility(`Paso movido a la posición ${index + direction + 1}.`);
  }, [busy, draft.steps, dragging, dispatch]);
  const removalSteps = useMemo(() => {
    if (dialog?.kind !== 'remove') return [];
    const keys = new Set(dialog.keys);
    return draft.steps.filter(step => keys.has(step.key));
  }, [dialog, draft.steps]);
  const selectedSteps = useMemo(() => draft.steps.filter(step => selectedKeys.has(step.key)), [draft.steps, selectedKeys]);
  const canApply = candidate && draft.personalized && !stepsMatchTemplate(draft.steps, candidate);
  const intact = candidate && !draft.personalized && draft.source === templateFingerprint(candidate);
  const frame = useMemo(() => [styles.frame, { backgroundColor: colors.surface.default,
    borderColor: colors.border.decorative, shadowColor: colors.shadow }], [colors]);
  const row = useCallback(({ item: step, drag, isActive }: RenderItemParams<DraftStep>) => {
    const selected = selectedKeys.has(step.key);
    return <View style={[frame, styles.rowFrame]}>
      <View style={[styles.row, { borderColor: colors.border.decorative, opacity: isActive ? 0.8 : 1 }]}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`${selected ? 'Deseleccionar' : 'Seleccionar'} paso ${step.orden}: ${step.descripcion}`}
          accessibilityState={{ checked: selected, selected, disabled: dragging || busy }} disabled={dragging || busy}
          onPress={() => select({ type: 'toggle', key: step.key })} style={styles.select}>
          <View style={[styles.circle, { borderColor: colors.border.control, backgroundColor: selected ? colors.action.primary : colors.surface.default }]} />
          <View style={[styles.number, { backgroundColor: colors.welcome.intro }]}>
            <Text style={[accountStyles.small, { color: colors.action.primary }]}>{step.orden}</Text>
          </View>
        </Pressable>
        {step.pictograma?.idArasaac && <StepPictogramImage pictogram={step.pictograma} />}
        <Text style={[accountStyles.small, styles.description, { color: colors.text.primary }]}>{step.descripcion}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Editar paso ${step.orden}: ${step.descripcion}`}
          accessibilityState={{ disabled: dragging || busy }} disabled={dragging || busy}
          onPress={() => show({ kind: 'edit', key: step.key, text: step.descripcion, touched: false, pictogram: step.pictograma })} style={styles.action}>
          <View style={[styles.editIcon, { backgroundColor: colors.welcome.intro }]}><AreaIcon name="pencil" color={colors.action.primary} size={sizes.iconSmall} /></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Reordenar paso ${step.orden}`}
          accessibilityState={{ disabled: dragging || dialogOpen || busy }}
          accessibilityHint="Mantén pulsado y arrastra. También puedes usar las acciones Subir y Bajar."
          accessibilityActions={[...(step.orden > 1 ? [{ name: 'moveUp', label: 'Subir' }] : []),
            ...(step.orden < draft.steps.length ? [{ name: 'moveDown', label: 'Bajar' }] : [])]}
          onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'moveUp') move(step.key, -1);
            if (event.nativeEvent.actionName === 'moveDown') move(step.key, 1); }}
          disabled={dragging || dialogOpen || busy} onLongPress={() => { Keyboard.dismiss(); drag(); }} style={styles.action}>
          <AreaIcon name="drag" color={colors.text.secondary} size={sizes.iconSmall} />
        </Pressable>
      </View>
    </View>;
  }, [busy, selectedKeys, frame, colors, dragging, show, dialogOpen, draft.steps.length, move]);
  const beginDrag = useCallback(() => {
    if (!active.current || busy) return;
    gesture.current = draft.steps.map(stepKey); setDragging(true); dispatch({ type: 'editing', open: true });
  }, [busy, draft.steps, dispatch]);
  const endDrag = useCallback(({ data, to, from }: DragEndParams<DraftStep>) => {
    if (!active.current || !gesture.current) return;
    const original = gesture.current; gesture.current = null;
    const keys = data.map(stepKey);
    const allowed = new Set(original);
    if (original.length === keys.length && keys.every(key => allowed.has(key))) {
      dispatch({ type: 'reorder', keys });
      if (from !== to) AccessibilityInfo.announceForAccessibility(`Paso movido a la posición ${to + 1}.`);
    }
    setDragging(false); dispatch({ type: 'editing', open: false });
  }, [dispatch]);
  return <>
    <DraggableFlatList data={draft.steps} keyExtractor={stepKey} renderItem={row} extraData={selectedKeys}
      style={styles.list} containerStyle={styles.list} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      onDragBegin={beginDrag} onDragEnd={endDrag}
      ListHeaderComponent={<View>
        <View style={styles.formHeader} pointerEvents={busy ? 'none' : 'auto'} accessibilityElementsHidden={busy}
          importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'}>{formHeader}</View>
        <View style={[frame, styles.top]}>
          <ActivitySectionHeading icon="steps" title="Paso a paso" />
          <Text accessibilityLiveRegion="polite" style={[accountStyles.small, { color: colors.text.secondary }]}>
            {intact ? `Pasos sugeridos para “${displayName}”.` : 'Puedes editar, eliminar, cambiar de orden o agregar pasos.'}
          </Text>
    {suggestion.status === 'loading' && <View style={styles.status} accessibilityState={{ busy: true }}>
      <ActivityIndicator color={colors.action.primary} /><Text style={[accountStyles.small, { color: colors.text.secondary }]}>Buscando pasos sugeridos…</Text>
    </View>}
    {(suggestion.status === 'error' || suggestion.status === 'invalid-response') && <View style={styles.status}>
      <Text accessibilityRole="alert" style={[accountStyles.small, { color: colors.status.error }]}>
        {suggestion.status === 'invalid-response' ? 'No pudimos mostrar los pasos recibidos.' : 'No pudimos consultar los pasos sugeridos.'} Puedes agregar tus propios pasos.
      </Text>
      <ContinueButton label="Reintentar sugerencia" onPress={retry} />
    </View>}
    {canApply && <ActivitySecondaryAction label={`Usar pasos sugeridos para “${displayName}”`} icon="sparkles" disabled={dragging || busy}
      onPress={() => show({ kind: 'apply', template: candidate!, displayName })} />}
    {draft.steps.length === 0 && suggestion.status !== 'loading' && <Text style={[accountStyles.small, { color: colors.text.secondary }]}>
      {candidate ? 'Puedes agregar tus propios pasos.' : 'Aún no hay pasos sugeridos. Agrega tus propios pasos.'}
    </Text>}
        </View>
      </View>}
      ListFooterComponent={<View>
        <View style={[frame, styles.bottom]}>
          {selectedSteps.length ? <ActivitySecondaryAction label={selectedSteps.length === 1 ? 'Eliminar paso' : `Eliminar ${selectedSteps.length} pasos`}
            icon="trash" destructive disabled={dragging || busy} onPress={() => show({ kind: 'remove', keys: selectedSteps.map(stepKey) })} />
            : <ActivitySecondaryAction label="Agregar paso" icon="plus" disabled={dragging || busy || draft.steps.length >= maximumStepOrder}
              onPress={() => show({ kind: 'edit', text: '', touched: false, pictogram: null })} />}
        </View>
        <View style={styles.create}>{formActions ?? <ContinueButton label="Crear actividad" disabled />}</View>
      </View>} />
    {dialog?.kind === 'edit' && <StepFormDialog mode={dialog.key ? 'edit' : 'create'} text={dialog.text} pictogram={dialog.pictogram} touched={dialog.touched}
      onChangeText={text => setDialog({ ...dialog, text })}
      onBlur={() => setDialog(current => current?.kind === 'edit' ? { ...current, touched: true } : current)}
      onSelect={pictogram => setDialog(current => current?.kind === 'edit' ? { ...current, pictogram } : current)}
      onSave={() => {
        dispatch({ type: 'save', key: dialog.key, description: dialog.text, pictograma: dialog.pictogram }); close();
      }} onClose={close} />}
    {dialog?.kind === 'remove' && removalSteps.length > 0 && <DeleteStepsDialog count={removalSteps.length} onClose={close}
      onConfirm={() => { dispatch({ type: 'removeMany', keys: dialog.keys }); select({ type: 'clear' }); close(); }} />}
    {dialog?.kind === 'apply' && <ActivityDialog title="¿Sustituir tus pasos?" onClose={close}>
      <Text style={[accountStyles.body, { color: colors.text.primary }]}>Se reemplazarán tus pasos personalizados por los sugeridos para “{dialog.displayName}”.</Text>
      <ContinueButton label="Sustituir pasos" onPress={() => { dispatch({ type: 'apply', template: dialog.template }); select({ type: 'clear' }); close(); }} />
      <ContinueButton label="Conservar mis pasos" onPress={close} />
    </ActivityDialog>}
  </>;
}
const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.xl, paddingBottom: spacing['3xl'] },
  formHeader: { gap: spacing.xl, marginBottom: spacing.xl },
  frame: { borderLeftWidth: borders.default, borderRightWidth: borders.default,
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity,
    shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  top: { borderTopWidth: borders.default, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card,
    padding: spacing['2xl'], paddingBottom: spacing.md, gap: spacing.md },
  rowFrame: { paddingHorizontal: spacing['2xl'] },
  bottom: { padding: spacing['2xl'], paddingTop: spacing.md, borderBottomWidth: borders.default,
    borderBottomLeftRadius: radii.card, borderBottomRightRadius: radii.card },
  create: { marginTop: spacing.xl },
  status: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderBottomWidth: borders.default, minHeight: sizes.touchTarget },
  select: { minWidth: sizes.touchTarget, minHeight: sizes.touchTarget, paddingHorizontal: spacing.xs,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  circle: { width: spacing.md, height: spacing.md, borderRadius: spacing.md / 2, borderWidth: borders.default },
  editIcon: { width: sizes.icon + spacing.sm, height: sizes.icon + spacing.sm, borderRadius: layout.activities.sectionIconRadius, alignItems: 'center', justifyContent: 'center' },
  number: { minWidth: sizes.icon, minHeight: sizes.icon, borderRadius: radii.control, padding: spacing.xs, alignItems: 'center', justifyContent: 'center' },
  description: { flex: 1 },
  action: { width: sizes.touchTarget, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
});
