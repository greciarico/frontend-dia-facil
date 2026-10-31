import { AppText as Text } from '@/components/app-text';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { AreaIcon } from './area-icon';

export function ActivityDialog({ title, onClose, children, description, centered = false, decoration, showClose = false, avoidKeyboard = false, compact = false, respectSafeArea = false, closeLabel = 'Cancelar y cerrar diálogo' }: {
  title: ReactNode; onClose: () => void; children: ReactNode; description?: string; closeLabel?: string;
  centered?: boolean; decoration?: ReactNode; showClose?: boolean; avoidKeyboard?: boolean; compact?: boolean;
  respectSafeArea?: boolean;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const heading = useRef<import('react-native').Text>(null);
  const content = <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
    <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[styles.card, compact && styles.compact, { backgroundColor: colors.surface.elevated }]}>
      {showClose && <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose}
        style={({ pressed }) => [styles.close, { backgroundColor: pressed ? colors.welcome.intro : 'transparent' }]}>
        <AreaIcon name="close" color={colors.text.primary} size={sizes.iconSmall} />
      </Pressable>}
      {decoration}
      <Text ref={heading} accessible accessibilityRole="header"
        style={[accountStyles.title, (showClose || centered) && styles.stepTitle,
          showClose && !centered && styles.withClose, centered && styles.centered, { color: colors.text.primary }]}>{title}</Text>
      {description && <Text style={[accountStyles.small, centered && styles.centered, { color: colors.text.secondary }]}>{description}</Text>}
      {children}
    </View>
  </ScrollView>;
  return <Modal visible transparent animationType="none" onRequestClose={onClose}
    onShow={() => { const target = findNodeHandle(heading.current); if (target) AccessibilityInfo.setAccessibilityFocus(target); }}>
    <View style={[styles.overlay, { backgroundColor: colors.overlay.scrim }, respectSafeArea && {
      paddingTop: Math.max(spacing['2xl'], insets.top), paddingBottom: Math.max(spacing['2xl'], insets.bottom),
      paddingLeft: Math.max(spacing['2xl'], insets.left), paddingRight: Math.max(spacing['2xl'], insets.right),
    }]}>
      {avoidKeyboard ? <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>{content}</KeyboardAvoidingView> : content}
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, padding: spacing['2xl'] },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing['2xl'] },
  card: { width: '100%', maxWidth: layout.contentMaxWidth, padding: spacing['2xl'], borderRadius: radii.card, gap: spacing.lg },
  keyboard: { flex: 1, width: '100%' },
  compact: { paddingVertical: spacing.lg, gap: spacing.md },
  close: { position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 1,
    width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center' },
  withClose: { paddingRight: sizes.touchTarget },
  stepTitle: { fontFamily: typography.family.bold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg },
  centered: { textAlign: 'center' },
});
