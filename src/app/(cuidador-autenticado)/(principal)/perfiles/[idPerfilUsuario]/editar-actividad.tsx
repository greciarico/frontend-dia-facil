import { useEffect, useRef, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppText } from '@/components/app-text';
import { accountStyles } from '@/components/carer/account-layout';
import { ActivityDefinitionForm } from '@/components/carer/activity-definition-form';
import { ActivityDialog } from '@/components/carer/activity-dialog';
import { AreaHeader } from '@/components/carer/area-header';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { useSession } from '@/context/session';
import { ActivityEditError, getEditableActivity, updateActivity } from '@/services/activity-edit';
import { matchesSaved, type EditActivityInput, type EditableActivity } from '@/utils/activity-edit';
import { activitiesHref, validProfileId } from '@/utils/profile-navigation';
import { radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

const appliesNext = 'Los cambios se aplicarán a partir de la siguiente ejecución.';
function explanation(state: EditableActivity['estadoHoy']) {
  if (state === 'EN_PROGRESO') return { title: 'Actividad en progreso',
    description: 'Los cambios se aplicarán a partir de la siguiente ejecución, sin afectar la actividad que se está realizando actualmente.' };
  if (state === 'COMPLETADA') return { title: 'Actividad completada',
    description: `Esta actividad ya fue completada hoy. ${appliesNext}` };
}

export default function EditActivityScreen() {
  const params = useLocalSearchParams<{ idPerfilUsuario?: string; idActividad?: string }>();
  const profile = validProfileId(params.idPerfilUsuario);
  const id = validProfileId(params.idActividad);
  const back = () => router.dismissTo(profile ? activitiesHref(profile) : '/perfiles');
  return <>
    <Stack.Screen options={{ title: 'Editar actividad', header: () =>
      <AreaHeader title="Editar actividad" onBack={back} backLabel="Volver a las actividades" showNotifications={false} /> }} />
    {profile && id ? <Editor key={`${profile}:${id}`} profile={profile} id={id} back={back} /> :
      <ContinueButton label="Volver a las actividades" onPress={back} />}
  </>;
}

function Editor({ profile, id, back }: { profile: number; id: number; back: () => void }) {
  const { manager } = useSession();
  const { colors } = useAppTheme();
  const pending = useRef<AbortController | null>(null);
  const sent = useRef<EditActivityInput | null>(null);
  const [activity, setActivity] = useState<EditableActivity>();
  const [loadError, setLoadError] = useState('');
  const [failure, setFailure] = useState<ActivityEditError>();
  const [latest, setLatest] = useState<EditableActivity>();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string>();
  const [reload, setReload] = useState(0);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const revision = manager.revision();
    void getEditableActivity(profile, id, revision, controller.signal).then(data => {
      if (!controller.signal.aborted && manager.revision() === revision) setActivity(data);
    }).catch(error => {
      if (!controller.signal.aborted && manager.revision() === revision)
        setLoadError(error instanceof ActivityEditError ? error.message : 'No pudimos cargar la actividad.');
    });
    return () => { controller.abort(); pending.current?.abort(); pending.current = null; };
  }, [profile, id, manager, reload]);

  function accept(data: EditableActivity, message?: string) {
    setActivity(data); setFailure(undefined); setLatest(undefined); setFormKey(key => key + 1);
    if (message) { Keyboard.dismiss(); setSuccess(message); }
  }

  async function operate(input?: EditActivityInput) {
    if (!activity || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    const sessionRevision = manager.revision();
    const current = () => !controller.signal.aborted && manager.revision() === sessionRevision;
    setBusy(true);
    try {
      if (input) {
        sent.current = input;
        const data = await updateActivity(profile, id, activity.revision, input, sessionRevision, controller.signal);
        if (current()) accept(data, explanation(data.estadoHoy)?.description ?? 'Los cambios ya están disponibles.');
      } else {
        const data = await getEditableActivity(profile, id, sessionRevision, controller.signal);
        if (!current()) return;
        if (failure?.kind === 'uncertain' && data.revision === activity.revision) {
          setFailure(undefined);
        } else if (failure?.kind === 'uncertain' && sent.current && matchesSaved(sent.current, data, activity)) {
          accept(data, ['Los datos guardados coinciden con tu borrador.', explanation(data.estadoHoy)?.description].filter(Boolean).join(' '));
        } else {
          setLatest(data);
        }
      }
    } catch (error) {
      if (current() && (input || error instanceof ActivityEditError))
        setFailure(error instanceof ActivityEditError ? error : new ActivityEditError('uncertain'));
    } finally {
      if (pending.current === controller) { pending.current = null; setBusy(false); }
    }
  }

  if (!activity) return <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
    {loadError ? <>
      <AppText accessibilityRole="alert">{loadError}</AppText>
      <ContinueButton label="Reintentar" onPress={() => { setLoadError(''); setReload(n => n + 1); }} />
      <ContinueButton label="Ver actividades" variant="secondary" onPress={back} />
    </> : <ActivityIndicator accessibilityLabel="Cargando actividad" color={colors.action.primary} />}
  </ScrollView>;
  const notice = explanation(activity.estadoHoy);
  const requiresRead = failure?.kind === 'conflict' || failure?.kind === 'uncertain';
  return <GestureHandlerRootView style={{ flex: 1 }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ActivityDefinitionForm key={formKey} initial={activity} busy={busy}
      intro={notice && <View style={[styles.notice, { backgroundColor: colors.welcome.intro }]}>
        <AreaIcon name="info" size={sizes.iconSmall} color={colors.action.primary} />
        <View style={styles.noticeCopy}>
          <AppText style={[accountStyles.small, styles.noticeTitle, { color: colors.text.primary }]}>{notice.title}</AppText>
          <AppText style={[accountStyles.small, { color: colors.text.secondary }]}>{appliesNext}</AppText>
        </View>
      </View>}
      actions={(input, invalid) => <View style={{ gap: spacing.md }}>
        {invalid && <AppText style={{ color: colors.text.secondary }}>{invalid}</AppText>}
        {failure && <AppText accessibilityRole="alert" style={{ color: colors.text.secondary }}>{failure.message}</AppText>}
        {requiresRead && <ContinueButton label="Consultar versión guardada" variant="secondary" disabled={busy} onPress={() => void operate()} />}
        <ContinueButton label="Guardar cambios" loadingLabel="Guardando cambios…" loading={busy}
          disabled={!input || requiresRead || failure?.kind === 'not-found'} onPress={() => { if (input) void operate(input); }} />
      </View>} />
    </KeyboardAvoidingView>
    {latest && <ActivityDialog title="¿Cargar la versión guardada?" showClose onClose={() => setLatest(undefined)}
      description="Si la cargas, reemplazarás tu borrador actual.">
      <ContinueButton label="Cargar versión" onPress={() => accept(latest)} />
      <ContinueButton label="Conservar borrador" variant="secondary" onPress={() => setLatest(undefined)} />
    </ActivityDialog>}
    {success && <ActivityDialog title="Actividad actualizada" description={success} centered showClose closeLabel="Cerrar confirmación"
      onClose={() => setSuccess(undefined)}>
      <ContinueButton label="Ver actividades" onPress={() => { setSuccess(undefined); back(); }} />
    </ActivityDialog>}
  </GestureHandlerRootView>;
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, gap: spacing.sm, borderRadius: radii.control },
  noticeCopy: { flex: 1, gap: spacing.xs },
  noticeTitle: { fontFamily: typography.family.medium },
});
