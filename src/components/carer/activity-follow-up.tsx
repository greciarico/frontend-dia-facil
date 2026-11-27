import { useEffect, useRef, useState } from 'react';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { useSession } from '@/context/session';
import { getFollowUpDetail, type FollowUpActivity, type FollowUpDay, type FollowUpDetail } from '@/services/follow-up';
import { borders, layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useEffectiveFontScale } from '@/theme/profile-appearance';
import { useAppTheme } from '@/theme/use-theme';
import { formatAgendaDate } from '@/utils/user-agenda';
import { accountStyles } from './account-layout';
import { ActivityEmptyState, activityEmptyContent } from './activity-empty-state';
import { ActivityDialog } from './activity-dialog';
import { ActivitySummaryCard } from './activity-summary-card';
import { AreaIcon } from './area-icon';
import { ContinueButton } from './continue-button';
import { StepPictogramImage } from './step-pictogram';

const statusLabels = { PENDIENTE: 'pendiente', EN_PROGRESO: 'en progreso', COMPLETADA: 'completada' } as const;
function localDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
function dateKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n, i) => String(n).padStart(i === 0 ? 4 : 2, '0')).join('-');
}
function offset(date: string, delta: number) {
  const value = localDate(date);
  value.setDate(value.getDate() + delta);
  return dateKey(value);
}

export function ActivityFollowUp({ profileId, data, calendar, status, reload, onDate, onRoutine }: {
  profileId: number; data?: FollowUpDay; calendar?: FollowUpDay; status: 'loading' | 'error' | 'ready';
  reload: () => void; onDate: (date: string | undefined) => void; onRoutine: () => void;
}) {
  const { colors } = useAppTheme();
  const [picked, setPicked] = useState<{ id: number; date: string }>();
  if (!data) return <View style={styles.content}>
    {calendar && (calendar.tieneActividadesActivas || calendar.tieneHistorial) &&
      <FollowUpCalendar data={calendar} onDate={next => onDate(next === calendar.fechaActual ? undefined : next)} />}
    <View style={styles.message}>
    {status === 'error' ? <>
      <AppText accessibilityRole="alert" style={[accountStyles.body, styles.body, { color: colors.text.primary }]}>No pudimos consultar el seguimiento.</AppText>
      <ContinueButton label="Reintentar" onPress={reload} />
    </> : <ActivityIndicator accessibilityLabel="Cargando seguimiento" color={colors.action.primary} />}
    </View>
  </View>;
  const emptyProfile = !data.tieneActividadesActivas && !data.tieneHistorial;
  const summary = data.resumen;
  const partial = data.cobertura === 'PARCIAL';
  const header = emptyProfile ? null : <>
    <FollowUpCalendar data={data} onDate={next => onDate(next === data.fechaActual ? undefined : next)} />
    {status === 'error' && <View style={styles.message}>
      <AppText accessibilityRole="alert" style={[accountStyles.body, styles.body, { color: colors.text.primary }]}>No pudimos actualizar el seguimiento.</AppText>
      <ContinueButton label="Reintentar" variant="secondary" onPress={reload} />
    </View>}
    {partial && data.actividades.length > 0 && <AppText style={[accountStyles.small, { color: colors.text.secondary }]}>
      Solo se muestran las ejecuciones registradas. La rutina de esa fecha no se puede reconstruir.
    </AppText>}
    {summary && summary.total > 0 && <View style={[styles.progress, { backgroundColor: colors.welcome.intro }]}>
      <View style={styles.summaryHeading}>
        <AppText accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>Progreso diario</AppText>
        <AppText style={[styles.title, { color: colors.action.primary }]}>{summary.porcentaje}%</AppText>
      </View>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.track, { backgroundColor: colors.background.purple }]}>
        <View style={[styles.fill, { width: `${summary.porcentaje ?? 0}%`, backgroundColor: colors.action.primary }]} />
      </View>
      <AppText style={[accountStyles.body, styles.body, { color: colors.text.primary }]}>
        {summary.completadas} de {summary.total} {summary.total === 1 ? 'actividad completada' : 'actividades completadas'}
      </AppText>
      <View style={styles.breakdown}>
        <ProgressStat count={summary.completadas} label={summary.completadas === 1 ? 'Completada' : 'Completadas'} status="completed" />
        <ProgressStat count={summary.enProgreso} label="En progreso" status="inProgress" />
        <ProgressStat count={summary.pendientes} label={summary.pendientes === 1 ? 'Pendiente' : 'Pendientes'} status="pending" />
      </View>
    </View>}
  </>;
  return <>
    <FlatList data={emptyProfile ? [] : data.actividades} keyExtractor={activity => String(activity.idActividad)}
      contentContainerStyle={emptyProfile ? activityEmptyContent : styles.content} ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={reload} colors={[colors.action.primary]} />}
      renderItem={({ item, index }) => {
        const progress = item.estado === 'EN_PROGRESO'
          ? `${item.pasosCompletados} de ${item.totalPasos} ${item.totalPasos === 1 ? 'paso completado' : 'pasos completados'}`
          : undefined;
        return <ActivitySummaryCard activity={item} index={index}
          onPress={() => setPicked({ id: item.idActividad, date: data.fecha })}
          followUp={{ label: progress ? `${statusLabels[item.estado]}, ${progress}` : statusLabels[item.estado],
            content: <FollowUpCardStatus activity={item} progress={progress} />,
            indicator: <StatusIcon status={cardStatuses[item.estado]} /> }} />;
      }}
      ListEmptyComponent={<View style={!emptyProfile && styles.datedEmpty}>
        <ActivityEmptyState illustration={emptyProfile ? 'follow-up' : 'calendar'}
          title={emptyProfile ? 'Aún no hay seguimiento' : partial ? 'No hay registros para este día' : 'No hay actividades para este día'}
          description={emptyProfile ? 'Agrega actividades a su rutina para comenzar a consultar su progreso diario'
            : partial ? 'La rutina de esa fecha no se puede reconstruir.' : 'Selecciona otra fecha para consultar su progreso'}
          action={emptyProfile ? <ContinueButton label="Ir a rutina" onPress={onRoutine} /> : undefined} />
      </View>} />
    {picked && <FollowUpSteps key={`${picked.date}:${picked.id}`} profile={profileId} id={picked.id}
      date={picked.date} onClose={() => setPicked(undefined)} />}
  </>;
}

type FollowUpStatus = 'completed' | 'inProgress' | 'pending';

const cardStatuses = { COMPLETADA: 'completed', EN_PROGRESO: 'inProgress', PENDIENTE: 'pending' } as const;

function useStatusPalette(status: FollowUpStatus) {
  const { colors } = useAppTheme();
  return {
    completed: { color: colors.status.success, backgroundColor: colors.status.successSurface },
    inProgress: { color: colors.action.primary, backgroundColor: colors.background.purple },
    pending: { color: colors.text.secondary, backgroundColor: colors.surface.elevated },
  }[status];
}

function StatusIcon({ status }: { status: FollowUpStatus }) {
  const { color } = useStatusPalette(status);
  return <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
    style={[styles.statIcon, { borderColor: color }, status === 'inProgress' && styles.dashed]}>
    {status === 'completed' && <AreaIcon name="check" size={spacing.lg} color={color} />}
  </View>;
}

function FollowUpCardStatus({ activity, progress }: { activity: FollowUpActivity; progress?: string }) {
  const labels = { COMPLETADA: 'Completada', EN_PROGRESO: 'En progreso', PENDIENTE: 'Pendiente' };
  const { color, backgroundColor } = useStatusPalette(cardStatuses[activity.estado]);
  return <>
    <AppText style={[accountStyles.small, styles.body, { color }]}>{labels[activity.estado]}</AppText>
    {progress && <>
      <AppText style={[accountStyles.small, styles.body, { color }]}>{progress}</AppText>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.track, styles.stepTrack, { backgroundColor }]}>
        <View style={[styles.fill, { width: `${activity.totalPasos ? activity.pasosCompletados / activity.totalPasos * 100 : 0}%`,
          backgroundColor: color }]} />
      </View>
    </>}
  </>;
}

function ProgressStat({ count, label, status }: { count: number; label: string; status: FollowUpStatus }) {
  const stacked = useEffectiveFontScale() >= layout.welcome.stackAboveFontScale;
  const { color, backgroundColor } = useStatusPalette(status);
  return <View accessible accessibilityLabel={`${count} ${label.toLowerCase()}`} style={[styles.stat, stacked && styles.statStacked, { backgroundColor }]}>
    <StatusIcon status={status} />
    <AppText style={[styles.title, { color }]}>{count}</AppText>
    <AppText style={[accountStyles.small, styles.statLabel, { color }]}>{label}</AppText>
  </View>;
}

function FollowUpCalendar({ data, onDate }: { data: FollowUpDay; onDate: (date: string) => void }) {
  const { colors, scheme } = useAppTheme();
  const [date, setDate] = useState<Date>();
  const picker = useRef(false);
  const previous = data.fecha > data.fechaMinima;
  const next = data.fecha < data.fechaActual;
  const select = (value: Date) => {
    const key = dateKey(value);
    if (key >= data.fechaMinima && key <= data.fechaActual) onDate(key);
  };
  useEffect(() => () => {
    if (Platform.OS === 'android' && picker.current) void DateTimePickerAndroid.dismiss('date').catch(() => undefined);
    picker.current = false;
  }, []);
  const choose = () => {
    if (Platform.OS !== 'android') { setDate(localDate(data.fecha)); return; }
    if (picker.current) return;
    picker.current = true;
    DateTimePickerAndroid.open({ mode: 'date', value: localDate(data.fecha), minimumDate: localDate(data.fechaMinima),
      maximumDate: localDate(data.fechaActual), positiveButton: { label: 'Aceptar' }, negativeButton: { label: 'Cancelar' },
      onValueChange: (_event, value) => { if (picker.current) { picker.current = false; select(value); } },
      onDismiss: () => { picker.current = false; } });
  };
  const label = data.fecha === data.fechaActual ? `Hoy, ${formatAgendaDate(data.fecha).toLocaleLowerCase('es-PE')}` : `${formatAgendaDate(data.fecha)} de ${data.fecha.slice(0, 4)}`;
  return <>
    <View style={styles.calendar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Día anterior" disabled={!previous}
        accessibilityState={{ disabled: !previous }} style={[styles.arrow, { backgroundColor: colors.welcome.intro }]}
        onPress={() => onDate(offset(data.fecha, -1))}>
        <AreaIcon name="back" color={previous ? colors.action.primary : colors.text.disabled} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Seleccionar fecha. ${label}`} onPress={choose}
        style={[styles.calendarButton, { backgroundColor: colors.welcome.intro }]}>
        <AreaIcon name="activities" color={colors.action.primary} size={sizes.iconSmall} />
        <AppText style={[accountStyles.small, styles.date, { color: colors.action.primary }]}>{label}</AppText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Día siguiente" disabled={!next}
        accessibilityState={{ disabled: !next }} style={[styles.arrow, { backgroundColor: colors.welcome.intro }]}
        onPress={() => onDate(offset(data.fecha, 1))}>
        <AreaIcon name="chevron" color={next ? colors.action.primary : colors.text.disabled} />
      </Pressable>
    </View>
    {date && <ActivityDialog title="Selecciona una fecha" onClose={() => setDate(undefined)}>
      <DateTimePicker mode="date" value={date} minimumDate={localDate(data.fechaMinima)}
        maximumDate={localDate(data.fechaActual)} display="spinner" themeVariant={scheme}
        onValueChange={(_event, value) => setDate(value)} />
      <ContinueButton label="Aceptar" onPress={() => { select(date); setDate(undefined); }} />
      <ContinueButton label="Cancelar" variant="secondary" onPress={() => setDate(undefined)} />
    </ActivityDialog>}
  </>;
}

function FollowUpSteps({ profile, id, date, onClose }: { profile: number; id: number; date: string; onClose: () => void }) {
  const { manager } = useSession();
  const revision = manager.revision();
  const { colors } = useAppTheme();
  const [data, setData] = useState<FollowUpDetail>();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    void getFollowUpDetail(profile, id, date, revision, ctrl.signal).then(value => {
      if (!ctrl.signal.aborted && revision === manager.revision()) setData(value);
    }).catch(() => { if (!ctrl.signal.aborted && revision === manager.revision()) setError(true); });
    return () => ctrl.abort();
  }, [profile, id, date, revision, manager, retry]);
  return <ActivityDialog title={data?.actividad.nombre ?? 'Detalle de la actividad'} showClose onClose={onClose}>
    <AppText style={[accountStyles.small, { color: colors.text.secondary }]}>{formatAgendaDate(date)} · {date.slice(0, 4)}</AppText>
    {error ? <>
      <AppText accessibilityRole="alert" style={[accountStyles.body, styles.body, { color: colors.text.primary }]}>No pudimos consultar el detalle de la actividad.</AppText>
      <ContinueButton label="Reintentar" onPress={() => { setError(false); setRetry(n => n + 1); }} />
    </> : !data ? <ActivityIndicator accessibilityLabel="Cargando pasos" color={colors.action.primary} /> : <>
      <AppText accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{statusLabels[data.actividad.estado]}</AppText>
      {data.pasos.length === 0 && <AppText style={[accountStyles.body, styles.body, { color: colors.text.primary }]}>No hay pasos disponibles para esta actividad.</AppText>}
      {data.pasos.map(step => <View key={step.posicion} style={[styles.step, { borderColor: colors.border.decorative }]}>
        {step.pictograma && <StepPictogramImage pictogram={step.pictograma} />}
        <View style={styles.stepText}>
          <AppText style={[accountStyles.body, styles.body, { color: colors.text.primary }]}>{step.posicion}. {step.descripcion}</AppText>
          <AppText style={[accountStyles.small, { color: colors.text.secondary }]}>{step.estado === 'COMPLETADO' ? 'Completado' : step.estado === 'SIN_REGISTRO' ? 'Sin registro' : 'Pendiente'}</AppText>
        </View>
      </View>)}
    </>}
  </ActivityDialog>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.xl, gap: spacing.md, flexGrow: 1 },
  message: { padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  datedEmpty: { paddingHorizontal: spacing['4xl'] - spacing.xl, paddingVertical: spacing['3xl'] },
  body: { textAlign: 'left' },
  title: { fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  calendar: { flexDirection: 'row', gap: spacing.xs, alignItems: 'stretch', marginBottom: spacing.md },
  arrow: { width: sizes.touchTarget, minHeight: sizes.touchTarget, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center' },
  calendarButton: { flex: 1, minHeight: sizes.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, padding: spacing.sm, borderRadius: radii.control },
  date: { flexShrink: 1, textAlign: 'center' },
  progress: { padding: spacing.md, borderRadius: radii.card, gap: spacing.sm, marginBottom: spacing.md },
  summaryHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  breakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexGrow: 1, flexBasis: 2 * spacing['4xl'] + spacing.sm, maxWidth: '100%', alignItems: 'center',
    padding: spacing.sm, gap: spacing.xs, borderRadius: radii.control },
  statStacked: { flexBasis: '100%' },
  stepTrack: { height: spacing.xs },
  statIcon: { width: sizes.icon, height: sizes.icon, borderRadius: sizes.icon / 2, borderWidth: borders.selected,
    alignItems: 'center', justifyContent: 'center' },
  dashed: { borderStyle: 'dashed' },
  statLabel: { width: '100%', textAlign: 'center' },
  track: { height: spacing.sm, borderRadius: radii.control, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.control },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: borders.default, paddingBottom: spacing.sm },
  stepText: { flex: 1, gap: spacing.xs },
});
