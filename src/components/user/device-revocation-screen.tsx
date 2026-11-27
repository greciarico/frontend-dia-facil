import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/app-text';
import { AreaIcon } from '@/components/carer/area-icon';
import { accountStyles } from '@/components/carer/account-layout';
import { deviceAccess } from '@/services/device-access';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export function DeviceRevocationScreen() {
  const { colors } = useAppTheme();
  const [seconds, setSeconds] = useState(3);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => true);
    let active = true;
    let retry: ReturnType<typeof setTimeout>;
    const finish = async () => {
      try { await deviceAccess.finishRevocation(); }
      catch { if (active) retry = setTimeout(() => void finish(), 1000); }
    };
    const timers = [2, 1].map((value, index) => setTimeout(() => setSeconds(value), (index + 1) * 1000));
    timers.push(setTimeout(() => { setSeconds(0); void finish(); }, 3000));
    return () => { back.remove(); active = false; timers.forEach(clearTimeout); clearTimeout(retry); };
  }, []);
  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.welcome.body }]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.icon, { backgroundColor: colors.welcome.intro }]}>
        <AreaIcon name="logout" color={colors.action.primary} />
      </View>
      <AppText accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>Tu sesión se cerrará</AppText>
      <AppText style={[accountStyles.body, { color: colors.text.primary }]}>Tu cuidador ha desvinculado este dispositivo</AppText>
      <AppText style={[accountStyles.body, { color: colors.text.primary }]}>Pídele ayuda para volver a conectarte</AppText>
      {seconds > 0 && <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.countdown, { backgroundColor: colors.welcome.intro }]}>
        <AppText style={[styles.number, { color: colors.action.primary }]}>{seconds}</AppText>
      </View>}
      <AppText style={[accountStyles.small, styles.center, { color: colors.text.secondary }]}>Volviendo a la pantalla de vinculación</AppText>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
    width: '100%', maxWidth: layout.contentMaxWidth, padding: spacing['2xl'], gap: spacing.lg },
  center: { textAlign: 'center' },
  countdown: { minWidth: sizes.touchTarget + spacing['2xl'], aspectRatio: 1, padding: spacing.lg,
    borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  number: { fontFamily: typography.family.bold, fontSize: typography.size['4xl'], lineHeight: typography.lineHeight['4xl'] },
  icon: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    width: sizes.touchTarget + spacing.md, height: sizes.touchTarget + spacing.md,
    borderRadius: (sizes.touchTarget + spacing.md) / 2 },
});
