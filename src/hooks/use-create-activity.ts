import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSession } from '@/context/session';
import { createActivity, CreateActivityError } from '@/services/activities';
import type { ActivityInput } from '@/utils/create-activity';

export function useCreateActivity(id: number, onCreated: () => void) {
  const { manager } = useSession();
  const active = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const completed = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<CreateActivityError | null>(null);
  useFocusEffect(useCallback(() => {
    active.current = true;
    return () => { active.current = false; pending.current?.abort(); pending.current = null; };
  }, []));
  const submit = async (input: ActivityInput) => {
    if (!active.current || pending.current || completed.current) return;
    const controller = new AbortController(); pending.current = controller;
    const revision = manager.revision();
    const current = () => active.current && !controller.signal.aborted && pending.current === controller
      && manager.revision() === revision && manager.getSnapshot().status === 'authenticated';
    setSending(true); setError(null);
    try {
      await createActivity(id, input, controller.signal);
      if (current()) { completed.current = true; onCreated(); }
    }
    catch (failure) { if (current()) setError(failure instanceof CreateActivityError ? failure : new CreateActivityError('uncertain')); }
    finally { if (current()) setSending(false); if (pending.current === controller) pending.current = null; }
  };
  return { sending, error, submit };
}
