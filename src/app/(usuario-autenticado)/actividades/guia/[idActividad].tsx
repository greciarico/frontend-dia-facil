import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { ActivityDialog } from '@/components/carer/activity-dialog';
import { StepDialogActions } from '@/components/carer/step-dialog-actions';
import { StepPictogramImage } from '@/components/carer/step-pictogram';
import { GuideSteps } from '@/components/user/guide-steps';
import { ExecutionSuccess } from '@/components/user/execution-success';
import { useUserGuide } from '@/hooks/use-user-guide';
import { useExecutionAction } from '@/hooks/use-execution-action';
import { advanceOperation, finishGuideOperation } from '@/services/user-execution';
import { reachedFrontier, type ExecutionFinished } from '@/utils/user-execution';
import { validActivityId, userActivityHref } from '@/utils/user-activity';
import { layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export default function GuideScreen() {
  const params = useLocalSearchParams<{ idActividad?: string }>(), id = validActivityId(params.idActividad);
  const query = useUserGuide(id), action = useExecutionAction(), { colors } = useAppTheme(), { width } = useWindowDimensions();
  const [selected, setSelected] = useState<number>(), [confirm, setConfirm] = useState(false), [finished, setFinished] = useState<ExecutionFinished>();
  const back = () => router.dismissTo(id ? userActivityHref(id) : '/mi-agenda');
  if (finished) return <ExecutionSuccess result={finished} />;
  const guide = query.state.status === 'ready' ? query.state.guide : undefined;
  const unavailable = query.state.status === 'unavailable' || guide?.estado === 'PENDIENTE';
  const completed = guide?.estado === 'COMPLETADA', dayChanged = guide && !guide.vigente || action.code === 'DIA_AGENDA_CAMBIADO';
  const consultation = !!completed && !!guide?.vigente;
  const ready = guide && (guide.estado === 'EN_PROGRESO' || consultation) && guide.vigente;
  const current = ready ? Math.max(0, guide.pasos.findIndex(p => p.idPasoActividad === selected && (consultation || p.alcanzado)) >= 0
    ? guide.pasos.findIndex(p => p.idPasoActividad === selected) : consultation ? 0 : reachedFrontier(guide)) : 0;
  const step = ready ? guide.pasos[current] : undefined, last = guide && current === guide.pasos.length - 1;
  const blocked = action.busy || action.blocked || !!action.code;
  const finish = () => {
    if (consultation || !guide?.idEjecucion || !step || !id) return;
    setConfirm(false); void action.run(finishGuideOperation(id, guide.idEjecucion, step.idPasoActividad, guide.fecha), setFinished, query.apply);
  };
  return <ScrollView style={{ backgroundColor: colors.background.primary }} contentContainerStyle={styles.page}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver al detalle de la actividad" onPress={back} style={styles.back}><AreaIcon name="back" color={colors.text.primary} /></Pressable>
    {query.state.status === 'loading' ? <ActivityIndicator accessibilityLabel="Cargando pasos" color={colors.action.primary} />
      : !ready || dayChanged ? <View style={styles.message}>
        <Text accessibilityRole="alert" style={[styles.copy, { color: colors.text.primary }]}>{dayChanged ? 'Comenzó un nuevo día. Vuelve al detalle de la actividad.'
          : completed ? 'Esta actividad ya está completada.' : unavailable ? 'Abre el detalle de la actividad para comenzar o continuar su guía.' : 'No pudimos cargar los pasos. Revisa tu conexión.'}</Text>
        <ContinueButton label={completed ? 'Volver a mi agenda' : unavailable || dayChanged ? 'Volver al detalle' : 'Reintentar'} variant="secondary"
          onPress={completed ? () => router.dismissTo('/mi-agenda') : unavailable || dayChanged ? back : query.reload} />
      </View> : <>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{guide.actividad.nombre}</Text>
        <GuideSteps steps={guide.pasos} current={current} disabled={!consultation && blocked} consultation={consultation} onSelect={setSelected} />
        <View style={[styles.step, { backgroundColor: colors.profiles.information }]}>
          <StepPictogramImage pictogram={step!.pictograma} size={Math.min(layout.carer.illustrationWidth, Math.max(sizes.touchTarget, width - spacing.xl * 4))} />
          <View style={styles.instruction}><AreaIcon name="audio" color={colors.action.primary} /><Text accessibilityRole="header" style={[styles.title, styles.stepText, { color: colors.text.primary }]}>{step!.descripcion}</Text></View>
        </View>
        {consultation ? <ContinueButton label={last ? 'Volver a la actividad' : 'Siguiente paso'}
          onPress={last ? back : () => setSelected(guide.pasos[current + 1].idPasoActividad)} /> : <>
        {action.busy && <ActivityIndicator accessibilityLabel="Guardando actividad" color={colors.action.primary} />}
        {!!action.error && <Text accessibilityRole="alert" style={[styles.copy, { color: colors.status.error }]}>{action.error}</Text>}
        {action.blocked ? <ContinueButton label="Consultar resultado" variant="secondary" onPress={action.retryRecovery} disabled={action.busy} />
          : action.code ? <ContinueButton label="Volver al detalle" variant="secondary" onPress={back} /> : <>
            <ContinueButton label={last ? 'Finalizar actividad' : 'Siguiente paso'} disabled={blocked} onPress={last ? finish : () => {
              if (!id || !guide.idEjecucion || !step) return;
              const next = guide.pasos[current + 1].idPasoActividad;
              void action.run(advanceOperation(id, guide.idEjecucion, step.idPasoActividad, guide.fecha), value => { query.apply(value); setSelected(next); }, query.apply);
            }} />
            {guide.actividad.guiaInicialCompletada && !last && <ContinueButton label="Finalizar actividad" variant="secondary" disabled={blocked} onPress={() => setConfirm(true)} />}
          </>}
        </>}
      </>}
    {confirm && ready && !consultation && <ActivityDialog title={`¿Ya terminaste ${guide.actividad.nombre}?`} description="La actividad se marcará como completada sin recorrer los pasos restantes." centered showClose respectSafeArea onClose={() => setConfirm(false)}>
      <StepDialogActions label="Sí, finalizar" onCancel={() => setConfirm(false)} onConfirm={finish} disabled={action.busy} />
    </ActivityDialog>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  back: { width: sizes.touchTarget, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'], textAlign: 'center' },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
  message: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  step: { borderRadius: radii.card, padding: spacing.lg, gap: spacing.lg, alignItems: 'center' },
  instruction: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, stepText: { flexShrink: 1 },
});
