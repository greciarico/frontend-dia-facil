import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { ContentSpeechSession, StepSpeech, type SpokenContent } from '@/services/step-speech';
import { useDeviceAccess } from '@/context/device-access';
import { deviceAccess } from '@/services/device-access';
import { useProfileAppearance } from '@/theme/profile-appearance';

/** Owned by the route, not its conditional loading/content subtree. No persistence or execution effects. */
export function useContentSpeech(scope: string, content?: SpokenContent) {
  const preferences = useProfileAppearance(), device = useDeviceAccess();
  const owner = `${device.profile?.idPerfilUsuario}:${deviceAccess.revision()}`;
  const [mountedOwner] = useState(owner);
  // The existing keyed profile provider remounts us for a new identity; never speak stale route data across it.
  const enabled = preferences?.lecturaVoz === true && device.status === 'linked' && owner === mountedOwner;
  const identity = `${owner}:${scope}`;
  const session = useMemo(() => new ContentSpeechSession(new StepSpeech(Speech), AppState.currentState == null || AppState.currentState === 'active'), []);
  const [entry, setEntry] = useState(0);
  const state = useSyncExternalStore(session.speech.subscribe, session.speech.getSnapshot, session.speech.getSnapshot);
  const key = content?.key, text = content?.text;
  useEffect(() => { session.update({ identity, enabled, content: key && text ? { key, text } : undefined }, entry); }, [session, identity, enabled, key, text, entry]);
  // Reconcile on the post-focus render, after the query has entered loading; do not read a cached pre-blur snapshot.
  useFocusEffect(useCallback(() => { setEntry(session.focus(true)); return () => session.blur(); }, [session]));
  useEffect(() => {
    const listener = AppState.addEventListener('change', value => session.setForeground(value === 'active'));
    return () => { listener.remove(); session.blur(); };
  }, [session]);
  return { enabled, ...state, repeat: session.repeat };
}
