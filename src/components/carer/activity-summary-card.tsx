import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveActivityIcon } from '@/constants/activity-icons';
import type { ActivitySummary } from '@/utils/activities';
import { formatActivityTime } from '@/utils/activity-draft';
import { getActivityIconSurface, getActivityVisualFamily } from '@/utils/activity-icon-surface';
import { borders, colors as palette, layout, radii, shadows, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { AreaIcon } from './area-icon';

export function ActivitySummaryCard({ activity, index, status, appearance = 'summary', onPress }: {
  activity: ActivitySummary; index: number; status?: 'pendiente' | 'en progreso' | 'completada'; appearance?: 'summary' | 'agenda'; onPress?: () => void;
}) {
  const { colors, scheme } = useAppTheme();
  const agenda = appearance === 'agenda';
  const family = agenda ? getActivityVisualFamily(index) : undefined;
  const border = agenda && scheme === 'light' ? family!.stroke : colors.border.decorative;
  const [failed, setFailed] = useState(false);
  const source = resolveActivityIcon(activity.codigoIcono);
  const [hour, minute] = activity.hora.split(':').map(Number);
  const time = formatActivityTime(hour * 60 + minute);
  const Container = onPress ? Pressable : View;
  return <Container accessible accessibilityLabel={`${activity.nombre}, ${time}${status ? `, ${status}` : ''}`}
    accessibilityRole={onPress ? 'button' : undefined} accessibilityHint={onPress ? 'Ver detalle de la actividad.' : undefined} onPress={onPress}
    style={[styles.card, agenda && styles.agendaCard, { backgroundColor: agenda && scheme === 'light' ? family!.light : colors.surface.default,
      borderColor: border, shadowColor: colors.shadow }]}>
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.iconSurface, agenda && styles.agendaIconSurface, {
      backgroundColor: agenda ? scheme === 'light' ? family!.hover : colors.surface.elevated : getActivityIconSurface(index),
      borderColor: border,
    }]}>
      {source && !failed ? <Image source={source} contentFit="contain" style={[styles.icon, agenda && styles.agendaIcon]} onError={() => setFailed(true)} />
        : <AreaIcon name="steps" color={colors.text.secondary} />}
    </View>
    <View style={[styles.text, agenda && styles.agendaText]}>
      <Text style={[accountStyles.body, styles.name, { color: colors.text.primary }]}>{activity.nombre}</Text>
      <Text style={[accountStyles.small, styles.left, agenda && styles.agendaTime, { color: colors.text.secondary }]}>{time}</Text>
      {status === 'en progreso' && <Text style={[accountStyles.small, styles.left, { color: colors.text.secondary }]}>En progreso</Text>}
    </View>
    {status && <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.state, agenda && styles.agendaState, {
      borderColor: status === 'completada' ? agenda ? family!.default : colors.status.success : agenda ? colors.text.disabled : colors.border.control,
      backgroundColor: status === 'completada' ? agenda ? family!.default : colors.status.successSurface : 'transparent',
    }]}>{status === 'completada' && <AreaIcon name="check" color={agenda ? palette.background.primary : colors.status.success} size={sizes.iconSmall} />}</View>}
  </Container>;
}
const styles = StyleSheet.create({
  state: { width: sizes.icon, height: sizes.icon, borderRadius: sizes.icon / 2, borderWidth: borders.selected, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, borderRadius: radii.card, borderWidth: borders.default,
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity, shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  iconSurface: { width: layout.activities.iconSize, height: layout.activities.iconSize, borderRadius: layout.activities.iconSize / 2,
    flexShrink: 0, justifyContent: 'center', alignItems: 'center' },
  name: { fontFamily: typography.family.bold, textAlign: 'left' },
  left: { textAlign: 'left' },
  icon: { width: sizes.touchTarget, height: sizes.touchTarget, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1, gap: spacing.xs },
  agendaCard: { gap: spacing.md, padding: 0, paddingRight: spacing.lg, overflow: 'hidden',
    shadowOpacity: 0, elevation: 0 },
  agendaIconSurface: { width: layout.activities.iconTileSize, minHeight: layout.activities.iconTileSize,
    height: 'auto', alignSelf: 'stretch', borderRadius: 0, borderRightWidth: borders.default, padding: spacing.sm },
  agendaIcon: { width: layout.activities.iconSize, height: layout.activities.iconSize },
  agendaText: { paddingVertical: spacing.md },
  agendaTime: { fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  agendaState: { borderWidth: borders.default },
});
