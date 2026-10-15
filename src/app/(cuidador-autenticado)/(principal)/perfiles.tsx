import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { accountStyles } from '@/components/carer/account-layout';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { CreateProfileButton } from '@/components/carer/create-profile-button';
import { ProfileCard } from '@/components/carer/profile-card';
import { useProfiles } from '@/hooks/use-profiles';
import { layout, radii, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { profileHref } from '@/utils/profile-navigation';

export default function ProfilesScreen() {
  const { state, reload } = useProfiles();
  const { colors } = useAppTheme();
  const openCreation = () => router.push('/crear-perfil');
  const openProfile = (id: number) => router.push(profileHref(id));
  if (state.status === 'loading') return <View style={styles.feedback} accessible accessibilityLabel="Cargando perfiles" accessibilityState={{ busy: true }}>
    <ActivityIndicator color={colors.action.primary} /><Text style={[accountStyles.body, { color: colors.text.secondary }]}>Cargando perfiles…</Text>
  </View>;
  if (state.status === 'error') return <View style={styles.feedback}>
    <Text accessibilityRole="alert" style={[accountStyles.body, { color: colors.text.secondary }]}>No pudimos cargar tus perfiles. Revisa tu conexión e inténtalo de nuevo.</Text>
    <ContinueButton label="Reintentar" onPress={() => void reload()} />
  </View>;
  const { perfiles, maximoPerfilesActivos: maximum } = state.data;
  const empty = perfiles.length === 0;
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
    {empty && <View style={styles.illustration}>
      <Image source={require('@/assets/illustrations/thoughtful-carer.png')} accessible={false} contentFit="contain" style={styles.image} />
    </View>}
    <View style={styles.content}>
      {empty ? <>
        <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>Aún no tienes{ '\n' }<Text style={{ color: colors.action.primary }}>usuarios</Text> a tu cargo</Text>
        <Text style={[accountStyles.small, styles.center, { color: colors.text.secondary }]}>Crea el perfil de la persona a quien acompañarás. Podrás preparar sus actividades, personalizar su agenda y conectar sus dispositivos.</Text>
        <View style={styles.action}><CreateProfileButton first onCreateProfile={openCreation} /></View>
        <View style={[styles.information, { backgroundColor: colors.profiles.information }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.background.purple }]}><AreaIcon name="info" color={colors.action.primary} /></View>
          <View style={styles.infoText}><Text style={[accountStyles.small, { color: colors.text.primary }]}>¿Cuántos perfiles puedo crear?</Text>
            <Text style={[accountStyles.small, { color: colors.text.secondary }]}>Puedes crear hasta {maximum} perfiles de usuarios a tu cargo.</Text></View>
        </View>
      </> : <>
        <Text style={[accountStyles.body, { color: colors.text.secondary }]}>Personas que acompañas</Text>
        <View style={styles.list}>{perfiles.map((profile, index) => <ProfileCard key={profile.idPerfilUsuario} profile={profile}
          surface={colors.profiles.cards[index % colors.profiles.cards.length]} onOpenProfile={openProfile} />)}</View>
        {perfiles.length < maximum && <CreateProfileButton onCreateProfile={openCreation} />}
        <Text style={[accountStyles.small, styles.center, { color: colors.text.secondary }]}>Puedes crear hasta {maximum} perfiles.{ '\n' }({perfiles.length} de {maximum})</Text>
        {perfiles.length >= maximum && <Text style={[accountStyles.small, styles.center, { color: colors.text.secondary }]}>Has alcanzado el límite de perfiles activos.</Text>}
      </>}
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: spacing.lg },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'], gap: spacing.lg },
  illustration: { alignItems: 'center', paddingVertical: spacing.lg },
  image: { width: layout.carer.illustrationWidth, maxWidth: '100%', aspectRatio: layout.profiles.emptyIllustrationRatio },
  feedback: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing['2xl'], width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  center: { textAlign: 'center' },
  action: { marginTop: spacing.md },
  list: { gap: spacing.md, paddingVertical: spacing.lg },
  information: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.control },
  infoText: { flex: 1, gap: spacing.xs },
  infoIcon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
});
