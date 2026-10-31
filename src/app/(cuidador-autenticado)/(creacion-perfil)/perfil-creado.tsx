import { AppText as Text } from '@/components/app-text';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AccountAvatar } from '@/components/carer/account-avatar';
import { accountStyles } from '@/components/carer/account-layout';
import { ContinueButton } from '@/components/carer/continue-button';
import { ProfileFlowLayout } from '@/components/carer/profile-flow-layout';
import { useProfileCreation } from '@/context/profile-creation';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { profileAvatar } from '@/utils/profiles';
import { profileHref } from '@/utils/profile-navigation';

export default function ProfileCreatedScreen() {
  const { created } = useProfileCreation();
  const { colors } = useAppTheme();
  if (!created) return <Redirect href="/perfiles" />;
  return <ProfileFlowLayout>
    <View style={styles.hero}>
      <Svg width="100%" height={layout.profiles.confirmationAvatarSize} viewBox="0 0 320 200" preserveAspectRatio="none" style={StyleSheet.absoluteFill} accessible={false}>
        <Path d="m20 44 8 2 5-3m254 0 6 3 8-2M10 110l12-8m276 0 12 8" stroke={colors.status.error} strokeWidth={sizes.stroke} strokeLinecap="round" />
        <Path d="m22 160 10-8m256 0 10 8M15 78l6-5m278 0 6 5" stroke={colors.action.primary} strokeWidth={sizes.stroke} strokeLinecap="round" />
        <Path d="m41 91 3-5m232 0 3 5" stroke={colors.onboarding.help.icon} strokeWidth={sizes.stroke} strokeLinecap="round" />
      </Svg>
      <AccountAvatar name={created.nombre} avatarId={profileAvatar(created.avatar).local} size={layout.profiles.confirmationAvatarSize} />
    </View>
    <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>¡Listo!</Text>
    <Text style={[accountStyles.body, styles.copy, { color: colors.text.secondary }]}>Hemos creado el perfil de <Text style={{ color: colors.action.primary, fontFamily: typography.family.bold }}>{created.nombre}</Text>.{ '\n' }Ahora puedes empezar a configurar su agenda</Text>
    <View style={styles.action}><ContinueButton label="Comenzar" onPress={() => router.replace(profileHref(created.idPerfilUsuario), { withAnchor: true })} /></View>
  </ProfileFlowLayout>;
}
const styles = StyleSheet.create({ hero: { alignItems: 'center', marginTop: spacing['5xl'], marginBottom: spacing['5xl'] },
  copy: { marginTop: spacing['2xl'] }, action: { marginTop: spacing['5xl'], paddingVertical: spacing['3xl'] } });
