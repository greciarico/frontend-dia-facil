import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { helpOperation, UnconfirmedHelp } from '@/services/user-help';
import { deviceAccess, HelpHttpError } from '@/services/device-access';
import type { HelpContext } from '@/utils/help-notifications';

const HELP_COOLDOWN_MS = 60_000;
const COUNTDOWN_TICK_MS = 1_000;

type State = { busy: boolean; uncertain: boolean; success: boolean; message: string; until: number };
const initial: State = { busy: false, uncertain: false, success: false, message: '', until: 0 };
export function useHelpRequest(context?: HelpContext) {
  const [state, setState] = useState(initial), [now, setNow] = useState(() => Date.now());
  const operation = useRef<ReturnType<typeof helpOperation> | undefined>(undefined);
  const active = useRef(false), busy = useRef(false), generation = useRef(0), revision = useRef(deviceAccess.revision());
  const until = useRef(0), ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateClock = useCallback(() => {
    const currentTime = Date.now(); setNow(currentTime);
    if (ticker.current !== null) { clearInterval(ticker.current); ticker.current = null; }
    if (!active.current || until.current <= currentTime) return;
    ticker.current = setInterval(() => {
      if (!active.current) return;
      const currentTime = Date.now(); setNow(currentTime);
      if (currentTime >= until.current && ticker.current !== null) { clearInterval(ticker.current); ticker.current = null; }
    }, COUNTDOWN_TICK_MS);
  }, []);
  const reopen = useCallback(() => {
    setState(old => ({ ...old, success: false, message: old.uncertain ? old.message : '', until: until.current }));
  }, []);
  useFocusEffect(useCallback(() => {
    active.current = true;
    if (revision.current !== deviceAccess.revision()) { operation.current = undefined; until.current = 0; }
    revision.current = deviceAccess.revision(); busy.current = false;
    setState(old => ({ ...initial, until: until.current, uncertain: !!operation.current,
      message: operation.current ? 'Consulta si tu solicitud quedó registrada.' : old.success ? old.message : '' }));
    updateClock();
    const listener = AppState.addEventListener('change', status => { if (status === 'active' && active.current) updateClock(); });
    return () => {
      active.current = false; ++generation.current; busy.current = false;
      if (ticker.current !== null) { clearInterval(ticker.current); ticker.current = null; }
      listener.remove();
    };
  }, [updateClock]));
  const run = async (recovery = false) => {
    if (!active.current || busy.current || until.current > Date.now() || revision.current !== deviceAccess.revision()) return;
    if (recovery && !operation.current) return;
    busy.current = true; const version = ++generation.current, owner = deviceAccess.revision();
    const current = () => active.current && version === generation.current && owner === deviceAccess.revision();
    setState(old => ({ ...old, busy: true, message: '', success: false }));
    try {
      if (!recovery) operation.current ??= helpOperation(context);
      await (recovery ? operation.current!.recover() : operation.current!.write());
      if (!current()) return;
      operation.current = undefined;
      // Relative cooldown: do not interpret a server LocalDateTime in the phone's time zone.
      until.current = Date.now() + HELP_COOLDOWN_MS;
      updateClock();
      setState({ busy: false, uncertain: false, success: true, message: 'Tu solicitud de ayuda quedó registrada.', until: until.current });
    } catch (error) {
      if (!current()) return;
      if (!operation.current) {
        setState({ ...initial, message: 'No pudimos preparar tu solicitud. Cierra y vuelve a abrir la aplicación.' });
        return;
      }
      if (error instanceof HelpHttpError && error.status === 429) {
        operation.current = undefined; until.current = Date.now() + error.retryAfter * 1000;
        updateClock();
        setState({ ...initial, until: until.current, message: 'Ya pediste ayuda. Espera un momento antes de volver a solicitarla.' });
      } else if (recovery && error instanceof HelpHttpError && error.status === 404 && error.code === 'SOLICITUD_NO_ENCONTRADA') {
        setState({ ...initial, message: 'No encontramos la solicitud. Puedes enviarla de nuevo con la misma clave.' });
      } else if (error instanceof UnconfirmedHelp || recovery || !(error instanceof HelpHttpError)) {
        setState({ ...initial, uncertain: true, message: 'No pudimos confirmar el resultado. Consulta si tu solicitud quedó registrada.' });
      } else {
        operation.current = undefined;
        setState({ ...initial, message: 'No pudimos registrar tu solicitud. Revisa tu conexión o vuelve a abrir la actividad.' });
      }
    } finally { if (current()) busy.current = false; }
  };
  return { ...state, remaining: Math.max(0, Math.ceil((state.until - now) / 1000)), reopen,
    submit: () => run(false), recover: () => run(true) };
}
