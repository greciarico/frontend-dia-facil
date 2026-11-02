export type HelpContext = { idActividad: number; idEjecucion: number; idPasoActividad: number };
export type HelpRequest = { idSolicitudAyuda: number; claveOperacion: string; fechaSolicitud: string; estado: 'PENDIENTE' | 'ATENDIDA';
  idActividad: number | null; idEjecucion: number | null; idPasoActividad: number | null; posicionPaso: number | null; descripcionPaso: string | null };
export type NotificationCategory = 'TODAS' | 'AYUDA' | 'SISTEMA';
export type CarerNotification = { idNotificacion: number; tipo: 'AYUDA_GENERAL' | 'AYUDA_CONTEXTUAL' | 'ACTIVIDAD_COMPLETADA';
  titulo: string; mensaje: string; fechaCreacion: string; leida: boolean; nombrePerfil: string; codigoIcono: string | null;
  idSolicitudAyuda: number | null; idEjecucion: number | null };
const MAX_NOTIFICATION_PAGE_SIZE = 20;
export type NotificationPage = { notificaciones: CarerNotification[]; siguienteCursor: string | null };
const id = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const date = (v: unknown): v is string => text(v) && Number.isFinite(Date.parse(v));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseHelpRequest(value: unknown, key: string, context?: HelpContext): HelpRequest {
  const v = value as HelpRequest;
  if (!v || !id(v.idSolicitudAyuda) || !uuid.test(v.claveOperacion) || v.claveOperacion !== key || !date(v.fechaSolicitud)
    || !['PENDIENTE', 'ATENDIDA'].includes(v.estado)) throw new Error('Solicitud inválida.');
  if (context ? v.idActividad !== context.idActividad || v.idEjecucion !== context.idEjecucion || v.idPasoActividad !== context.idPasoActividad
    || !id(v.posicionPaso) || !text(v.descripcionPaso)
    : [v.idActividad, v.idEjecucion, v.idPasoActividad, v.posicionPaso, v.descripcionPaso].some(x => x !== null)) throw new Error('Contexto inválido.');
  return { idSolicitudAyuda: v.idSolicitudAyuda, claveOperacion: v.claveOperacion, fechaSolicitud: v.fechaSolicitud, estado: v.estado,
    idActividad: v.idActividad, idEjecucion: v.idEjecucion, idPasoActividad: v.idPasoActividad, posicionPaso: v.posicionPaso, descripcionPaso: v.descripcionPaso };
}
export function parseNotification(value: unknown): CarerNotification {
  const v = value as CarerNotification;
  if (!v || !id(v.idNotificacion) || !['AYUDA_GENERAL', 'AYUDA_CONTEXTUAL', 'ACTIVIDAD_COMPLETADA'].includes(v.tipo)
    || !text(v.titulo) || typeof v.mensaje !== 'string' || !date(v.fechaCreacion) || typeof v.leida !== 'boolean' || !text(v.nombrePerfil)
    || !(v.codigoIcono === null || text(v.codigoIcono)) || !(v.idSolicitudAyuda === null || id(v.idSolicitudAyuda))
    || !(v.idEjecucion === null || id(v.idEjecucion))) throw new Error('Notificación inválida.');
  return { idNotificacion: v.idNotificacion, tipo: v.tipo, titulo: v.titulo, mensaje: v.mensaje, fechaCreacion: v.fechaCreacion,
    leida: v.leida, nombrePerfil: v.nombrePerfil, codigoIcono: v.codigoIcono, idSolicitudAyuda: v.idSolicitudAyuda, idEjecucion: v.idEjecucion };
}
export function parseNotificationPage(value: unknown): NotificationPage {
  const v = value as NotificationPage;
  if (!v || !Array.isArray(v.notificaciones) || v.notificaciones.length > MAX_NOTIFICATION_PAGE_SIZE
    || !(v.siguienteCursor === null || text(v.siguienteCursor))) throw new Error('Listado inválido.');
  const notificaciones = v.notificaciones.map(parseNotification);
  if (new Set(notificaciones.map(n => n.idNotificacion)).size !== notificaciones.length) throw new Error('Listado duplicado.');
  return { notificaciones, siguienteCursor: v.siguienteCursor };
}
export function notificationDate(value: string) {
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}-05:00`;
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(zoned));
}
