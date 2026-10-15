import { useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '@/context/session';
import { layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { AreaIcon } from './area-icon';
import { ContinueButton } from './continue-button';
import { NotificationBell } from './notification-bell';

export function AreaHeader({ title, onBack, showNotifications = true, backLabel = 'Volver a Mis perfiles', rightContent }: {
  title: ReactNode; onBack?: () => void; showNotifications?: boolean; backLabel?: string; rightContent?: ReactNode;
}) {
  const { manager } = useSession();
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const heading = useRef<Text>(null);
  const options = useRef<View>(null);
  function close() {
    setOpen(false);
    const target = findNodeHandle(options.current); if (target) AccessibilityInfo.setAccessibilityFocus(target);
  }
  async function logout() {
    if (busy) return;
    setBusy(true); setError(false);
    try { await manager.logout(); setOpen(false); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  return <>
    <View style={styles.header}>
      {onBack ? <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.options}>
        <AreaIcon name="back" color={colors.text.primary} />
      </Pressable> : <Pressable ref={options} accessibilityRole="button" accessibilityLabel="Opciones de cuenta" onPress={() => { setError(false); setOpen(true); }} style={styles.options}>
        <AreaIcon name="more" color={colors.text.secondary} />
      </Pressable>}
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      {rightContent !== undefined ? <View style={styles.options}>{rightContent}</View>
        : showNotifications ? <NotificationBell /> : <View style={styles.options} />}
    </View>
    <Modal visible={open} transparent animationType="none" onRequestClose={close}
      onShow={() => { const target = findNodeHandle(heading.current); if (target) AccessibilityInfo.setAccessibilityFocus(target); }}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay.scrim }]}>
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <View accessibilityViewIsModal style={[styles.menu, { backgroundColor: colors.surface.elevated }]}>
            <Text ref={heading} accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>Tu cuenta</Text>
            <ContinueButton label="Cerrar sesión" onPress={() => void logout()} loading={busy} loadingLabel="Cerrando sesión…" />
            {error && <Text accessibilityRole="alert" style={[accountStyles.small, { color: colors.status.error }]}>No pudimos guardar el cierre de sesión. Inténtalo de nuevo.</Text>}
            <Pressable accessibilityRole="button" onPress={close} style={styles.close}><Text style={[accountStyles.body, { color: colors.action.primary }]}>Cerrar</Text></Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  header: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  options: { width: sizes.touchTarget, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl },
  overlay: { flex: 1, padding: spacing['2xl'] },
  modalScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  menu: { width: '100%', maxWidth: layout.contentMaxWidth, padding: spacing['2xl'], gap: spacing.lg, borderRadius: radii.card },
  close: { minHeight: sizes.touchTarget, justifyContent: 'center' },
});
