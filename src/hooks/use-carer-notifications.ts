import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { getNotifications, markNotificationRead } from '@/services/carer-notifications';
import type { CarerNotification, NotificationCategory } from '@/utils/help-notifications';

export function useCarerNotifications(category: NotificationCategory) {
  const [items, setItems] = useState<CarerNotification[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [more, setMore] = useState(false), [error, setError] = useState('');
  const [marking, setMarking] = useState<number[]>([]);
  const reload = useRef<() => void>(() => undefined), loadMore = useRef<() => void>(() => undefined);
  const mark = useRef<(id: number) => void>(() => undefined);
  useFocusEffect(useCallback(() => {
    let alive = true, version = 0, fetching = false, next: string | null = null;
    let controller: AbortController | undefined;
    const writes = new Map<number, AbortController>(), read = new Set<number>();
    const load = async (append = false) => {
      if (!alive || append && (fetching || !next)) return;
      const request = ++version, requested = append ? next : null;
      controller?.abort(); controller = new AbortController(); const signal = controller.signal;
      fetching = true; setError(''); setMore(append); setLoading(!append);
      if (!append) { next = null; setCursor(null); }
      try {
        const page = await getNotifications(category, requested, signal);
        if (!alive || signal.aborted || version !== request) return;
        next = page.siguienteCursor === requested ? null : page.siguienteCursor; setCursor(next);
        const incoming = page.notificaciones.map(n => read.has(n.idNotificacion) ? { ...n, leida: true } : n);
        setItems(previous => (append ? [...previous, ...incoming.filter(n => !previous.some(p => p.idNotificacion === n.idNotificacion))] : incoming)
          .sort((a, b) => Date.parse(b.fechaCreacion) - Date.parse(a.fechaCreacion) || b.idNotificacion - a.idNotificacion));
      } catch {
        if (alive && !signal.aborted && version === request) setError('No pudimos cargar las notificaciones. Revisa tu conexión e inténtalo de nuevo.');
      } finally {
        if (alive && version === request) { fetching = false; setLoading(false); setMore(false); }
      }
    };
    setItems([]); setMarking([]);
    reload.current = () => { void load(); }; loadMore.current = () => { void load(true); };
    mark.current = id => {
      if (!alive || writes.has(id)) return;
      const write = new AbortController(); writes.set(id, write); setMarking([...writes.keys()]);
      void markNotificationRead(id, write.signal).then(() => {
        if (!alive || write.signal.aborted) return;
        read.add(id); setItems(old => old.map(n => n.idNotificacion === id ? { ...n, leida: true } : n));
      }).catch(() => { if (alive && !write.signal.aborted) setError('No pudimos marcar la notificación como leída. Tócala para reintentar.'); })
        .finally(() => { writes.delete(id); if (alive) setMarking([...writes.keys()]); });
    };
    void load();
    const listener = AppState.addEventListener('change', status => {
      if (status === 'active') void load();
      else { ++version; controller?.abort(); fetching = false; }
    });
    return () => { alive = false; ++version; controller?.abort(); writes.forEach(c => c.abort()); listener.remove();
      reload.current = () => undefined; loadMore.current = () => undefined; mark.current = () => undefined; };
  }, [category]));
  return { items, cursor, loading, more, error, marking, reload: () => reload.current(), loadMore: () => loadMore.current(), markRead: (id: number) => mark.current(id) };
}
