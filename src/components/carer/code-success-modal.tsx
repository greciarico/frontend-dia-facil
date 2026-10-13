import { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { layout, radii, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { CodeEnvelope } from './code-envelope';
import { ContinueButton } from './continue-button';

export function CodeSuccessModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useAppTheme();
  const title = useRef<Text>(null);
  useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility('¡Código verificado! Tu correo ha sido verificado correctamente.');
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}
      onShow={() => { const target = findNodeHandle(title.current); if (target) AccessibilityInfo.setAccessibilityFocus(target); }}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay.scrim }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
            <Svg width="100%" height={sizes.touchTarget} viewBox="0 0 240 48" accessible={false}>
              <Path d="m40 10 5 7m28-13 3 8m92-4-4 9m26-5-5 5M99 8l-3 6m49 8 4 5" stroke={colors.action.primary} strokeWidth={sizes.stroke} />
              <Circle cx="58" cy="30" r="3" fill={colors.status.success} />
              <Circle cx="178" cy="32" r="3" fill={colors.action.primary} />
            </Svg>
            <CodeEnvelope />
            <Text ref={title} accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>¡Código verificado!</Text>
            <Text style={[accountStyles.body, { color: colors.text.secondary }]}>Tu correo ha sido verificado correctamente.</Text>
            <View style={styles.action}><ContinueButton label="Entendido" onPress={onClose} /></View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, padding: spacing['2xl'] },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing['2xl'] },
  card: { width: '100%', maxWidth: layout.contentMaxWidth, borderRadius: radii.card,
    padding: spacing['2xl'], alignItems: 'center', gap: spacing.lg },
  action: { alignSelf: 'stretch' },
});
