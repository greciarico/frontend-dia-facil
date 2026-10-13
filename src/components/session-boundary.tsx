import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContinueButton } from '@/components/carer/continue-button';
import { accountStyles } from '@/components/carer/account-layout';
import { useSession } from '@/context/session';
import { spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

/** Recovery UI only: authenticated destinations are handled by the root router. */
export function SessionBoundary() {
  const { manager, status, message } = useSession();
  const { colors } = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  async function action(kind: 'retry' | 'logout') {
    if (busy) return;
    setBusy(true); setFeedback(undefined);
    try {
      if (kind === 'logout') await manager.logout();
      else if (kind === 'retry') {
        await manager.retry();
        if (manager.getSnapshot().status === 'authenticated' && manager.getSnapshot().stage === 'onboarding') router.replace('/cuidador/paso-4');
      }
    } catch { setFeedback('No pudimos completar la operación. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={[styles.page, { backgroundColor: colors.background.primary }]}>
    <View style={styles.content}>
      {status === 'booting' || status === 'authenticated' ? <><ActivityIndicator color={colors.action.primary} /><Text style={[accountStyles.body, { color: colors.text.secondary }]}>{status === 'booting' ? 'Restaurando tu sesión…' : 'Preparando tu cuenta…'}</Text></>
        : <>
          <Text accessibilityRole="alert" style={[accountStyles.body, { color: colors.text.secondary }]}>{message || 'No pudimos restaurar tu sesión.'}</Text>
          <ContinueButton label="Reintentar" disabled={busy} onPress={() => void action('retry')} />
          <ContinueButton label="Cerrar sesión" disabled={busy} onPress={() => void action('logout')} />
          {feedback && <Text accessibilityLiveRegion="polite" style={[accountStyles.body, { color: colors.text.secondary }]}>{feedback}</Text>}
        </>}
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: spacing['2xl'], justifyContent: 'center' },
  content: { alignItems: 'center', gap: spacing.lg },
});
