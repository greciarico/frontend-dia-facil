# E3: vinculación del dispositivo del usuario

Entrada desde «Soy usuario»: bienvenida → Conecta tu agenda → QR o código manual → Conectando → confirmación real → Ir a mi agenda. Sin números de pasos ni porcentajes ficticios de backend. «¿Necesitas ayuda?» abre ayuda contextual sobre Conecta tu agenda. La llegada es [Mi agenda real, con detalle y ejecución](mi-agenda.md); recordatorios y accesibilidad configurable siguen pendientes.

## Ayuda contextual

`ConnectionHelp` mantiene exclusivamente su propio estado de apertura y reutiliza `ActivityDialog`. La ayuda del Login continúa siendo su alerta nativa; no se modifica. La nueva ayuda presenta dos secciones informativas con los iconos vectoriales existentes de cámara y teclado, los textos aprobados y un único botón «Entendido» de tamaño modal. No navega, escanea ni envía el código, y no tiene dependencia de servicios o del gestor E3.

Abrir la ayuda oculta el teclado para facilitar la lectura, conservando el valor del código y el campo manual desplegado. Entendido, X («Cerrar ayuda»), Atrás Android y escape de VoiceOver cierran el mismo modal. Tocar el fondo no lo cierra, como en los otros ActivityDialog. Al cerrar se devuelve el foco accesible al botón de ayuda si la pantalla sigue activa; se cancelan callbacks pendientes al reabrir o abandonar la pantalla. No se reabre el teclado automáticamente.

El diálogo conserva ScrollView, foco inicial en el título y `animationType="none"`. La opción `respectSafeArea` adapta su padding a las áreas seguras únicamente aquí; por defecto sigue desactivada para los usos existentes. No hay alturas fijas ni textos truncados, y los colores provienen del tema light/dark. No se incorpora lectura en voz alta ni contacto con el cuidador.

Pruebas: `node --test scripts/test-connection-help.cjs` verifica contenido, apertura/reapertura, cada mecanismo de cierre, foco, cleanup, lectura de alternativas y temas; la suite de onboarding conserva las pruebas de código manual, QR y connect. Pendiente comprobar físicamente texto ampliado, scroll, TalkBack/VoiceOver y que, tras escribir parte del código, abrir/cerrar ayuda conserva el valor y el despliegue manual.

## Composición y transición visual del onboarding

La variante de onboarding de `ConnectionLayout` utiliza fondo amarillo suave y cabecera lila con curva SVG a todo el ancho. Las imágenes de bienvenida y celebración se muestran transparentes sobre esa separación, sin tarjetas. Error conserva la superficie clara y `sad-user.png`. El layout predeterminado sigue intacto para «Hola {nombre}», escáner y recuperación. Los colores se adaptan al modo oscuro con los tokens existentes.

«Ingresar código» despliega el campo y una flecha accesible dentro de «Conecta tu agenda»; no navega a otra pantalla. La flecha y el envío desde teclado solo funcionan con el formato válido existente. Atrás cierra primero el ingreso desplegado. El fallback manual del escáner regresa a esa misma zona abierta. QR y campo llaman al mismo `connect()` y no alteran preparación, credenciales ni endpoints.

«Conectando tu agenda» conserva una transición visual mínima de 1.200 ms **solo para éxito**, centralizada en `motion.userConnectionTransitionDuration`. E3 empieza inmediatamente y guarda su resultado sin esperar a la UI. La pantalla prioriza su carga local aunque el gestor ya haya confirmado la vinculación. Si la operación devuelve código inválido o cualquier otro error, se cancela el temporizador y se muestra inmediatamente su estado correspondiente, sin esperar el mínimo. La barra avanza visualmente sin números y, si la operación tarda más, continúa indeterminada hasta recibir el resultado; no añade otra espera. TalkBack recibe estado ocupado sin valores de progreso ficticios. Movimiento reducido usa la representación estática. Salir cancela temporizadores y animaciones e ignora publicaciones visuales tardías, sin cancelar ni repetir la vinculación real.

Éxito muestra «¡Listo, {nombre}!», «Tu agenda ya está conectada» y la tarjeta «Tu dispositivo está conectado a tu agenda». «Ir a mi agenda» mantiene `finish()` y `/mi-agenda`. No se prometen actividades/configuraciones/recordatorios todavía pendientes. Restaurar sigue omitiendo bienvenida y confirmación.

QR y entrada manual se normalizan a mayúsculas, eliminando espacios. La sintaxis enviable es `DF-` + exactamente 16 caracteres alfanuméricos (`A-Z`, `0-9`), sin reproducir restricciones internas del generador. El campo manual usa `maxLength=19` y su estado normalizado también se limita a 19 caracteres; un carácter adicional no deshabilita una selección completa. QR no se trunca: una cadena demasiado larga se rechaza por formato. No hay comprobación previa de existencia: el backend resuelve todo durante `/api/dispositivos/vincular`. Un código como `DF-0000000000000000` puede enviarse; su rechazo backend muestra «El código no es válido» como estado completo. Red/timeout/servicio muestran un error técnico recuperable, nunca se confunden con código inválido.

`DeviceAccessManager` separa la máquina de estados de la UI y coalesce solicitudes. Primero prepara una credencial aleatoria independiente, la guarda en SecureStore y luego vincula. No guarda código, nombre, perfil ni imágenes en almacenamiento persistente. El secreto pendiente/activo y las pruebas de v?nculos previos usan una clave separada de las sesiones del cuidador y las mismas opciones seguras. Las escrituras compartidas impiden mantener simultáneamente dos experiencias activas en esta instalación. Otras instalaciones siguen siendo independientes.

Ante resultado desconocido del POST se consulta GET con el secreto ya guardado, sin replay automático. Si también falla GET, el secreto se conserva para reintentar/restaurar. La confirmación solo vive en memoria: recargar JS o reabrir la app restaura directamente al área del usuario, sin repetir bienvenida/confirmación. Un error de red durante restauración conserva la credencial y muestra recuperación, sin flash de Login. Un 401 autoritativo la descarta.

Salir del perfil es ahora una pausa local: retiene las pruebas previas en SecureStore, no procesa revocaciones ni desvincula dispositivos. E1 conserva el conteo ACTIVO. Una nueva conexión valida el código vigente y puede reutilizar el mismo dispositivo del perfil mediante prueba previa, sin IDs enviados como autoridad. Véase [pausa y reconexión](mi-agenda.md#salir-del-perfil). Cambiar al rol cuidador requiere salir de la experiencia Usuario y volver a la selección de rol; una sesión de cuidador requiere logout antes de entrar al flujo usuario.

`expo-camera` ya estaba instalado, no se añadió dependencia para E3. Solo se usa cámara tras elegir Escanear; permiso denegado permite código manual y, si corresponde, abrir ajustes. La cámara solo se monta con foco y app activa; se ignoran escaneos repetidos y callbacks tardíos. Plugin con microphonePermission=false; no se solicitan permisos de audio. Los tres PNG proporcionados permanecen locales en `assets/illustrations/`.

## Preparación del entorno

El usuario confirmó posteriormente vinculación física por QR y código. Las notas
de transición documentan cómo preparar otra BD, no una orden para repetirla sobre
la instalación funcional. No se ha realizado una nueva auditoría de su MySQL.

Completar primero [la transición y activación backend](../../backend_dia_facil/docs/dispositivos-e3.md). No se ejecutó en la BD local desde este entorno. E1 también pasa a utilizar exclusivamente el formato vigente. El QR sigue conteniendo exactamente el código mostrado, sin URLs, datos personales ni tokens. `EXPO_PUBLIC_API_URL` conserva la configuración LAN ya funcional; no cambiar autenticación del cuidador.

## Prueba física Android / Expo Go

1. Cuidador: abrir perfil propio → Vincular dispositivo → mostrar QR/código y anotar conteo. Usar otro teléfono/instalación para el usuario; una instalación mantiene un único rol activo.
2. Usuario: Soy usuario → bienvenida → Comenzar. Comprobar manualmente código válido, pegar con espacios/minúsculas y formato inválido; nunca aceptar seis dígitos legacy. Confirmación usa nombre real y miniatura/fallback del perfil.
3. Repetir desde otra instalación con QR: conceder cámara, denegarla y probar fallback manual. Volver atrás/cambiar de app mientras escanea no debe emitir llamadas tardías.
4. Recargar JS/cerrar y reabrir: restaura directamente la conexión sin bienvenida ni confirmación. Sin red al abrir, recuperación conserva el secreto; Reintentar al recuperar red.
5. Código bien formado inexistente, anterior después de renovar o de perfil inactivo: mismo estado «El código no es válido». Corte de red/timeout: error técnico y reintento explícito. No modificar datos ni realizar POST automáticamente para probarlo.
6. Perder respuesta después de vincular: consulta GET recupera el resultado, sin segundo Dispositivo por ese secreto. Dos toques no duplican preparación/vinculación.
7. Cuidador: volver a primer plano en E1 → conteo real incrementado. Renovar código no desconecta el usuario ya vinculado. Dos instalaciones de usuario con el mismo código vigente crean dos Dispositivo ACTIVO independientes.
8. Salir del perfil: vuelve al onboarding Usuario y permanece pausado al reabrir. Reconectar con código vigente reutiliza el dispositivo anterior sin incrementar E1; no se procesa una revocación al recuperar red. Atrás desde bienvenida permite volver a roles. Verificar que cuidador OTP, restauración/logout, onboarding y otras sesiones sigan funcionando.
9. Revisar TalkBack, texto ampliado, safe areas y light/dark en bienvenida, entrada, cámara, errores, carga y confirmación. No se afirma validación física desde pruebas unitarias/export.

Validaciones automatizadas: `npm run test:user-link`, suites existentes `node --test scripts/test-*.cjs`, `npm exec -- tsc --noEmit`, `npm run lint` y export Android. Los tests verifican almacenamiento previo al POST, recuperación de respuesta perdida, restauración, descarte por 401, conservación ante red, revocación offline y aislamiento de dominios. `node --test scripts/test-user-onboarding.cjs` añade ingreso desplegable, QR/manual compartidos, tiempos controlados, doble envío, errores separados, descarte de callbacks tardíos, navegación, movimiento reducido y conservación del layout predeterminado.
