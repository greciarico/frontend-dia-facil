import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { AreaIcon } from '@/components/carer/area-icon';
import type { CarerSupportGuide } from '@/constants/carer-support-guides';
import { borders, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

type GuideMode = 'numbered' | 'checked';

export function SupportGuideCard({ guide, mode, contentLabel }: { guide: CarerSupportGuide; mode: GuideMode; contentLabel: string }) {
  const { colors } = useAppTheme(), tone = colors.supportGuideTones[guide.tone], [expanded, setExpanded] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={guide.title}
    accessibilityHint={expanded ? 'Ocultar instrucciones' : 'Mostrar instrucciones'}
    accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}
    style={({ pressed }) => [styles.card, { backgroundColor: colors.surface.default,
      borderColor: expanded ? tone.border : colors.border.decorative, opacity: pressed ? 0.8 : 1 }]}>
    <View style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: tone.surface }]}>
        <AreaIcon name={guide.icon} color={tone.icon} />
      </View>
      <View style={styles.copy}>
        <AppText style={[styles.title, { color: colors.text.primary }]}>{guide.title}</AppText>
        <AppText style={[styles.summary, { color: colors.text.secondary }]}>{guide.summary}</AppText>
      </View>
      <View style={styles.chevron}>
        <AreaIcon name={expanded ? 'chevronUp' : 'chevronDown'} color={colors.action.primary} />
      </View>
    </View>
    {expanded && <>
      <View style={[styles.divider, { backgroundColor: colors.border.decorative }]} />
      <View accessible accessibilityLabel={`Instrucciones de ${guide.title}`} style={styles.content}>
        <AppText accessibilityRole="header" style={[styles.contentLabel, { color: colors.text.secondary }]}>{contentLabel}</AppText>
        {guide.steps.map((step, index) => <View key={step} style={styles.stepRow}>
          {mode === 'numbered'
            ? <View style={[styles.stepBadge, { backgroundColor: colors.surface.default, borderColor: tone.icon }]}>
                <AppText style={[styles.stepNumber, { color: tone.icon }]}>{index + 1}</AppText>
              </View>
            : <AreaIcon name="check" color={tone.icon} size={sizes.iconSmall}
                backdrop={{ size: sizes.iconSmall, color: tone.surface }} />}
          <AppText style={[styles.stepText, { color: colors.text.secondary }]}>{step}</AppText>
        </View>)}
      </View>
    </>}
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.card, borderWidth: borders.default },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconTile: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  summary: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
  chevron: { width: sizes.icon, alignItems: 'center', justifyContent: 'center' },
  divider: { height: borders.default, marginTop: spacing.sm },
  content: { gap: spacing.sm, paddingTop: spacing.xs },
  contentLabel: { fontFamily: typography.family.semibold, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stepBadge: { width: sizes.icon, height: sizes.icon, borderRadius: radii.control, borderWidth: borders.default,
    alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontFamily: typography.family.bold, fontSize: typography.size.xs, lineHeight: typography.lineHeight.xs },
  stepText: { flex: 1, minWidth: 0, fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
});
