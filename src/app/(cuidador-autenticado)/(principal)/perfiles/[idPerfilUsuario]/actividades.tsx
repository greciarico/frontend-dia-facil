import { carerPeopleCopy } from '@/constants/carer-people-copy';
import { AppText as Text } from '@/components/app-text';
import { useState } from 'react';
import { ActivityActionsMenu, type ActivityMenuAnchor } from '@/components/carer/activity-actions-menu';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { accountStyles } from '@/components/carer/account-layout';
import { ActivitiesEmptyIllustration } from '@/components/carer/activities-empty-illustration';
import { ActivitySummaryCard } from '@/components/carer/activity-summary-card';
import { AreaHeader } from '@/components/carer/area-header';
import { ContinueButton } from '@/components/carer/continue-button';
import { activityFabSize, CreateActivityButton } from '@/components/carer/create-activity-button';
import { ProfileAvatar } from '@/components/carer/profile-avatar';
import { activeActivityLimitMessage, maximumActiveActivities } from '@/utils/activities';
import { useProfileActivities } from '@/hooks/use-profile-activities';
import { layout, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { newActivityHref, profileHref, validProfileId } from '@/utils/profile-navigation';

export default function ProfileActivitiesScreen() {
  const params = useLocalSearchParams<{ idPerfilUsuario?: string }>();
  const id = validProfileId(params.idPerfilUsuario);
  const { state, reload } = useProfileActivities(id);
  const { colors } = useAppTheme();
  const profile = state.status === 'ready' ? state.profile : undefined;
  const count = state.status === 'ready' ? state.data.actividades.length : undefined;
  const atLimit = count !== undefined && count >= maximumActiveActivities;
  const [menu, setMenu] = useState<{ id: number; anchor: ActivityMenuAnchor }>();
  function back() { router.dismissTo(id ? profileHref(id) : '/perfiles'); }
  return <>
    <Stack.Screen options={{ title: profile ? `Actividades de ${profile.nombre}` : 'Actividades',
      header: () => <AreaHeader onBack={back} backLabel={profile ? `Volver al perfil de ${profile.nombre}` : 'Volver al perfil'} showNotifications={false}
        title={profile ? <>Actividades de <Text style={{ color: colors.action.primary }}>{profile.nombre}</Text></> : 'Actividades'}
        rightContent={profile ? <View accessible accessibilityLabel={`Avatar de ${profile.nombre}`}>
          <ProfileAvatar name={profile.nombre} avatar={profile.avatar} size={sizes.touchTarget - spacing.sm} />
        </View> : undefined} /> }} />
    {count !== undefined && <View style={styles.capacity}>
      <View style={styles.capacityRow}>
        <Text accessibilityRole="header" style={[styles.capacityTitle, { color: colors.text.primary }]}>Rutina diaria</Text>
        <Text style={[accountStyles.small, { color: colors.action.primary }]}>{`${count} de ${maximumActiveActivities} actividades`}</Text>
      </View>
      {atLimit && <Text style={[accountStyles.small, { color: colors.text.secondary }]}>{activeActivityLimitMessage}</Text>}
    </View>}
    {state.status === 'ready' && state.data.actividades.length > 0 ? <View style={styles.listArea}>
      <FlatList data={state.data.actividades} keyExtractor={activity => String(activity.idActividad)}
        renderItem={({ item, index }) => <ActivitySummaryCard activity={item} index={index} actionsOpen={menu?.id === item.idActividad}
          onActions={anchor => setMenu({ id: item.idActividad, anchor })} />} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.populatedContent} style={styles.list} />
      <View pointerEvents="box-none" style={styles.fabRail}>
        <View style={styles.fab}><CreateActivityButton floating id={state.profile.idPerfilUsuario}
          onCreateActivity={atLimit ? undefined : profileId => router.push(newActivityHref(profileId))} /></View>
      </View>
    </View> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {state.status === 'loading' ? <View style={styles.feedback} accessible accessibilityLabel="Cargando actividades" accessibilityState={{ busy: true }}>
        <ActivityIndicator color={colors.action.primary} /><Text style={[accountStyles.body, { color: colors.text.secondary }]}>Cargando actividades…</Text>
      </View> : state.status === 'ready' ? <View>
        <View style={styles.illustration}><ActivitiesEmptyIllustration /></View>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text.primary }]}>Aún no hay actividades</Text>
        <Text style={[styles.description, { color: colors.text.secondary }]}>Agrega las actividades que formarán su rutina diaria</Text>
        <View style={styles.create}><CreateActivityButton id={state.profile.idPerfilUsuario}
          onCreateActivity={atLimit ? undefined : profileId => router.push(newActivityHref(profileId))} /></View>
      </View> : <View style={styles.feedback}>
        <Text accessibilityRole="alert" style={[accountStyles.body, styles.center, { color: colors.text.secondary }]}>
          {state.status === 'not-found' ? 'No pudimos encontrar los datos de esta persona.' : 'No pudimos cargar las actividades. Inténtalo de nuevo.'}
        </Text>
        {state.status === 'error' && <ContinueButton label="Reintentar" onPress={() => void reload()} />}
        <ContinueButton label={state.status === 'not-found' ? carerPeopleCopy.back : 'Volver al perfil'}
          onPress={state.status === 'not-found' ? () => router.dismissTo('/perfiles') : back} />
      </View>}
    </ScrollView>}
    {menu && id && <ActivityActionsMenu anchor={menu.anchor} onClose={() => setMenu(undefined)} onEdit={() => {
      setMenu(undefined);
      router.push({ pathname: '/perfiles/[idPerfilUsuario]/editar-actividad' as const, params: { idPerfilUsuario: String(id), idActividad: String(menu.id) } });
    }} />}
  </>;
}
const styles = StyleSheet.create({
  capacity: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.xs },
  capacityRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs },
  capacityTitle: { flexShrink: 1, fontFamily: typography.family.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  listArea: { flex: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  list: { flex: 1 },
  populatedContent: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.xl,
    paddingBottom: activityFabSize + spacing.lg * 2, gap: spacing.md },
  fabRail: { position: 'absolute', right: spacing.xl, bottom: spacing.lg, zIndex: 1 },
  fab: { alignSelf: 'flex-end' },
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center',
    paddingHorizontal: spacing['4xl'], paddingVertical: spacing['3xl'] },
  illustration: { alignItems: 'center', marginBottom: spacing['2xl'] },
  title: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl, textAlign: 'center' },
  description: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md,
    textAlign: 'center', marginTop: spacing.lg },
  create: { marginTop: spacing['5xl'] },
  feedback: { gap: spacing.lg },
  center: { textAlign: 'center' },
});
