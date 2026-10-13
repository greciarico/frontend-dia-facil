import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AccountAvatar } from '@/components/carer/account-avatar';
import { AccountLayout, accountStyles } from '@/components/carer/account-layout';
import { AvatarSelector } from '@/components/carer/avatar-selector';
import { ContinueButton } from '@/components/carer/continue-button';
import { useCarerRegistration } from '@/context/carer-registration';
import { useSession } from '@/context/session';
import type { CarerAvatarId } from '@/constants/carer-avatars';
import { CodeRequestError, completeCarerRegistration } from '@/services/carer-auth';
import { borders, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { registrationInput, validateCarerName } from '@/utils/carer-registration';

export default function CarerPersonalizationScreen() {
  const { colors } = useAppTheme();
  const { pending, clear } = useCarerRegistration();
  const session = useSession();
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState<CarerAvatarId | null>(null);
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState<'continue' | 'skip' | null>(null);
  const [created, setCreated] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const active = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const completed = useRef(false);
  const input = useRef<TextInput>(null);
  useFocusEffect(useCallback(() => {
    active.current = true;
    return () => { active.current = false; controller.current?.abort(); controller.current = null; clear(); };
  }, [clear]));
  useEffect(() => {
    const text = fieldError || error;
    if (text) AccessibilityInfo.announceForAccessibility(text);
  }, [fieldError, error]);

  async function submit(skipAvatar: boolean) {
    if (!pending || controller.current || completed.current || needsVerification || !active.current) return;
    const validation = validateCarerName(name);
    setFieldError(validation); setError(undefined);
    if (validation) { input.current?.focus(); return; }
    const request = registrationInput(pending.comprobanteRegistro, name, avatarId, skipAvatar);
    const abort = new AbortController(); controller.current = abort;
    setLoading(skipAvatar ? 'skip' : 'continue'); Keyboard.dismiss();
    try {
      const grant = await completeCarerRegistration(request, abort.signal);
      if (!active.current || abort.signal.aborted) return;
      completed.current = true; setCreated(true); setSkipped(skipAvatar); setName(request.nombre);
      if (skipAvatar) setAvatarId(null);
      clear();
      await session.manager.establish(grant, 'onboarding', skipAvatar);
      router.replace('/cuidador/paso-4');
      AccessibilityInfo.announceForAccessibility('Cuenta creada.');
    } catch (failure) {
      if (!active.current || abort.signal.aborted) return;
      const safe = failure instanceof CodeRequestError ? failure : new CodeRequestError('No pudimos crear tu cuenta. Inténtalo más tarde.');
      if (['COMPROBANTE_INVALIDO', 'CUENTA_EXISTENTE'].includes(safe.codigo || '')) {
        setNeedsVerification(true); clear();
      }
      if (safe.field) setFieldError(safe.message); else setError(safe.message);
    } finally {
      if (controller.current === abort) { controller.current = null; if (active.current) setLoading(null); }
    }
  }
  if (!pending && !created && !needsVerification) return <Redirect href="/cuidador/paso-1" />;
  const blocked = loading !== null || created || needsVerification;
  const valid = !validateCarerName(name);
  return <AccountLayout step={3} hero={<>
    <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>Personaliza tu <Text style={{ color: colors.action.primary }}>perfil</Text></Text>
    <View style={styles.avatar} accessible accessibilityLabel={avatarId ? 'Avatar seleccionado' : 'Avatar con la inicial de tu nombre'}>
      <AccountAvatar name={name} avatarId={avatarId} />
    </View>
  </>}>
    <View style={styles.form}>
      <Text style={[accountStyles.body, styles.label, { color: colors.text.primary }]}>Nombre</Text>
      <TextInput ref={input} value={name} editable={!blocked} autoComplete="name" textContentType="name"
        autoCapitalize="words" autoCorrect={false} returnKeyType="done" placeholder="¿Cómo te llamas?"
        placeholderTextColor={colors.text.secondary} accessibilityLabel="Nombre del cuidador" accessibilityHint={fieldError || 'Obligatorio para crear tu cuenta.'}
        onChangeText={value => { setName(value); setFieldError(undefined); setError(undefined); }}
        onBlur={() => setFieldError(validateCarerName(name))} onSubmitEditing={() => void submit(false)}
        style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface.default,
          borderColor: fieldError ? colors.status.error : colors.border.control }]} />
      {fieldError && <Text accessibilityRole="alert" style={[accountStyles.small, { color: colors.status.error }]}>{fieldError}</Text>}
      <Text style={[accountStyles.body, styles.label, styles.section, { color: colors.text.primary }]}>Avatar de perfil</Text>
      <AvatarSelector name={name} value={avatarId} onChange={setAvatarId} disabled={blocked} />
      <Text style={[accountStyles.small, { color: colors.text.secondary }]}>Podrás añadir una foto propia más adelante.</Text>
      <View style={styles.action}><ContinueButton label="Continuar" loading={loading === 'continue'} loadingLabel="Creando cuenta…"
        disabled={blocked || !valid} onPress={() => void submit(false)} /></View>
      <Pressable accessibilityRole="button" disabled={blocked || !valid} accessibilityState={{ disabled: blocked || !valid, busy: loading === 'skip' }}
        onPress={() => void submit(true)} style={styles.skip}>
        <Text style={[accountStyles.small, { color: blocked || !valid ? colors.text.secondary : colors.action.primary,
          textDecorationLine: 'underline' }]}>{loading === 'skip' ? 'Creando cuenta…' : 'Personalizar más tarde'}</Text>
      </Pressable>
      {error && <Text accessibilityRole="alert" style={[accountStyles.small, styles.feedback,
        { color: colors.status.error, backgroundColor: colors.status.errorSurface }]}>{error}</Text>}
      {needsVerification && <ContinueButton label="Volver a verificar mi correo" onPress={() => router.replace('/cuidador/paso-1')} />}
      {created && <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[accountStyles.body, { color: colors.status.success }]}>Cuenta creada.</Text>}
      {created && skipped && <Text style={[accountStyles.small, { color: colors.text.secondary }]}>Podrás personalizar tu perfil más adelante desde Mi perfil.</Text>}
    </View>
  </AccountLayout>;
}
const styles = StyleSheet.create({
  avatar: { paddingTop: spacing['3xl'], paddingBottom: spacing.sm },
  form: { paddingTop: spacing['2xl'], gap: spacing.md },
  label: { textAlign: 'left' },
  input: { minHeight: sizes.touchTarget, borderWidth: borders.default, borderRadius: radii.control,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontFamily: typography.family.regular,
    fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  section: { marginTop: spacing.lg },
  action: { marginTop: spacing['2xl'] },
  skip: { minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  feedback: { padding: spacing.md, borderRadius: radii.control },
});
