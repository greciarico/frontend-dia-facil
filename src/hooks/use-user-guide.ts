import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { getGuide } from '@/services/user-execution';
import { DeviceFailure } from '@/services/device-access-manager';
import type { Guide } from '@/utils/user-execution';

type State = { status: 'loading' | 'error' | 'unavailable' } | { status: 'ready'; guide: Guide };
export function useUserGuide(id: number | undefined) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const execution = useRef<number | undefined>(undefined), reloadRef = useRef<() => void>(() => undefined);
  const owner = useRef(id);
  const applyRef = useRef<(guide: Guide) => void>(() => undefined);
  useFocusEffect(useCallback(() => {
    if (owner.current !== id) { owner.current = id; execution.current = undefined; }
    if (!id) { setState({ status: 'unavailable' }); return; }
    let alive = true, version = 0;
    let controller: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    const apply = (guide: Guide) => {
      if (!alive) return;
      clearTimeout(timer); execution.current = guide.idEjecucion ?? undefined;
      setState({ status: 'ready', guide });
      if (guide.vigente) timer = setTimeout(load, guide.actualizarEnSegundos * 1000);
    };
    const load = () => {
      const request = ++version; controller?.abort(); clearTimeout(timer); controller = new AbortController();
      const signal = controller.signal, started = performance.now(); setState({ status: 'loading' });
      void getGuide(id, signal, execution.current).then(guide => {
        if (!alive || signal.aborted || request !== version) return;
        apply(guide);
        if (guide.vigente) { clearTimeout(timer); timer = setTimeout(load, Math.max(0, guide.actualizarEnSegundos * 1000 - (performance.now() - started))); }
      }).catch(error => {
        if (alive && !signal.aborted && request === version) setState({ status: error instanceof DeviceFailure && ['not-found', 'guide-conflict'].includes(error.kind) ? 'unavailable' : 'error' });
      });
    };
    applyRef.current = guide => { ++version; controller?.abort(); apply(guide); };
    reloadRef.current = load; load();
    const listener = AppState.addEventListener('change', next => { if (next === 'active') load(); else { ++version; controller?.abort(); clearTimeout(timer); } });
    return () => { alive = false; ++version; controller?.abort(); clearTimeout(timer); listener.remove(); reloadRef.current = () => undefined; applyRef.current = () => undefined; };
  }, [id]));
  return { state, reload: () => reloadRef.current(), apply: (guide: Guide) => applyRef.current(guide) };
}
