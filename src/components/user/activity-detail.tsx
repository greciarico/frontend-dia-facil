import { Image } from 'expo-image';
import { useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type TextLayoutEvent } from 'react-native';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { resolveActivityIcon } from '@/constants/activity-icons';
import { formatActivityTime } from '@/utils/activity-draft';
import { formatAgendaDate } from '@/utils/user-agenda';
import { eligibleForDirectCompletion, type UserActivityDetail } from '@/utils/user-activity';
import { borders, colors as palette, layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

function ActivityPicture({ code }: { code: string | null }) {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const source = resolveActivityIcon(code);
  return <View importantForAccessibility="no-hide-descendants" style={[styles.hero, { backgroundColor: colors.background.yellow }]}>
    {source && !failed ? <Image source={source} contentFit="contain" style={styles.picture} onError={() => setFailed(true)} />
      : <AreaIcon name="activities" color={colors.action.primary} size={sizes.touchTarget} />}
  </View>;
}

export function UserActivityDetailContent({ detail, onStart, onDirect, disabled = false, busy = false }: {
  detail: UserActivityDetail; onStart?: () => void; onDirect?: () => void; disabled?: boolean; busy?: boolean;
}) {
  const { colors } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const activity = detail.actividad;
  const [hour, minute] = activity.hora.split(':').map(Number);
  const time = formatActivityTime(hour * 60 + minute);
  const date = formatAgendaDate(detail.fecha);
  const [metadataWidth, setMetadataWidth] = useState(0);
  const [verticalFor, setVerticalFor] = useState<string | null>(null);
  const measurementKey = [metadataWidth, fontScale, time, date].join('|');
  // Reject late native events from an earlier width, font scale or set of values.
  const currentMeasurement = useRef(measurementKey);
  useLayoutEffect(() => { currentMeasurement.current = measurementKey; }, [measurementKey]);
  const stacked = verticalFor === measurementKey;
  const stackMetadata = () => {
    if (!stacked && metadataWidth > 0 && currentMeasurement.current === measurementKey) setVerticalFor(measurementKey);
  };
  const checkLines = (event: TextLayoutEvent, comfortableLines: number) => {
    const count = event.nativeEvent.lines.length;
    if (count === 0 || count > comfortableLines) stackMetadata();
  };
  const completed = activity.estado === 'COMPLETADA';
  return <View style={styles.content}>
    <View style={styles.introduction}>
      <ActivityPicture key={activity.codigoIcono || ''} code={activity.codigoIcono} />
      <View style={styles.nameBlock}>
        <Text style={[styles.small, { color: colors.text.secondary }]}>Actividad</Text>
        <Text accessibilityRole="header" style={[styles.name, { color: colors.text.primary }]}>{activity.nombre}</Text>
        {activity.estado === 'EN_PROGRESO' && <Text style={[styles.body, styles.centered, { color: colors.text.secondary }]}>
          En progreso
        </Text>}
      </View>
      <View accessible style={[styles.reading, { backgroundColor: colors.profiles.information }]}>
        <AreaIcon name="audio" color={colors.action.primary} />
        <Text style={[styles.body, styles.emphasis, styles.flexText, { color: colors.text.primary }]}>Es hora de {activity.nombre}</Text>
      </View>
    </View>
    <View onLayout={event => {
      const width = event.nativeEvent.layout.width;
      if (Number.isFinite(width) && width > 0) setMetadataWidth(width);
    }} style={[styles.metadata, stacked && styles.stacked, { borderColor: colors.border.decorative, backgroundColor: colors.surface.default }]}>
      <View style={[styles.metadataItem, styles.metadataTime, stacked && styles.stackedMetadataItem]}>
        <View style={[styles.smallIcon, { backgroundColor: colors.profiles.information }]}><AreaIcon name="clock" color={colors.action.primary} /></View>
        <View key={`time:${measurementKey}`} style={styles.flexText}>
          <Text style={[styles.small, { color: colors.text.secondary }]}>Hora</Text>
          <Text onTextLayout={event => checkLines(event, 1)} style={[styles.body, styles.emphasis, { color: colors.text.primary }]}>{time}</Text>
        </View>
      </View>
      <View accessible={false} importantForAccessibility="no-hide-descendants"
        style={[styles.divider, stacked && styles.horizontalDivider, { backgroundColor: colors.border.decorative }]} />
      <View style={[styles.metadataItem, stacked ? styles.stackedMetadataItem : styles.metadataDate]}>
        <View style={[styles.smallIcon, { backgroundColor: colors.profiles.information }]}><AreaIcon name="activities" color={colors.action.primary} /></View>
        <View key={`date:${measurementKey}`} style={styles.dateText} onLayout={event => {
          if (event.nativeEvent.layout.width <= 0) stackMetadata();
        }}>
          <Text style={[styles.small, { color: colors.text.secondary }]}>Fecha</Text>
          <Text onTextLayout={event => checkLines(event, 2)} style={[styles.body, styles.emphasis, { color: colors.text.primary }]}>{date}</Text>
        </View>
      </View>
    </View>
    <View style={[styles.actions, { borderColor: colors.border.decorative, backgroundColor: colors.profiles.information }]}>
      <View style={styles.actionHeading}>
        <View style={[styles.headingIcon, { backgroundColor: colors.welcome.iconSurface }]}><AreaIcon name="steps" color={colors.action.primary} /></View>
        <View style={styles.flexText}>
          {completed && <Text style={[styles.small, { color: colors.status.success }]}>Actividad completada</Text>}
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text.primary }]}>{completed ? '¿Quieres recordar los pasos?' : '¿Qué harás ahora?'}</Text>
          <Text style={[styles.small, { color: colors.text.secondary }]}>{completed ? 'Puedes volver a verlos cuando quieras.'
            : activity.guiaInicialCompletada ? 'Puedes seguir los pasos de esta actividad o marcarla como completa.' : 'Recorre los pasos para completar esta actividad.'}</Text>
        </View>
      </View>
      <ContinueButton label="Ver paso a paso" appearance="solid-purple" busy={busy} disabled={disabled || !onStart} onPress={onStart}
        leadingIcon={<AreaIcon name="steps" color={palette.background.primary} />} />
      {!completed && activity.guiaInicialCompletada && <ContinueButton label="Ya lo hice" variant="secondary" busy={busy} disabled={disabled || !eligibleForDirectCompletion(activity) || !onDirect} onPress={onDirect}
        leadingIcon={<AreaIcon name="check" color={colors.action.primary} />} />}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  introduction: { gap: spacing.md },
  hero: { width: layout.activities.emptyIllustrationSize, height: layout.activities.emptyIllustrationSize,
    borderRadius: layout.activities.emptyIllustrationSize / 2, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  picture: { width: layout.activities.iconTileSize, height: layout.activities.iconTileSize },
  nameBlock: { alignItems: 'center', gap: spacing.xs },
  name: { fontFamily: typography.family.bold, fontSize: typography.size['3xl'], lineHeight: typography.lineHeight['3xl'], textAlign: 'center' },
  body: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  emphasis: { fontFamily: typography.family.semibold },
  small: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
  centered: { textAlign: 'center' }, flexText: { flexShrink: 1 },
  reading: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.control },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, borderRadius: radii.control, borderWidth: borders.default },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  metadataItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  metadataTime: { flexShrink: 0, maxWidth: '100%' },
  stackedMetadataItem: { flex: 0 },
  metadataDate: { flex: 1 },
  dateText: { flex: 1, minWidth: 0 },
  divider: { width: borders.default, alignSelf: 'stretch' },
  horizontalDivider: { width: 'auto', height: borders.default },
  smallIcon: { padding: spacing.sm, borderRadius: radii.control },
  actions: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.card, borderWidth: borders.default },
  actionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headingIcon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: typography.family.bold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg },
});
