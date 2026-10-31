import { AppText as Text } from '@/components/app-text';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler, ScrollView, StyleSheet, } from 'react-native';
import { ContinueButton } from '@/components/carer/continue-button';
import { useDeviceAccess } from '@/context/device-access';
import { CelebrationPicture } from '@/components/user/celebration-picture';
import type { ExecutionFinished } from '@/utils/user-execution';
import { layout, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

const back = () => router.dismissTo('/mi-agenda');
export function ExecutionSuccess({ result }: { result: ExecutionFinished }) {
  const { colors } = useAppTheme(); const device = useDeviceAccess();
  useFocusEffect(useCallback(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => listener.remove(); }, []));
  return <ScrollView contentContainerStyle={styles.page} style={{ backgroundColor: colors.background.primary }}>
    <CelebrationPicture />
    <Text accessibilityRole="header" style={[styles.title, { color: colors.action.primary }]}>¡Muy bien!</Text>
    <Text style={[styles.title, { color: colors.text.primary }]}>¡Completaste {result.actividad.nombre}!</Text>
    <Text style={[styles.copy, { color: colors.text.primary }]}>Excelente trabajo{device.profile?.nombre ? <>{', '}<Text style={{ fontFamily: typography.family.semibold, color: colors.action.primary }}>{device.profile.nombre}</Text></> : ''}</Text>
    <ContinueButton label="Volver a mi agenda" onPress={back} />
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', gap: spacing.xl, padding: spacing.xl, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  title: { fontFamily: typography.family.bold, fontSize: typography.size['3xl'], lineHeight: typography.lineHeight['3xl'], textAlign: 'center' },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
});
