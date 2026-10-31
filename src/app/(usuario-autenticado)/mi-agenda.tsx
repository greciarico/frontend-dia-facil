import { AppText as Text } from '@/components/app-text';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useDeviceAccess } from '@/context/device-access';
import { deviceAccess } from '@/services/device-access';
import { useUserAgenda } from '@/hooks/use-user-agenda';
import { ActivitySummaryCard } from '@/components/carer/activity-summary-card';
import { ContinueButton } from '@/components/carer/continue-button';
import { ActivityDialog } from '@/components/carer/activity-dialog';
import { StepDialogActions } from '@/components/carer/step-dialog-actions';
import { ProfileAvatar } from '@/components/carer/profile-avatar';
import { AreaIcon } from '@/components/carer/area-icon';
import { ConnectionCalendar } from '@/components/user/connection-progress';
import { agendaStatusLabel, formatAgendaDate } from '@/utils/user-agenda';
import { userActivityHref } from '@/utils/user-activity';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export default function ConnectedAgendaScreen() {
  const device = useDeviceAccess();
  if (device.status !== 'linked' || !device.profile) return <Redirect href="/" />;
  return <AgendaContent />;
}
function AgendaContent() {
  const device = useDeviceAccess(); const { colors } = useAppTheme();
  const { state, reload } = useUserAgenda();
  const [dialog, setDialog] = useState<'options' | 'exit' | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submitted = useRef(false);
  const profile = state.status === 'ready' ? state.agenda.perfil : device.profile!;
  const close = () => { if (!submitted.current) setDialog(null); };
  return <View style={[styles.page, { backgroundColor: colors.background.primary }]}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Opciones de Mi agenda" onPress={() => setDialog('options')} style={styles.options}>
          <AreaIcon name="more" color={colors.action.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>Mi agenda</Text>
        </View>
        <View accessible accessibilityLabel={`Perfil de ${profile.nombre}`} style={styles.avatar}>
          <ProfileAvatar name={profile.nombre} avatar={profile.avatar} size={sizes.touchTarget} />
        </View>
      </View>
      {state.status === 'ready' && <Text style={[styles.copy, styles.date, { color: colors.text.secondary }]}>{formatAgendaDate(state.agenda.fecha)}</Text>}
    </View>
    <FlatList data={state.status === 'ready' ? state.agenda.actividades : []} keyExtractor={item => String(item.idActividad)}
      contentContainerStyle={styles.list} refreshing={state.status === 'loading'} onRefresh={reload}
      renderItem={({ item, index }) => <ActivitySummaryCard activity={item} index={index} status={agendaStatusLabel(item.estado)} appearance="agenda"
        onPress={() => router.push(userActivityHref(item.idActividad))} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<View style={styles.empty}>
        {state.status === 'loading' ? <ActivityIndicator accessibilityLabel="Cargando tu agenda" color={colors.action.primary} />
          : state.status === 'error' ? <>
            <Text accessibilityRole="alert" style={[styles.copy, { color: colors.text.primary }]}>No pudimos cargar tu agenda. Revisa tu conexión e inténtalo nuevamente.</Text>
            <ContinueButton label="Reintentar" onPress={reload} variant="secondary" />
          </> : <>
            <View importantForAccessibility="no-hide-descendants"><ConnectionCalendar /></View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Hoy no hay actividades</Text>
            <Text style={[styles.copy, { color: colors.text.secondary }]}>Cuando tu cuidador agregue actividades, aparecerán aquí.</Text>
          </>}
      </View>} />
    {dialog === 'options' && <ActivityDialog title="Mi agenda" onClose={close} showClose respectSafeArea>
      <ContinueButton label="Salir del perfil" variant="secondary" size="modal" onPress={() => { setError(''); setDialog('exit'); }} />
    </ActivityDialog>}
    {dialog === 'exit' && <ActivityDialog title={`¿Salir del perfil de ${profile.nombre}?`} onClose={close} showClose centered respectSafeArea
      description="Dejarás de ver esta agenda en este teléfono. Las actividades y la vinculación se conservarán. Para volver, conecta tu agenda con el código de tu cuidador.">
      {!!error && <Text accessibilityRole="alert" style={[styles.copy, { color: colors.status.error }]}>{error}</Text>}
      <StepDialogActions label="Salir del perfil" disabled={busy} onCancel={close} onConfirm={() => {
        if (submitted.current) return; submitted.current = true; setBusy(true); setError('');
        void deviceAccess.logout(true).then(() => router.replace('/usuario')).catch(() => {
          submitted.current = false; setBusy(false); setError('No pudimos guardar la salida. Inténtalo de nuevo.');
        });
      }} />
    </ActivityDialog>}
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1 }, header: { gap: spacing.xs, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { flex: 1 }, title: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl, textAlign: 'center' },
  avatar: { width: sizes.touchTarget, flexShrink: 0 },
  options: { width: sizes.touchTarget, minHeight: sizes.touchTarget, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  date: { textAlign: 'center' },
  list: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing['2xl'], width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  separator: { height: spacing['2xl'] }, empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  emptyTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl, textAlign: 'center' },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, flexShrink: 1 },
});
