# Vincular dispositivo (E1)

El hub abre `/perfiles/[idPerfilUsuario]/vincular-dispositivo` pasando únicamente el identificador. La pantalla obtiene nombre, código y cantidad real mediante el cliente HTTP privado. Reutiliza el layout autenticado, AreaHeader, AreaNavigation (Perfiles activo), ActivityDialog y botones modal.

Contrato: [vinculacion-http.md](../../backend_dia_facil/docs/vinculacion-http.md).

- `services/device-link.ts`: GET/POST y validación estricta de respuesta, formato vigente y conteo real.
- `hooks/use-device-link.ts`: carga, renovación exclusiva, recuperación por GET tras resultado desconocido/409/429, cancelación y descarte por foco/perfil/época de sesión; recarga en AppState active.
- Pantalla: QR local con `react-native-qrcode-svg` ya instalado; negro sobre blanco con margen para escaneo también en dark. Misma cadena del servidor en QR y copia.
- `expo-clipboard ~57.0.2`: versión del catálogo bundledNativeModules de Expo 57, disponible en Expo Go; solo escritura al pulsar Copiar. No se lee el portapapeles ni se piden permisos de cámara.
- Ilustración introductoria SVG local mantenible (no es un QR funcional). No había un asset propio equivalente al prototipo.
- «Dispositivos vinculados (N)» muestra el conteo activo y abre el listado del perfil. El modal destructivo confirma la desvinculación individual y el contador se recarga al volver. La ruta dinámica usa el ID del perfil una sola vez. Renovar confirma que el código anterior solo deja de servir para **nuevas** vinculaciones.
- Códigos únicamente en memoria, sin parámetros de navegación, logs, analytics ni almacenamiento persistente.

## Cooldown y presentación

El backend impone 60 segundos y devuelve `renovacionEnSegundos` en GET/POST. La interfaz no usa 60 como fuente de verdad: crea un instante objetivo con `performance.now()` y calcula el tiempo restante desde ese objetivo. Un intervalo actualiza la etiqueta mientras la pantalla está enfocada y la app activa; no realiza polling. Cambiar fecha/hora del teléfono no adelanta la disponibilidad. Al volver de segundo plano o recuperar foco se consulta otra vez el servidor.

Durante la espera se muestra «Renovar nuevamente en N s» bajo la descripción, se deshabilita la tarjeta y se evita enviar también desde el handler. 429 `RENOVACION_PREMATURA` provoca reconciliación por GET, manteniendo la autoridad del backend. El contador es una estimación conservadora, no un reloj exacto del servidor.

La tarjeta separa el contenedor flexible del texto y sobrescribe localmente la alineación centrada que heredaba el título de `accountStyles.body`. Título y descripción comparten borde izquierdo y altura dinámica. El modal reutiliza ActivityDialog y StepDialogActions: círculo suave, refresh vectorial coral, pregunta centrada con «renovar» en coral, Cancelar con variante secundaria coral y «Sí, renovar» primario morado. La opción `secondaryVariant` no cambia los valores predeterminados de otros diálogos.

## Warning de arranque Expo Router / Android

En la versión instalada `expo-router 57.0.25`, el código `build/fork/NavigationContainer.js` pasa `setLastUnhandledLink` a `useLinking`. `useThenable` crea la promesa inicial desde un inicializador de useState durante render. En `build/fork/useLinking.native.js`, líneas 123–127, la continuación de la URL inicial llama a ese setter sin asegurar que el contenedor haya completado su primer montaje.

Una prueba aislada del archivo instalado, con límites nativos/hooks simulados y sin escribir en node_modules, confirmó que el callback puede ejecutarse con cero efectos de montaje ejecutados. Esta es una reproducción del mecanismo, **no** una reproducción física completa del warning de React. El usuario confirmó que el aviso aparece al iniciar/recargar, lo cual coincide con esta ruta.

Evidencia externa: [Expo issue #49378](https://github.com/expo/expo/issues/49378), con reproducción Android y reportes para 57.0.25. No se actualizan dependencias ni se modifica linking, restauración de sesión, node_modules o LogBox para tratar este aviso. Se mantiene como limitación externa documentada hasta evaluar una corrección oficial por separado.

Por separado se corrigió código de E1: el cleanup de foco solo invalida operaciones y elimina suscripciones; ya no llama a setConfirm. El reinicio del modal/copia ocurre al entrar en foco; useIsFocused impide mantener un modal visible sobre otra ruta. Cada copia captura una generación de foco y un identificador de operación, para que sus resultados no publiquen feedback ni interfieran con una copia nueva al salir/regresar. Esto no se presenta como solución del warning externo.

## Prueba manual Android / Expo Go

E3 ya incorpora vinculación real desde el rol usuario: consultar [el flujo y la prueba actual](usuario-vinculacion.md). En instalaciones que todavía tengan códigos legacy, consultar la transición de E3 antes de activar el backend.

1. Sesión válida → Mis perfiles → perfil propio → Vincular dispositivo.
2. Verificar nombre, igualdad código/QR (contenido literal) y copiar/pegar voluntariamente en otra app. Pantalla light/dark y texto ampliado.
3. Cancelar la confirmación no cambia nada; renovar cambia ambos a la vez. Conteo de dispositivos activos se mantiene.
4. Dos instalaciones con la misma vista: renovar en una; la segunda recibe 409 al intentar con el anterior y consulta el código actual.
5. Cortar la conexión durante renovación: no reaparece código anterior sin consulta exitosa. Reintentar consulta, no renueva otra vez.
6. Volver a primer plano recarga; Atrás visual/físico regresa al hub. Salir/cerrar sesión durante petición no publica datos tardíos.
7. Abrir el listado, cancelar una confirmación y después confirmar la retirada. Verificar que la tarjeta desaparece y que el contador se actualiza al volver. Consultar [la validación de DF-12](usuario-vinculacion.md#df-12--desvinculación-remota).
8. Tras renovar, verificar espera, deshabilitación y habilitación al terminar; salir y regresar y volver de segundo plano conserva el cooldown real. Una fecha/hora del teléfono incorrecta no debe permitir renovar antes.
9. Salir durante copia y regresar: una respuesta tardía no debe mostrar feedback nuevo ni dejar el botón bloqueado. Abrir/cancelar el modal y comprobar X/Atrás, texto ampliado y light/dark.

`npm run test:device-link`, suites existentes, `tsc --noEmit`, lint y export Android validan la integración sin conectarse a una BD real.
