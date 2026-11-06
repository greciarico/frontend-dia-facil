import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSession } from '@/context/session';
import { ActivityTemplateError, getActivityTemplate } from '@/services/activity-templates';
import { activityQuery, activitySuggestionDebounceMs } from '@/utils/activity-icon-options';
import type { ActivityTemplate } from '@/utils/activity-draft';
export type TemplateState = { status: 'idle' | 'loading' | 'error' | 'invalid-response' }
  | { status: 'ready'; template: ActivityTemplate | null };
export function useActivityTemplate(name: string) {
  const { manager, caregiver } = useSession();
  const revision = manager.revision();
  const owner = caregiver?.idCuidador;
  const query = activityQuery(name);
  const eligible = query.length >= 3 && name.length <= 80;
  const [attempt, setAttempt] = useState(0);
  const key = `${owner}:${revision}:${query}:${attempt}`;
  const [result, setResult] = useState<{ key: string; state: TemplateState }>();
  useFocusEffect(useCallback(() => {
    if (!eligible || !owner) return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && manager.revision() === revision;
    setResult({ key, state: { status: 'loading' } });
    const timer = setTimeout(() => {
      void getActivityTemplate(query, controller.signal).then(template => {
        if (current()) setResult({ key, state: { status: 'ready', template } });
      }).catch(error => {
        if (current()) setResult({ key, state: { status: error instanceof ActivityTemplateError && error.kind === 'invalid-response' ? 'invalid-response' : 'error' } });
      });
    }, activitySuggestionDebounceMs);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [eligible, owner, revision, manager, query, key]));
  const state: TemplateState = !eligible ? { status: 'idle' }
    : result?.key === key ? result.state : { status: 'loading' };
  return { state, retry: () => setAttempt(value => value + 1) };
}
