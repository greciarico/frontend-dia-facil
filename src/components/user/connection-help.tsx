import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { ActivityDialog } from '@/components/carer/activity-dialog';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

/** Contextual help owns no connection/form state and has no transport or navigation dependency. */
export function ConnectionHelp() {
  const { colors } = useAppTheme(); const focused = useIsFocused();
  const [open, setOpen] = useState(false); const trigger = useRef<View>(null);
  const active = useRef(false); const restoreFocus = useRef(false); const frame = useRef<number | null>(null);
  useFocusEffect(useCallback(() => {
    active.current = true; setOpen(false);
    return () => { active.current = false; if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  }, []));
  useEffect(() => {
    if (open || !restoreFocus.current) return;
    restoreFocus.current = false;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (!active.current) return;
      const target = findNodeHandle(trigger.current);
      if (target) AccessibilityInfo.setAccessibilityFocus(target);
    });
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  }, [open]);
  const close = () => { restoreFocus.current = true; setOpen(false); };
  const choices = [
    { title: 'Escanear QR', description: 'Apunta la cámara al código QR.', icon: 'camera' as const },
    { title: 'Ingresar código', description: 'Escribe el código que aparece debajo del QR.', icon: 'keyboard' as const },
  ];
  return <>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel="¿Necesitas ayuda?" accessibilityState={{ expanded: open }}
      onPress={() => { Keyboard.dismiss(); setOpen(true); }} style={styles.trigger}>
      <AreaIcon name="help" color={colors.action.primary} />
      <Text style={[styles.triggerText, { color: colors.action.primary }]}>¿Necesitas ayuda?</Text>
    </Pressable>
    {open && focused && <ActivityDialog title="¿Necesitas ayuda para conectar tu agenda?"
      description="Pídele a tu cuidador que abra tu perfil y te muestre tu código de conexión."
      onClose={close} showClose closeLabel="Cerrar ayuda" respectSafeArea>
      {choices.map(choice => <View key={choice.icon} accessible accessibilityLabel={`${choice.title}. ${choice.description}`}
        style={styles.choice}>
        <AreaIcon name={choice.icon} color={colors.action.primary} />
        <View style={styles.copy}>
          <Text style={[styles.choiceTitle, { color: colors.text.primary }]}>{choice.title}</Text>
          <Text style={[styles.description, { color: colors.text.secondary }]}>{choice.description}</Text>
        </View>
      </View>)}
      <ContinueButton size="modal" label="Entendido" onPress={close} />
    </ActivityDialog>}
  </>;
}
const styles = StyleSheet.create({
  trigger: { minHeight: sizes.touchTarget, padding: spacing.sm, paddingTop: spacing['4xl'], flexDirection: 'row',
    gap: spacing.sm, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  triggerText: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
  choice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.lg },
  copy: { flex: 1, gap: spacing.xs },
  choiceTitle: { fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  description: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
});
