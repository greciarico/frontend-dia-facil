import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { AccessibilityEditor } from '@/services/accessibility-editor';
import { getProfileAccessibility, patchProfileAccessibility, resetProfileAccessibility } from '@/services/accessibility';
import { sessionManager } from '@/services/session';

export function useAccessibilityEditor(id?: number) {
  const editor = useMemo(() => new AccessibilityEditor({
    get: signal => id ? getProfileAccessibility(id, signal) : Promise.reject({ status: 404 }),
    patch: (value, signal) => patchProfileAccessibility(id!, value, signal), reset: signal => resetProfileAccessibility(id!, signal),
    revision: () => sessionManager.revision(),
  }), [id]);
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  useFocusEffect(useCallback(() => { editor.enter(); return () => editor.leave(); }, [editor]));
  return { state, editor };
}
