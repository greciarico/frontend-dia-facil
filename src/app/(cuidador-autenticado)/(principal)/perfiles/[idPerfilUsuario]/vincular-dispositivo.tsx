import { Stack, router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { accountStyles } from '@/components/carer/account-layout';
import { ActivityDialog } from '@/components/carer/activity-dialog';
import { AreaHeader } from '@/components/carer/area-header';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { DeviceLinkIllustration } from '@/components/carer/device-link-illustration';
import { StepDialogActions } from '@/components/carer/step-dialog-actions';
import type { DeviceLink } from '@/services/device-link';
import { useDeviceLink } from '@/hooks/use-device-link';
import { colors as palette, borders, layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { profileHref, validProfileId } from '@/utils/profile-navigation';

export default function DeviceLinkScreen() {
  const { idPerfilUsuario } = useLocalSearchParams<{ idPerfilUsuario?: string }>();
  const isFocused = useIsFocused();
  const id = validProfileId(idPerfilUsuario);
  const { state, reload, renew } = useDeviceLink(id);
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const [confirm, setConfirm] = useState<DeviceLink>();
  const [copyFeedback, setCopyFeedback] = useState<{ code: string; message: string }>();
  const [copying, setCopying] = useState(false);
  const focused = useRef(false);
  const focusGeneration = useRef(0);
  const copyPending = useRef<symbol | null>(null);
  const currentCode = useRef<string | undefined>(undefined);
  const data = state.status === 'ready' ? state.data : undefined;
  const cooldown = state.status === 'ready' ? state.remainingSeconds : 0;
  useEffect(() => { currentCode.current = data?.codigoVinculacion; }, [data?.codigoVinculacion]);
  const back = useCallback(() => router.dismissTo(id ? profileHref(id) : '/perfiles'), [id]);
  useFocusEffect(useCallback(() => {
    focused.current = true; focusGeneration.current++;
    setConfirm(undefined); setCopying(false);
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => { focused.current = false; focusGeneration.current++; copyPending.current = null; subscription.remove(); };
  }, [back]));
  async function copy() {
    if (!data || copyPending.current) return;
    const code = data.codigoVinculacion;
    const generation = focusGeneration.current;
    const operation = Symbol('copy');
    const current = () => focused.current && focusGeneration.current === generation && currentCode.current === code;
    copyPending.current = operation; setCopying(true);
    try {
      const copied = await Clipboard.setStringAsync(code);
      if (current()) setCopyFeedback({ code, message: copied ? 'Código copiado.' : 'No pudimos copiar el código.' });
    } catch {
      if (current()) setCopyFeedback({ code, message: 'No pudimos copiar el código. Puedes escribirlo manualmente.' });
    } finally {
      if (copyPending.current === operation) {
        copyPending.current = null;
        if (focused.current && focusGeneration.current === generation) setCopying(false);
      }
    }
  }
  const qrSize = Math.max(sizes.touchTarget, Math.min(layout.deviceLink.qrSize,
    width - spacing['2xl'] * 2 - spacing.lg * 2 - layout.deviceLink.quietZone * 2));
  return <>
    <Stack.Screen options={{ title: 'Vincular dispositivo', header: () => <AreaHeader title="Vincular dispositivo"
      showNotifications={false} backLabel="Volver al perfil" onBack={back} /> }} />
    {data ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.illustration}><DeviceLinkIllustration /></View>
      <Text style={[accountStyles.body, styles.centered, { color: colors.text.secondary }]}>
        Escanea el QR o escribe este código desde la app del dispositivo que usará <Text style={{ color: colors.action.primary, fontFamily: typography.family.bold }}>{data.nombrePerfil}</Text>.
      </Text>
      <View accessible accessibilityLabel="Código QR de vinculación. También puedes copiar o escribir el código que aparece debajo."
        style={[styles.qr, { borderColor: colors.border.decorative, backgroundColor: palette.background.primary }]}>
        <QRCode value={data.codigoVinculacion} size={qrSize} quietZone={layout.deviceLink.quietZone}
          color={palette.text.primary} backgroundColor={palette.background.primary} />
      </View>
      <View style={[styles.codeRow, { backgroundColor: colors.background.purple }]}>
        <Text selectable style={[styles.code, { color: colors.action.primary }]}>{data.codigoVinculacion}</Text>
        <Pressable onPress={() => void copy()} disabled={copying} accessibilityRole="button" accessibilityLabel="Copiar código de vinculación"
          accessibilityState={{ disabled: copying, busy: copying }} style={styles.iconButton}>
          <AreaIcon name="copy" color={colors.action.primary} />
        </Pressable>
      </View>
      {copyFeedback?.code === data.codigoVinculacion && <Text accessibilityLiveRegion="polite" style={[accountStyles.small, styles.centered, { color: colors.text.secondary }]}>{copyFeedback.message}</Text>}
      {state.status === 'ready' && !!state.notice && <Text accessibilityLiveRegion="polite" style={[accountStyles.small, styles.centered, { color: colors.text.secondary }]}>{state.notice}</Text>}
      <View accessible accessibilityRole="button" accessibilityLabel={`Dispositivos vinculados (${data.dispositivosActivos})`}
        accessibilityState={{ disabled: true }} accessibilityHint="Disponible próximamente."
        style={[styles.action, { borderColor: colors.border.decorative, backgroundColor: colors.surface.default }]}>
        <AreaIcon name="shield" color={colors.action.primary} />
        <Text style={[styles.actionText, { color: colors.action.primary }]}>Dispositivos vinculados ({data.dispositivosActivos})</Text>
        <AreaIcon name="chevron" color={colors.text.disabled} />
      </View>
      <Pressable onPress={() => setConfirm(data)} disabled={cooldown > 0} accessibilityRole="button" accessibilityLabel="Renovar código de vinculación"
        accessibilityState={{ disabled: cooldown > 0 }} accessibilityHint={cooldown > 0 ? `Renovar nuevamente en ${cooldown} s` : undefined}
        style={[styles.action, { borderColor: colors.border.decorative, backgroundColor: colors.profiles.information }]}>
        <AreaIcon name="refresh" color={colors.action.primary} />
        <View style={styles.renewalCopy}><Text style={[accountStyles.body, styles.renewalTitle, { color: colors.text.primary }]}>Renovar código de vinculación</Text>
          <Text style={[accountStyles.small, { color: colors.text.secondary }]}>Úsalo solo si crees que alguien más conoce el código actual.</Text>
          {cooldown > 0 && <Text style={[accountStyles.small, { color: colors.action.primary }]}>Renovar nuevamente en {cooldown} s</Text>}
        </View>
      </Pressable>
    </ScrollView> : <View style={styles.feedback}>
      {state.status === 'loading' || state.status === 'renewing' ? <>
        <ActivityIndicator color={colors.action.primary} accessibilityLabel={state.status === 'renewing' ? 'Renovando código' : 'Cargando código'} />
        <Text accessibilityLiveRegion="polite" style={[accountStyles.body, styles.centered, { color: colors.text.secondary }]}>
          {state.status === 'renewing' ? 'Renovando código…' : 'Consultando código…'}</Text>
      </> : <>
        <Text accessibilityRole="alert" style={[accountStyles.body, styles.centered, { color: colors.text.secondary }]}>
          {state.status === 'not-found' ? 'Este perfil no está disponible.' : 'No pudimos consultar el código actual. Revisa tu conexión e inténtalo de nuevo.'}</Text>
        {state.status === 'error' && <ContinueButton label="Reintentar" onPress={() => void reload()} />}
        <ContinueButton label="Volver al perfil" onPress={back} />
      </>}
    </View>}
    {isFocused && data && confirm === data && cooldown === 0 && <ActivityDialog
      title={<Text style={styles.renewalQuestion}>¿Estás seguro de que quieres <Text style={{ color: colors.destructive.default }}>renovar</Text> el código?</Text>}
      centered compact showClose onClose={() => setConfirm(undefined)}
      decoration={<View accessible={false} importantForAccessibility="no-hide-descendants"
        style={[styles.renewalCircle, { backgroundColor: colors.destructive.surface }]}>
        <AreaIcon name="refresh" color={colors.destructive.default} size={sizes.touchTarget} />
      </View>}
      description="El código anterior dejará de servir para vincular nuevos dispositivos. Los dispositivos ya vinculados seguirán funcionando.">
      <StepDialogActions label="Sí, renovar" secondaryVariant="destructive-outline" onCancel={() => setConfirm(undefined)} onConfirm={() => {
        setConfirm(undefined); void renew(data.codigoVinculacion);
      }} />
    </ActivityDialog>}
  </>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center',
    padding: spacing['2xl'], gap: spacing.lg },
  illustration: { width: layout.deviceLink.illustrationWidth, height: layout.deviceLink.illustrationHeight, alignSelf: 'center', maxWidth: '100%' },
  centered: { textAlign: 'center' },
  qr: { alignSelf: 'center', borderWidth: borders.selected, borderRadius: radii.control, padding: spacing.sm, overflow: 'hidden' },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingLeft: spacing.lg, borderRadius: radii.control, alignSelf: 'center', maxWidth: '100%' },
  code: { flexShrink: 1, fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  iconButton: { minWidth: sizes.touchTarget, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  action: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, alignItems: 'center',
    minHeight: sizes.touchTarget, borderWidth: borders.default, borderRadius: radii.control },
  actionText: { flex: 1, fontFamily: typography.family.medium, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  renewalCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  renewalTitle: { textAlign: 'left' },
  renewalQuestion: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl },
  renewalCircle: { width: sizes.touchTarget + spacing['3xl'], height: sizes.touchTarget + spacing['3xl'], borderRadius: sizes.touchTarget,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  feedback: { flex: 1, justifyContent: 'center', padding: spacing['2xl'], gap: spacing.lg },
});
