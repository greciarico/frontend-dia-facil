import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSession } from '@/context/session';
import { ActivityIconsError, getActivityIcons } from '@/services/activity-icons';
import { activityQuery, activitySuggestionDebounceMs, type ActivityIconOption } from '@/utils/activity-icon-options';

export type IconOptionsState = { status: 'idle' | 'loading' | 'error' | 'invalid-response' }
  | { status: 'ready'; icons: ActivityIconOption[] };
type Result = { key: string; state: IconOptionsState };

/** Independent requests: changing the name never replaces or reloads the full catalogue. */
export function useActivityIcons(enabled: boolean, name: string) {
  const { manager, caregiver } = useSession();
  const revision = manager.revision();
  const owner = caregiver?.idCuidador;
  const [catalogueResult, setCatalogue] = useState<Result>();
  const [suggestionResult, setSuggestions] = useState<Result>();
  const [catalogueRetry, setCatalogueRetry] = useState(0);
  const [suggestionRetry, setSuggestionRetry] = useState(0);
  const query = activityQuery(name);
  const eligible = enabled && query.length >= 3 && name.length <= 80;
  const sessionKey = `${owner}:${revision}`;
  const catalogueKey = `${sessionKey}:${catalogueRetry}`;
  const suggestionKey = `${sessionKey}:${query}:${suggestionRetry}`;

  useFocusEffect(useCallback(() => {
    if (!enabled || !owner) return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && manager.revision() === revision;
    setCatalogue({ key: catalogueKey, state: { status: 'loading' } });
    void getActivityIcons(controller.signal).then(icons => {
      if (current()) setCatalogue({ key: catalogueKey, state: { status: 'ready', icons } });
    }).catch(error => {
      if (current()) setCatalogue({ key: catalogueKey, state: { status: error instanceof ActivityIconsError ? error.kind === 'invalid-response' ? 'invalid-response' : 'error' : 'error' } });
    });
    return () => controller.abort();
  }, [enabled, owner, revision, manager, catalogueKey]));

  useFocusEffect(useCallback(() => {
    if (!eligible || !owner) return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && manager.revision() === revision;
    setSuggestions({ key: suggestionKey, state: { status: 'loading' } });
    const timer = setTimeout(() => {
      void getActivityIcons(controller.signal, query).then(icons => {
        if (current()) setSuggestions({ key: suggestionKey, state: { status: 'ready', icons } });
      }).catch(error => {
        if (current()) setSuggestions({ key: suggestionKey, state: { status: error instanceof ActivityIconsError ? error.kind === 'invalid-response' ? 'invalid-response' : 'error' : 'error' } });
      });
    }, activitySuggestionDebounceMs);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [eligible, owner, revision, manager, query, suggestionKey]));

  const catalogue: IconOptionsState = !enabled ? { status: 'idle' }
    : catalogueResult?.key === catalogueKey ? catalogueResult.state : { status: 'loading' };
  const suggestions: IconOptionsState = !eligible ? { status: 'idle' }
    : suggestionResult?.key === suggestionKey ? suggestionResult.state : { status: 'loading' };
  return { catalogue, suggestions, query,
    retryCatalogue: () => setCatalogueRetry(value => value + 1),
    retrySuggestions: () => setSuggestionRetry(value => value + 1) };
}
