import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Linking } from 'react-native';
import Constants from 'expo-constants';
import type { DevicePushToken, NotificationPermissionsStatus } from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useSession } from './session';
import { useDeviceAccess } from './device-access';
import { installationId, notificationsNative, pushRefresh, pushSupported, registerPush, unregisterPush, getPushRegistration, readPushPreference, writePushPreference, type PushPreference } from '@/services/carer-push';
import { PrivateHttpError } from '@/services/private-http';
import { getNotification } from '@/services/carer-notifications';
import { parsePushIntent, pushDecision, PushIntents } from '@/utils/push-intent';

const PUSH_RECONCILE_TIMEOUT_MS = 45_000;

type Status = 'unsupported' | 'idle' | 'checking' | 'denied' | 'enabled' | 'error' | 'disabled' | 'disable-pending';
type PushStage = 'canal' | 'permisos' | 'token-nativo' | 'token-expo' | 'almacenamiento' | 'registro';
const Context = createContext({ status: 'idle' as Status, enabled: false, busy: false, deactivate: () => {}, errorStage: null as PushStage | null, errorCode: null as 'TIEMPO_AGOTADO' | 'VALIDACION' | 'OPERACION_FALLIDA' | null, activate: () => {}, refresh: () => {}, settings: () => {}, visible: (_ids: number[]) => {} });
export const useCarerPush = () => useContext(Context);
export function CarerPushProvider({ children }: { children: ReactNode }) {
  const session = useSession(), device = useDeviceAccess(), navigation = useRootNavigationState();
  const owner = session.status === 'authenticated' && session.stage === 'ready' && device.status === 'unlinked' ? session.caregiver?.idCuidador : undefined;
  const revision = session.manager.revision();
  const activeRequest = useRef<AbortController | null>(null);
  const current = useRef(owner); const visibleIds = useRef<number[]>([]); const intents = useRef(new PushIntents());
  const [status, setStatus] = useState<Status>(pushSupported() ? 'idle' : 'unsupported');
  const [errorStage, setErrorStage] = useState<PushStage | null>(null);
  const [errorCode, setErrorCode] = useState<'TIEMPO_AGOTADO' | 'VALIDACION' | 'OPERACION_FALLIDA' | null>(null);
  const [confirmed, setConfirmed] = useState<{ owner: number; revision: number } | null>(null);
  const permissionFlight = useRef<Promise<NotificationPermissionsStatus> | null>(null);
  const [wake, setWake] = useState(0); const action = useRef<(explicit: boolean) => void>(() => {});
  const disableAction = useRef<() => void>(() => {});
  const registration = useRef<{ idRegistro: number; generacion: number; idCuidador: number; sessionRevision: number } | null>(null);
  useEffect(() => session.manager.onExit(() => {
    // Session revocation already has durable offline retry in SessionManager.
    // Do not schedule an authenticated DELETE after logout changed identity.
    current.current = undefined; registration.current = null; setConfirmed(null); visibleIds.current = [];
    activeRequest.current?.abort(); action.current = () => {}; disableAction.current = () => {};
    intents.current = new PushIntents();
    if (!pushSupported()) return;
    void notificationsNative().then(async n => {
      await n.dismissAllNotificationsAsync();
      await n.clearLastNotificationResponseAsync();
    }).catch(() => undefined);
  }), [session.manager]);
  useEffect(() => { current.current = owner; }, [owner]);
  useEffect(() => {
    if (!pushSupported()) return;
    let alive = true;
    const subscriptions: { remove(): void }[] = [];
    void notificationsNative().then(n => {
      if (!alive) return;
      n.setNotificationHandler({ handleNotification: async notification => {
        const data = parsePushIntent(notification.request.content.data);
        const record = registration.current;
        const show = alive && record?.sessionRevision === session.manager.revision() && !!data && pushDecision(data, current.current, record, true) === 'open' && !visibleIds.current.includes(data.idNotificacion);
        return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
      } });
      subscriptions.push(n.addNotificationReceivedListener(notification => {
        const data = parsePushIntent(notification.request.content.data);
        const record = registration.current;
        if (alive && record?.sessionRevision === session.manager.revision() && data && pushDecision(data, current.current, record, true) === 'open') pushRefresh.emit();
      }), n.addNotificationResponseReceivedListener(response => {
        intents.current.receive(response.notification.request.content.data); setWake(v => v + 1);
        void n.clearLastNotificationResponseAsync().catch(() => undefined);
      }));
      return n.getLastNotificationResponseAsync().then(response => {
        if (!alive || !response) return;
        intents.current.receive(response.notification.request.content.data); setWake(v => v + 1);
        void n.clearLastNotificationResponseAsync().catch(() => undefined);
      });
    }).catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; subscriptions.forEach(s => s.remove()); };
  }, [session.manager]);
  useEffect(() => {
    if (!pushSupported()) return;
    let alive = true, running = false, pending = false, pendingExplicit = false;
    let pendingToken: DevicePushToken | undefined, lastToken: string | undefined;
    let pendingChange: boolean | undefined, wanted: boolean | undefined;
    let choiceEpoch = 0;
    const controller = new AbortController();
    const valid = () => alive && !controller.signal.aborted && session.manager.revision() === revision && current.current === owner;
    registration.current = null;
    const subscriptions: { remove(): void }[] = [];
    const reconcile = async (explicit: boolean, suppliedToken?: DevicePushToken, change?: boolean) => {
      if (!owner || !valid()) return;
      if (change !== undefined) { wanted = change; choiceEpoch++; }
      if (suppliedToken && suppliedToken.data === lastToken && change === undefined) return;
      if (running) {
        if (change !== undefined) { pendingChange = change; activeRequest.current?.abort(); }
        else { pending = true; pendingExplicit ||= explicit; if (suppliedToken) pendingToken = suppliedToken; }
        return;
      }
      const attemptChoice = choiceEpoch;
      running = true; setStatus('checking'); setErrorStage(null); setErrorCode(null);
      const attempt = new AbortController(); activeRequest.current = attempt;
      let stage: PushStage = 'canal', timedOut = false, succeeded = false;
      const stopped = new Promise<never>((_resolve, reject) => {
        attempt.signal.addEventListener('abort', () => reject(new Error('PUSH_STOPPED')), { once: true });
      });
      void stopped.catch(() => undefined);
      const cancel = () => attempt.abort();
      controller.signal.addEventListener('abort', cancel, { once: true });
      const timer = setTimeout(() => { timedOut = true; attempt.abort(); }, PUSH_RECONCILE_TIMEOUT_MS);
      const wait = async <T,>(next: PushStage, operation: () => Promise<T>): Promise<T> => {
        stage = next;
        if (!valid() || attempt.signal.aborted || attemptChoice !== choiceEpoch) throw new Error('PUSH_STOPPED');
        const result = await Promise.race([operation(), stopped]);
        if (!valid() || attempt.signal.aborted || attemptChoice !== choiceEpoch) throw new Error('PUSH_STOPPED');
        return result;
      };
      let invalidResponse = false, preference: PushPreference | undefined;
      try {
        const id = await wait('almacenamiento', () => installationId());
        let choice = await wait('almacenamiento', () => readPushPreference(owner, id));
        preference = choice.preference;
        const currentAttempt = () => valid() && !attempt.signal.aborted && attemptChoice === choiceEpoch;
        if (change !== undefined || wanted === false && preference === 'enabled') {
          preference = (change ?? wanted) ? 'enabled' : 'disable-pending';
          choice = await wait('almacenamiento', () => writePushPreference(owner, id, preference!, undefined, currentAttempt));
          preference = choice.preference;
        }
        const persist = async (next: PushPreference) => {
          choice = await wait('almacenamiento', () => writePushPreference(owner, id, next, choice.intentId, currentAttempt));
          preference = choice.preference;
        };
        const remote = async () => {
          const value = await wait('registro', () => getPushRegistration(id, attempt.signal, revision));
          if (value.idCuidador !== owner) { invalidResponse = true; throw new Error('PUSH_INVALID_OWNER'); }
          return value;
        };
        const mutate = async <T,>(operation: (etag: string) => Promise<T>): Promise<T> => {
          for (let conflict = 0; ; conflict++) {
            const latest = await wait('almacenamiento', () => readPushPreference(owner, id));
            if (latest.intentId !== choice.intentId) throw new Error('PUSH_STALE_INTENT');
            const state = await remote();
            try { return await wait('registro', () => operation(state.etag)); }
            catch (error) {
              // Only the still-current intent may reconcile once after a precondition conflict.
              if (!(error instanceof PrivateHttpError) || error.status !== 412 || conflict !== 0 || !currentAttempt()) throw error;
            }
          }
        };
        if (preference !== 'enabled') {
          registration.current = null; setConfirmed(null); lastToken = undefined;
          await persist('disable-pending');
          // Even absent/inactive tokens need an acknowledged durable ordering fence.
          await mutate(etag => unregisterPush(id, attempt.signal, etag, revision));
          if ((await remote()).activo) throw new Error('PUSH_REVOCATION_PENDING');
          await persist('disabled');
          setStatus('disabled');
          void notificationsNative().then(n => n.dismissAllNotificationsAsync()).catch(() => undefined);
          return;
        }
        const n = await wait('canal', () => notificationsNative());
        const channelId = Constants.expoConfig?.extra?.push?.androidChannelId ?? 'diafacil-cuidador-v1';
        const channel = await wait('canal', () => n.getNotificationChannelAsync(channelId));
        if (!channel) {
          // Omitting sound uses Android's system sound; strings name custom audio files.
          await wait('canal', () => n.setNotificationChannelAsync(channelId, { name: 'Avisos del cuidador', importance: n.AndroidImportance.HIGH }));
        }
        let permission = await wait('permisos', () => n.getPermissionsAsync());
        if (explicit && !permission.granted && permission.canAskAgain) {
          permission = await wait('permisos', () => {
            if (!permissionFlight.current) {
              const flight = n.requestPermissionsAsync();
              permissionFlight.current = flight;
              const clear = () => { if (permissionFlight.current === flight) permissionFlight.current = null; };
              void flight.then(clear, clear);
            }
            return permissionFlight.current;
          });
        }
        if (!permission.granted) {
          registration.current = null; setConfirmed(null);
          setStatus(permission.canAskAgain ? 'idle' : 'denied');
          await mutate(etag => unregisterPush(id, attempt.signal, etag, revision));
          if ((await remote()).activo) throw new Error('PUSH_REVOCATION_PENDING');
          return;
        }
        const devicePushToken = suppliedToken ?? await wait('token-nativo', () => n.getDevicePushTokenAsync());
        // Pass the native token so Expo does not query it again and emit another token event.
        const token = await wait('token-expo', () => n.getExpoPushTokenAsync({ projectId: Constants.expoConfig!.extra!.eas.projectId, devicePushToken }));
        const registered = await mutate(etag => registerPush(id, token.data, attempt.signal, etag, revision));
        if (registered.idCuidador !== owner) { invalidResponse = true; throw new Error('PUSH_INVALID_OWNER'); }
        registration.current = { ...registered, sessionRevision: revision };
        lastToken = devicePushToken.data; succeeded = true;
        setConfirmed({ owner, revision }); setStatus('enabled'); setWake(v => v + 1);
      } catch {
        if (valid()) {
          registration.current = null; setConfirmed(null);
          setErrorStage(stage); setErrorCode(timedOut ? 'TIEMPO_AGOTADO' : invalidResponse ? 'VALIDACION' : 'OPERACION_FALLIDA');
          setStatus(wanted === false || preference && preference !== 'enabled' ? 'disable-pending' : 'error');
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[DiaFacil push]', { stage, code: timedOut ? 'TIEMPO_AGOTADO' : invalidResponse ? 'VALIDACION' : 'OPERACION_FALLIDA' });
        }
      } finally {
        clearTimeout(timer); controller.signal.removeEventListener('abort', cancel); attempt.abort();
        if (activeRequest.current === attempt) activeRequest.current = null;
        running = false;
        const retry = pending && succeeded && valid();
        const explicitRetry = pendingExplicit, nextToken = pendingToken;
        const nextChange = pendingChange;
        pending = false; pendingExplicit = false; pendingToken = undefined; pendingChange = undefined;
        if (nextChange !== undefined && valid()) void reconcile(nextChange, undefined, nextChange);
        else if (retry) void reconcile(explicitRetry, nextToken);
      }
    };
    action.current = explicit => { void reconcile(explicit, undefined, explicit ? true : undefined); };
    disableAction.current = () => { void reconcile(false, undefined, false); };
    if (owner) {
      void reconcile(false);
      void notificationsNative().then(n => { if (valid()) subscriptions.push(n.addPushTokenListener(token => { void reconcile(false, token); })); }).catch(() => undefined);
    } else {
      visibleIds.current = []; registration.current = null;
      void notificationsNative().then(n => n.dismissAllNotificationsAsync()).catch(() => undefined);
    }
    subscriptions.push(AppState.addEventListener('change', value => { if (value === 'active') { void reconcile(false); setWake(v => v + 1); } }));
    return () => { alive = false; controller.abort(); action.current = () => {}; disableAction.current = () => {}; subscriptions.forEach(s => s.remove()); };
  }, [owner, revision, session.manager]);
  useEffect(() => {
    const intent = intents.current.pending;
    if (!intent) return;
    const record = registration.current?.sessionRevision === revision ? registration.current : null;
    const decision = pushDecision(intent, owner, record, !!navigation?.key);
    if (decision === 'wait') return;
    if (decision === 'discard') { intents.current.consume(intent); return; }
    const controller = new AbortController();
    void getNotification(intent.idNotificacion, controller.signal, revision).then(() => {
      if (controller.signal.aborted || current.current !== owner || session.manager.revision() !== revision) return;
      router.push({ pathname: '/notificaciones', params: { pushId: String(intent.idNotificacion), pushKey: String(wake) } });
      intents.current.consume(intent);
    }).catch(error => {
      if (controller.signal.aborted || session.manager.revision() !== revision) return;
      if (error instanceof PrivateHttpError && [400, 401, 403, 404, 410].includes(error.status ?? 0)) intents.current.consume(intent);
      // Transient failures retry on foreground; opening a push never marks read.
    });
    return () => controller.abort();
  }, [owner, revision, session.manager, navigation?.key, wake]);
  const visible = useCallback((ids: number[]) => { visibleIds.current = ids; }, []);
  const refresh = useCallback(() => action.current(false), []);
  return <Context.Provider value={{ status: owner || status === 'unsupported' ? status : 'idle', enabled: !!owner && confirmed?.owner === owner && confirmed.revision === revision, busy: status === 'checking', deactivate: () => disableAction.current(), errorStage, errorCode, activate: () => action.current(true), refresh, settings: () => { void Linking.openSettings().catch(() => undefined); }, visible }}>{children}</Context.Provider>;
}
