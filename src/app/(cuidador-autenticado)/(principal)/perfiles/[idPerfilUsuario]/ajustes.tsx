import { AppText as Text } from '@/components/app-text';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { TextSizeSelector } from '@/components/accessibility/text-size-selector';
import { useProfileDetail } from '@/hooks/use-profile-detail';
import { useAccessibilityEditor } from '@/hooks/use-accessibility-editor';
import { ProfileAvatar } from '@/components/carer/profile-avatar';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { ActivityDialog } from '@/components/carer/activity-dialog';
import { StepDialogActions } from '@/components/carer/step-dialog-actions';
import { validProfileId } from '@/utils/profile-navigation';
import { layout, radii, shadows, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export default function ProfileSettings() {
  const params = useLocalSearchParams<{ idPerfilUsuario?: string }>(), id = validProfileId(params.idPerfilUsuario);
  const profile = useProfileDetail(id), { state, editor } = useAccessibilityEditor(id);
  const { colors } = useAppTheme(), [confirm, setConfirm] = useState(false);
  const disabled = state.busy || state.uncertain, preferences = state.value;
  return <ScrollView contentContainerStyle={styles.page}>
    {profile.state.status === 'ready' && <View style={styles.profile}>
      <ProfileAvatar name={profile.state.profile.nombre} avatar={profile.state.profile.avatar} />
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{profile.state.profile.nombre}</Text>
      <Text style={[styles.copy, styles.centered, { color: colors.text.secondary }]}>Personaliza la app para que sea más fácil de usar.</Text>
    </View>}
    {profile.state.status === 'error' && <View style={styles.feedback}>
      <Text accessibilityRole="alert" style={[styles.copy, { color: colors.text.primary }]}>No pudimos cargar los datos del perfil.</Text>
      <ContinueButton label="Reintentar perfil" variant="secondary" onPress={() => void profile.reload()} />
    </View>}
    {state.status === 'loading' && <ActivityIndicator accessibilityLabel="Cargando ajustes" color={colors.action.primary} />}
    {state.status === 'not-found' && <Text accessibilityRole="alert" style={[styles.copy, { color: colors.text.primary }]}>No pudimos encontrar este perfil.</Text>}
    {!!state.message && <View style={styles.feedback}>
      <Text accessibilityRole="alert" style={[styles.copy, { color: colors.text.primary }]}>{state.message}</Text>
      <ContinueButton label="Consultar ajustes" variant="secondary" disabled={state.busy} onPress={() => void editor.load()} />
    </View>}
    {state.status === 'ready' && preferences && <>
      <Text accessibilityRole="header" style={[styles.label, { color: colors.action.primary }]}>Accesibilidad</Text>
      <View style={[styles.card, { backgroundColor: colors.surface.elevated, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
        <View style={styles.heading}>
          <View style={[styles.icon, { backgroundColor: colors.welcome.intro }]}><AreaIcon name="textSize" color={colors.action.primary} /></View>
          <View style={styles.flexText}><Text style={[styles.label, { color: colors.text.primary }]}>Tamaño del texto</Text>
            <Text style={[styles.small, { color: colors.text.secondary }]}>Ajusta el tamaño de las letras.</Text></View>
        </View>
        <TextSizeSelector value={preferences.tamanoTexto} disabled={disabled} onChange={tamanoTexto => void editor.change({ tamanoTexto })} />
      </View>
      <View style={[styles.card, styles.setting, { backgroundColor: colors.surface.elevated, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
        <View style={[styles.icon, { backgroundColor: colors.welcome.intro }]}><AreaIcon name="contrast" color={colors.action.primary} /></View>
        <View style={styles.flexText}><Text style={[styles.label, { color: colors.text.primary }]}>Alto contraste</Text>
          <Text style={[styles.small, { color: colors.text.secondary }]}>Mejora la visibilidad de los elementos.</Text></View>
          <View pointerEvents={state.busy ? 'none' : 'auto'} style={styles.switchTarget}>
            <Switch accessibilityLabel="Alto contraste" accessibilityState={{ disabled, busy: state.busy }} disabled={state.uncertain} value={preferences.altoContraste}
              trackColor={{ true: colors.switch.on, false: colors.switch.off }} thumbColor={colors.switch.thumb} ios_backgroundColor={colors.switch.off}
              onValueChange={value => { if (!disabled) void editor.change({ altoContraste: value }); }} />
          </View>
      </View>
      <View style={[styles.card, styles.setting, { backgroundColor: colors.surface.elevated, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
        <View style={[styles.icon, { backgroundColor: colors.welcome.intro }]}><AreaIcon name="audio" color={colors.action.primary} /></View>
        <View style={styles.flexText}><Text style={[styles.label, { color: colors.text.primary }]}>Lectura de voz</Text>
          <Text style={[styles.small, { color: colors.text.secondary }]}>Permite escuchar los pasos al tocar el botón de voz.</Text></View>
          <View pointerEvents={state.busy ? 'none' : 'auto'} style={styles.switchTarget}>
            <Switch accessibilityLabel="Lectura de voz" accessibilityState={{ disabled, busy: state.busy }} disabled={state.uncertain} value={preferences.lecturaVoz}
              trackColor={{ true: colors.switch.on, false: colors.switch.off }} thumbColor={colors.switch.thumb} ios_backgroundColor={colors.switch.off}
              onValueChange={value => { if (!disabled) void editor.change({ lecturaVoz: value }); }} />
          </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Restablecer ajustes" accessibilityState={{ disabled }} disabled={disabled} onPress={() => setConfirm(true)}
        style={[styles.card, styles.setting, { backgroundColor: colors.surface.elevated, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
        <View style={[styles.icon, { backgroundColor: colors.welcome.intro }]}><AreaIcon name="refresh" color={colors.action.primary} /></View>
        <View style={styles.flexText}><Text style={[styles.label, { color: colors.text.primary }]}>Restablecer ajustes</Text>
          <Text style={[styles.small, { color: colors.text.secondary }]}>Volver a la configuración predeterminada.</Text></View>
        <AreaIcon name="chevron" color={colors.text.secondary} size={sizes.iconSmall} />
      </Pressable>
      <View style={styles.saveStatus} accessibilityLiveRegion="polite" accessibilityLabel={state.busy ? 'Guardando ajustes' : undefined} accessibilityState={{ busy: state.busy }}>
        <Text style={[styles.small, { color: colors.text.secondary }]}>{state.busy ? 'Guardando ajustes…' : 'Los cambios se guardan automáticamente.'}</Text>
      </View>
    </>}
    {confirm && <ActivityDialog title="¿Restablecer los ajustes?" description="El tamaño del texto volverá a Mediano, el alto contraste se desactivará y la lectura de voz se activará."
      centered compact showClose respectSafeArea onClose={() => setConfirm(false)}>
      <StepDialogActions label="Restablecer" onCancel={() => setConfirm(false)} disabled={disabled}
        onConfirm={() => { setConfirm(false); void editor.reset(); }} />
    </ActivityDialog>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.xl, gap: spacing.xl },
  profile: { alignItems: 'center', gap: spacing.sm }, feedback: { gap: spacing.md },
  title: { fontFamily: typography.family.bold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg },
  label: { fontFamily: typography.family.semibold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  small: { fontFamily: typography.family.regular, fontSize: typography.size.xs, lineHeight: typography.lineHeight.xs }, centered: { textAlign: 'center' },
  icon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: radii.card, borderWidth: 1, shadowOffset: { width: 0, height: shadows.card.offsetY },
    shadowOpacity: shadows.card.opacity, shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switchTarget: { minHeight: sizes.touchTarget, minWidth: sizes.touchTarget, justifyContent: 'center', alignItems: 'center' },
  saveStatus: { minHeight: sizes.touchTarget, justifyContent: 'center' },
  setting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, flexText: { flex: 1 },
});
