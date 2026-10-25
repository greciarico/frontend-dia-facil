import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { sessionManager } from '@/services/session';
const Context = createContext<typeof sessionManager | null>(null);
export function SessionProvider({ children, autoRestore = true }: { children: ReactNode; autoRestore?: boolean }) {
  useEffect(() => {
    if (autoRestore) void sessionManager.restore();
    const listener = AppState.addEventListener('change', value => {
      if (value === 'active') void sessionManager.flushRevocations().catch(() => undefined);
    });
    const revocations = setInterval(() => {
      if (AppState.currentState === 'active') void sessionManager.flushRevocations().catch(() => undefined);
    }, 30_000);
    return () => { listener.remove(); clearInterval(revocations); };
  }, [autoRestore]);
  return <Context.Provider value={sessionManager}>{children}</Context.Provider>;
}
export function useSession() {
  const manager = useContext(Context);
  if (!manager) throw new Error('Session provider is required');
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  return { manager, ...state };
}
