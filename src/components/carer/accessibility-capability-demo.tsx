import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '@/components/app-text';
import type { AccessibilityCapability } from '@/constants/accessibility-information';
import { resolveActivityIcon } from '@/constants/activity-icons';
import { useEffectiveFontScale } from '@/theme/profile-appearance';
import { borders, layout, radii, sizes, spacing, themes, highContrastTheme, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { AreaIcon } from './area-icon';
import { AccessibilityVoiceWaves } from './accessibility-voice-waves';
import { StepPictogramImage } from './step-pictogram';
import { AccessibilityTextSample } from './accessibility-text-sample';

// Curated Desayunar examples, approved in docs/desayunar-arasaac.md (backend).
// Informational only: no local JPA IDs, template search or profile data.
const examplePictograms = [
  { idArasaac: 2443, nombre: 'enjabonar las manos' },
  { idArasaac: 5549, nombre: 'poner la mesa' },
].map(pictogram => ({ ...pictogram, fuente: 'ARASAAC' as const,
  urlImagen: `https://static.arasaac.org/pictograms/${pictogram.idArasaac}/${pictogram.idArasaac}_300.png` }));

/** Illustrative scenes. Only the two approved ARASAAC images are remote. */
export function AccessibilityCapabilityDemo({ capability, active = false, animateText = false }: {
  capability: AccessibilityCapability; active?: boolean; animateText?: boolean;
}) {
  const { colors } = useAppTheme(), fontScale = useEffectiveFontScale();
  const [width, setWidth] = useState(0);
  const visualSize = width > 0 ? Math.max(sizes.icon, Math.min(sizes.touchTarget, (width - 2 * spacing.sm) / 3)) : sizes.touchTarget;
  const stepSize = width > 0 ? Math.max(sizes.icon, Math.min(layout.activities.iconSize, (width - sizes.iconSmall - 2 * spacing.sm) / 2 - 2 * spacing.sm)) : layout.activities.iconSize;
  const tile = [styles.tile, { backgroundColor: colors.surface.default, borderColor: colors.border.decorative }];
  const copy = [styles.copy, { color: colors.text.primary }];
  const arrow = <AreaIcon name="send" color={colors.action.primary} size={sizes.iconSmall} />;
  let scene;
  switch (capability.id) {
    case 'visual':
      scene = <View style={styles.row}>
        {(['bread', 'open-book', 'run'] as const).map((code, index) => <View key={code} style={styles.visualExample}>
          <Image source={resolveActivityIcon(code)} contentFit="contain" style={[{ width: visualSize, height: visualSize },
            { transform: [{ translateY: index === 1 ? -spacing.xs : spacing.xs }, { scale: index === 1 ? 1 : 0.96 }] }]} />
        </View>)}
      </View>;
      break;
    case 'steps':
      scene = <View style={styles.row}>
        <View style={[tile, styles.item]}>
          <View style={styles.pictogramSurface}><StepPictogramImage pictogram={examplePictograms[0]} size={stepSize} /></View>
          <AppText style={[styles.number, { color: colors.action.primary }]}>1</AppText>
        </View>
        {arrow}
        <View style={[tile, styles.item]}>
          <View style={styles.pictogramSurface}><StepPictogramImage pictogram={examplePictograms[1]} size={stepSize} /></View>
          <AppText style={[styles.number, { color: colors.action.primary }]}>2</AppText>
        </View>
      </View>;
      break;
    case 'voice':
      scene = <View style={styles.voice}>
        <View style={[tile, styles.instruction]}>
          <AreaIcon name="audio" color={colors.action.primary} />
          <AppText style={[...copy, styles.instructionText]}>Lávate las manos</AppText>
        </View>
        <AccessibilityVoiceWaves active={active} />
      </View>;
      break;
    case 'text':
      scene = <AccessibilityTextSample active={active && animateText} />;
      break;
    case 'contrast':
      scene = <View style={styles.comparison}>{[
        { label: 'Normal', theme: themes.light }, { label: 'Alto contraste', theme: highContrastTheme },
      ].map(({ label, theme }) => <View key={label} style={[styles.preview, { backgroundColor: theme.colors.background.primary,
        borderColor: theme.colors.border.control, flexBasis: sizes.touchTarget * 2 * fontScale }]}>
        <AppText style={[styles.copy, { color: theme.colors.text.primary }]}>{label}</AppText>
        <AppText style={[styles.sampleMedium, { color: theme.colors.action.primary }]}>Aa</AppText>
        <View style={[styles.exampleState, { backgroundColor: theme.colors.action.primary }]}>
          <AreaIcon name="check" color={theme.colors.action.onPrimary} size={sizes.iconSmall} />
        </View>
      </View>)}</View>;
      break;
    case 'help':
      scene = <View style={styles.row}>
        <View style={styles.person}>
          <Image source={require('@/assets/illustrations/im-user.png')} contentFit="contain" style={styles.personImage} />
          <AppText style={copy}>Usuario</AppText>
        </View>
        <View style={styles.helpFlow}>{arrow}<AreaIcon name="support" color={colors.action.primary} size={sizes.iconSmall} />{arrow}</View>
        <View style={styles.person}>
          <Image source={require('@/assets/illustrations/im-carer.png')} contentFit="contain" style={styles.personImage} />
          <AppText style={copy}>Cuidador</AppText>
        </View>
      </View>;
      break;
  }
  return <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.demo}
    onLayout={event => { const measured = event.nativeEvent.layout.width; if (Number.isFinite(measured) && measured > 0) setWidth(measured); }}>
    {scene}
  </View>;
}
const styles = StyleSheet.create({
  demo: { width: '100%', gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tile: { borderRadius: radii.control, borderWidth: borders.default, padding: spacing.sm, alignItems: 'center', gap: spacing.xs },
  item: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  visualExample: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  pictogramSurface: { backgroundColor: themes.light.colors.surface.default, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center' },
  copy: { fontFamily: typography.family.semibold, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm, textAlign: 'center' },
  number: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl },
  voice: { gap: spacing.sm }, instruction: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, instructionText: { flexShrink: 1 },
  sampleMedium: { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'] },
  comparison: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preview: { flexGrow: 1, flexShrink: 1, maxWidth: '100%', borderWidth: borders.default, borderRadius: radii.control, padding: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  exampleState: { width: sizes.icon, height: sizes.icon, borderRadius: sizes.icon / 2, alignItems: 'center', justifyContent: 'center' },
  person: { flex: 1, minWidth: 0, gap: spacing.xs, alignItems: 'center' },
  personImage: { width: '100%', maxWidth: layout.activities.iconTileSize, aspectRatio: 3 / 2 },
  helpFlow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
});
