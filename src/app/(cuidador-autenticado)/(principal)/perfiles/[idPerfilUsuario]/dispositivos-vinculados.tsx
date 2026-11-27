import { useEffect, useRef, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { accountStyles } from '@/components/carer/account-layout';
import { ActivityDialog } from '@/components/carer/activity-dialog';
import { AreaHeader } from '@/components/carer/area-header';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { getAuthenticatedHttpClient } from '@/services/private-http';
import { borders, layout, radii, shadows, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { validProfileId } from '@/utils/profile-navigation';

type Device = { idDispositivo: number; nombre: string; fechaVinculacion: string };

export default function LinkedDevicesScreen() {
  const params = useLocalSearchParams<{ idPerfilUsuario: string; nombre?: string }>();
  const id = validProfileId(params.idPerfilUsuario);
  const path = `/api/perfiles/${id}/dispositivos`;
  const { colors } = useAppTheme();
  const [devices, setDevices] = useState<Device[]>();
  const [error, setError] = useState('');
  const [choice, setChoice] = useState<Device>();
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const sending = useRef(false);
  useEffect(() => {
    const request = new AbortController();
    if (!id) return;
    getAuthenticatedHttpClient().get<{ dispositivos: Device[] }>(path, { signal: request.signal })
      .then(({ data }) => { if (!request.signal.aborted) setDevices(data.dispositivos); })
      .catch(() => { if (!request.signal.aborted) setError('No pudimos consultar los dispositivos.'); });
    return () => request.abort();
  }, [id, path, retry]);

  async function revoke() {
    if (!choice || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    const client = getAuthenticatedHttpClient();
    try {
      await client.delete(`${path}/${choice.idDispositivo}`);
      setDevices(previous => previous?.filter(device => device.idDispositivo !== choice.idDispositivo));
      setChoice(undefined);
      setRetry(value => value + 1);
    } catch {
      try {
        const { data } = await client.get<{ dispositivos: Device[] }>(path);
        setDevices(data.dispositivos);
        if (data.dispositivos.some(device => device.idDispositivo === choice.idDispositivo))
          setError('El dispositivo sigue vinculado. Puedes intentarlo de nuevo.');
        else setChoice(undefined);
      } catch {
        setError('No pudimos confirmar la desvinculación. Puedes intentarlo de nuevo.');
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return <>
    <Stack.Screen options={{ headerShown: true, header: () => <AreaHeader title="Dispositivos vinculados"
      onBack={() => router.back()} showNotifications={false} /> }} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.icon, styles.hero, { backgroundColor: colors.welcome.intro }]}>
        <AreaIcon name="device" size={sizes.touchTarget} color={colors.action.primary} />
      </View>
      <AppText accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>
        {params.nombre ? `Dispositivos de ${params.nombre}` : 'Dispositivos vinculados'}
      </AppText>
      <AppText style={[accountStyles.body, { color: colors.text.secondary }]}>Consulta y gestiona los dispositivos que tienen acceso a su agenda.</AppText>
      {!choice && !!error && <>
        <AppText accessibilityRole="alert" style={[accountStyles.body, { color: colors.text.primary }]}>{error}</AppText>
        {id && <ContinueButton label="Reintentar" onPress={() => { setError(''); setRetry(value => value + 1); }} />}
      </>}
      {!id && <AppText accessibilityRole="alert" style={accountStyles.body}>No pudimos encontrar los datos de esta persona.</AppText>}
      {id && !devices && !error && <ActivityIndicator accessibilityLabel="Cargando dispositivos" color={colors.action.primary} />}
      {devices?.length === 0 && <AppText style={[accountStyles.body, { color: colors.text.primary }]}>Aún no hay dispositivos vinculados.</AppText>}
      {devices?.map(device => <View key={device.idDispositivo} style={[styles.card, {
        backgroundColor: colors.surface.default, borderColor: colors.border.decorative, shadowColor: colors.shadow,
      }]}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: colors.welcome.intro }]}>
            <AreaIcon name="device" color={colors.action.primary} />
          </View>
          <View style={styles.details}>
            <AppText style={[accountStyles.body, styles.left, { color: colors.text.primary }]}>{device.nombre}</AppText>
            <AppText style={[accountStyles.small, styles.left, { color: colors.text.secondary }]}>
              Vinculado el {new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(device.fechaVinculacion + 'T12:00:00Z'))}
            </AppText>
          </View>
        </View>
        <ContinueButton label="Desvincular dispositivo" variant="destructive-outline" size="modal"
          leadingIcon={<AreaIcon name="unlink" color={colors.destructive.default} />}
          onPress={() => { setError(''); setChoice(device); }} />
      </View>)}
    </ScrollView>
    {choice && <ActivityDialog title="¿Estás seguro de que deseas desvincular este dispositivo?"
      description={params.nombre
        ? `Se cerrará la sesión de ${params.nombre} en este dispositivo. Sus actividades y su progreso se conservarán.`
        : 'Se cerrará la sesión en este dispositivo. Sus actividades y su progreso se conservarán.'}
      centered showClose respectSafeArea onClose={() => { if (!sending.current) { setError(''); setChoice(undefined); } }}
      decoration={<View style={[styles.icon, styles.hero, { backgroundColor: colors.destructive.surface }]}>
        <AreaIcon name="unlink" color={colors.destructive.default} />
      </View>}>
      <AppText style={[accountStyles.body, { color: colors.text.primary }]}>{choice.nombre}</AppText>
      {!!error && <AppText accessibilityRole="alert" style={[accountStyles.small, { color: colors.text.primary }]}>{error}</AppText>}
      <ContinueButton label="Desvincular" loadingLabel="Desvinculando…" loading={busy} variant="destructive" size="modal" onPress={() => void revoke()} />
      <ContinueButton label="Cancelar" disabled={busy} variant="destructive-outline" size="modal"
        onPress={() => { setError(''); setChoice(undefined); }} />
    </ActivityDialog>}
  </>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.xl, gap: spacing.lg },
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: radii.card, borderWidth: borders.default,
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity,
    shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  details: { flex: 1 },
  left: { textAlign: 'left' },
  icon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2,
    alignItems: 'center', justifyContent: 'center' },
  hero: { alignSelf: 'center', width: 2 * sizes.touchTarget, height: 2 * sizes.touchTarget, borderRadius: sizes.touchTarget },
});
