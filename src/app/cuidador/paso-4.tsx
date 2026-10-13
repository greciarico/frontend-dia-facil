import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AccountAvatar } from '@/components/carer/account-avatar';
import { AccountLayout, accountStyles } from '@/components/carer/account-layout';
import { ContinueButton } from '@/components/carer/continue-button';
import { useSession } from '@/context/session';
import { sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export default function AccountCompletedScreen() {
  const { manager, status, stage, caregiver, skippedAvatar } = useSession();
  const { colors } = useAppTheme();
  if (status !== 'authenticated' || stage !== 'onboarding' || !caregiver) return <Redirect href="/" />;
  const rows = [
    { title: 'Crear actividades', detail: 'Organiza rutinas y pasos diarios.', icon: 'M4 5h16v16H4ZM8 2v6m8-6v6M4 10h16M8 14h2m4 0h2m-8 4h2', palette: colors.onboarding.activities },
    { title: 'Configurar accesibilidad', detail: 'Adapta la experiencia a cada persona.', icon: 'M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', palette: colors.onboarding.accessibility },
    { title: 'Recibir solicitudes de ayuda', detail: 'Mantente al tanto cuando necesiten apoyo.', icon: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 20h4', palette: colors.onboarding.help },
  ];
  function finish() { manager.finishOnboarding(); router.replace('/'); }
  return <AccountLayout step={4} onBack={finish} hero={<>
    <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>¡Cuenta <Text style={{ color: colors.action.primary }}>creada!</Text></Text>
    <View style={styles.avatar}><AccountAvatar name={caregiver.nombre || ''} avatarId={caregiver.avatarId} />
      <View style={[styles.badge, { backgroundColor: colors.surface.default }]}><Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" accessible={false}>
        <Path d="m5 12 4 4L19 6" fill="none" stroke={colors.action.primary} strokeWidth={sizes.stroke} strokeLinecap="round" />
      </Svg></View>
    </View>
  </>}>
    <Text style={[accountStyles.body, styles.greeting, { color: colors.text.secondary }]}>Hola <Text style={{ color: colors.action.primary, fontFamily: typography.family.bold }}>{caregiver.nombre}</Text>, ahora puedes:</Text>
    <View style={styles.rows}>{rows.map(row => <View key={row.title} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: row.palette.surface }]}><Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" accessible={false}>
        <Path d={row.icon} fill="none" stroke={row.palette.icon} strokeWidth={sizes.stroke} strokeLinecap="round" strokeLinejoin="round" />
      </Svg></View>
      <View style={styles.text}><Text style={[accountStyles.body, styles.left, { color: colors.text.primary }]}>{row.title}</Text>
        <Text style={[accountStyles.small, { color: colors.text.secondary }]}>{row.detail}</Text></View>
    </View>)}</View>
    {skippedAvatar && <Text style={[accountStyles.small, { color: colors.text.secondary }]}>Podrás personalizar tu perfil más adelante desde Mi perfil.</Text>}
    <View style={styles.action}><ContinueButton label="Continuar" onPress={finish} /></View>
  </AccountLayout>;
}
const styles = StyleSheet.create({
  avatar: { marginTop: spacing['3xl'], marginBottom: spacing.sm, zIndex: 1, overflow: 'visible' },
  badge: { position: 'absolute', bottom: 0, right: 0, width: sizes.touchTarget - spacing.sm,
    height: sizes.touchTarget - spacing.sm, borderRadius: (sizes.touchTarget - spacing.sm) / 2, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  greeting: { textAlign: 'left', paddingTop: spacing['3xl'] },
  rows: { gap: spacing['2xl'], paddingVertical: spacing['3xl'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  icon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: spacing.xs },
  left: { textAlign: 'left' },
  action: { marginTop: 'auto', paddingTop: spacing['2xl'] },
});
