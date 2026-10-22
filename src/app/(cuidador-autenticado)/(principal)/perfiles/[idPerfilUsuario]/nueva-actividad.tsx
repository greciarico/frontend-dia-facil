import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useReducer, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { accountStyles } from '@/components/carer/account-layout';
import { ActivityIconSelector } from '@/components/carer/activity-icon-selector';
import { ActivitySectionHeading } from '@/components/carer/activity-section-heading';
import { ActivityTimeField } from '@/components/carer/activity-time-field';
import { ActivityStepsEditor } from '@/components/carer/activity-steps-editor';
import { AreaHeader } from '@/components/carer/area-header';
import { ContinueButton } from '@/components/carer/continue-button';
import { ProfileAvatar } from '@/components/carer/profile-avatar';
import { useActivityIcons } from '@/hooks/use-activity-icons';
import { useActivityTemplate } from '@/hooks/use-activity-template';
import { initialStepsDraft, stepsDraftReducer } from '@/utils/activity-draft';
import { useProfileDetail } from '@/hooks/use-profile-detail';
import { borders, layout, radii, shadows, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { activityNameError, type ActivityIconOption } from '@/utils/activity-icon-options';
import { activitiesHref, validProfileId } from '@/utils/profile-navigation';

export default function NewActivityScreen() {
  const params = useLocalSearchParams<{ idPerfilUsuario?: string }>();
  const id = validProfileId(params.idPerfilUsuario);
  const { state, reload } = useProfileDetail(id);
  const { colors } = useAppTheme();
  const profile = state.status === 'ready' ? state.profile : undefined;
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
        {state.status === 'ready' ? <ActivityForm key={state.profile.idPerfilUsuario} /> : <ScrollView contentContainerStyle={styles.content}><View style={styles.feedback}>
          {state.status === 'loading' ? <View accessible accessibilityLabel="Cargando perfil" accessibilityState={{ busy: true }}>
            <ActivityIndicator color={colors.action.primary} />
          </View> : <>
            <Text accessibilityRole="alert" style={[accountStyles.body, { color: colors.text.secondary }]}>
              {state.status === 'not-found' ? 'No pudimos encontrar este perfil.' : 'No pudimos cargar el perfil. Inténtalo de nuevo.'}
            </Text>
            {state.status === 'error' && <ContinueButton label="Reintentar" onPress={() => void reload()} />}
            <ContinueButton label="Volver a Mis perfiles" onPress={() => router.dismissTo('/perfiles')} />
          </>}
        </View></ScrollView>}
    </KeyboardAvoidingView>
    </GestureHandlerRootView>
  </>;
}

function ActivityForm() {
  const { colors } = useAppTheme();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [icon, setIcon] = useState<ActivityIconOption | null>(null);
  const [focused, setFocused] = useState(false);
  const [time, setTime] = useState<number | null>(null);
  const [steps, dispatchSteps] = useReducer(stepsDraftReducer, initialStepsDraft);
  const template = useActivityTemplate(name);
  const data = useActivityIcons(true, name);
  const error = touched ? activityNameError(name) : undefined;
  const card = [styles.card, { backgroundColor: colors.surface.default, borderColor: colors.border.decorative, shadowColor: colors.shadow }];
  const header = <>
    <Text style={[accountStyles.body, styles.left, { color: colors.text.secondary }]}>Agrega una nueva actividad a su agenda.</Text>
    <View style={card}>
      <ActivitySectionHeading icon="pencil" title="Nombre de la actividad" />
      <TextInput value={name} onChangeText={setName} onFocus={() => setFocused(true)}
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
      <ActivityIconSelector {...data} value={icon} onChange={setIcon} />
    </View>
  </>;
  return <ActivityStepsEditor draft={steps} dispatch={dispatchSteps} suggestion={template.state} retry={template.retry}
    displayName={data.query} formHeader={header} />;
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center',
    padding: spacing.xl, paddingBottom: spacing['3xl'], gap: spacing.xl },
  card: { borderRadius: radii.card, borderWidth: borders.default, padding: spacing['2xl'], gap: spacing.md,
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity,
    shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  input: { minHeight: sizes.touchTarget, borderWidth: borders.default, borderRadius: radii.control, padding: spacing.md,
    fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  feedback: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  left: { textAlign: 'left' },
});
