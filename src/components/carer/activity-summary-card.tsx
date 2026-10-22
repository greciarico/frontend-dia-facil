import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { resolveActivityIcon } from '@/constants/activity-icons';
import type { ActivitySummary } from '@/utils/activities';
import { formatActivityTime } from '@/utils/activity-draft';
import { getActivityIconSurface } from '@/utils/activity-icon-surface';
import { borders, layout, radii, shadows, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { AreaIcon } from './area-icon';

export function ActivitySummaryCard({ activity, index }: { activity: ActivitySummary; index: number }) {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const source = resolveActivityIcon(activity.codigoIcono);
  const [hour, minute] = activity.hora.split(':').map(Number);
  const time = formatActivityTime(hour * 60 + minute);
  return <View accessible accessibilityLabel={`${activity.nombre}, ${time}`}
    style={[styles.card, { backgroundColor: colors.surface.default, borderColor: colors.border.decorative, shadowColor: colors.shadow }]}>
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.iconSurface, { backgroundColor: getActivityIconSurface(index) }]}>
      {source && !failed ? <Image source={source} contentFit="contain" style={styles.icon} onError={() => setFailed(true)} />
        : <AreaIcon name="steps" color={colors.text.secondary} />}
    </View>
    <View style={styles.text}>
      <Text style={[accountStyles.body, styles.name, { color: colors.text.primary }]}>{activity.nombre}</Text>
      <Text style={[accountStyles.small, styles.left, { color: colors.text.secondary }]}>{time}</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, borderRadius: radii.card, borderWidth: borders.default,
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity, shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
  iconSurface: { width: layout.activities.iconSize, height: layout.activities.iconSize, borderRadius: layout.activities.iconSize / 2,
    flexShrink: 0, justifyContent: 'center', alignItems: 'center' },
  name: { fontFamily: typography.family.bold, textAlign: 'left' },
  left: { textAlign: 'left' },
  icon: { width: sizes.touchTarget, height: sizes.touchTarget, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1, gap: spacing.xs },
});
