import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { UserActivityDetailContent } from '@/components/user/activity-detail';
import { ExecutionSuccess } from '@/components/user/execution-success';
import { useExecutionAction } from '@/hooks/use-execution-action';
import { startGuideOperation, finishDirectOperation } from '@/services/user-execution';
import { guideHref, type ExecutionFinished } from '@/utils/user-execution';
import { useUserActivity } from '@/hooks/use-user-activity';
import { validActivityId } from '@/utils/user-activity';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export default function UserActivityScreen() {
  const { idActividad } = useLocalSearchParams<{ idActividad?: string }>();
  const id = validActivityId(idActividad);
  const { state, reload } = useUserActivity(id);
  const action = useExecutionAction();
  const [finished, setFinished] = useState<ExecutionFinished>();
  const { colors } = useAppTheme();
  const back = () => router.dismissTo('/mi-agenda');
  if (finished) return <ExecutionSuccess result={finished} />;
  return <ScrollView style={{ backgroundColor: colors.background.primary }} contentContainerStyle={styles.page}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver a Mi agenda" onPress={back} style={styles.back}>
      <AreaIcon name="back" color={colors.text.primary} />
    </Pressable>
    {state.status === 'ready' ? <>
      <UserActivityDetailContent detail={state.detail} busy={action.busy} disabled={action.blocked || !!action.code}
        onStart={() => { if (!id) return;
          if (state.detail.actividad.estado === 'COMPLETADA') { router.push(guideHref(id)); return; }
          void action.run(startGuideOperation(id, state.detail.fecha), () => {
          router.push(guideHref(id));
        }, () => reload()); }} onDirect={() => { if (id) void action.run(finishDirectOperation(id, state.detail.fecha), setFinished, () => reload()); }} />
      {action.busy && <ActivityIndicator accessibilityLabel="Guardando actividad" color={colors.action.primary} />}
      {!!action.error && <Text accessibilityRole="alert" style={[styles.copy, { color: colors.status.error }]}>{action.error}</Text>}
      {action.blocked && <ContinueButton label="Consultar resultado" variant="secondary" disabled={action.busy} onPress={action.retryRecovery} />}
      {!!action.code && <ContinueButton label="Consultar actividad" variant="secondary" onPress={() => { action.reset(); reload(); }} />}
    </>
      : <View style={styles.message}>
        {state.status === 'loading' ? <ActivityIndicator accessibilityLabel="Cargando actividad" color={colors.action.primary} />
          : <>
            <Text accessibilityRole="alert" style={[styles.copy, { color: colors.text.primary }]}>
              {state.status === 'not-found' ? 'Esta actividad no está disponible.' : 'No pudimos cargar la actividad. Revisa tu conexión e inténtalo nuevamente.'}
            </Text>
            <ContinueButton label={state.status === 'not-found' ? 'Volver a Mi agenda' : 'Reintentar'} variant="secondary"
              onPress={state.status === 'not-found' ? back : reload} />
          </>}
      </View>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'], gap: spacing.lg },
  back: { minHeight: sizes.touchTarget, width: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
});
