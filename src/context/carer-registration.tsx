import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { registrationReducer, type PendingRegistration } from '@/utils/carer-registration';

type RegistrationContext = {
  pending: PendingRegistration | null;
  begin: (value: PendingRegistration) => void;
  clear: () => void;
};
const Context = createContext<RegistrationContext | null>(null);

/** Scoped to the carer navigator: unmounting or clearing drops the proof. */
export function CarerRegistrationProvider({ children }: { children: ReactNode }) {
  const [pending, dispatch] = useReducer(registrationReducer, null);
  const begin = useCallback((value: PendingRegistration) => dispatch({ type: 'pending', value }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const value = useMemo(() => ({ pending, begin, clear }), [pending, begin, clear]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCarerRegistration() {
  const context = useContext(Context);
  if (!context) throw new Error('Carer registration navigator is required.');
  return context;
}
