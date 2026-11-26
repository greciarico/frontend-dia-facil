import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { useSession } from '@/context/session';
import { getEditableActivity, ActivityEditError } from '@/services/activity-edit';
import { deleteActivity, deleteFailure } from '@/services/activity-delete';
import { getActivities } from '@/services/activities';
import { radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import type { EditableActivity } from '@/utils/activity-edit';
import { accountStyles } from './account-layout';
import { ActivityDialog } from './activity-dialog';
import { AreaIcon } from './area-icon';
import { ContinueButton } from './continue-button';
import { StepDialogActions } from './step-dialog-actions';

export function DeleteActivityDialog({ profileId, activityId, person, onClose, onRemoved }: {
  profileId: number; activityId: number; person: string; onClose: () => void; onRemoved: (message: string) => void;
}) {
  const { manager } = useSession();
  const { colors } = useAppTheme();
  const pending = useRef<AbortController | null>(null);
  const [detail, setDetail] = useState<EditableActivity>();
  const [busy, setBusy] = useState<'reading' | 'deleting'>();
  const [issue, setIssue] = useState<{ message: string; checkList?: boolean }>();

  const readDetail = useCallback(async (controller: AbortController, revision: number, message?: string) => {
    const current = () => !controller.signal.aborted && manager.revision() === revision;
    try {
      const record = await getEditableActivity(profileId, activityId, revision, controller.signal);
      if (current()) { setDetail(record); setIssue(message ? { message } : undefined); }
    } catch (error) {
      if (current()) {
        setDetail(undefined);
        setIssue(error instanceof ActivityEditError && error.kind === 'not-found'
          ? { message: 'La actividad ya no está disponible.', checkList: true }
          : { message: 'No pudimos consultar la actividad. Inténtalo de nuevo.' });
      }
    }
  }, [profileId, activityId, manager]);

  useEffect(() => {
    const controller = new AbortController();
    pending.current = controller;
    const revision = manager.revision();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return readDetail(controller, revision);
    }).finally(() => {
      if (pending.current === controller) pending.current = null;
    });
    return () => { pending.current?.abort(); pending.current = null; };
  }, [manager, readDetail]);

  async function operate(mode: 'delete' | 'detail' | 'list') {
    if (pending.current || mode === 'delete' && (!detail || issue?.checkList)) return;
    const controller = new AbortController();
    pending.current = controller;
    const revision = manager.revision();
    const current = () => !controller.signal.aborted && manager.revision() === revision;
    setBusy(mode === 'delete' ? 'deleting' : 'reading');
    try {
      if (mode === 'list') {
        const data = await getActivities(profileId, controller.signal, revision);
        if (!current()) return;
        if (!data.actividades.some(activity => activity.idActividad === activityId)) {
          onRemoved('La actividad ya no aparece en la rutina.');
          return;
        }
        await readDetail(controller, revision, 'La actividad sigue en la rutina. Revisa los datos antes de volver a confirmar.');
      } else if (mode === 'detail') {
        await readDetail(controller, revision);
      } else if (detail) {
        const result = await deleteActivity(profileId, activityId, detail.revision, revision, controller.signal);
        if (!current()) return;
        onRemoved(result.estadoHoy === 'EN_PROGRESO'
          ? `Actividad eliminada. ${person} podrá terminar la ejecución de hoy.`
          : result.estadoHoy === 'COMPLETADA'
            ? 'Actividad eliminada. Permanecerá completada en la agenda de hoy.'
            : 'Actividad eliminada.');
      }
    } catch (error) {
      if (!current()) return;
      if (mode !== 'delete') {
        setIssue({ message: 'No pudimos comprobar el listado. Inténtalo de nuevo.', checkList: true });
      } else {
        const failure = deleteFailure(error);
        if (failure === 'conflict') {
          await readDetail(controller, revision, 'La actividad cambió. Revisa los datos y confirma de nuevo.');
        } else {
          setIssue(failure === 'rejected'
            ? { message: 'No pudimos eliminar la actividad. Inténtalo de nuevo.' }
            : { message: 'Comprueba el listado antes de volver a intentar la eliminación.', checkList: true });
        }
      }
    } finally {
      if (pending.current === controller) { pending.current = null; setBusy(undefined); }
    }
  }

  const close = () => { if (busy !== 'deleting') onClose(); };
  const notice = detail?.estadoHoy === 'EN_PROGRESO'
    ? { title: 'Actividad en progreso', description: `${person} podrá terminar esta actividad. A partir de mañana ya no aparecerá en su agenda.` }
    : detail?.estadoHoy === 'COMPLETADA'
      ? { title: 'Actividad completada', description: 'La actividad permanecerá completada en la agenda de hoy. A partir de mañana ya no aparecerá.' }
      : undefined;

  return <ActivityDialog centered compact showClose={busy !== 'deleting'} onClose={close}
    title={detail ? `¿Estás seguro de que deseas eliminar “${detail.nombre}” de la rutina de ${person}?` : 'Confirmar eliminación'}
    description={detail ? 'Esta acción no se puede deshacer.' : undefined}
    decoration={<View accessible={false} importantForAccessibility="no-hide-descendants"
      style={[styles.trashCircle, { backgroundColor: colors.destructive.surface }]}>
      <AreaIcon name="trash" color={colors.destructive.default} size={sizes.touchTarget} />
    </View>}>
    {notice && <View style={[styles.notice, { backgroundColor: colors.welcome.intro }]}>
      <AreaIcon name="info" size={sizes.iconSmall} color={colors.action.primary} />
      <View style={styles.copy}>
        <AppText style={[accountStyles.small, { color: colors.text.primary, fontFamily: typography.family.medium }]}>{notice.title}</AppText>
        <AppText style={[accountStyles.small, { color: colors.text.secondary }]}>{notice.description}</AppText>
      </View>
    </View>}
    {(!detail && !issue || busy === 'reading') && <ActivityIndicator accessibilityLabel="Consultando actividad" color={colors.action.primary} />}
    {issue && <AppText accessibilityRole="alert" style={{ color: colors.text.secondary }}>{issue.message}</AppText>}
    {issue?.checkList ? <ContinueButton label="Comprobar listado" variant="secondary" disabled={!!busy} onPress={() => void operate('list')} /> :
      !detail && issue && <ContinueButton label="Reintentar" variant="secondary" disabled={!!busy} onPress={() => void operate('detail')} />}
    <StepDialogActions label="Eliminar" loading={busy === 'deleting'} loadingLabel="Eliminando…" destructive
      disabled={!detail || !!busy || issue?.checkList === true} onConfirm={() => void operate('delete')} onCancel={close} />
  </ActivityDialog>;
}

const trashCircleSize = sizes.touchTarget + spacing['3xl'];

const styles = StyleSheet.create({
  trashCircle: { width: trashCircleSize, height: trashCircleSize, borderRadius: trashCircleSize / 2,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  notice: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, gap: spacing.sm, borderRadius: radii.control },
  copy: { flex: 1, gap: spacing.xs },
});
