import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountLayout, accountStyles } from '@/components/carer/account-layout';
import { CodeEnvelope } from '@/components/carer/code-envelope';
import { CodeSuccessModal } from '@/components/carer/code-success-modal';
import { ContinueButton } from '@/components/carer/continue-button';
import { OtpInput } from '@/components/carer/otp-input';
import { useCarerRegistration } from '@/context/carer-registration';
import { useSession } from '@/context/session';
import { CodeRequestError, requestCarerCode, verifyCarerCode, type VerifiedCode } from '@/services/carer-auth';
import { radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { emptyOtp, remainingSeconds, resendLabel } from '@/utils/carer-otp';

export default function CarerCodeScreen() {
  const { email, resendAt } = useLocalSearchParams<{ email?: string; resendAt?: string }>();
  // Presence only: Step 1 and the backend already accepted this address.
  if (typeof email !== 'string' || !email.trim()) return <Redirect href="/cuidador/paso-1" />;
  const deadline = typeof resendAt === 'string' && resendAt.trim() ? Number(resendAt) : undefined;
  return <CodeScreen email={email} initialDeadline={deadline !== undefined && Number.isFinite(deadline) && deadline > 0 ? deadline : undefined} />;
}

function CodeScreen({ email, initialDeadline }: { email: string; initialDeadline?: number }) {
  const { colors } = useAppTheme();
  const registration = useCarerRegistration();
  const session = useSession();
  const [digits, setDigits] = useState(emptyOtp);
  const [operation, setOperation] = useState<'verify' | 'resend' | null>(null);
  const [phase, setPhase] = useState<'input' | 'animating' | 'confirmed'>('input');
  const [modal, setModal] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<CodeRequestError>();
  const [codeBlocked, setCodeBlocked] = useState(false);
  const [accountBlocked, setAccountBlocked] = useState(false);
  const [resendBlocked, setResendBlocked] = useState(false);
  const [seconds, setSeconds] = useState(() => remainingSeconds(initialDeadline));
  const target = useRef(initialDeadline);
  const active = useRef(false);
  const pending = useRef<AbortController | null>(null);
  // Temporary result only; never a session and never a route parameter.
  const result = useRef<VerifiedCode | null>(null);
  function acknowledge() {
    if (!active.current) return;
    setModal(false);
    if (result.current?.estado === 'REGISTRO_PENDIENTE') {
      registration.begin({ email, comprobanteRegistro: result.current.comprobanteRegistro });
      router.replace('/cuidador/paso-3');
    } else if (result.current?.estado === 'AUTENTICADO') {
      session.manager.finishOnboarding(); router.replace('/');
    }
  }

  useFocusEffect(useCallback(() => {
    active.current = true;
    return () => { active.current = false; pending.current?.abort(); pending.current = null; result.current = null; };
  }, []));
  useEffect(() => {
    const update = () => setSeconds(remainingSeconds(target.current));
    const timer = setInterval(update, 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  useEffect(() => {
    const text = error?.message || message;
    if (text) AccessibilityInfo.announceForAccessibility(text);
  }, [error, message]);
  const completeAnimation = useCallback(() => {
    if (!active.current || !result.current) return;
    setPhase('confirmed'); setModal(true);
  }, []);
  function cooldown(secondsFromServer: number) {
    target.current = Date.now() + secondsFromServer * 1000;
    setSeconds(remainingSeconds(target.current));
  }
  function handleError(value: unknown) {
    const failure = value instanceof CodeRequestError ? value : new CodeRequestError('No pudimos completar la solicitud. Inténtalo más tarde.');
    setError(failure);
    if (['CODIGO_INEXISTENTE', 'CODIGO_VENCIDO', 'CODIGO_USADO', 'LIMITE_INTENTOS'].includes(failure.codigo || '')) setCodeBlocked(true);
    if (failure.codigo === 'CUENTA_INACTIVA') setAccountBlocked(true);
    if (failure.codigo === 'REENVIO_PREMATURO') {
      if (failure.retryAfterSeconds !== undefined) cooldown(failure.retryAfterSeconds);
      else { setResendBlocked(true); setMessage('Vuelve al Paso 1 para solicitar otro código.'); }
    }
  }
  async function send(kind: 'verify' | 'resend') {
    if (pending.current || result.current || accountBlocked || !active.current) return;
    const codigo = digits.join('');
    if (kind === 'verify' && (codeBlocked || !/^[0-9]{6}$/.test(codigo))) return;
    if (kind === 'resend' && (resendBlocked || remainingSeconds(target.current) > 0)) return;
    const controller = new AbortController(); pending.current = controller;
    setOperation(kind); setError(undefined); setMessage(undefined); Keyboard.dismiss();
    try {
      if (kind === 'verify') {
        const verified = await verifyCarerCode(email, codigo, controller.signal);
        if (!active.current || controller.signal.aborted) return;
        if (verified.estado === 'AUTENTICADO') {
          await session.manager.establish(verified, 'otp');
          if (!active.current || controller.signal.aborted) return;
        }
        result.current = verified;
        setDigits(emptyOtp()); setPhase('animating');
      } else {
        const requested = await requestCarerCode(email, controller.signal);
        if (!active.current || controller.signal.aborted) return;
        cooldown(requested.reenvioEnSegundos); setDigits(emptyOtp()); setCodeBlocked(false); setResendBlocked(false);
        setMessage('Te hemos enviado otro código. Revisa tu correo e ingresa el más reciente.');
      }
    } catch (failure) {
      if (active.current && !controller.signal.aborted) handleError(failure);
    } finally {
      if (pending.current === controller) { pending.current = null; if (active.current) setOperation(null); }
    }
  }
  const locked = operation !== null || phase !== 'input' || accountBlocked;
  const canResend = !locked && !resendBlocked && seconds === 0;
  return (
    <>
      <View style={styles.page} importantForAccessibility={modal ? 'no-hide-descendants' : 'auto'}>
        <AccountLayout step={2} hero={<>
          <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>
            Verifica tu <Text style={{ color: colors.action.primary }}>correo</Text>
          </Text>
          <Text style={[accountStyles.body, styles.description, { color: colors.text.secondary }]}>
            Te hemos enviado un código de verificación a: <Text style={{ color: colors.action.primary, fontFamily: typography.family.bold }}>{email}</Text>
          </Text>
          <View style={styles.illustration}><CodeEnvelope accepted={phase === 'animating'} onComplete={completeAnimation} /></View>
        </>}>
          {phase === 'confirmed' ? <Text accessibilityRole="header" style={[accountStyles.title, styles.confirmed, { color: colors.status.success }]}>¡Código verificado!</Text>
            : <OtpInput digits={digits} disabled={locked || codeBlocked} error={error?.field ? error.message : undefined}
              onChange={next => { setDigits(next); setError(undefined); setMessage(undefined); }} />}
          {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
            style={[accountStyles.small, styles.feedback, { color: colors.status.error, backgroundColor: colors.status.errorSurface }]}>{error.message}</Text>}
          {message && <Text accessibilityLiveRegion="polite" style={[accountStyles.small, styles.feedback, { color: colors.text.secondary }]}>{message}</Text>}
          <View style={styles.resend}>
            <Text style={[accountStyles.small, { color: colors.text.secondary }]}>¿No recibiste el código?</Text>
            <Pressable disabled={!canResend} onPress={() => void send('resend')} accessibilityRole="button"
              accessibilityState={{ disabled: !canResend, busy: operation === 'resend' }}
              accessibilityLabel={operation === 'resend' ? 'Enviando otro código' : 'Enviar de nuevo'}
              accessibilityHint={seconds > 0 ? 'Podrás solicitar otro código en ' + seconds + ' segundos.' : undefined}
              style={styles.resendButton}>
              <Text style={[accountStyles.small, { color: canResend ? colors.action.primary : colors.text.secondary,
                textDecorationLine: 'underline' }]}>{operation === 'resend' ? 'Enviando…' : resendLabel(seconds)}</Text>
            </Pressable>
          </View>
          <View style={styles.footer}>
            {phase === 'confirmed'
              ? <ContinueButton label="Continuar" onPress={acknowledge} />
              : <ContinueButton label="Verificar" loading={operation === 'verify'} loadingLabel="Verificando…"
                disabled={locked || codeBlocked || !/^[0-9]{6}$/.test(digits.join(''))} onPress={() => void send('verify')} />}
            {phase === 'confirmed' && <Text style={[accountStyles.small, styles.confirmed, { color: colors.text.secondary }]}>Tu correo fue verificado.</Text>}
          </View>
        </AccountLayout>
      </View>
      <CodeSuccessModal visible={modal} onClose={acknowledge} onDismiss={() => setModal(false)} />
    </>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  description: { marginTop: spacing.md, paddingHorizontal: spacing['2xl'] },
  illustration: { alignSelf: 'stretch', alignItems: 'center', marginTop: spacing['2xl'] },
  resend: { alignItems: 'center', marginTop: spacing['3xl'] },
  resendButton: { minHeight: sizes.touchTarget, justifyContent: 'center', paddingHorizontal: spacing.lg },
  footer: { marginTop: 'auto', paddingTop: spacing['5xl'] },
  confirmed: { textAlign: 'center', marginTop: spacing['2xl'] },
  feedback: { padding: spacing.md, borderRadius: radii.control, marginTop: spacing.md },
});
