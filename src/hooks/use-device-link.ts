import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useSession } from '@/context/session';
import { DeviceLinkError, getDeviceLink, renewDeviceLink, type DeviceLink } from '@/services/device-link';
import { remainingRenewalSeconds, renewalDeadline } from '@/utils/device-link-cooldown';

type LinkState = { status: 'loading' | 'renewing' | 'error' | 'not-found' }
  | { status: 'ready'; data: DeviceLink; deadline: number; remainingSeconds: number; notice?: string };
type Result = { id: number; owner: number; revision: number; state: LinkState };

export function useDeviceLink(id: number | undefined) {
  const { manager, caregiver } = useSession();
  const owner = caregiver?.idCuidador;
  const active = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const ready = useRef<{ id: number; owner: number; revision: number; code: string; deadline: number } | null>(null);
  const [result, setResult] = useState<Result>();
  const run = useCallback(async (expected?: string) => {
    if (!id || !owner || !active.current || pending.current) return;
    const available = ready.current;
    if (expected !== undefined && (!available || available.id !== id || available.owner !== owner
      || available.revision !== manager.revision() || available.code !== expected
      || remainingRenewalSeconds(available.deadline) > 0)) return;
    const controller = new AbortController(); pending.current = controller;
    const revision = manager.revision();
    const current = () => active.current && !controller.signal.aborted && pending.current === controller
      && manager.revision() === revision && manager.getSnapshot().status === 'authenticated'
      && manager.getSnapshot().caregiver?.idCuidador === owner;
    const publish = (state: LinkState) => { if (current()) setResult({ id, owner, revision, state }); };
    const publishReady = (data: DeviceLink, notice?: string) => {
      if (!current()) return;
      const deadline = renewalDeadline(data.renovacionEnSegundos);
      ready.current = { id, owner, revision, code: data.codigoVinculacion, deadline };
      publish({ status: 'ready', data, deadline, remainingSeconds: data.renovacionEnSegundos, notice });
    };
    ready.current = null;
    publish({ status: expected === undefined ? 'loading' : 'renewing' });
    try {
      if (expected === undefined) publishReady(await getDeviceLink(id, controller.signal));
      else {
        try {
          const data = await renewDeviceLink(id, expected, controller.signal);
          publishReady(data, 'Código renovado. Los dispositivos vinculados siguen funcionando.');
        } catch (error) {
          if (!current()) return;
          if (error instanceof DeviceLinkError && error.kind === 'not-found') throw error;
          // Never replay a POST with an unknown outcome. Recover the authoritative code via GET.
          const data = await getDeviceLink(id, controller.signal);
          publishReady(data, error instanceof DeviceLinkError && error.kind === 'changed'
            ? 'El código cambió desde otra solicitud. Mostramos el código actual.'
            : error instanceof DeviceLinkError && error.kind === 'cooldown'
              ? 'Espera antes de renovar nuevamente el código.'
              : 'No pudimos confirmar la renovación. Mostramos el código actual consultado al servidor.');
        }
      }
    } catch (error) {
      publish({ status: error instanceof DeviceLinkError && error.kind === 'not-found' ? 'not-found' : 'error' });
    } finally { if (pending.current === controller) pending.current = null; }
  }, [id, owner, manager]);
  useFocusEffect(useCallback(() => {
    let focused = true;
    const revision = manager.revision();
    active.current = true; void run();
    const timer = setInterval(() => {
      if (!focused || AppState.currentState !== 'active' || manager.revision() !== revision) return;
      setResult(result => {
        if (!focused || manager.revision() !== revision || !result || result.id !== id || result.owner !== owner
          || result.revision !== revision || result.state.status !== 'ready') return result;
        const remainingSeconds = remainingRenewalSeconds(result.state.deadline);
        return remainingSeconds === result.state.remainingSeconds ? result
          : { ...result, state: { ...result.state, remainingSeconds } };
      });
    }, 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void run(); });
    return () => { focused = false; active.current = false; clearInterval(timer); subscription.remove();
      pending.current?.abort(); pending.current = null; ready.current = null; };
  }, [run, id, owner, manager]));
  const state: LinkState = !id ? { status: 'not-found' }
    : result?.id === id && result.owner === owner && result.revision === manager.revision() ? result.state : { status: 'loading' };
  return { state, reload: useCallback(() => run(), [run]), renew: useCallback((code: string) => run(code), [run]) };
}
