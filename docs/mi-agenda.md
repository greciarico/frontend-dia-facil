# Mi agenda — primera consulta real

`/mi-agenda` sustituye la pantalla temporal y conserva la entrada/restauración E3.
El servicio utiliza `createUserHttpClient`, sin IDs en URL/body, sin refresh de
cuidador ni replay. La fecha y la zona vienen del backend (America/Lima por
defecto), y HH:mm sigue siendo hora local. La cabecera formatea la fecha de
calendario sin convertirla al huso del móvil.

La lista consulta nombre, icono 3D local, hora y estado. Cada tarjeta abre el
detalle de su actividad mediante su ID, con rol botón y anuncio de propósito.
El círculo
no es checkbox ni botón. EN_PROGRESO conserva círculo sin marcar y texto «En
progreso». TalkBack/VoiceOver anuncia nombre, hora y estado de toda la tarjeta.
No hay ejecución, progreso por pasos, solicitud de apoyo ni notificaciones.
Fallback de icono y secuencia de cinco superficies reutilizan la implementación
del cuidador; estados de ejecución no alteran las definiciones persistidas.

`useUserAgenda` carga al enfocar y volver a primer plano, permite pull-to-refresh
y reintento, y programa una sola recarga para el cambio de día indicado por la
API (descontando el tiempo de la consulta con reloj monotónico). Cancela peticiones
y temporizadores al perder foco. No muestra vacío mientras carga ni conserva
estados de ayer como si fueran de hoy durante un error de recarga.

Vacío: calendario vectorial local `ConnectionCalendar`, «Hoy no hay actividades»
y «Cuando tu cuidador agregue actividades, aparecerán aquí». No se crean assets.

`BottomNavigation` concentra la presentación compartida. `AreaNavigation` mantiene
los destinos y comportamiento del cuidador. `UserAreaNavigation` solo presenta
Agenda activa y Apoyo deshabilitado, sin rutas provisionales. El layout Usuario
mantiene esta barra fuera de la FlatList y dentro de safe areas. Cabecera sin
flecha atrás: es la raíz del Usuario. Avatar informativo y menú de opciones.

## Detalle de actividad

`/actividades/[idActividad]` vive en el mismo layout autenticado Usuario. El Stack
usa `anchor: 'mi-agenda'` para mantener el retorno también al abrir directamente
un detalle. La flecha vuelve mediante dismissTo; Agenda conserva su destino.
El detalle obtiene sus datos desde GET `/api/usuario/actividades/{idActividad}`,
sin confiar en nombre, hora, estado ni perfil pasados en navegación.

Muestra icono 3D local con fallback, nombre, hora y fecha del servidor, bloque
informativo «Es hora de {nombre}» y las dos acciones del prototipo. El bloque de
lectura no reproduce voz ni se anuncia como botón: expo-speech está instalado,
pero su integración con ConfiguracionPerfil.lecturaVoz queda pendiente.

«Ver paso a paso» y «Ya lo hice» permanecen visibles, deshabilitados y sin
handlers. No existen rutas provisionales ni comandos para ejecutar/finalizar.
La elegibilidad de dominio para futura finalización directa es
`guiaInicialCompletada && estado !== 'COMPLETADA'`; no activa el botón en este
incremento. Si falta primera guía se explica que debe completarse antes.
EN_PROGRESO conserva su estado; COMPLETADA muestra confirmación informativa sin
crear otra ejecución. Los cambios de plantilla no modifican esta bandera.

La introducción usa spacing.md entre icono, nombre y lectura, conservando los
tamaños. La lectura y los valores de Hora/Fecha utilizan Nunito semibold.
La descripción de opciones es siempre «Puedes seguir los pasos de esta actividad
o marcarla como completa»; las acciones permanecen deshabilitadas.

Hora usa ancho natural y Fecha el restante. onLayout identifica el ancho real de
la tarjeta y onTextLayout evalúa el texto visible: Hora en varias líneas o Fecha
en más de dos cambia a disposición vertical. Son criterios de distribución,
no límites del texto: no hay truncado, reducción de fuente ni alturas fijas.
El separador decorativo vertical pasa a horizontal al apilar. La decisión queda
estable para cada ancho, escala y valores; se vuelve a medir al cambiarlos y se
ignoran eventos de medidas anteriores. No utiliza breakpoints por dispositivo.

Se consulta al enfocar, volver a primer plano y cambiar el día. Se cancelan
peticiones/temporizadores y se ignoran respuestas tardías. Un 404 funcional
ACTIVIDAD_NO_ENCONTRADA muestra «Esta actividad no está disponible» y regreso a
Mi agenda; red/respuesta inválida permite Reintentar. Un 401 sigue usando E3.
No hay datos ficticios mientras carga. La fecha sigue perteneciendo a Lima,
incluido un cambio de día entre abrir la tarjeta y consultar el detalle.

## Presentación visual de Usuario

El encabezado usa controles laterales de 48 con idéntico ancho: opciones a la
izquierda y avatar a la derecha. Título y fecha quedan centrados, sin posiciones
absolutas, fondos añadidos ni cambios en la salida del perfil.

La variante `appearance="agenda"` de ActivitySummaryCard integra una zona izquierda
de icono de 88 en la misma tarjeta. El PNG mide 64 y usa contain, sin círculo.
El orden visual Yellow/Green/Orange/Blue/Purple se obtiene por índice, reutilizando
light para la tarjeta, stroke para bordes, hover para icono y default para el
círculo completado con check blanco. Purple utiliza su token existente hoverLight.
El borde pendiente reutiliza text.disabled; EN_PROGRESO conserva su texto.
En dark se emplean superficies/bordes semánticos oscuros y el acento de familia.
La variante summary del cuidador conserva su diseño anterior.

BottomNavigation ofrece `appearance="user"`: ancho máximo 256, ampliable al ancho
disponible con texto aumentado. Agenda mantiene el énfasis lila; Apoyo conserva
su apariencia neutral y estado deshabilitado. No cambian destinos ni acciones.

## Salir del perfil

Opciones → Salir del perfil → confirmación. La salida es **local**, incluso sin
red: no llama a DELETE ni desvincula Dispositivo. Tras guardar en SecureStore,
se limpia el perfil activo en memoria y se regresa al onboarding Usuario. Al
reabrir permanece pausado, sin restaurar automáticamente ese perfil. Atrás desde
la bienvenida permite regresar a la selección de rol sin perder las pruebas.

La misma clave SecureStore ahora contiene versión 2: `active`, `proofs`, `paused`.
Versión 1 se lee conservando su secreto activo; las antiguas revocaciones
pendientes se retienen como pruebas, nunca se procesan como desvinculaciones.
Solo `active` puede autorizar el cliente privado, y solo con estado linked.
Las pruebas retenidas no crean una sesión activa ni cuentan para el bloqueo
entre experiencias Cuidador/Usuario. No se guardan nombres, avatares ni códigos.

Una nueva conexión envía las pruebas al caso de uso existente de vincular. Backend
resuelve primero el código vigente y solo reutiliza la prueba del mismo perfil
ACTIVO; puede conectarse otro perfil sin confundir sus credenciales. El secreto
canónico devuelto se valida y guarda antes de confirmar. La pérdida de una
respuesta no ocasiona POST automático ni elimina las pruebas. La garantía de
reutilización requiere conservar SecureStore; reinstalar sin secretos constituye
una nueva instalación. La salida local no invalida una copia del secreto anterior
en backend; la revocación futura pertenece al cuidador/E2.

## Prueba física pendiente

1. E3 ya vinculado y reapertura → agenda directa, sin bienvenida ni confirmación.
2. Crear actividades desde Cuidador → volver a primer plano Usuario: nombre,
   iconos y horas reales en orden; ninguna tarjeta ejecuta ni completa.
3. Perfil sin actividades → vacío solo tras consulta; red caída → error/reintento.
4. Verificar medianoche de Lima, foreground y pull-to-refresh; no usar el reloj
   local del teléfono como autoridad del día. No crear ejecuciones desde esta UI.
5. Salir offline → onboarding; reapertura permanece pausada. Reconectar al mismo
   perfil con código/QR no incrementa E1. Cambiar a otro perfil y regresar conserva
   vínculos independientes. Renovar código exige el vigente al reconectar.
6. Credencial revocada o perfil inactivo → tratamiento global E3, nunca activar
   otro perfil retenido automáticamente.
7. Texto ampliado, light/dark, safe areas, lista larga, TalkBack/VoiceOver.

Pruebas automatizadas: `scripts/test-user-agenda.cjs` cubre parser, transporte,
fecha, estados informativos, menú y ciclos de foco/foreground/medianoche/cleanup;
`test-user-link.cjs` cubre pausa, migración, reconexión, respuesta perdida y
aislamiento de credenciales. No sustituyen la prueba física.

Validación actual: 181 pruebas frontend correctas, TypeScript y lint
sin errores; export Android offline correcta. Android físico, texto ampliado y
lectores de pantalla requieren la prueba manual descrita arriba.

`test-user-activity.cjs` añade contrato mínimo, elegibilidad por actividad,
acciones deshabilitadas en todos los estados, apertura por ID, retorno nativo,
loading/404/red, renovación del día y cancelación de consultas. En Android físico
probar abrir cada tarjeta, regresar con flecha/Atrás/Agenda, fallos de red, texto
ampliado y lectores de pantalla. No se afirma validación física desde el export.
