import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { DeviceFailure } from '@/services/device-access-manager';
import { UnconfirmedExecution, type ExecutionOperation } from '@/services/user-execution';
import type { Guide } from '@/utils/user-execution';

export function useExecutionAction() {
  const mounted = useRef(true), visible = useRef(false), pending = useRef(false);
  const recovery = useRef<(() => Promise<void>) | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [blocked, setBlocked] = useState(false);
  const [code, setCode] = useState<string>();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useFocusEffect(useCallback(() => { visible.current = true; return () => { visible.current = false; }; }, []));
  async function run<T>(operation: ExecutionOperation<T>, onSuccess: (result: T) => void, onSnapshot?: (guide: Guide) => void) {
    if (pending.current || recovery.current) return;
    async function execute(readOnly: boolean) {
      if (pending.current) return;
      pending.current = true; setBusy(true); setError(''); setCode(undefined);
      try {
        const result = await (readOnly ? operation.recover() : operation.write()); recovery.current = null;
        if (mounted.current) setBlocked(false);
        if (mounted.current && visible.current) onSuccess(result);
      } catch (failure) {
        if (!mounted.current) return;
        if (failure instanceof UnconfirmedExecution) {
          if (failure.snapshot) {
            recovery.current = null; setBlocked(false); if (visible.current) onSnapshot?.(failure.snapshot);
          } else { recovery.current = () => execute(true); setBlocked(true); }
          setError(failure.message);
        } else {
          recovery.current = null; setBlocked(false);
          if (failure instanceof DeviceFailure && failure.code) setCode(failure.code);
          setError(failure instanceof DeviceFailure && failure.code === 'DIA_AGENDA_CAMBIADO'
            ? 'Comenzó un nuevo día. Vuelve al detalle de la actividad.' : 'No pudimos realizar esa acción. Consulta nuevamente la actividad.');
        }
      } finally { pending.current = false; if (mounted.current) setBusy(false); }
    }
    await execute(false);
  }
  return { busy, error, blocked, code, run, retryRecovery: () => { void recovery.current?.(); }, reset: () => {
    if (!pending.current && !recovery.current) { setError(''); setCode(undefined); }
  } };
}
