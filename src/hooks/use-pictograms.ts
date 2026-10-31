import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSession } from '@/context/session';
import { getPictograms, PictogramsError, type ArasaacPictogram } from '@/services/pictograms';

export type PictogramsState = { status: 'idle' | 'loading' | 'error' | 'invalid-response' }
  | { status: 'ready'; pictograms: ArasaacPictogram[] };
export function usePictograms(text: string) {
  const { manager, caregiver } = useSession();
  const revision = manager.revision();
  const owner = caregiver?.idCuidador;
  const query = text.trim().replace(/\s+/g, ' ');
  const eligible = query.length >= 3 && text.length <= 120;
  const [attempt, setAttempt] = useState(0);
  const key = `${owner}:${revision}:${query}:${attempt}`;
  const [result, setResult] = useState<{ key: string; state: PictogramsState }>();
  useFocusEffect(useCallback(() => {
    if (!eligible || !owner) return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && manager.revision() === revision;
    setResult({ key, state: { status: 'loading' } });
    const timer = setTimeout(() => {
      void getPictograms(query, controller.signal).then(pictograms => {
        if (current()) setResult({ key, state: { status: 'ready', pictograms } });
      }).catch(error => {
        if (current()) setResult({ key, state: { status: error instanceof PictogramsError && error.kind === 'invalid-response' ? 'invalid-response' : 'error' } });
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [eligible, owner, revision, manager, query, key]));
  const state: PictogramsState = !eligible ? { status: 'idle' }
    : result?.key === key ? result.state : { status: 'loading' };
  return { state, query, retry: () => setAttempt(value => value + 1) };
}
