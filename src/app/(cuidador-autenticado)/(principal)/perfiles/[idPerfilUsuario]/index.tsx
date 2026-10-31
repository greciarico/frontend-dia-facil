import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { accountStyles } from '@/components/carer/account-layout';
import { AreaHeader } from '@/components/carer/area-header';
import { ContinueButton } from '@/components/carer/continue-button';
import { ProfileActions } from '@/components/carer/profile-actions';
import { ProfileAvatar } from '@/components/carer/profile-avatar';
import { useProfileDetail } from '@/hooks/use-profile-detail';
import { layout, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { activitiesHref, deviceLinkHref, validProfileId } from '@/utils/profile-navigation';

export default function ProfileHomeScreen() {
  const params = useLocalSearchParams<{ idPerfilUsuario?: string }>();
  const { state, reload } = useProfileDetail(validProfileId(params.idPerfilUsuario));
  const { colors } = useAppTheme();
  function back() { router.dismissTo('/perfiles'); }
  const profile = state.status === 'ready' ? state.profile : undefined;
  return <>
    <Stack.Screen options={{ title: profile ? `Perfil de ${profile.nombre}` : 'Perfil',
      header: () => <AreaHeader onBack={back} showNotifications={false}
        title={profile ? <>Perfil de <Text style={{ color: colors.action.primary }}>{profile.nombre}</Text></> : 'Perfil'} /> }} />
    {state.status === 'loading' ? <View style={styles.feedback} accessible accessibilityLabel="Cargando perfil" accessibilityState={{ busy: true }}>
      <ActivityIndicator color={colors.action.primary} /><Text style={[accountStyles.body, { color: colors.text.secondary }]}>Cargando perfil…</Text>
    </View> : state.status === 'ready' ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.avatar} accessible accessibilityLabel={`Avatar de ${state.profile.nombre}`}>
        <ProfileAvatar name={state.profile.nombre} avatar={state.profile.avatar} size={layout.profiles.detailAvatarSize} />
      </View>
      <Text style={[styles.name, { color: colors.text.primary }]}>{state.profile.nombre}</Text>
      <Text style={[styles.prompt, { color: colors.action.primary }]}>¿Qué quieres hacer ahora?</Text>
      <ProfileActions id={state.profile.idPerfilUsuario} onCreateActivities={id => router.push(activitiesHref(id))} onLinkDevice={id => router.push(deviceLinkHref(id))} />
    </ScrollView> : <View style={styles.feedback}>
      <Text accessibilityRole="alert" style={[accountStyles.body, { color: colors.text.secondary }]}>
        {state.status === 'not-found' ? 'No pudimos encontrar este perfil.' : 'No pudimos cargar el perfil. Revisa tu conexión e inténtalo de nuevo.'}
      </Text>
      {state.status === 'error' && <ContinueButton label="Reintentar" onPress={() => void reload()} />}
      <ContinueButton label="Volver a Mis perfiles" onPress={back} />
    </View>}
  </>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing['2xl'], paddingBottom: spacing['2xl'] },
  avatar: { alignItems: 'center', marginTop: spacing['2xl'], marginBottom: spacing.md },
  name: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl, textAlign: 'center' },
  prompt: { fontFamily: typography.family.semibold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md,
    textAlign: 'center', marginVertical: spacing['3xl'] },
  feedback: { flex: 1, justifyContent: 'center', width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing['2xl'], gap: spacing.lg },
});
