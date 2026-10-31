import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AreaIcon } from '@/components/carer/area-icon';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { KeyboardAwareForm } from '@/components/forms/keyboard-aware-form';

/** Opt-in composition: the authenticated landing and restoration UI keep their existing layout. */
export function OnboardingLayout({ title, description, illustration, children, onBack, kind }: {
  title: ReactNode; description?: string; illustration?: ReactNode; children: ReactNode; onBack?: () => void;
  kind: 'welcome' | 'connect' | 'loading' | 'success' | 'error';
}) {
  const { colors } = useAppTheme(); const insets = useSafeAreaInsets();
  const error = kind === 'error'; const headingInHero = kind === 'connect' || kind === 'loading';
  const background = error ? colors.background.primary : colors.welcome.body;
  const heading = <>
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
    {description && <Text style={[styles.description, { color: colors.text.secondary }]}>{description}</Text>}
  </>;
  return <KeyboardAwareForm style={{ backgroundColor: background }} contentContainerStyle={{ paddingBottom: insets.bottom + spacing['3xl'] }}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.sm, backgroundColor: error ? background : colors.welcome.hero,
        minHeight: error ? undefined : layout.welcome.heroHeight + insets.top }]}>
        <View style={[styles.navigation, { paddingLeft: Math.max(insets.left, spacing.lg), paddingRight: Math.max(insets.right, spacing.lg) }]}>
          {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} style={styles.back}>
            <AreaIcon name="back" color={colors.text.primary} /></Pressable>}
        </View>
        <View style={[styles.heroContent, { paddingLeft: Math.max(insets.left, spacing['2xl']), paddingRight: Math.max(insets.right, spacing['2xl']) }]}>
          {headingInHero && <View style={styles.heading}>{heading}</View>}
          {illustration && <View style={[styles.illustration, !error && styles.overlap]}>{illustration}</View>}
        </View>
        {!error && <Svg width="100%" height={layout.carer.curveHeight} viewBox="0 0 390 32" preserveAspectRatio="none"
          style={styles.curve} accessible={false} pointerEvents="none">
          <Path d="M0 32V26Q195 -26 390 26V32Z" fill={background} />
        </Svg>}
      </View>
      <View style={[styles.body, { paddingLeft: Math.max(insets.left, spacing['4xl']), paddingRight: Math.max(insets.right, spacing['4xl']) }]}>
        {!headingInHero && <View style={styles.heading}>{heading}</View>}
        <View style={[styles.actions, kind === 'welcome' && styles.welcomeActions]}>{children}</View>
      </View>
  </KeyboardAwareForm>;
}
const styles = StyleSheet.create({
  hero: { justifyContent: 'flex-end', paddingBottom: spacing.lg },
  navigation: { minHeight: sizes.touchTarget, width: '100%' },
  back: { minWidth: sizes.touchTarget, minHeight: sizes.touchTarget, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center' },
  heroContent: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', alignItems: 'center', gap: spacing.lg, zIndex: 1 },
  illustration: { width: '100%', alignItems: 'center', paddingTop: spacing.lg },
  overlap: { marginBottom: -spacing['2xl'] },
  curve: { position: 'absolute', left: 0, bottom: 0, zIndex: 0 },
  body: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingTop: spacing['3xl'] },
  heading: { width: '100%', gap: spacing.lg },
  title: { fontFamily: typography.family.bold, fontSize: typography.size['3xl'], lineHeight: typography.lineHeight['3xl'], textAlign: 'center' },
  description: { fontFamily: typography.family.regular, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg, textAlign: 'center' },
  actions: { gap: spacing.lg, paddingTop: spacing['2xl'] },
  welcomeActions: { paddingTop: spacing['5xl'] },
});
