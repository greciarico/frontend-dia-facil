import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { useSession } from '@/context/session';
import { getFollowUp, type FollowUpDay } from '@/services/follow-up';

type Result = {
  profile: number; revision: number; date?: string;
  status: 'loading' | 'error' | 'ready'; data?: FollowUpDay;
};

export function useFollowUp(profile: number | undefined, date: string | undefined, enabled: boolean) {
  const { manager } = useSession();
  const revision = manager.revision();
  const [result, setResult] = useState<Result>();
  const [initial, setInitial] = useState<{ profile: number; revision: number; routine: boolean; latest: FollowUpDay }>();
  const reloadRef = useRef<() => void>(() => undefined);
  const reload = useCallback(() => reloadRef.current(), []);
  useFocusEffect(useCallback(() => {
    if (!profile || !enabled) return;
    let current: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const key = { profile, revision, date };
    const cancel = () => { current?.abort(); clearTimeout(timer); };
    const load = (dayChanged = false) => {
      cancel();
      const controller = new AbortController();
      current = controller;
      const started = performance.now();
      const publish = () => active && !controller.signal.aborted && manager.revision() === revision;
      setResult(old => ({ ...key, status: 'loading',
        data: (!dayChanged || date !== undefined) && old?.profile === profile && old.revision === revision && old.date === date ? old.data : undefined }));
      void getFollowUp(profile, date, revision, controller.signal).then(data => {
        if (!publish()) return;
        setResult({ ...key, status: 'ready', data });
        setInitial(old => ({ profile, revision, latest: data,
          routine: old?.profile === profile && old.revision === revision ? old.routine : !data.tieneActividadesActivas && !data.tieneHistorial }));
        timer = setTimeout(() => load(true), Math.max(0, data.actualizarEnSegundos * 1000 - (performance.now() - started)));
      }).catch(() => {
        if (publish()) setResult(old => ({ ...key, status: 'error', data: old?.data }));
      });
    };
    reloadRef.current = load;
    load();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') load(true); else cancel(); });
    return () => {
      active = false; cancel(); listener.remove(); reloadRef.current = () => undefined;
    };
  }, [profile, date, enabled, manager, revision]));
  const state = result && result.profile === profile && result.revision === revision && result.date === date ? result : undefined;
  const metadata = initial?.profile === profile && initial?.revision === revision ? initial : undefined;
  return { state, reload, initialRoutine: metadata?.routine,
    calendar: metadata && { ...metadata.latest, fecha: date ?? metadata.latest.fechaActual } };
}
