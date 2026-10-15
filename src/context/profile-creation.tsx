import { createContext, useContext, useState, type ReactNode } from 'react';
import { useSession } from '@/context/session';
import type { UserProfile } from '@/utils/profiles';

type Result = { owner: number; revision: number; profile: UserProfile };
const Context = createContext<{ result: Result | null; complete: (profile: UserProfile) => void } | null>(null);
/** Scoped to this flow only; never stored or passed as a route parameter. */
export function ProfileCreationProvider({ children }: { children: ReactNode }) {
  const { caregiver, manager } = useSession();
  const [result, setResult] = useState<Result | null>(null);
  return <Context.Provider value={{ result, complete: profile => {
    if (caregiver) setResult({ owner: caregiver.idCuidador, revision: manager.revision(), profile });
  } }}>{children}</Context.Provider>;
}
export function useProfileCreation() {
  const value = useContext(Context);
  const { caregiver, manager } = useSession();
  if (!value) throw new Error('Profile creation provider is required');
  return { complete: value.complete, created: value.result?.owner === caregiver?.idCuidador
    && value.result?.revision === manager.revision() ? value.result?.profile : undefined };
}
