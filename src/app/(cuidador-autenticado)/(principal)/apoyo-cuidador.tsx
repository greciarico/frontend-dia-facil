import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { AccountAvatar } from '@/components/carer/account-avatar';
import { AreaHeader } from '@/components/carer/area-header';
import { AreaIcon } from '@/components/carer/area-icon';
import { carerPeopleCopy } from '@/constants/carer-people-copy';
import { useSession } from '@/context/session';
import { borders, layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

type SupportIcon = 'bookOpen' | 'steps' | 'support' | 'lightbulb' | 'profiles';
type SupportTone = 'lavender' | 'green' | 'blue';
type InfoCard = { title: string; description: string; icon: SupportIcon; tone: SupportTone; onPress: () => void; hint: string };

const illustrationWidth = Math.round(layout.carer.illustrationWidth * 0.8);

export default function CarerSupportScreen() {
  const { colors } = useAppTheme(), { caregiver } = useSession();
  const guides: InfoCard[] = [
    { title: '¿Cómo usar la App?', description: 'Aprende a crear actividades y más', icon: 'steps', tone: 'lavender',
      onPress: () => router.push('/guias-rapidas'), hint: 'Abre las guías rápidas' },
    { title: 'Comprender mejor', description: 'Información sobre rutinas', icon: 'support', tone: 'green',
      onPress: () => router.push('/comprender-mejor'), hint: 'Abre Comprender mejor' },
  ];
  const resources: InfoCard[] = [
    { title: 'Consejos y recomendaciones', description: 'Ideas para acompañar de forma positiva', icon: 'lightbulb', tone: 'blue',
      onPress: () => router.push('/consejos-y-recomendaciones'), hint: 'Abre consejos y recomendaciones' },
  ];
  const icon = (name: SupportIcon) => <AreaIcon name={name} color={colors.action.primary} />;
  const heading = (name: 'bookOpen' | 'profiles', title: string, description: string) => <View style={styles.heading}>
    <View style={[styles.headingIcon, { backgroundColor: colors.profiles.information }]}>{icon(name)}</View>
    <View style={styles.headingCopy}>
      <AppText accessibilityRole="header" style={[styles.headingTitle, { color: colors.text.primary }]}>{title}</AppText>
      <AppText style={[styles.headingDescription, { color: colors.text.secondary }]}>{description}</AppText>
    </View>
  </View>;
  const card = (item: InfoCard) => {
    const tone = colors.supportCards[item.tone];
    return <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.description}`}
      accessibilityHint={item.hint} onPress={item.onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: tone.background, borderColor: tone.border, opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.cardIcon, { backgroundColor: tone.tile }]}>{icon(item.icon)}</View>
      <View style={styles.cardCopy}>
        <AppText style={[styles.cardTitle, { color: colors.text.primary }]}>{item.title}</AppText>
        <AppText style={[styles.cardDescription, { color: colors.text.secondary }]}>{item.description}</AppText>
      </View>
      <View style={styles.cardChevron}><AreaIcon name="chevron" color={colors.action.primary} size={sizes.iconSmall} /></View>
    </Pressable>;
  };
  return <View style={[styles.page, { backgroundColor: colors.background.primary }]}>
    <AreaHeader title="Apoyo" backLabel={carerPeopleCopy.back} showNotifications={false}
      onBack={() => router.dismissTo('/perfiles')}
      rightContent={<AccountAvatar name={caregiver?.nombre ?? ''} avatarId={caregiver?.avatarId ?? null} size={sizes.touchTarget} />} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <View style={styles.intro}>
        <Image source={require('@/assets/illustrations/carer-account.png')} accessible={false} contentFit="contain"
          style={[styles.illustration, { width: illustrationWidth }]} />
        <AppText style={[styles.introText, { color: colors.text.secondary }]}>Aquí puedes encontrar ayuda y recursos para usar la app</AppText>
      </View>
      <View style={styles.section}>
        {heading('bookOpen', 'Guías rápidas', 'Aprende a usar la app paso a paso')}
        {guides.map(card)}
      </View>
      <View style={styles.section}>
        {heading('profiles', 'Para cuidadores', 'Recursos útiles para apoyar mejor')}
        {resources.map(card)}
      </View>
      <View style={styles.motivation}>
        <View style={styles.motivationIcon}>
          <AreaIcon name="heartHandshake" color={colors.action.primary} />
        </View>
        <AppText accessibilityRole="header" style={[styles.motivationTitle, { color: colors.text.primary }]}>Cada pequeño paso cuenta</AppText>
        <AppText style={[styles.motivationDescription, { color: colors.text.secondary }]}>Acompañar con paciencia también es avanzar</AppText>
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl },
  intro: { alignItems: 'center', gap: spacing.md },
  illustration: { aspectRatio: layout.carer.accountIllustrationRatio, maxWidth: '100%' },
  introText: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
  section: { gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headingIcon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1, gap: spacing.xs },
  headingTitle: { fontFamily: typography.family.bold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg },
  headingDescription: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderRadius: radii.card, borderWidth: borders.default },
  cardIcon: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  cardChevron: { width: sizes.iconSmall, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  cardDescription: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
  motivation: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },
  motivationIcon: { opacity: 0.75 },
  motivationTitle: { fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
  motivationDescription: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm, textAlign: 'center' },
});
