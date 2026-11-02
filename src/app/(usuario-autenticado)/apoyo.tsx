import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { AccessibilityInfo, findNodeHandle, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { ProfileAvatar } from '@/components/carer/profile-avatar';
import { HelpIllustration, HelpRequestDialog } from '@/components/user/help-request-dialog';
import { useDeviceAccess } from '@/context/device-access';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export default function SupportScreen() {
  const { colors } = useAppTheme(), { profile } = useDeviceAccess();
  const [visible, setVisible] = useState(false), trigger = useRef<View>(null);
  const close = () => { setVisible(false); const node = findNodeHandle(trigger.current); if (node) AccessibilityInfo.setAccessibilityFocus(node); };
  return <ScrollView contentContainerStyle={styles.page}>
    <View style={styles.header}>
      <Pressable onPress={() => router.dismissTo('/mi-agenda')} accessibilityRole="button" accessibilityLabel="Volver a mi agenda" style={styles.control}>
        <AreaIcon name="back" color={colors.text.primary} /></Pressable>
      <AppText accessibilityRole="header" style={[styles.title, styles.heading, { color: colors.text.primary }]}>Apoyo</AppText>
      {profile && <ProfileAvatar name={profile.nombre} avatar={profile.avatar} size={sizes.touchTarget} />}
    </View>
    <View style={styles.content}>
      <HelpIllustration />
      <AppText accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>¿Necesitas ayuda?</AppText>
      <AppText style={[styles.copy, { color: colors.text.secondary }]}>Puedes pedir ayuda a tu cuidador si necesitas apoyo con alguna actividad o si tienes un problema.</AppText>
      <View ref={trigger} collapsable={false}><ContinueButton label="Solicitar ayuda" onPress={() => setVisible(true)}
        leadingIcon={<AreaIcon name="phone" color={colors.action.onPrimary} />} /></View>
      <View style={styles.info}><AreaIcon name="help" color={colors.action.primary} />
        <AppText style={[styles.note, { color: colors.text.secondary }]}>Tu solicitud aparecerá en las Notificaciones de tu cuidador.</AppText></View>
    </View>
    <HelpRequestDialog visible={visible} onClose={close} />
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, heading: { flex: 1 },
  control: { minWidth: sizes.touchTarget, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', gap: spacing['2xl'], paddingVertical: spacing.xl },
  title: { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'], textAlign: 'center' },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg, textAlign: 'center' },
  info: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' }, note: { flex: 1, fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm } });
