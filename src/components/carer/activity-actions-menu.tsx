import { useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/app-text';
import { AreaIcon } from './area-icon';
import { borders, radii, shadows, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export type ActivityMenuAnchor = { x: number; y: number; width: number; height: number; trigger: View };
const pointerHeight = spacing.md / 2;
const pointerWidth = spacing.md;

export function ActivityActionsMenu({ anchor, onClose, onEdit }: {
  anchor: ActivityMenuAnchor; onClose: () => void; onEdit: () => void;
}) {
  const { colors } = useAppTheme();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const action = useRef<View>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number }>();
  const [contentHeight, setContentHeight] = useState<number>(sizes.touchTarget);
  const viewportWidth = viewport?.width ?? window.width;
  const viewportHeight = viewport?.height ?? window.height;
  const rightEdge = Math.min(anchor.x + anchor.width, viewportWidth - insets.right - spacing.sm);
  const maxWidth = Math.min(216, Math.max(0, rightEdge - insets.left - spacing.sm));
  const pointerRight = rightEdge - (anchor.x + anchor.width / 2) - pointerWidth / 2;
  const topEdge = insets.top + spacing.sm;
  const bottomEdge = viewportHeight - insets.bottom - spacing.sm;
  const below = Math.max(topEdge + pointerHeight, anchor.y + anchor.height);
  const above = Math.min(bottomEdge - pointerHeight, anchor.y);
  const roomBelow = Math.max(0, bottomEdge - below);
  const roomAbove = Math.max(0, above - topEdge);
  const placeBelow = contentHeight <= roomBelow || roomBelow >= roomAbove;
  const maxHeight = placeBelow ? roomBelow : roomAbove;
  const top = placeBelow ? below : above - Math.min(contentHeight, maxHeight);
  function close() {
    onClose();
    requestAnimationFrame(() => {
      const target = findNodeHandle(anchor.trigger);
      if (target) AccessibilityInfo.setAccessibilityFocus(target);
    });
  }
  // Use the same window inset behavior as the measured trigger on Android.
  return <Modal visible transparent onRequestClose={close}
    onShow={() => { const target = findNodeHandle(action.current); if (target) AccessibilityInfo.setAccessibilityFocus(target); }}>
    <View style={styles.viewport} onLayout={({ nativeEvent: { layout: { width, height } } }) => setViewport({ width, height })}>
      <Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={close} />
      <View accessibilityViewIsModal onAccessibilityEscape={close}
        style={[styles.menu, { right: viewportWidth - rightEdge, top, maxWidth, maxHeight,
          backgroundColor: colors.surface.default, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
        <ScrollView bounces={false} onContentSizeChange={(_width, height) => setContentHeight(height)}>
          <Pressable ref={action} accessibilityRole="button" onPress={onEdit} style={styles.item}>
            <AreaIcon name="pencil" color={colors.action.primary} />
            <AppText style={{ color: colors.text.primary, flexShrink: 1 }}>Editar actividad</AppText>
          </Pressable>
        </ScrollView>
        <Svg width={pointerWidth} height={pointerHeight + borders.default} viewBox="0 0 12 7"
          accessible={false} pointerEvents="none" style={[styles.pointer, { right: pointerRight,
            ...(placeBelow ? { top: -pointerHeight } : { bottom: -pointerHeight, transform: [{ rotate: '180deg' }] }) }]}>
          <Path d="M0 7 6 1 12 7Z" fill={colors.surface.default} />
          <Path d="M0 7 6 1 12 7" stroke={colors.border.decorative} fill="none" />
        </Svg>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  menu: { position: 'absolute', borderWidth: borders.default, borderRadius: radii.control, elevation: shadows.card.elevation,
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowRadius: shadows.card.radius, shadowOpacity: shadows.card.opacity },
  item: { minHeight: sizes.touchTarget, padding: spacing.md, alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  pointer: { position: 'absolute' },
});
