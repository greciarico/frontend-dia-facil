import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { getUserAgenda } from '@/services/user-agenda';
import type { UserAgenda } from '@/utils/user-agenda';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; agenda: UserAgenda };
export function useUserAgenda() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const reloadRef = useRef<() => void>(() => undefined);
  const reload = useCallback(() => reloadRef.current(), []);
  useFocusEffect(useCallback(() => {
    let alive = true, version = 0;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      const request = ++version;
      controller?.abort(); clearTimeout(timer); controller = new AbortController();
      const signal = controller.signal;
      const started = performance.now();
      // Never present yesterday's completion states as today's while refreshing.
      setState({ status: 'loading' });
      void getUserAgenda(signal).then(agenda => {
        if (!alive || signal.aborted || request !== version) return;
        setState({ status: 'ready', agenda });
        timer = setTimeout(load, Math.max(0, agenda.actualizarEnSegundos * 1000 - (performance.now() - started)));
      }).catch(() => {
        if (alive && !signal.aborted && request === version) setState({ status: 'error' });
      });
    };
    reloadRef.current = load; load();
    const listener = AppState.addEventListener('change', next => {
      if (next === 'active') load();
      else { ++version; controller?.abort(); clearTimeout(timer); }
    });
    return () => { alive = false; ++version; controller?.abort(); clearTimeout(timer); listener.remove(); reloadRef.current = () => undefined; };
  }, []));
  return { state, reload };
}
