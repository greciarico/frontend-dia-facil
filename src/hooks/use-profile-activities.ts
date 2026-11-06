import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useSession } from '@/context/session';
import { getProfile, ProfileDetailError } from '@/services/profiles';
import { ActivitiesError, getActivities } from '@/services/activities';
import type { UserProfile } from '@/utils/profiles';
import type { ProfileActivities } from '@/utils/activities';

type ActivitiesState = { status: 'loading' | 'error' | 'not-found' }
  | { status: 'ready'; profile: UserProfile; data: ProfileActivities };
type Result = { id: number; owner: number; revision: number; state: ActivitiesState };

export function useProfileActivities(id: number | undefined) {
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
    const publish = (state: ActivitiesState) => { if (current()) setResult({ id, owner, revision, state }); };
    publish({ status: 'loading' });
    try {
      const profile = await getProfile(id, controller.signal);
      if (!current()) return;
      const data = await getActivities(id, controller.signal);
      publish({ status: 'ready', profile, data });
    } catch (error) {
      const unavailable = (error instanceof ProfileDetailError || error instanceof ActivitiesError) && error.kind === 'not-found';
      publish({ status: unavailable ? 'not-found' : 'error' });
    } finally { if (pending.current === controller) pending.current = null; }
  }, [id, owner, manager]);
  useFocusEffect(useCallback(() => {
    active.current = true; void load();
    return () => { active.current = false; pending.current?.abort(); pending.current = null; };
  }, [load]));
  const state: ActivitiesState = !id ? { status: 'not-found' }
    : result?.id === id && result.owner === owner && result.revision === manager.revision() ? result.state : { status: 'loading' };
  return { state, reload: load };
}
