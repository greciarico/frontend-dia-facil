import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { ContinueButton } from '@/components/carer/continue-button';
import { NotificationCard } from '@/components/carer/notification-card';
import { useCarerNotifications } from '@/hooks/use-carer-notifications';
import type { NotificationCategory, CarerNotification } from '@/utils/help-notifications';
import { layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { useCarerPush } from '@/context/carer-push';
import { getNotification } from '@/services/carer-notifications';
import { pushRefresh } from '@/services/carer-push';

const HIGHLIGHT_DURATION_MS = 3_000;
const MAX_AUTO_PAGES = 5;
const MAX_SCROLL_ATTEMPTS = 3;
const SCROLL_RETRY_DELAY_MS = 150;

const filters: { id: NotificationCategory; label: string }[] = [{ id: 'TODAS', label: 'Todas' }, { id: 'AYUDA', label: 'Ayuda' }, { id: 'SISTEMA', label: 'Sistema' }];
export default function NotificationsScreen() {
  const [category, setCategory] = useState<NotificationCategory>('TODAS');
  const query = useCarerNotifications(category), { colors } = useAppTheme();
  const push = useCarerPush();
  const params = useLocalSearchParams<{ pushId?: string; pushKey?: string }>();
  const [target, setTarget] = useState<{ id: number } | null>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [targetError, setTargetError] = useState('');
  const [retry, setRetry] = useState(0);
  const list = useRef<FlatList<CarerNotification>>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookup = useRef<AbortController | null>(null);
  const focused = useRef(false), visibleIds = useRef<number[]>([]);
  const intentKey = JSON.stringify([params.pushId ?? null, params.pushKey ?? null]);
  const handledIntent = useRef<string | null>(null);
  const pending = useRef<{ id: number; key: string; pages: number; shown: boolean; scrolls: number; ready: boolean; retry: number } | null>(null);
  const currentQuery = useRef(query), visible = useRef(push.visible);
  useEffect(() => { currentQuery.current = query; visible.current = push.visible; });
  useEffect(() => pushRefresh.subscribe(() => currentQuery.current.reload()), []);
  const clearHighlight = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    timer.current = null; scrollTimer.current = null; setHighlighted(null);
  }, []);
  const highlight = useCallback((id: number) => {
    const intent = pending.current;
    if (!focused.current || !intent || !intent.ready || intent.id !== id || intent.shown) return;
    intent.shown = true; handledIntent.current = intent.key; setHighlighted(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; if (pending.current === intent) setHighlighted(null); }, HIGHLIGHT_DURATION_MS);
  }, []);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: { item: CarerNotification }[] }) => {
    if (!focused.current) return;
    const ids = viewableItems.map(v => v.item.idNotificacion);
    visibleIds.current = ids; visible.current(ids);
    const intent = pending.current;
    if (intent && ids.includes(intent.id)) highlight(intent.id);
  }, [highlight]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    const cleanup = () => {
      focused.current = false; lookup.current?.abort(); clearHighlight();
      visibleIds.current = []; visible.current([]);
    };
    const id = Number(params.pushId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      pending.current = null; clearHighlight(); setTarget(null); setTargetError('');
      return cleanup;
    }
    if (handledIntent.current === intentKey) return cleanup;
    clearHighlight(); setTarget(null); setTargetError(''); setCategory('TODAS');
    let intent = pending.current;
    if (!intent || intent.key !== intentKey) {
      intent = { id, key: intentKey, pages: 0, shown: false, scrolls: 0, ready: false, retry }; pending.current = intent;
    }
    if (intent.retry !== retry) { intent.retry = retry; intent.pages = 0; }
    intent.ready = false; intent.scrolls = 0;
    const controller = new AbortController(); lookup.current = controller;
    void getNotification(id, controller.signal).then(() => {
      if (controller.signal.aborted || !focused.current || pending.current !== intent) return;
      intent.ready = true; setTarget({ id }); currentQuery.current.reload();
    }).catch(() => { if (!controller.signal.aborted && focused.current) setTargetError('No pudimos abrir el aviso. Inténtalo de nuevo.'); });
    return cleanup;
  }, [params.pushId, intentKey, retry, clearHighlight]));
  useEffect(() => {
    const intent = pending.current;
    if (!intent || !intent.ready || intent.id !== target?.id || intent.shown || category !== 'TODAS' || !focused.current || query.loading || query.more || query.error) return;
    const index = query.items.findIndex(item => item.idNotificacion === intent.id);
    if (index >= 0) {
      setTargetError('');
      if (visibleIds.current.includes(intent.id)) highlight(intent.id);
      else if (intent.scrolls === 0) { intent.scrolls++; list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }); }
    } else if (query.cursor && intent.pages < MAX_AUTO_PAGES) {
      intent.pages++; currentQuery.current.loadMore();
    } else if (!query.cursor || intent.pages >= MAX_AUTO_PAGES) {
      setTargetError(query.cursor ? 'Este aviso está más atrás. Usa Ver más para continuar.' : 'Este aviso ya no está disponible en el historial.');
    }
  }, [target, category, query.items, query.loading, query.more, query.cursor, query.error, highlight]);
  const selectFilter = (value: NotificationCategory) => {
    lookup.current?.abort(); handledIntent.current = intentKey; pending.current = null; clearHighlight(); setTarget(null); setTargetError(''); setCategory(value);
  };
  return <View style={styles.page}>
    <View style={styles.filters}>{filters.map(filter => <Pressable key={filter.id} accessibilityRole="tab"
      accessibilityLabel={filter.label} accessibilityState={{ selected: category === filter.id }} onPress={() => selectFilter(filter.id)}
      style={[styles.filter, { backgroundColor: category === filter.id ? colors.action.primary : colors.profiles.information }]}>
      <AppText style={[styles.copy, { textAlign: 'center', color: category === filter.id ? colors.action.onPrimary : colors.action.primary }]}>{filter.label}</AppText>
    </Pressable>)}</View>
    {!!query.error && <View style={styles.error}><AppText accessibilityRole="alert" style={[styles.copy, { color: colors.status.error }]}>{query.error}</AppText>
      <ContinueButton label="Reintentar" variant="secondary" onPress={query.cursor ? query.loadMore : query.reload} disabled={query.loading || query.more} /></View>}
    <FlatList ref={list} data={query.items} keyExtractor={item => String(item.idNotificacion)} contentContainerStyle={styles.list}
      onViewableItemsChanged={onViewableItemsChanged}
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        const intent = pending.current;
        if (!intent || !intent.ready || intent.shown || intent.scrolls >= MAX_SCROLL_ATTEMPTS || !focused.current) return;
        intent.scrolls++; list.current?.scrollToOffset({ offset: Math.max(0, index * averageItemLength), animated: false });
        if (scrollTimer.current) clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => {
          scrollTimer.current = null;
          if (pending.current === intent && focused.current) list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }, SCROLL_RETRY_DELAY_MS);
      }}
      ListHeaderComponent={targetError ? <View><AppText accessibilityRole="alert">{targetError}</AppText><ContinueButton label="Reintentar aviso" onPress={() => setRetry(v => v + 1)} /></View> : null}
      refreshing={query.loading} onRefresh={query.reload}
      renderItem={({ item }) => <NotificationCard item={item} highlighted={highlighted === item.idNotificacion} busy={query.marking.includes(item.idNotificacion)} onPress={() => { if (!item.leida) query.markRead(item.idNotificacion); }} />}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      ListEmptyComponent={<View style={styles.empty}>{query.loading ? <ActivityIndicator accessibilityLabel="Cargando notificaciones" color={colors.action.primary} />
        : !query.error && <AppText style={[styles.copy, { color: colors.text.secondary }]}>Todavía no hay notificaciones{category === 'AYUDA' ? ' de ayuda' : category === 'SISTEMA' ? ' del sistema' : ''}.</AppText>}</View>}
      ListFooterComponent={query.more ? <ActivityIndicator accessibilityLabel="Cargando más notificaciones" color={colors.action.primary} />
        : query.cursor && !query.loading ? <ContinueButton label="Ver más" variant="secondary" onPress={query.loadMore} /> : null} />
  </View>;
}
const styles = StyleSheet.create({ page: { flex: 1 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.xl, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  filter: { flex: 1, minWidth: 80, minHeight: sizes.touchTarget, justifyContent: 'center', padding: spacing.sm, borderRadius: radii.control },
  list: { flexGrow: 1, gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'], width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }, error: { padding: spacing.lg, gap: spacing.md } });
