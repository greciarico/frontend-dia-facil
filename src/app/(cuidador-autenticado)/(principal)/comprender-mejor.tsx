import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { AccountAvatar } from '@/components/carer/account-avatar';
import { AreaHeader } from '@/components/carer/area-header';
import { AreaIcon } from '@/components/carer/area-icon';
import { SupportGuideCard } from '@/components/carer/support-guide-card';
import { carerUnderstandingTopics } from '@/constants/carer-understanding-topics';
import { useSession } from '@/context/session';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export default function CarerUnderstandingScreen() {
  const { colors } = useAppTheme(), { caregiver } = useSession();
  return <View style={[styles.page, { backgroundColor: colors.background.primary }]}>
    <AreaHeader title="Comprender mejor" backLabel="Volver a Apoyo" showNotifications={false}
      onBack={() => router.dismissTo('/apoyo-cuidador')}
      rightContent={<AccountAvatar name={caregiver?.nombre ?? ''} avatarId={caregiver?.avatarId ?? null} size={sizes.touchTarget} />} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <View style={styles.intro}>
        <AreaIcon name="support" color={colors.action.primary} size={sizes.touchTarget} />
        <AppText style={[styles.introText, { color: colors.text.secondary }]}>
          Ideas sencillas para acompañar las rutinas y la comunicación de cada persona.
        </AppText>
      </View>
      <View style={styles.topics}>
        {carerUnderstandingTopics.map(topic => <SupportGuideCard key={topic.id} guide={topic} mode="checked" contentLabel="Aspectos importantes" />)}
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl },
  intro: { alignItems: 'center', gap: spacing.sm },
  introText: { fontFamily: typography.family.regular, fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md, textAlign: 'center' },
  topics: { gap: spacing.md },
});
