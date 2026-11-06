import { Redirect, router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Keyboard, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareTextInput } from '@/components/forms/keyboard-aware-form';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useDeviceAccess } from '@/context/device-access';
import { deviceAccess } from '@/services/device-access';
import { DeviceFailure } from '@/services/device-access-manager';
import { linkCodeLength, normalizeLinkCode, normalizeManualLinkCode, validLinkCode } from '@/utils/user-link';
import { ConnectionLayout, userConnectionStyles as styles } from '@/components/user/connection-layout';
import { ContinueButton } from '@/components/carer/continue-button';
import { DeviceLinkIllustration } from '@/components/carer/device-link-illustration';
import { AreaIcon } from '@/components/carer/area-icon';
import { ConnectionCalendar, ConnectionProgress } from '@/components/user/connection-progress';
import { ConnectionHelp } from '@/components/user/connection-help';
import { minimumTransition } from '@/utils/minimum-transition';
import { useAppTheme } from '@/theme/use-theme';
import { borders, layout, motion, radii, sizes, spacing, typography } from '@/theme/tokens';

type Phase = 'welcome' | 'connect' | 'scan' | 'loading' | 'invalid' | 'technical';
export default function UserConnectionScreen() {
  const state = useDeviceAccess(); const { colors } = useAppTheme();
  const [phase, setPhase] = useState<Phase>(() => state.status === 'pending' ? 'connect' : 'welcome');
  const [code, setCode] = useState(''); const [error, setError] = useState('');
  const [manualExpanded, setManualExpanded] = useState(false);
  const pending = useRef(false); const active = useRef(false);
  const attempt = useRef(0); const transition = useRef<ReturnType<typeof minimumTransition> | null>(null);
  const leave = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    try { await deviceAccess.logout(); if (active.current) router.replace('/'); }
    catch { if (active.current) setError('No pudimos cerrar la conexión de forma segura. Intenta volver nuevamente.'); }
    finally { pending.current = false; }
  }, []);
  useFocusEffect(useCallback(() => {
    active.current = true;
    setPhase(value => value === 'loading' && !pending.current ? 'connect' : value);
    return () => { active.current = false; attempt.current++; pending.current = false; transition.current?.cancel(); transition.current = null; };
  }, []));
  const backToWelcome = () => {
    if (manualExpanded) { Keyboard.dismiss(); setManualExpanded(false); return; }
    setCode(''); setPhase('welcome');
  };
  useFocusEffect(useCallback(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pending.current) return true;
      if (phase === 'welcome') { void leave(); return true; }
      if (phase === 'connect' && manualExpanded) { Keyboard.dismiss(); setManualExpanded(false); return true; }
      setPhase(phase === 'connect' ? 'welcome' : 'connect'); return true;
    });
    return () => back.remove();
  }, [phase, leave, manualExpanded]));
  async function connect(raw: string) {
    if (!active.current || pending.current) return;
    const normalized = normalizeLinkCode(raw);
    if (!validLinkCode(normalized)) { setPhase('invalid'); return; }
    const currentAttempt = ++attempt.current;
    pending.current = true; Keyboard.dismiss(); setCode(normalized); setError(''); setPhase('loading');
    const visual = minimumTransition(motion.userConnectionTransitionDuration); transition.current = visual;
    let failed = false; let failure: unknown;
    try { await deviceAccess.connect(normalized); }
    catch (error) { failed = true; failure = error; visual.cancel(); }
    if (!failed) await visual.wait;
    if (!active.current || currentAttempt !== attempt.current) return;
    transition.current = null; pending.current = false;
    if (failed) {
      if (failure instanceof DeviceFailure && failure.kind === 'canceled') { setPhase('connect'); return; }
      setError(failure instanceof DeviceFailure ? failure.message : 'No pudimos conectar tu agenda. Inténtalo de nuevo.');
      setPhase(failure instanceof DeviceFailure && failure.kind === 'invalid-code' ? 'invalid' : 'technical');
    } else { setCode(''); setPhase('connect'); }
  }
  if (phase === 'loading') return <ConnectionLayout onboarding="loading" title="Conectando tu agenda" description="Estamos preparando tus actividades"
    illustration={<ConnectionCalendar />}><ConnectionProgress /></ConnectionLayout>;
  if (state.status === 'linked' && state.stage === 'ready') return <Redirect href="/mi-agenda" />;
  if (state.status === 'linked') return <ConnectionLayout onboarding="success" title={`¡Listo, ${state.profile!.nombre}!`} description="Tu agenda ya está conectada."
    illustration={<Image source={require('@/assets/illustrations/user-happy.png')} contentFit="contain" style={local.image} accessible={false} />}>
    <View style={[local.confirmation, { backgroundColor: colors.status.successSurface }]}>
      <View style={[local.check, { backgroundColor: colors.status.success }]}><AreaIcon name="check" color={colors.surface.default} /></View>
      <Text style={[styles.copy, local.confirmationCopy, { color: colors.text.primary }]}>Tu dispositivo está conectado a tu agenda.</Text>
    </View>
    <ContinueButton label="Ir a mi agenda" onPress={() => { deviceAccess.finish(); router.replace('/mi-agenda'); }} />
  </ConnectionLayout>;
  if (phase === 'scan') return <ScanCode onCode={value => void connect(value)} onBack={() => setPhase('connect')}
    onManual={() => { setManualExpanded(true); setPhase('connect'); }} />;
  if (phase === 'invalid') return <ConnectionLayout onboarding="error" title="El código no es válido" description="Verifica que el código sea correcto e intenta nuevamente."
    onBack={() => setPhase('connect')} illustration={<Image source={require('@/assets/illustrations/sad-user.png')} style={[local.image, local.errorImage]} contentFit="contain" accessible={false} />}>
    <ContinueButton label="Intentar nuevamente" onPress={() => { setCode(''); setPhase('connect'); }} />
  </ConnectionLayout>;
  if (phase === 'technical') return <ConnectionLayout onboarding="error" title="No pudimos conectar tu agenda" onBack={() => setPhase('connect')}>
    <Text accessibilityRole="alert" style={[styles.copy, { color: colors.text.secondary }]}>{error}</Text>
    <ContinueButton label="Reintentar" onPress={() => void connect(code)} />
    <ContinueButton label="Volver" variant="secondary" onPress={() => setPhase('connect')} />
  </ConnectionLayout>;
  if (phase === 'connect') return <ConnectionLayout onboarding="connect" title="Conecta tu agenda" description="Para ver tus actividades, pídele a tu cuidador que te muestre un código QR o código de conexión."
    onBack={backToWelcome} illustration={<View style={local.illustration}><DeviceLinkIllustration /></View>}>
    <ContinueButton label="Escanear código QR" leadingIcon={<AreaIcon name="camera" color={colors.action.onPrimary} />}
      onPress={() => { setManualExpanded(false); setPhase('scan'); }} />
    <Text style={[styles.copy, { color: colors.action.primary }]}>o</Text>
    {manualExpanded ? <View style={local.manual}>
      <Text style={[styles.copy, { color: colors.text.secondary }]}>Código de conexión</Text>
      <View style={[local.codeField, { borderColor: colors.border.control, backgroundColor: colors.surface.default }]}>
        <KeyboardAwareTextInput autoFocus value={code} onChangeText={value => setCode(normalizeManualLinkCode(value))} maxLength={linkCodeLength} autoCapitalize="characters" autoCorrect={false}
          accessibilityLabel="Código de conexión" placeholder="DF-XXXXXXXXXXXXXXXX" placeholderTextColor={colors.text.disabled}
          returnKeyType="go" onSubmitEditing={() => { if (validLinkCode(code)) void connect(code); }}
          style={[local.codeInput, { color: colors.text.primary }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Conectar mi agenda" accessibilityState={{ disabled: !validLinkCode(code) }}
          disabled={!validLinkCode(code)} onPress={() => void connect(code)} style={[local.send, { backgroundColor: validLinkCode(code) ? colors.action.primary : colors.action.disabled }]}>
          <AreaIcon name="send" color={validLinkCode(code) ? colors.action.onPrimary : colors.text.disabled} />
        </Pressable>
      </View>
    </View> : <ContinueButton label="Ingresar código" variant="secondary" leadingIcon={<AreaIcon name="keyboard" color={colors.action.primary} />}
      onPress={() => setManualExpanded(true)} />}
    <ConnectionHelp />
  </ConnectionLayout>;
  return <ConnectionLayout onboarding="welcome" title={<>¡Bienvenido a{ '\n' }<Text style={{ color: colors.action.primary }}>DiaFacil</Text>!</>} description="Tu agenda visual para un día más fácil."
    onBack={() => void leave()} illustration={<Image source={require('@/assets/illustrations/user-account.png')} style={local.image} contentFit="contain" accessible={false} />}>
    {error ? <Text accessibilityRole="alert" style={[styles.copy, { color: colors.text.secondary }]}>{error}</Text> : null}
    <ContinueButton label="Comenzar" onPress={() => setPhase('connect')} />
  </ConnectionLayout>;
}
function ScanCode({ onCode, onBack, onManual }: { onCode(code: string): void; onBack(): void; onManual(): void }) {
  const [permission, requestPermission] = useCameraPermissions(); const focused = useIsFocused();
  const requested = useRef(false);
  const accepting = useRef(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active'); const scanned = useRef(false);
  const { colors } = useAppTheme();
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !requested.current) {
      requested.current = true; void requestPermission().catch(() => undefined);
    }
  }, [permission, requestPermission]);
  useFocusEffect(useCallback(() => {
    let active = true;
    accepting.current = AppState.currentState === 'active';
    const listener = AppState.addEventListener('change', state => { if (active) {
      accepting.current = state === 'active'; setForeground(accepting.current);
    } });
    return () => { active = false; accepting.current = false; listener.remove(); };
  }, []));
  return <ConnectionLayout title="Escanear código QR" description="Apunta la cámara al QR que te muestra tu cuidador." onBack={onBack}>
    {permission?.granted ? focused && foreground && <CameraView style={local.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onMountError={() => { if (accepting.current) onManual(); }} onBarcodeScanned={({ data }) => {
        if (accepting.current && !scanned.current) { scanned.current = true; onCode(data); }
      }} />
      : <>
        <Text style={[styles.copy, { color: colors.text.secondary }]}>Necesitamos permiso para usar la cámara. También puedes ingresar el código.</Text>
        <ContinueButton label={permission?.canAskAgain === false ? 'Abrir ajustes' : 'Permitir cámara'} onPress={() => {
          if (permission?.canAskAgain === false) void Linking.openSettings().catch(() => undefined); else void requestPermission();
        }} />
      </>}
    <ContinueButton label="Ingresar código" variant="secondary" onPress={onManual} />
  </ConnectionLayout>;
}
const local = StyleSheet.create({
  illustration: { width: '100%', maxWidth: layout.welcome.illustrationWidth, aspectRatio: 240 / 150 },
  image: { width: '100%', maxWidth: layout.welcome.illustrationWidth, aspectRatio: layout.userOnboarding.illustrationRatio, alignSelf: 'center' },
  errorImage: { maxWidth: layout.userOnboarding.errorIllustrationWidth },
  camera: { width: '100%', aspectRatio: 1 },
  manual: { gap: spacing.sm },
  codeField: { borderWidth: borders.default, borderRadius: radii.control, flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.sm },
  codeInput: { flex: 1, minWidth: 0, minHeight: sizes.touchTarget, fontFamily: typography.family.semibold, fontSize: typography.size.md, paddingHorizontal: spacing.sm },
  send: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center' },
  confirmation: { borderRadius: radii.control, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  check: { width: sizes.touchTarget - spacing.md, height: sizes.touchTarget - spacing.md, borderRadius: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  confirmationCopy: { flex: 1, textAlign: 'left', fontFamily: typography.family.semibold },
});
