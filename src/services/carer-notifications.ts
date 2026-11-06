import { getAuthenticatedHttpClient, type PrivateRequestOptions } from './private-http';
import { sessionManager } from './session';
import { SessionFailure } from './session-manager';
import { parseNotification, parseNotificationPage, type NotificationCategory } from '@/utils/help-notifications';

export async function getNotifications(category: NotificationCategory, cursor: string | null, signal: AbortSignal) {
  const revision = sessionManager.revision();
  const response = await getAuthenticatedHttpClient().get('/api/notificaciones', { signal, expectedRevision: revision, params: { categoria: category, ...(cursor ? { cursor } : {}) } } as PrivateRequestOptions);
  if (revision !== sessionManager.revision()) throw new SessionFailure('canceled');
  return parseNotificationPage(response.data);
}
export async function getNotification(id: number, signal: AbortSignal, expectedRevision = sessionManager.revision()) {
  const revision = sessionManager.revision();
  const value = parseNotification((await getAuthenticatedHttpClient().get(`/api/notificaciones/${id}`, { signal, expectedRevision } as PrivateRequestOptions)).data);
  if (revision !== sessionManager.revision()) throw new SessionFailure('canceled');
  if (value.idNotificacion !== id) throw new Error('Notificación inválida.');
  return value;
}
export async function markNotificationRead(id: number, signal: AbortSignal) {
  const revision = sessionManager.revision();
  await getAuthenticatedHttpClient().put(`/api/notificaciones/${id}/leida`, undefined, { signal, expectedRevision: revision, authReplaySafe: true } as PrivateRequestOptions);
  if (revision !== sessionManager.revision()) throw new SessionFailure('canceled');
}
