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
  const finishSuccess = (another: boolean) => {
    if (!confirmed || successHandled.current) return;
    successHandled.current = true;
    if (another) { void reload(); setSuccess(null); }
    else { setSuccess({ ...confirmed, leaving: true }); router.dismissTo(activitiesHref(confirmed.id)); }
  };
  const back = useCallback(() => router.dismissTo(id ? activitiesHref(id) : '/perfiles'), [id]);
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => listener.remove();
  }, [back]));
  return <>
    <Stack.Screen options={{ title: 'Nueva actividad', header: () => <AreaHeader title="Nueva actividad" showNotifications={false}
      onBack={back} backLabel="Volver a las actividades" rightContent={profile ? <View accessible accessibilityLabel={`Avatar de ${profile.nombre}`}>
        <ProfileAvatar name={profile.nombre} avatar={profile.avatar} size={sizes.touchTarget - spacing.sm} />
      </View> : undefined} /> }} />
    <GestureHandlerRootView style={styles.flex}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {confirmed ? <View style={styles.flex} /> : state.status === 'ready' && !atLimit ? <ActivityForm key={state.profile.idPerfilUsuario} id={state.profile.idPerfilUsuario}
          onCreated={() => { Keyboard.dismiss(); successHandled.current = false; setSuccess({ id: state.profile.idPerfilUsuario, name: state.profile.nombre }); }} /> : <ScrollView contentContainerStyle={styles.content}><View style={styles.feedback}>
          {state.status === 'loading' ? <View accessible accessibilityLabel="Cargando actividades" accessibilityState={{ busy: true }}>
            <ActivityIndicator color={colors.action.primary} />
          </View> : atLimit ? <>
            <Text style={[accountStyles.body, { color: colors.text.secondary }]}>{activeActivityLimitMessage}</Text>
            <ContinueButton label="Ver actividades" onPress={back} />
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
  </>;
}


function ActivityForm({ id, onCreated }: { id: number; onCreated: () => void }) {
  const { colors } = useAppTheme();
  const creation = useCreateActivity(id, onCreated);
  const [confirmRetry, setConfirmRetry] = useState(false);
  const atLimit = creation.error?.kind === 'limit';
  return <ActivityDefinitionForm busy={creation.sending}
    intro={<Text style={[accountStyles.body, { color: colors.text.secondary }]}>Agrega una nueva actividad a su agenda.</Text>}
    actions={(input, invalid) => {
      const submit = () => { if (input && !creation.sending && !atLimit) void creation.submit(input); };
      return <View style={styles.feedback}>
        {invalid && <Text style={[accountStyles.small, { color: colors.text.secondary }]}>{invalid}</Text>}
        {creation.error && <>
          <Text accessibilityRole="alert" style={[accountStyles.small, { color: atLimit ? colors.text.secondary : colors.status.error }]}>{creation.error.message}</Text>
          {(creation.error.kind === 'uncertain' || creation.error.kind === 'not-found') && <ContinueButton variant="secondary"
            label="Ver actividades" onPress={() => router.dismissTo(activitiesHref(id))} />}
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
