# Incremento 1: ayuda y notificaciones internas

> Contrato del incremento original. Esta rama integra tambi?n su backend y la infraestructura push; ver [integracion-notificaciones.md](integracion-notificaciones.md).

Solo frontend. No integra push, Firebase, EAS ni modifica SQL/backend. Reutiliza las sesiones E3/cuidador y preferencias de accesibilidad independientes.

## Rutas y diseño

- `/apoyo`: acceso desde navegación del usuario, avatar, ilustración original `assets/illustrations/user-help.png`, confirmación compartida y resultado verificable.
- Guía: teléfono arriba a la derecha durante ejecución vigente EN_PROGRESO; captura los identificadores del paso mostrado. No escribe progreso. El modal conserva su operación al cerrarse y reabrirse.
- `/notificaciones`: Todas/Ayuda/Sistema, páginas máximas de 20, refresco al foco/foreground y manual; tocar tarjeta confirma lectura mediante PUT antes de cambiar su apariencia. Conserva Mi perfil y el proveedor/listeners de accesibilidad.

## Contrato coordinado

POST `/api/usuario/solicitudes-ayuda`:
`{claveOperacion: UUID, idActividad?, idEjecucion?, idPasoActividad?}`.
Sin identificadores de perfil o cuidador: el backend deriva su identidad.

GET `/api/usuario/solicitudes-ayuda/por-clave/{clave}` retorna la misma solicitud.
DTO: `{idSolicitudAyuda,claveOperacion,fechaSolicitud,estado,idActividad,idEjecucion,idPasoActividad,posicionPaso,descripcionPaso}`.
Estado PENDIENTE/ATENDIDA. Campos contextuales explícitamente null para ayuda general.
404 con `codigo: SOLICITUD_NO_ENCONTRADA`; 429 con `codigo: AYUDA_PREMATURA` y `Retry-After` en segundos.

GET `/api/notificaciones?categoria=TODAS|AYUDA|SISTEMA&cursor=...`:
`{notificaciones:[],siguienteCursor:null|string}`. Backend ordena fecha/ID descendentes y limita cada página a 20.
Notificación: `{idNotificacion,tipo,titulo,mensaje,fechaCreacion,leida,nombrePerfil,codigoIcono,idSolicitudAyuda,idEjecucion}`.
Tipos AYUDA_GENERAL/AYUDA_CONTEXTUAL/ACTIVIDAD_COMPLETADA; referencias/icono ausentes como null.
GET `/api/notificaciones/{id}` retorna la tarjeta propia.
PUT `/api/notificaciones/{id}/leida`: idempotente, acepta respuesta exitosa sin cuerpo (204) o con cuerpo (200).

Fechas: preferir ISO 8601 con offset explícito. Como compatibilidad con LocalDateTime del backend, la fecha de notificación sin offset se interpreta en America/Lima (-05:00), nunca en la zona del teléfono. El cooldown es relativo a la confirmación, 60 segundos, o a Retry-After; no interpreta fechaSolicitud en la zona local. El servidor es autoridad de la espera por perfil/contexto, incluyendo otros dispositivos y reinstalaciones.

## Idempotencia y errores

UUID generado con `crypto.randomUUID()` o el generador nativo existente de Expo Modules Core (`globalThis.expo.uuidv4`, Android UUID.randomUUID). Sin librerías nuevas ni Math.random. Es clave de idempotencia, no credencial; no se utiliza como autorización. Si ninguno está disponible, no se envía la solicitud.

Un POST con resultado de transporte incierto se recupera por GET usando la misma clave. Nunca se muestra éxito sin DTO válido con clave y contexto coincidentes. Si tampoco se confirma por GET, solo se ofrece consultar resultado. Un GET 404 explícito permite reenvío con la misma clave. El cierre/reapertura del modal conserva esa operación; el éxito se limpia al reabrir y conserva su cooldown. No hay cola offline persistente.

Blur invalida la generación de UI; refocus permite recuperar la operación pendiente. Cambio de revisión de acceso descarta respuestas viejas. Se impide doble envío inmediato. Los errores transportados son sanitizados, sin tokens ni cuerpos completos en logs/UI.

## Validación

`node --test scripts/test-help-notifications.cjs scripts/test-user-execution.cjs`

`npm run lint` y `node_modules/.bin/tsc --noEmit --incremental false`.
Regenerar tipos de Expo Router mediante Expo al agregar rutas si `.expo/types` está desactualizado.

Pendiente de integración real: backend y SQL aprobados por su responsable; verificar Android físico, TalkBack, texto ampliado, apariencia y el flujo completo con dos identidades. Las notificaciones automáticas al completar se crean en backend; el frontend consume el historial al refrescar, no genera eventos desde la pantalla.

## Cierre de validacion del Incremento 1

- Suite frontend completa: 234 pruebas correctas, cero fallos. Incluye ayuda/notificaciones, Mi perfil, accesibilidad, Agenda y ejecucion.
- Las pruebas de catalogo usan rutas reales con guiones, JSON ejecutable y entidades JPA actuales; el SQL v7 permanece como referencia historica.
- ESLint reconoce CommonJS y globals de scripts. La simulacion de hooks usa nombres auxiliares sin desactivar reglas de la aplicacion.
- TypeScript y ESLint de src/scripts deben repetirse despues de cambios funcionales.
- Integracion backend MySQL validada en esquema desechable; no equivale a prueba Android fisica ni prueba UI end-to-end.
- MySQL diafacil: migracion NO aplicada. No iniciar backend local con ddl-auto=update antes de nueva aprobacion expresa del SQL.
- Pendiente: aprobacion/aplicacion del SQL y prueba fisica con usuario y cuidador. Push sigue fuera del Incremento 1.

Resultado final: frontend 234/234; backend aislado 323/323; integracion MySQL desechable 1/1. TypeScript correcto. SQL de diafacil NO aplicado; Android fisico pendiente.
