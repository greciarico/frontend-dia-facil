import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AccountLayout, accountStyles } from '@/components/carer/account-layout';
import { ContinueButton } from '@/components/carer/continue-button';
import { useCarerRegistration } from '@/context/carer-registration';
import { CodeRequestError, requestCarerCode } from '@/services/carer-auth';
import { borders, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { validateCarerEmail } from '@/utils/carer-email';

export default function CarerAccountScreen() {
  const { colors } = useAppTheme();
  const { clear } = useCarerRegistration();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const input = useRef<TextInput>(null);

  useFocusEffect(useCallback(() => {
    clear();
    setLoading(false);
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [clear]));
  useEffect(() => {
    const message = fieldError || requestError;
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [fieldError, requestError]);

  async function submit() {
    if (pending.current) return;
    const trimmed = email.trim();
    setEmail(trimmed);
    setRequestError(undefined);
    const error = validateCarerEmail(trimmed);
    setFieldError(error);
    if (error) { input.current?.focus(); return; }
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    Keyboard.dismiss();
    try {
      const response = await requestCarerCode(trimmed, controller.signal);
      if (!controller.signal.aborted) router.navigate({ pathname: '/cuidador/paso-2', params: {
        email: trimmed, resendAt: String(Date.now() + response.reenvioEnSegundos * 1000),
      } });
    } catch (error) {
      if (controller.signal.aborted) return;
      const failure = error instanceof CodeRequestError ? error : new CodeRequestError('No pudimos solicitar el código. Inténtalo más tarde.');
      if (failure.field) setFieldError(failure.message);
      else setRequestError(failure.message);
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <AccountLayout step={1} hero={<Image source={require('@/assets/illustrations/carer-account.png')}
      contentFit="contain" accessible={false} style={accountStyles.illustration} />}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>
          Cuenta de <Text style={{ color: colors.action.primary }}>Cuidador</Text>
        </Text>
        <Text style={[accountStyles.body, { color: colors.text.secondary }]}>Ingresa tu correo electrónico{'\n'}para continuar</Text>
      </View>
      <View style={styles.form}>
        <View style={[styles.input, { backgroundColor: colors.surface.default,
          borderColor: fieldError ? colors.status.error : focused ? colors.border.selected : colors.border.control }]}>
          <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" accessible={false}>
            <Path d="M3 5h18v14H3Z" fill={colors.action.primary} />
            <Path d="m4 6 8 6 8-6" fill="none" stroke={colors.surface.default} strokeWidth={sizes.stroke} strokeLinejoin="round" />
          </Svg>
          <TextInput ref={input} value={email} editable={!loading} keyboardType="email-address" autoCapitalize="none"
            autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="go"
            placeholder="Correo electrónico" placeholderTextColor={colors.text.secondary}
            accessibilityLabel="Correo electrónico" accessibilityHint={fieldError || 'Ingresa el correo donde recibirás tu código.'}
            onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setFieldError(validateCarerEmail(email)); }}
            onChangeText={value => { setEmail(value); setFieldError(undefined); setRequestError(undefined); }}
            onSubmitEditing={() => void submit()} style={[styles.email, { color: colors.text.primary }]} />
        </View>
        {fieldError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
          style={[accountStyles.small, { color: colors.status.error }]}>{fieldError}</Text>}
        <View style={styles.action}><ContinueButton label="Continuar" loading={loading} onPress={() => void submit()} /></View>
        {requestError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
          style={[accountStyles.small, styles.requestError, { color: colors.status.error, backgroundColor: colors.status.errorSurface }]}>{requestError}</Text>}
      </View>
      <View style={styles.notice}>
        <View style={[styles.noticeIcon, { backgroundColor: colors.welcome.intro }]}>
          <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" accessible={false}>
            <Path d="M7 10V6a5 5 0 0 1 10 0v4M5 10h14v12H5ZM12 14v4" fill="none"
              stroke={colors.action.primary} strokeWidth={sizes.stroke} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <Text style={[accountStyles.small, styles.noticeText, { color: colors.text.secondary }]}>Te enviaremos un código de verificación a tu correo.</Text>
      </View>
    </AccountLayout>
  );
}

const styles = StyleSheet.create({
  heading: { paddingTop: spacing['5xl'] + spacing['2xl'], gap: spacing.md },
  form: { marginTop: spacing['3xl'], gap: spacing.sm },
  input: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg,
    minHeight: sizes.touchTarget, borderWidth: borders.default, borderRadius: radii.control },
  email: { flex: 1, minHeight: sizes.touchTarget, paddingVertical: spacing.md, fontFamily: typography.family.regular,
    fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  action: { marginTop: spacing['2xl'] },
  requestError: { padding: spacing.md, borderRadius: radii.control },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing['5xl'] },
  noticeIcon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  noticeText: { flex: 1 },
});
