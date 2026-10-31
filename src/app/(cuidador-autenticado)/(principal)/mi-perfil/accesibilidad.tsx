import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { TextSizeSelector } from '@/components/accessibility/text-size-selector';
import { AreaIcon } from '@/components/carer/area-icon';
import { ActivityDialog } from '@/components/carer/activity-dialog';
import { StepDialogActions } from '@/components/carer/step-dialog-actions';
import { useCarerAccessibility } from '@/context/carer-accessibility';
import { useAppTheme } from '@/theme/use-theme';
import { layout, radii, shadows, sizes, spacing, typography } from '@/theme/tokens';

export default function AccountAccessibilityScreen() {
  const { state, editor } = useCarerAccessibility(), { colors } = useAppTheme();
  const [confirm, setConfirm] = useState(false);
  const value = state.value, disabled = state.busy || state.uncertain;
  if (!value) return null; // The account provider owns initial loading and recovery.
  const card = [styles.card, { backgroundColor: colors.surface.elevated, borderColor: colors.border.decorative, shadowColor: colors.shadow }];
  return <ScrollView contentContainerStyle={styles.page}>
    <AppText style={[styles.copy, styles.intro, { color: colors.text.secondary }]}>Ajusta la apariencia de la app para que te sea más cómoda de usar.</AppText>
    <View style={card}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.welcome.iconSurface }]}><AreaIcon name="textSize" color={colors.action.primary} /></View>
        <View style={styles.text}><AppText style={[styles.label, { color: colors.text.primary }]}>Tamaño del texto</AppText>
          <AppText style={[styles.small, { color: colors.text.secondary }]}>Ajusta el tamaño de las letras.</AppText></View>
      </View>
      <TextSizeSelector value={value.tamanoTexto} disabled={disabled} onChange={tamanoTexto => void editor.change({ tamanoTexto })} />
    </View>
    <View style={[card, styles.row]}>
      <View style={[styles.icon, { backgroundColor: colors.welcome.iconSurface }]}><AreaIcon name="contrast" color={colors.action.primary} /></View>
      <View style={styles.text}><AppText style={[styles.label, { color: colors.text.primary }]}>Alto contraste</AppText>
        <AppText style={[styles.small, { color: colors.text.secondary }]}>Mejora la visibilidad de los elementos.</AppText></View>
      <View pointerEvents={state.busy ? 'none' : 'auto'} style={styles.switchTarget}>
        <Switch accessibilityLabel="Alto contraste" accessibilityState={{ disabled, busy: state.busy }} disabled={state.uncertain} value={value.altoContraste}
          trackColor={{ true: colors.switch.on, false: colors.switch.off }} thumbColor={colors.switch.thumb} ios_backgroundColor={colors.switch.off}
          onValueChange={altoContraste => { if (!disabled) void editor.change({ altoContraste }); }} />
      </View>
    </View>
    <Pressable style={[card, styles.row]} accessibilityRole="button" accessibilityLabel="Restablecer ajustes" accessibilityState={{ disabled }} disabled={disabled} onPress={() => setConfirm(true)}>
      <View style={[styles.icon, { backgroundColor: colors.welcome.iconSurface }]}><AreaIcon name="refresh" color={colors.action.primary} /></View>
      <View style={styles.text}><AppText style={[styles.label, { color: colors.text.primary }]}>Restablecer ajustes</AppText>
        <AppText style={[styles.small, { color: colors.text.secondary }]}>Volver a la configuración predeterminada.</AppText></View>
      <AreaIcon name="chevron" color={colors.text.secondary} size={sizes.iconSmall} />
    </Pressable>
    <View style={styles.saveStatus} accessibilityLiveRegion="polite" accessibilityState={{ busy: state.busy }}>
      <AppText style={[styles.small, { color: colors.text.secondary }]}>{state.busy ? 'Guardando ajustes…' : 'Los cambios se guardan automáticamente.'}</AppText>
    </View>
    {confirm && <ActivityDialog title="¿Restablecer tus ajustes?" description="El tamaño del texto volverá a Mediano y el alto contraste se desactivará."
      centered compact showClose respectSafeArea onClose={() => setConfirm(false)}>
      <StepDialogActions label="Restablecer" disabled={disabled} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); void editor.reset(); }} />
    </ActivityDialog>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.xl, gap: spacing.lg },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  intro: { textAlign: 'center', marginBottom: spacing.lg },
  label: { fontFamily: typography.family.semibold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  small: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
  text: { flex: 1, gap: spacing.xs }, row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.lg, gap: spacing.md, shadowOffset: { width: 0, height: shadows.card.offsetY },
    shadowOpacity: shadows.card.opacity, shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  switchTarget: { minHeight: sizes.touchTarget, minWidth: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  saveStatus: { minHeight: sizes.touchTarget, justifyContent: 'center' },
});
