import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useSession } from '@/context/session';
import { getProfile, ProfileDetailError } from '@/services/profiles';
import type { UserProfile } from '@/utils/profiles';

type DetailState = { status: 'loading' | 'error' | 'not-found' } | { status: 'ready'; profile: UserProfile };
type Result = { id: number; owner: number; revision: number; state: DetailState };
export function useProfileDetail(id: number | undefined) {
  const { manager, caregiver } = useSession();
  const owner = caregiver?.idCuidador;
  const active = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const [result, setResult] = useState<Result>();
  const load = useCallback(async () => {
    if (!id || !owner || !active.current || pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    const revision = manager.revision();
    const current = () => active.current && !controller.signal.aborted && pending.current === controller
      && manager.revision() === revision && manager.getSnapshot().status === 'authenticated'
      && manager.getSnapshot().caregiver?.idCuidador === owner;
    const publish = (state: DetailState) => { if (current()) setResult({ id, owner, revision, state }); };
    publish({ status: 'loading' });
    try { publish({ status: 'ready', profile: await getProfile(id, controller.signal) }); }
    catch (error) { publish({ status: error instanceof ProfileDetailError && error.kind === 'not-found' ? 'not-found' : 'error' }); }
    finally { if (pending.current === controller) pending.current = null; }
  }, [id, owner, manager]);
  useFocusEffect(useCallback(() => {
    active.current = true; void load();
    return () => { active.current = false; pending.current?.abort(); pending.current = null; };
  }, [load]));
  const state: DetailState = !id ? { status: 'not-found' }
    : result?.id === id && result.owner === owner && result.revision === manager.revision() ? result.state : { status: 'loading' };
  return { state, reload: load };
}
