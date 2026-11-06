# Multimedia editorial de Accesibilidad en DiaFácil

Implementado el 1 de noviembre de 2026. Solo frontend; no cambia backend,
sesiones, TTS ni preferencias. La reproducción editorial no es lectura de voz.

## Assets y presentación

Recursos locales bajo assets/accessibility, verificados sin recomprimir:

| Archivo | Bytes | Metadatos |
| --- | ---: | --- |
| videos/visual-support.mp4 | 4.674.835 | H.264, 1280×720, 25 fps, 18,6 s, 2,01 Mbps; sin pista audio |
| videos/caregiver-support.mp4 | 6.153.394 | H.264, 1280×720, 30 fps, 19,5 s, 2,52 Mbps; pista AAC |
| images/visual-communication.webp | 120.040 | 1949×704, horizontal |

Total: 10.948.269 bytes, aproximadamente 10,95 MB. Se utiliza la última versión
aportada por el usuario, no los antiguos archivos de 53/22 MB. El primer video
ya se llama visual-support.mp4, sin extensión duplicada. No se incorporan videos
verticales ni fuentes remotas. Las referencias require son estáticas para que
Metro incluya los recursos al construir el APK. El export Android contiene
copias con SHA-256 idéntico de los tres archivos suministrados; no sustituye una
prueba de decodificación en Android ni una compilación APK.

Orden: hero existente → Accesibilidad en acción (dos videos) → seis capacidades
existentes → fotografía con reflexión → cierre existente. Títulos y descripciones
de los videos están fuera de la imagen. La fotografía usa expo-image/contain y
su relación real, sin recorte de sujetos ni interacción. Los textos usan AppText
y tokens existentes, sin altura fija ni truncamiento. No se agregan preferencias.

## Dependencia y compatibilidad

Se agregó únicamente expo-video **57.0.2**, fijado en package.json/package-lock.
La instalación online falló con EACCES por restricciones de red del entorno.
Se instaló mediante Expo CLI offline desde el artefacto oficial disponible en
caché (integridad registrada en el lockfile). No se modificaron SDK, RN ni los
demás paquetes, ni se añadió una exclusión para ocultar la diferencia.

La referencia oficial y bundledNativeModules de Expo 57 recomiendan **~57.0.5**;
esa revisión no estaba disponible en caché. La API utilizada existe en 57.0.2 y
pasó TypeScript/export; validar en Expo Go SDK 57 y en el APK real. La alineación
con el patch recomendado puede realizarse cuando haya acceso al registro mediante
`npx expo install expo-video`, revisando después el diff y las pruebas. No afirmar
que el export valida compatibilidad binaria física.

Plugin expo-video: supportsBackgroundPlayback=false y supportsPictureInPicture=false.
No necesita permisos de cámara/micrófono/galería ni notificaciones. Si se utiliza
un development build antiguo, debe reconstruirse para incluir el nuevo módulo;
Expo Go debe ser compatible con el SDK del proyecto.

Referencias: [Video SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/video/) y
[Expo Image/WebP](https://docs.expo.dev/versions/v57.0.0/sdk/image/).

## Visibilidad y reproducción

AccessibilityMediaCarousel tiene dos reproductores creados con useVideoPlayer,
uno por asset, y un solo EditorialVideoController. Antes de reproducir uno,
pausa ambos. El seleccionado se muestra en una página completa con contain,
superficie textureView en Android, radios existentes y sin controles nativos,
fullscreen ni PiP. El carrusel tiene paging, gesto y flechas con targets accesibles.
No cambia de página al terminar. Los títulos transmiten la idea sin movimiento.

Refinamiento de controles: se retiró el botón externo permanente. La propia página
del video es un Pressable con la misma llamada controller.toggle(), label y rol
de botón según estado: Pausar video, Reanudar video, Volver a reproducir video o
Reproducir video. Solo la página seleccionada expone la acción a TalkBack.
La superficie nativa no captura toques; el scroll horizontal mantiene su gesto.
En pausa manual/final y listo con movimiento reducido se muestra un círculo Play
vectorial de 48×48; es decorativo dentro de la única acción accesible. Su overlay
absoluto no cambia el layout 16:9. Durante reproducción no hay overlay permanente.
Reintentar se conserva únicamente ante error. No se cambió el coordinador ni los
umbrales/intención manual. El gesto no debe generar una pausa manual adicional.

Estabilidad de carga: el ActivityIndicator ya no se inserta entre descripción y
navegación. La carga inicial es un overlay absoluto dentro del frame 16:9, sin
interceptar toques. onFirstFrameRender registra por asset que ya mostró contenido;
el buffering posterior conserva la vista/fotograma disponible sin spinner. El
cierre de modal conserva ambos players; pause/seek/revalidación pueden cambiar
su estado nativo temporalmente, pero no se hace replaceAsync salvo Reintentar.
No se reservan huecos ni se fijan alturas de texto para compensar indicadores.

La medición usa measureInWindow del frame audiovisual y del host nativo del
ScrollView vertical (getNativeScrollRef). El viewport excluye naturalmente el
header/menu inferior. No se mide el bloque de texto ni se usan offsets de teléfono.

- Entrada ≥65 % visible, salida ≤35 %. Entre ambos conserva el estado previo.
- Fracción = intersección vertical / min(altura del video, altura del viewport).
- Scroll/layout solicitan mediciones; las simultáneas se coalescen y se repite
  una medición si hubo scroll mientras estaba pendiente. Sin polling/timers.
- Foco, foreground y cierre de modal invalidan mediciones viejas y solicitan una
  nueva. Un retorno rápido desde background también fuerza esa comprobación.

Estados: outside, ready, playing, manual-paused y ended; loading/error técnicos
se manejan aparte. Pausa manual conserva posición y no se revierte por eventos de
ready o pequeños desplazamientos. Reanudar continúa; Volver a reproducir inicia
desde cero. Al salir suficientemente, cambiar de video o abandonar el contexto
se reinicia la posición. Una ejecución finalizada no hace loop: requiere acción
manual o una nueva visualización real. Eventos antiguos y recargas tardías no
pueden iniciar otra página ni reactivar una pantalla oculta.

El gesto suspende reproducción durante el arrastre. Si vuelve a la misma página,
conserva posición e intención; si cambia, inicia la nueva desde cero. El video
siempre tiene muted=true y volume=0, aunque exista pista AAC. No hay control para
activar audio ni reproducción en background/external playback.

Con reducción de movimiento, solo Play manual. La consulta inicial es conservadora
hasta conocer el ajuste; cambios del sistema prevalecen sobre respuestas tardías.
Activarlo durante autoplay pausa el video. No se cambia ninguna preferencia de
DiaFácil. Un error requiere Reintentar explícito, sin replay automático. Las
suscripciones y mediciones se invalidan al desmontar; los hooks liberan players.

## Validación y pendientes

247 pruebas frontend, TypeScript, lint y export Android correctos. Suites relevantes:
test-editorial-video.cjs y test-carer-account.cjs: histéresis, pausa, finalización,
gesto/cambio de página, exclusividad, error previo/retry, carga, callbacks tardíos,
reducción de movimiento, foco/background/modal, medición coalescida, silencio,
orden de secciones, imagen y controles sin truncamiento.

El usuario confirmó físicamente funcionamiento y diseño multimedia antes del
último refinamiento de controles. El nuevo toque/Play central requiere otra
validación física, incluyendo TalkBack y gesto horizontal sin toques accidentales.
La supresión de saltos por carga también requiere validación física: abrir/cerrar
repetidamente detalles con ambos videos y reproducción/pausa manual, ambos temas
y tres tamaños. El test simula buffering y verifica flujo estable, overlay inicial,
identidad de reproductores y ausencia de reload durante el ciclo de modal.
Matriz adicional pendiente Android: reproducción offline de ambos assets, radios/textureView,
umbral durante scroll lento/rápido, pausa manual, final/repetir, cambio 1→2→1,
background/foreground y retorno, GRANDE + escalado del sistema, Alto contraste,
movimiento reducido y TalkBack. iOS/VoiceOver y el APK real no se dan por validados.
