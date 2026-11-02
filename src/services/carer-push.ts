import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { sessionManager } from './session';
import { operationKey } from '@/utils/operation-key';
import { getAuthenticatedHttpClient, type PrivateRequestOptions } from './private-http';

export function pushSupported() {
  return Platform.OS === 'android' && Constants.executionEnvironment !== 'storeClient' && Constants.expoConfig?.extra?.push?.enabled === true && !!Constants.expoConfig?.extra?.eas?.projectId;
}
let native: Promise<typeof import('expo-notifications')> | undefined;
export function notificationsNative() {
  if (!pushSupported()) throw new Error('Los avisos requieren una compilación Android propia configurada.');
  return native ??= import('expo-notifications');
}
let installationFlight: Promise<string> | undefined;
export function installationId() {
  return installationFlight ??= (async () => {
    const existing = await SecureStore.getItemAsync('diafacil.push.installation');
    if (existing) return existing;
    const id = operationKey();
    await SecureStore.setItemAsync('diafacil.push.installation', id);
    return id;
  })().catch(error => { installationFlight = undefined; throw error; });
}
export async function registerPush(idInstalacion: string, expoToken: string, signal: AbortSignal, etag: string, expectedRevision = sessionManager.revision()) {
  assertEtag(etag);
  const response = await getAuthenticatedHttpClient().put('/api/push/registro', { idInstalacion, expoToken, plataforma: 'ANDROID' },
    { signal, expectedRevision, authReplaySafe: true, headers: { 'If-Match': etag } } as PrivateRequestOptions);
  const v = response.data;
  if (!v || v.activo !== true || ![v.idRegistro, v.generacion, v.idCuidador].every(n => Number.isSafeInteger(n) && n > 0)
    || v.proyectoEas !== Constants.expoConfig?.extra?.eas?.projectId) throw new Error('Registro inválido.');
  return { ...v, etag: responseEtag(response) } as { idRegistro: number; generacion: number; idCuidador: number; etag: string };
}
function assertEtag(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^"[0-9a-f]{64}"$/.test(value)) throw new Error('Invalid push precondition');
}
function responseEtag(response: { headers: Record<string, unknown> }) {
  const tag = response.headers.etag;
  assertEtag(tag);
  return tag;
}
export async function unregisterPush(idInstalacion: string, signal: AbortSignal, etag: string, expectedRevision = sessionManager.revision()) {
  assertEtag(etag);
  const response = await getAuthenticatedHttpClient().delete('/api/push/registro', {
    signal, expectedRevision, params: { idInstalacion }, authReplaySafe: true, headers: { 'If-Match': etag },
  } as PrivateRequestOptions);
  return responseEtag(response);
}
export type PushPreference = 'enabled' | 'disabled' | 'disable-pending';
export type PushPreferenceState = { version: 1; intentId: string; preference: PushPreference };
const preferenceKey = (caregiver: number, installation: string) => 'diafacil.push.preference.' + caregiver + '.' + installation;
const preferenceWrites = new Map<string, Promise<unknown>>();
function serialized<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const task = (preferenceWrites.get(key) ?? Promise.resolve()).catch(() => undefined).then(operation);
  preferenceWrites.set(key, task);
  const clear = () => { if (preferenceWrites.get(key) === task) preferenceWrites.delete(key); };
  void task.then(clear, clear);
  return task;
}
function decodePreference(raw: string | null): PushPreferenceState {
  if (raw === null || ['enabled', 'disabled', 'disable-pending'].includes(raw)) {
    return { version: 1, intentId: operationKey(), preference: (raw ?? 'enabled') as PushPreference };
  }
  const value = JSON.parse(raw);
  if (value?.version !== 1 || typeof value.intentId !== 'string' || !value.intentId
    || !['enabled', 'disabled', 'disable-pending'].includes(value.preference)) throw new Error('Invalid push preference');
  return { version: 1, intentId: value.intentId, preference: value.preference };
}
export function readPushPreference(caregiver: number, installation: string): Promise<PushPreferenceState> {
  const key = preferenceKey(caregiver, installation);
  return serialized(key, async () => {
    const raw = await SecureStore.getItemAsync(key);
    const value = decodePreference(raw);
    // Upgrade legacy strings and preserve the existing default without changing Android permission behavior.
    if (raw === null || !raw.startsWith('{')) await SecureStore.setItemAsync(key, JSON.stringify(value));
    return value;
  });
}
export function writePushPreference(caregiver: number, installation: string, preference: PushPreference,
  expectedIntentId?: string, isCurrent: () => boolean = () => true): Promise<PushPreferenceState> {
  const key = preferenceKey(caregiver, installation);
  return serialized(key, async () => {
    if (!isCurrent()) throw new Error('PUSH_STALE_INTENT');
    const current = decodePreference(await SecureStore.getItemAsync(key));
    if (!isCurrent() || expectedIntentId !== undefined && current.intentId !== expectedIntentId) throw new Error('PUSH_STALE_INTENT');
    const value: PushPreferenceState = { version: 1, intentId: expectedIntentId ?? operationKey(), preference };
    await SecureStore.setItemAsync(key, JSON.stringify(value));
    return value;
  });
}
export async function getPushRegistration(idInstalacion: string, signal: AbortSignal, expectedRevision = sessionManager.revision()) {
  const response = await getAuthenticatedHttpClient().get('/api/push/registro', {
    signal, expectedRevision, params: { idInstalacion }, authReplaySafe: true,
  } as PrivateRequestOptions);
  const v = response.data;
  if (!v || typeof v.activo !== 'boolean' || !Number.isSafeInteger(v.idCuidador) || v.idCuidador <= 0
    || v.proyectoEas !== Constants.expoConfig?.extra?.eas?.projectId
    || (v.activo && ![v.idRegistro, v.generacion].every(n => Number.isSafeInteger(n) && n > 0))) throw new Error('Invalid push registration');
  return { ...v, etag: responseEtag(response) } as { activo: boolean; idRegistro: number | null; generacion: number | null; idCuidador: number; proyectoEas: string; etag: string };
}
const refreshListeners = new Set<() => void>();
export const pushRefresh = {
  subscribe(listener: () => void) { refreshListeners.add(listener); return () => { refreshListeners.delete(listener); }; },
  emit() { refreshListeners.forEach(fn => fn()); },
};
