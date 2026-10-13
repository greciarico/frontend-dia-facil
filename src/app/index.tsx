import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { RoleCard } from '@/components/welcome/role-card';
import { layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

type Role = 'user' | 'carer';

export default function WelcomeScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [selected, setSelected] = useState<Role | null>(null);
  const stacked = window.width < layout.welcome.stackBelowWidth || window.fontScale > layout.welcome.stackAboveFontScale;
  const heroHeight = Math.min(layout.welcome.heroHeight, window.height * 0.35);
  const illustrationWidth = Math.min(layout.welcome.illustrationWidth, window.width * 0.64, heroHeight * 0.95);

  function select(role: Role) {
    setSelected(role);
    AccessibilityInfo.announceForAccessibility('Has seleccionado: ' + (role === 'user' ? 'Soy usuario' : 'Soy cuidador') + '.');
  }

  return (
    <ScrollView style={{ backgroundColor: colors.welcome.body }}
      contentContainerStyle={[styles.page, { minHeight: window.height }]}
      contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { height: heroHeight, paddingTop: insets.top + spacing.md,
        backgroundColor: colors.welcome.hero }]}>
        <Image source={require('@/assets/illustrations/welcome-character.png')} contentFit="contain" accessible={false}
          style={{ width: illustrationWidth, aspectRatio: layout.welcome.illustrationRatio }} />
        <Svg width="100%" height={layout.welcome.curveHeight} viewBox="0 0 390 32" preserveAspectRatio="none"
          style={styles.curve} accessible={false}>
          <Path d="M0 32V20Q195 -20 390 20V32Z" fill={colors.welcome.body} />
        </Svg>
      </View>
      <View style={[styles.content, { paddingLeft: Math.max(insets.left, spacing.lg),
        paddingRight: Math.max(insets.right, spacing.lg), paddingBottom: insets.bottom + spacing.lg }]}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text.primary }]}>
          ¡Bienvenido a <Text style={{ color: colors.action.primary }}>DiaFacil</Text>!
        </Text>
        <View style={[styles.intro, { backgroundColor: colors.welcome.intro }]}>
          <View style={[styles.introIcon, { backgroundColor: colors.welcome.iconSurface }]}>
            <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" accessible={false}>
              <Path d="m10 3 2.1 5.9L18 11l-5.9 2.1L10 19l-2.1-5.9L2 11l5.9-2.1L10 3Zm9-1v5m-2.5-2.5h5" fill="none"
                stroke={colors.action.primary} strokeWidth={sizes.stroke} strokeLinejoin="round" strokeLinecap="round" />
            </Svg>
          </View>
          <Text style={[styles.introText, { color: colors.text.primary }]}>
            Para comenzar, cuéntanos.{'\n'}¿Cómo quieres usar la app?
          </Text>
        </View>
        <View style={[styles.roles, stacked && styles.stacked]} accessibilityLabel="Elige cómo usar DiaFacil">
          <RoleCard title="Soy usuario" description="Quiero ver mi agenda y seguir mis actividades"
            variant="user" illustration={require('@/assets/illustrations/im-user.png')}
            selected={selected === 'user'} onSelect={() => select('user')} />
          <RoleCard title="Soy cuidador" description="Quiero configurar, personalizar y acompañar la agenda"
            variant="carer" illustration={require('@/assets/illustrations/im-carer.png')}
            selected={selected === 'carer'} onSelect={() => select('carer')}
            onContinue={() => router.navigate('/cuidador/paso-1')} />
        </View>
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" accessibilityLabel="¿Necesitas ayuda?"
            onPress={() => Alert.alert('¿Cómo quieres usar DiaFacil?',
              'Elige “Soy usuario” para ver tu agenda y seguir tus actividades. Elige “Soy cuidador” para configurar y acompañar la agenda.',
              [{ text: 'Entendido' }])}
            style={({ pressed }) => [styles.help, { backgroundColor: pressed ? colors.welcome.intro : 'transparent' }]}>
            <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" accessible={false}>
              <Circle cx="12" cy="12" r="10" fill="none" stroke={colors.action.primary} strokeWidth={sizes.stroke} />
              <Path d="M9 8.5a3 3 0 0 1 6 0c0 2-3 2-3 4M12 16.5v.5" fill="none" stroke={colors.action.primary}
                strokeWidth={sizes.stroke} strokeLinecap="round" />
            </Svg>
            <Text style={[styles.helpText, { color: colors.action.primary }]}>¿Necesitas ayuda?</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1 },
  hero: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.md },
  curve: { position: 'absolute', bottom: 0 },
  content: { flexGrow: 1, alignSelf: 'center', width: '100%', maxWidth: layout.contentMaxWidth, paddingTop: spacing.lg },
  heading: { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'], textAlign: 'center' },
  intro: { borderRadius: radii.card, padding: spacing.lg, marginTop: spacing['2xl'], flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  introIcon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2,
    alignItems: 'center', justifyContent: 'center' },
  introText: { flexShrink: 1, fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  roles: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.lg, marginTop: spacing['2xl'] },
  stacked: { flexDirection: 'column' },
  footer: { marginTop: 'auto', paddingTop: spacing['4xl'], alignItems: 'center' },
  help: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    minHeight: sizes.touchTarget, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.control },
  helpText: { fontFamily: typography.family.semibold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg, flexShrink: 1 },
});
