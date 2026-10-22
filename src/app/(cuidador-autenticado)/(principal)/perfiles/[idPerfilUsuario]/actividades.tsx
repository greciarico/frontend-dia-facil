import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { accountStyles } from '@/components/carer/account-layout';
import { ActivitiesEmptyIllustration } from '@/components/carer/activities-empty-illustration';
import { AreaHeader } from '@/components/carer/area-header';
import { ContinueButton } from '@/components/carer/continue-button';
import { CreateActivityButton } from '@/components/carer/create-activity-button';
import { ProfileAvatar } from '@/components/carer/profile-avatar';
import { useProfileActivities } from '@/hooks/use-profile-activities';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { newActivityHref, profileHref, validProfileId } from '@/utils/profile-navigation';

export default function ProfileActivitiesScreen() {
  const params = useLocalSearchParams<{ idPerfilUsuario?: string }>();
  const id = validProfileId(params.idPerfilUsuario);
  const { state, reload } = useProfileActivities(id);
  const { colors } = useAppTheme();
  const profile = state.status === 'ready' ? state.profile : undefined;
  function back() { router.dismissTo(id ? profileHref(id) : '/perfiles'); }
  return <>
    <Stack.Screen options={{ title: profile ? `Actividades de ${profile.nombre}` : 'Actividades',
      header: () => <AreaHeader onBack={back} backLabel={profile ? `Volver al perfil de ${profile.nombre}` : 'Volver al perfil'} showNotifications={false}
        title={profile ? <>Actividades de <Text style={{ color: colors.action.primary }}>{profile.nombre}</Text></> : 'Actividades'}
        rightContent={profile ? <View accessible accessibilityLabel={`Avatar de ${profile.nombre}`}>
          <ProfileAvatar name={profile.nombre} avatar={profile.avatar} size={sizes.touchTarget - spacing.sm} />
        </View> : undefined} /> }} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {state.status === 'loading' ? <View style={styles.feedback} accessible accessibilityLabel="Cargando actividades" accessibilityState={{ busy: true }}>
        <ActivityIndicator color={colors.action.primary} /><Text style={[accountStyles.body, { color: colors.text.secondary }]}>Cargando actividades…</Text>
      </View> : state.status === 'ready' ? state.data.actividades.length === 0 ? <View>
        <View style={styles.illustration}><ActivitiesEmptyIllustration /></View>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>Aún no hay actividades</Text>
        <Text style={[styles.description, { color: colors.text.secondary }]}>Agrega las actividades que formarán su rutina diaria</Text>
        <View style={styles.create}><CreateActivityButton id={state.profile.idPerfilUsuario}
          onCreateActivity={profileId => router.push(newActivityHref(profileId))} /></View>
      </View> : <View style={styles.feedback}>
        <Text style={[accountStyles.body, styles.center, { color: colors.text.secondary }]}>Este perfil ya tiene actividades. La visualización de su agenda aún no está disponible.</Text>
        <ContinueButton label="Volver al perfil" onPress={back} />
      </View> : <View style={styles.feedback}>
        <Text accessibilityRole="alert" style={[accountStyles.body, styles.center, { color: colors.text.secondary }]}>
          {state.status === 'not-found' ? 'No pudimos encontrar este perfil.' : 'No pudimos cargar las actividades. Inténtalo de nuevo.'}
        </Text>
        {state.status === 'error' && <ContinueButton label="Reintentar" onPress={() => void reload()} />}
        <ContinueButton label={state.status === 'not-found' ? 'Volver a Mis perfiles' : 'Volver al perfil'}
          onPress={state.status === 'not-found' ? () => router.dismissTo('/perfiles') : back} />
      </View>}
    </ScrollView>
  </>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center',
    paddingHorizontal: spacing['4xl'], paddingVertical: spacing['3xl'] },
  illustration: { alignItems: 'center', marginBottom: spacing['2xl'] },
  title: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl, textAlign: 'center' },
  description: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md,
    textAlign: 'center', marginTop: spacing.lg },
  create: { marginTop: spacing['5xl'] },
  feedback: { gap: spacing.lg },
  center: { textAlign: 'center' },
});
