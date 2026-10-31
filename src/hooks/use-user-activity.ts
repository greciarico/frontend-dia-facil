import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { getUserActivityDetail } from '@/services/user-agenda';
import { DeviceFailure } from '@/services/device-access-manager';
import type { UserActivityDetail } from '@/utils/user-activity';

type State = { status: 'loading' | 'error' | 'not-found' } | { status: 'ready'; detail: UserActivityDetail };
export function useUserActivity(id: number | undefined) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const reloadRef = useRef<() => void>(() => undefined);
  const reload = useCallback(() => reloadRef.current(), []);
  useFocusEffect(useCallback(() => {
    if (!id) { setState({ status: 'not-found' }); return; }
    let alive = true, version = 0;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      const request = ++version;
      controller?.abort(); clearTimeout(timer); controller = new AbortController();
      const signal = controller.signal, started = performance.now();
      setState({ status: 'loading' });
      void getUserActivityDetail(id, signal).then(detail => {
        if (!alive || signal.aborted || request !== version) return;
        setState({ status: 'ready', detail });
        timer = setTimeout(load, Math.max(0, detail.actualizarEnSegundos * 1000 - (performance.now() - started)));
      }).catch(error => {
        if (alive && !signal.aborted && request === version) setState({ status: error instanceof DeviceFailure && error.kind === 'not-found' ? 'not-found' : 'error' });
      });
    };
    reloadRef.current = load; load();
    const listener = AppState.addEventListener('change', next => {
      if (next === 'active') load();
      else { ++version; controller?.abort(); clearTimeout(timer); }
    });
    return () => { alive = false; ++version; controller?.abort(); clearTimeout(timer); listener.remove(); reloadRef.current = () => undefined; };
  }, [id]));
  return { state, reload };
}
