import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AreaIcon } from '@/components/carer/area-icon';
import { ContinueButton } from '@/components/carer/continue-button';
import { UserActivityDetailContent } from '@/components/user/activity-detail';
import { useUserActivity } from '@/hooks/use-user-activity';
import { validActivityId } from '@/utils/user-activity';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export default function UserActivityScreen() {
  const { idActividad } = useLocalSearchParams<{ idActividad?: string }>();
  const { state, reload } = useUserActivity(validActivityId(idActividad));
  const { colors } = useAppTheme();
  const back = () => router.dismissTo('/mi-agenda');
  return <ScrollView style={{ backgroundColor: colors.background.primary }} contentContainerStyle={styles.page}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver a Mi agenda" onPress={back} style={styles.back}>
      <AreaIcon name="back" color={colors.text.primary} />
    </Pressable>
    {state.status === 'ready' ? <UserActivityDetailContent detail={state.detail} />
      : <View style={styles.message}>
        {state.status === 'loading' ? <ActivityIndicator accessibilityLabel="Cargando actividad" color={colors.action.primary} />
          : <>
            <Text accessibilityRole="alert" style={[styles.copy, { color: colors.text.primary }]}>
              {state.status === 'not-found' ? 'Esta actividad no está disponible.' : 'No pudimos cargar la actividad. Revisa tu conexión e inténtalo nuevamente.'}
            </Text>
            <ContinueButton label={state.status === 'not-found' ? 'Volver a Mi agenda' : 'Reintentar'} variant="secondary"
              onPress={state.status === 'not-found' ? back : reload} />
          </>}
      </View>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'], gap: spacing.lg },
  back: { minHeight: sizes.touchTarget, width: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
});
