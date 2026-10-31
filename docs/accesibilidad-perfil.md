# Ajustes de accesibilidad del perfil

Implementado el 30 de octubre de 2026; refinamiento del 31 de octubre. El usuario
confirmó físicamente tamaño, persistencia, lectura de voz y ocultamiento en pasos;
después aprobó también el refinamiento visual, Alto contraste y tamaño GRANDE.
La nueva lectura automática y el check circular quedan pendientes de prueba física. Prototipo:
`design/vista-cuidador/Ajustes.png`. SDK 57 sin upgrades ni nuevas dependencias.
Contrato propietario: [backend](../../backend_dia_facil/docs/accesibilidad-http.md).

## Cuidador

Hub → Configurar accesibilidad → `/perfiles/{id}/ajustes`. Nombre/avatar reales
solo informativos, sin edición; menú del cuidador mantiene Perfiles activo.
Tres valores semánticos de texto, switches de contraste/voz y restablecimiento
con confirmación mediante ActivityDialog/StepDialogActions. Lectura de voz está
activada por defecto; su comportamiento automático y repetición se describen abajo.

Guardado automático mediante PATCH parcial. El control se actualiza de forma
optimista y bloquea cambios mientras se confirma. Error conocido: restaura el
valor anterior. Respuesta de escritura desconocida: GET de reconciliación, nunca
replay automático de red. Si también falla, conserva el valor optimista visible
como no confirmado y bloquea edición/reset hasta Consultar ajustes. Solo un rechazo
confirmado o GET autoritativo determina la reversión. Cerrar la pantalla aborta/ignora respuestas tardías; al volver
consulta la fuente de verdad. Un aborto móvil no garantiza cancelar el commit.
El cliente privado mantiene únicamente su recuperación de rechazo 401 renovable.

Reset es un POST único, confirmado, sin optimismo hasta respuesta; defaults:
MEDIANO, altoContraste=false, lecturaVoz=true. Conserva recordatorios. Dos
cuidadores/sesiones editando el mismo campo: último commit, sin merge complejo.

El selector de texto tiene un único borde sutil y relleno morado solo en la opción
elegida. Su check morado aparece en un círculo blanco dibujado íntegramente con
SVG, idéntico al cargar o cambiar el valor optimista, evitando alternar la
superficie nativa entre transparente y blanca. El espacio reservado se
conserva para evitar saltos. Switches: pista activa
morada, inactiva gris y pulgar explícito, también en iOS. El bloqueo transitorio
por guardado no aplica disabled nativo a los switches: bloquea toques/handlers y
anuncia disabled/busy accesiblemente. La incertidumbre sí deshabilita el control.
No se monta/desmonta un spinner entre tarjetas; el estado de guardado ocupa un
espacio estable después de los controles. Se conserva el valor optimista durante
confirmación sin refetch normal ni desmontaje del formulario.

## Usuario vinculado

UserAccessibilityProvider vive únicamente en `(usuario-autenticado)`, identificado
por perfil y revisión E3. Consulta `/api/usuario/accesibilidad` con el cliente
privado E3; no envía un perfil como autoridad. Guarda preferencias solo en memoria.
No cambia tokens, SecureStore, restauración ni navegación de vinculación.

Primera carga: espera la configuración antes de mostrar el área; si falla, mensaje
y Reintentar, sin inventar una preferencia. Refresca al foreground y al enfocar
destinos del Stack (el primer foco ya está cubierto por la carga inicial).
Comparte una petición pendiente; no hay polling ni consulta por componente/paso.
Si falla un refresh posterior, conserva los últimos valores, ofrece Reintentar
y mantiene montada la guía con su paso seleccionado. Cambios del cuidador se ven
en el próximo refresh, sin promesa de tiempo real. Cambio de identidad/salida
elimina el contexto y descarta respuestas antiguas. 401 conserva el manejo E3.

## Presentación

ProfileAppearanceContext acota `useAppTheme` al Usuario autenticado. El cuidador
y el onboarding previo a la vinculación mantienen su composición normal.
`AppText` aplica PEQUENO=.9, MEDIANO=1, GRANDE=1.25 a fontSize/lineHeight explícitos,
con fuente base mínima 12. Mantiene el escalado nativo adicional, sin truncado
ni topes. Texto anidado sin tamaño hereda sin multiplicarse dos veces.

Agenda, detalle, guía, celebración, botones, navegación, diálogos y fallback de
avatar usan esa primitiva. Los cálculos responsive de Hora/Fecha y acciones
consideran también el factor del perfil. No cambia tipografía de todo el Cuidador.

Desde el refinamiento del 31 de octubre, **Alto contraste significa presentación
oscura de alta legibilidad y menor luminosidad**, independientemente del tema
del teléfono. Sustituye la interpretación anterior que conservaba claro/oscuro
también con el switch activado. `useAppTheme` devuelve `highContrastTheme` basado
en `themes.dark`: fondo #121116, superficies #1C1A23/#272332, texto claro y acción
lila #B9A7EF. No hay tercera preferencia ni selector nuevo. Con false se conserva
exactamente el tema normal del sistema; Cuidador y onboarding no se oscurecen.

Bordes decorativos sutiles; contraste fuerte en controles/estados. Las cinco
familias por posición usan superficies oscuras teñidas y checks legibles. El paso
actual se rellena y destaca en altura, alcanzados con contorno lila y futuros con
contorno neutral; no se cambian los permisos de navegación. La navegación inferior
y barra de estado usan el tema efectivo sin cambiar rutas. PNG/pictogramas no se
invierten ni recolorean. Tests comprueban texto/acción principales >=7:1 y control
>=3:1; no equivalen a una auditoría completa de cada pantalla física.

## Lectura automática y repetición (refinamiento aprobado)

Reutiliza `expo-speech` 57.0.3, sin nuevas dependencias. Este refinamiento sustituye
la decisión anterior de lectura exclusivamente voluntaria. Con lecturaVoz=true:

- Detalle: entrada real/foco y datos disponibles disparan una sola lectura de
  `Es hora de {nombreActividad}.` No lee título, fecha, hora, estado ni navegación.
- Ejecución y consulta: primer paso visible y cada cambio real, incluso retroceso,
  leen `Paso {actual} de {total}. {descripcionPaso}.` con cantidades reales.
- El icono permanece junto al contenido. Cada toque detiene y repite desde el
  principio el mismo mensaje; nunca se convierte en una acción de solo detener.

`useContentSpeech` vive en la ruta, antes de los retornos/ramas de carga o éxito.
`ContentSpeechSession` coordina foco, disponibilidad y preferencia mediante una
clave estable de contenido por entrada. Objetos nuevos, renders, loading temporal,
refetch y cambios de estado no reinician la lectura del mismo contenido.
Cada foco tiene una revisión interna: la lectura espera al render posterior al
foco y descarta actualizaciones de la entrada anterior. Así no comienza a leer
un snapshot cacheado justo antes de que la consulta pase a loading al regresar.
El paso actualmente visible determina el mensaje; no el máximo alcanzado.
Al volver realmente a una pantalla se abre otra entrada y puede leerse otra vez.
Activar voz con contenido visible lo lee una vez. Volver del background no repite
un contenido ya leído; si aún no se leyó por no estar disponible, podrá leerse
cuando el contenido y la aplicación estén activos.

`StepSpeech` comparte propiedad y cola por motor nativo, serializa `stop → speak`
y descarta solicitudes/callbacks antiguos. El cleanup de una pantalla anterior
no puede detener al propietario nuevo. Antes de otra lectura se detiene/vacía la
anterior. Se detiene al cambiar de paso, ocultarse el contenido por loading, perder
foco, desmontar, pasar a background, desactivar voz o cambiar/invalidar identidad.
El provider E3 existente remonta el área al cambiar perfil/revisión; mientras
tanto el hook no reproduce datos de la identidad anterior.

Con lecturaVoz=false no hay llamadas automáticas ni iconos de detalle/pasos.
No cambia el texto ni la ejecución. Se evita duplicar el anuncio explícito de
`GuideSteps` cuando TTS está activo; los controles conservan labels/estados de
TalkBack/VoiceOver. Con voz desactivada se conserva la asistencia nativa existente.
La consulta COMPLETADA usa las mismas frases sin crear progreso, ejecución,
finalización ni celebración. La celebración no inicia lectura nueva.

Error TTS: mensaje seguro y repetición voluntaria, sin bucle de reintentos. No hay
servicios externos ni grabaciones. Motor/voces dependen del sistema; en iPhone
físico el modo silencio puede impedir sonido. Referencia de API:
[Expo Speech SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/speech/).

## Validación y matriz física pendiente

`test-accessibility.cjs` cubre contratos, cliente, tamaños/herencia, contraste,
guardado/reconciliación, respuestas tardías, provider/deduplicación y voz/cleanup.
Se mantienen las suites de E3, agenda y ejecución sin cambiar sus reglas.
Refinamiento visual posterior: 217 pruebas frontend correctas; TypeScript, lint y export Android
correctos. No se modificó backend ni se volvió a ejecutar su suite en este pase.

El bloque «Es hora de…» usa la presentación compacta del control únicamente en
detalle: botón de 48 sin estiramiento, contenedor ajustado al contenido con
maxWidth=100% y texto que puede envolver sin truncado. Misma geometría en tema
normal/Alto contraste y los tres tamaños. La presentación de los pasos y la lógica
TTS permanecen sin cambios. La regresión física de círculo/cuadrado y la anchura
deben verificarse de nuevo en Android; las pruebas de estilos no simulan su render nativo.

Probar en Android/Expo Go y, por separado, iOS:

- Guardar/restablecer y reabrir; dos perfiles con valores distintos; cuidador sin
  cambio global de apariencia; recordatorio conservado.
- Dispositivo ya abierto: foreground/cambio de destino aplica preferencias sin
  perder el paso actual. Pérdida de red, resultado desconocido y recuperación.
- Tres tamaños combinados con texto del sistema ampliado; scroll, Hora/Fecha,
  controles, diálogos y navegación; light/dark con contraste activo/inactivo.
- TalkBack/VoiceOver: radios, switches, foco del modal y botón de voz; toques
  rápidos, cambio de paso, salida/background, desactivación y error del motor.
- Entrada al detalle, paso siguiente/anterior y consulta COMPLETADA: una lectura
  por contenido, frase exacta, repetición desde el icono, sin duplicado por refetch.
  Cambios de identidad y callbacks tardíos entre pantallas no deben mezclar audio.

No se implementan recordatorios, configuración de idioma, lectura de otros contenidos,
sincronización en tiempo real ni el modal al abandonar una guía EN_PROGRESO.
