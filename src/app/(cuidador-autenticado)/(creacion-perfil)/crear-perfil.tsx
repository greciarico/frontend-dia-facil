import { AppTextInput as TextInput } from '@/components/app-text-input';
import { AppText as Text } from '@/components/app-text';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, Pressable, StyleSheet, TextInput as NativeTextInput, View } from 'react-native';
import { AccountAvatar } from '@/components/carer/account-avatar';
import { accountStyles } from '@/components/carer/account-layout';
import { AreaIcon } from '@/components/carer/area-icon';
import { AvatarSelector } from '@/components/carer/avatar-selector';
import { ContinueButton } from '@/components/carer/continue-button';
import { ProfileFlowLayout } from '@/components/carer/profile-flow-layout';
import type { CarerAvatarId } from '@/constants/carer-avatars';
import { useProfileCreation } from '@/context/profile-creation';
import { useSession } from '@/context/session';
import { createProfile, CreateProfileError } from '@/services/profiles';
import { borders, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { validateProfileName } from '@/utils/create-profile';

export default function CreateProfileScreen() {
  const { colors } = useAppTheme();
  const { manager } = useSession();
  const { complete, created } = useProfileCreation();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<CarerAvatarId | null>(null);
  const [fieldError, setFieldError] = useState<string>();
  const [failure, setFailure] = useState<CreateProfileError>();
  const [loading, setLoading] = useState(false);
  const input = useRef<NativeTextInput>(null);
  const active = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const committed = useRef(false);
  useFocusEffect(useCallback(() => {
    active.current = true;
    return () => { active.current = false; pending.current?.abort(); pending.current = null; };
  }, []));
  useEffect(() => {
    const message = fieldError || failure?.message;
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [fieldError, failure]);
  const blocked = loading || !!created || failure?.kind === 'limit' || failure?.kind === 'uncertain';
  function back() { router.replace('/perfiles'); }
  async function submit() {
    if (!active.current || pending.current || committed.current || blocked) return;
    const invalid = validateProfileName(name); setFieldError(invalid); setFailure(undefined);
    if (invalid) { input.current?.focus(); return; }
    const controller = new AbortController(); pending.current = controller;
    const epoch = manager.revision(); const owner = manager.getSnapshot().caregiver?.idCuidador;
    const current = () => active.current && !controller.signal.aborted && manager.revision() === epoch
      && manager.getSnapshot().status === 'authenticated' && manager.getSnapshot().caregiver?.idCuidador === owner;
    setLoading(true); Keyboard.dismiss();
    try {
      const profile = await createProfile(name, avatar, controller.signal);
      if (!current()) return;
      committed.current = true; complete(profile);
    } catch (error) {
      if (!current()) return;
      const safe = error instanceof CreateProfileError ? error : new CreateProfileError('uncertain');
      if (safe.kind === 'validation' && safe.field === 'nombre') { setFieldError(safe.message); input.current?.focus(); }
      else setFailure(safe);
    } finally { if (pending.current === controller) { pending.current = null; if (active.current) setLoading(false); } }
  }
  if (created) return <Redirect href="/perfil-creado" />;
  return <ProfileFlowLayout onBack={back}>
    <View style={styles.avatar} accessible accessibilityLabel="Avatar de la persona">
      <AccountAvatar name={name} avatarId={avatar} />
      <Pressable disabled accessibilityRole="button" accessibilityLabel="Añadir fotografía" accessibilityHint="Disponible próximamente."
        accessibilityState={{ disabled: true }} style={[styles.camera, { backgroundColor: colors.surface.elevated }]}>
        <AreaIcon name="camera" color={colors.text.disabled} />
      </Pressable>
    </View>
    <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>¿Cómo se llama?</Text>
    <Text style={[accountStyles.small, styles.description, { color: colors.text.secondary }]}>Escribe el nombre de la persona que usará la agenda</Text>
    <TextInput ref={input} value={name} onChangeText={value => { setName(value); setFieldError(undefined); setFailure(undefined); }}
      editable={!blocked} autoCapitalize="words" autoCorrect={false} autoComplete="name" textContentType="name"
      placeholder="Escribe su nombre" placeholderTextColor={colors.text.secondary} returnKeyType="done"
      onSubmitEditing={() => void submit()} onBlur={() => setFieldError(validateProfileName(name))}
      accessibilityLabel="Nombre de la persona" accessibilityHint={fieldError || 'Obligatorio. Máximo 60 caracteres.'}
      style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface.default, borderColor: fieldError ? colors.status.error : colors.border.control }]} />
    {fieldError && <Text accessibilityRole="alert" style={[accountStyles.small, { color: colors.status.error }]}>{fieldError}</Text>}
    <Text style={[styles.section, { color: colors.text.primary }]}>Imagen o avatar de perfil</Text>
    <Text style={[accountStyles.small, { color: colors.text.secondary }]}>Selecciona un avatar para identificar su perfil. Podrás añadir una foto más adelante.</Text>
    <View style={styles.selector}><AvatarSelector value={avatar} onChange={value => { setAvatar(value); setFailure(undefined); }} disabled={blocked} name={name}
      title="Elige un avatar" resetLabel="Usar la inicial del nombre" /></View>
    <View style={styles.action}><ContinueButton label="Continuar" onPress={() => void submit()} disabled={blocked || !!validateProfileName(name)} loading={loading} loadingLabel="Creando perfil…" /></View>
    {failure && <Text accessibilityRole="alert" style={[accountStyles.small, styles.error, { color: colors.status.error }]}>{failure.message}</Text>}
    {(failure?.kind === 'limit' || failure?.kind === 'uncertain') && <ContinueButton label="Revisar Mis perfiles" onPress={back} />}
  </ProfileFlowLayout>;
}
const styles = StyleSheet.create({
  avatar: { alignSelf: 'center', marginTop: spacing.lg, marginBottom: spacing['5xl'] },
  camera: { position: 'absolute', right: 0, bottom: 0, width: sizes.touchTarget, height: sizes.touchTarget,
    borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  description: { textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  input: { minHeight: sizes.touchTarget, borderWidth: borders.default, borderRadius: radii.control,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontFamily: typography.family.regular,
    fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  section: { marginTop: spacing['3xl'], marginBottom: spacing.sm, fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  selector: { marginTop: spacing['2xl'] }, action: { marginTop: spacing['2xl'] }, error: { marginVertical: spacing.lg },
});
