import { ActivityDefinitionForm } from '@/components/carer/activity-definition-form';
import { carerPeopleCopy } from '@/constants/carer-people-copy';
import { AppText as Text } from '@/components/app-text';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { accountStyles } from '@/components/carer/account-layout';
import { ActivityDialog } from '@/components/carer/activity-dialog';
import { ActivityCreatedModal } from '@/components/carer/activity-created-modal';
import { StepDialogActions } from '@/components/carer/step-dialog-actions';
import { useCreateActivity } from '@/hooks/use-create-activity';
import { AreaHeader } from '@/components/carer/area-header';
import { ContinueButton } from '@/components/carer/continue-button';
import { ProfileAvatar } from '@/components/carer/profile-avatar';
import { useProfileActivities } from '@/hooks/use-profile-activities';
import { activeActivityLimitMessage, maximumActiveActivities } from '@/utils/activities';
import { layout, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { activitiesHref, validProfileId } from '@/utils/profile-navigation';

export default function NewActivityScreen() {
  const params = useLocalSearchParams<{ idPerfilUsuario?: string }>();
  const id = validProfileId(params.idPerfilUsuario);
  const { state, reload } = useProfileActivities(id);
  const { colors } = useAppTheme();
  const profile = state.status === 'ready' ? state.profile : undefined;
  const atLimit = state.status === 'ready' && state.data.actividades.length >= maximumActiveActivities;
  const [success, setSuccess] = useState<{ id: number; name: string; leaving?: boolean } | null>(null);
  const successHandled = useRef(false);
  const confirmed = success?.id === id ? success : null;
  const [hasManualSteps, setHasManualSteps] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const leave = useCallback(() => {
    setConfirmExit(false);
    setHasManualSteps(false);
    router.dismissTo(id ? activitiesHref(id, 'rutina') : '/perfiles');
  }, [id]);
  const finishSuccess = useCallback((another: boolean) => {
    if (!confirmed || successHandled.current) return;
    successHandled.current = true;
    if (another) {
      setConfirmExit(false);
      setHasManualSteps(false);
      void reload();
      setSuccess(null);
    } else {
      setSuccess({ ...confirmed, leaving: true });
      leave();
    }
  }, [confirmed, leave, reload]);
  const requestLeave = useCallback(() => {
    if (confirmExit) { setConfirmExit(false); return; }
    if (confirmed) { finishSuccess(false); return; }
    if (hasManualSteps) { setConfirmExit(true); return; }
    leave();
  }, [confirmExit, confirmed, finishSuccess, hasManualSteps, leave]);
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { requestLeave(); return true; });
    return () => listener.remove();
  }, [requestLeave]));
  return <>
    <Stack.Screen options={{ title: 'Nueva actividad', header: () => <AreaHeader title="Nueva actividad" showNotifications={false}
      onBack={requestLeave} backLabel="Volver a las actividades" rightContent={profile ? <View accessible accessibilityLabel={`Avatar de ${profile.nombre}`}>
        <ProfileAvatar name={profile.nombre} avatar={profile.avatar} size={sizes.touchTarget - spacing.sm} />
      </View> : undefined} /> }} />
    <GestureHandlerRootView style={styles.flex}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {confirmed ? <View style={styles.flex} /> : state.status === 'ready' && !atLimit ? <ActivityForm key={state.profile.idPerfilUsuario} id={state.profile.idPerfilUsuario}
          onManualStepsChange={setHasManualSteps} onExit={requestLeave}
          onCreated={() => { setHasManualSteps(false); setConfirmExit(false); Keyboard.dismiss(); successHandled.current = false;
            setSuccess({ id: state.profile.idPerfilUsuario, name: state.profile.nombre }); }} /> : <ScrollView contentContainerStyle={styles.content}><View style={styles.feedback}>
          {state.status === 'loading' ? <View accessible accessibilityLabel="Cargando actividades" accessibilityState={{ busy: true }}>
            <ActivityIndicator color={colors.action.primary} />
          </View> : atLimit ? <>
            <Text style={[accountStyles.body, { color: colors.text.secondary }]}>{activeActivityLimitMessage}</Text>
            <ContinueButton label="Ver actividades" onPress={requestLeave} />
          </> : <>
            <Text accessibilityRole="alert" style={[accountStyles.body, { color: colors.text.secondary }]}>
              {state.status === 'not-found' ? 'No pudimos encontrar los datos de esta persona.' : 'No pudimos cargar las actividades. Inténtalo de nuevo.'}
            </Text>
            {state.status === 'error' && <ContinueButton label="Reintentar" onPress={() => void reload()} />}
            <ContinueButton label={carerPeopleCopy.back} onPress={() => router.dismissTo('/perfiles')} />
          </>}
        </View></ScrollView>}
    </KeyboardAvoidingView>
    </GestureHandlerRootView>
    {confirmed && !confirmed.leaving && <ActivityCreatedModal profileName={confirmed.name} onCreateAnother={() => finishSuccess(true)} onViewActivities={() => finishSuccess(false)} />}
    {confirmExit && <ActivityDialog title="¿Salir sin guardar?" description="Si sales ahora, perderás los pasos que has creado y los cambios de esta actividad"
      centered compact showClose closeLabel="Seguir editando" onClose={() => setConfirmExit(false)}>
      <StepDialogActions label="Salir sin guardar" destructive secondaryLabel="Seguir editando"
        onCancel={() => setConfirmExit(false)} onConfirm={leave} />
    </ActivityDialog>}
  </>;
}


function ActivityForm({ id, onCreated, onManualStepsChange, onExit }: {
  id: number; onCreated: () => void; onManualStepsChange: (hasManualSteps: boolean) => void; onExit: () => void;
}) {
  const { colors } = useAppTheme();
  const creation = useCreateActivity(id, onCreated);
  const [confirmRetry, setConfirmRetry] = useState(false);
  const atLimit = creation.error?.kind === 'limit';
  return <ActivityDefinitionForm busy={creation.sending} onManualStepsChange={onManualStepsChange}
    intro={<Text style={[accountStyles.body, { color: colors.text.secondary }]}>Agrega una nueva actividad a su agenda.</Text>}
    actions={(input, invalid) => {
      const submit = () => { if (input && !creation.sending && !atLimit) void creation.submit(input); };
      return <View style={styles.feedback}>
        {invalid && <Text style={[accountStyles.small, { color: colors.text.secondary }]}>{invalid}</Text>}
        {creation.error && <>
          <Text accessibilityRole="alert" style={[accountStyles.small, { color: atLimit ? colors.text.secondary : colors.status.error }]}>{creation.error.message}</Text>
          {(creation.error.kind === 'uncertain' || creation.error.kind === 'not-found') && <ContinueButton variant="secondary"
            label="Ver actividades" onPress={onExit} />}
        </>}
        <ContinueButton label="Crear actividad" loadingLabel="Creando actividad…" loading={creation.sending}
          disabled={!input || atLimit || creation.error?.kind === 'not-found'}
          onPress={() => creation.error?.kind === 'uncertain' ? setConfirmRetry(true) : submit()} />
        {confirmRetry && <ActivityDialog title="¿Volver a intentar?" showClose onClose={() => setConfirmRetry(false)}>
          <Text style={[accountStyles.body, { color: colors.text.secondary }]}>La solicitud anterior podría haberse completado. Si vuelves a enviarla, podrías crear otra actividad. Revisa primero tus actividades.</Text>
          <StepDialogActions label="Volver a intentar" onCancel={() => setConfirmRetry(false)}
            onConfirm={() => { setConfirmRetry(false); submit(); }} />
        </ActivityDialog>}
      </View>;
    }} />;
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center',
    padding: spacing.xl, paddingBottom: spacing['3xl'], gap: spacing.xl },
  feedback: { flex: 1, justifyContent: 'center', gap: spacing.lg },
});
