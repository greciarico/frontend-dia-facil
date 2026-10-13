import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useSession } from '@/context/session';
import { getProfiles } from '@/services/profiles';
import type { ProfilesResponse } from '@/utils/profiles';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: ProfilesResponse; owner: number };
export function useProfiles() {
  const { manager, caregiver } = useSession();
  const owner = caregiver?.idCuidador;
  const active = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<State>({ status: 'loading' });
  const load = useCallback(async () => {
    if (!active.current || !owner || request.current) return;
    const controller = new AbortController(); request.current = controller;
    const epoch = manager.revision();
    const current = () => active.current && !controller.signal.aborted && request.current === controller
      && manager.revision() === epoch && manager.getSnapshot().status === 'authenticated'
      && manager.getSnapshot().caregiver?.idCuidador === owner;
    setState({ status: 'loading' });
    try {
      const data = await getProfiles(controller.signal);
      if (current()) setState({ status: 'ready', data, owner });
    } catch {
      if (current()) setState({ status: 'error' });
    } finally { if (request.current === controller) request.current = null; }
  }, [manager, owner]);
  useFocusEffect(useCallback(() => {
    active.current = true; void load();
    return () => { active.current = false; request.current?.abort(); request.current = null; };
  }, [load]));
  return { state: state.status === 'ready' && state.owner !== owner ? { status: 'loading' as const } : state, reload: load };
}
