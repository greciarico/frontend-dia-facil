import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { borders, layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export function AccountLayout({ step, hero, children }: { step: 1 | 2 | 3; hero: ReactNode; children: ReactNode }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const heroHeight = step === 1 ? layout.carer.accountHeroHeight
    : step === 2 ? layout.carer.codeHeroHeight : layout.carer.profileHeroHeight;
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace(step === 1 ? '/' : '/cuidador/paso-1');
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.welcome.body }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, minHeight: window.height }}>
        <View style={[styles.hero, { minHeight: heroHeight + insets.top,
          paddingTop: insets.top + spacing['2xl'], paddingLeft: Math.max(insets.left, spacing.lg),
          paddingRight: Math.max(insets.right, spacing.lg), backgroundColor: colors.welcome.hero }]}>
          <View style={styles.navigation}>
            <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Volver"
              style={({ pressed }) => [styles.back, { backgroundColor: pressed ? colors.background.purple : 'transparent' }]}>
              <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" accessible={false}>
                <Path d="m15 5-7 7 7 7" fill="none" stroke={colors.text.primary} strokeWidth={sizes.stroke}
                  strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <View style={styles.progress} accessible accessibilityLabel={`Paso ${step} de 4`}>
              <View style={styles.dots} importantForAccessibility="no-hide-descendants">
                {[1, 2, 3, 4].map(value => (
                  <View key={value} style={[styles.dot, { backgroundColor: value <= step ? colors.action.primary : colors.border.decorative }]}>
                    {value < 4 && <View style={[styles.connector, { backgroundColor: value < step ? colors.action.primary : colors.border.decorative }]} />}
                  </View>
                ))}
              </View>
              <Text style={[accountStyles.small, { color: colors.text.secondary }]}>Paso {step} de 4</Text>
            </View>
            <View style={styles.back} />
          </View>
          <View style={styles.heroContent}>{hero}</View>
          <Svg width="100%" height={layout.carer.curveHeight} viewBox="0 0 390 32" preserveAspectRatio="none"
            style={styles.curve} accessible={false}>
            <Path d="M0 32V26Q195 -26 390 26V32Z" fill={colors.welcome.body} />
          </Svg>
        </View>
        <View style={[styles.content, { paddingLeft: Math.max(insets.left, spacing['4xl']),
          paddingRight: Math.max(insets.right, spacing['4xl']), paddingBottom: insets.bottom + spacing['3xl'] }]}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const accountStyles = StyleSheet.create({
  title: { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'], textAlign: 'center' },
  body: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
  small: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
  illustration: { width: layout.carer.illustrationWidth, maxWidth: '100%', aspectRatio: layout.carer.accountIllustrationRatio },
});

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: spacing.xs },
  navigation: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: layout.contentMaxWidth },
  back: { width: sizes.touchTarget, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control },
  progress: { flex: 1, alignItems: 'center', gap: spacing.sm },
  dots: { flexDirection: 'row', gap: layout.carer.stepGap },
  dot: { width: layout.carer.stepDot, height: layout.carer.stepDot, borderRadius: layout.carer.stepDot / 2 },
  connector: { position: 'absolute', left: layout.carer.stepDot, top: (layout.carer.stepDot - borders.selected) / 2,
    width: layout.carer.stepGap, height: borders.selected },
  heroContent: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignItems: 'center', justifyContent: 'flex-end', paddingTop: spacing['3xl'] },
  curve: { position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none' },
  content: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
});
