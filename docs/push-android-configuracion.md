# Incremento 2: preparar push Android con proyectos reales

## Estado y limites

Push esta desactivado por defecto. El responsable ya creo Firebase Dia Facil (dia-facil), registro com.diafacil.app, descargo google-services.json y habilito FCM v1. La cuenta Expo es jhonatanvasquez; la CLI ya confirmo esa identidad. EAS ya esta vinculado como @jhonatanvasquez/diafacil. La primera build fallo por un recurso splash ausente; la segunda build 2712245a-e1c7-4c63-ab3f-1bf986dfb7b2 termino FINISHED con la correccion localizada. Keystore reutilizado en EAS; APK disponible, sin envios reales. Ver build-android-primera-compilacion.md. La configuracion conserva Expo 57.0.27, Router 57.0.25, React 19.2.3 y React Native 0.86.3. expo-notifications 57.0.22, Constants, Device y SecureStore ya existian; solo se agregan expo-dev-client 57.0.19 y expo-build-properties 57.0.22.

El historial de Notificaciones del Incremento 1 es la fuente persistente. Solo eventos nuevos con registros elegibles crean entregas push; no hay envio retroactivo. El toque de una alerta no marca leida su tarjeta. Las claves de servicio nunca se incluyen en EXPO_PUBLIC_ ni en el bundle.

## 1. Proyectos que crea personalmente el responsable

No repetir Firebase ni el registro Android: ya estan completados. Archivo ya validado y copiado como frontend-dia-facil/google-services.json: project_id dia-facil y paquete com.diafacil.app. Esta ignorado por Git y app.config.ts reconoce su ruta sin modificarlo. No imprimir claves. Este archivo es configuracion cliente, no la clave de servicio.

El responsable ya confirmo la clave privada JSON guardada FUERA del repositorio. No generar otra si la actual es valida. FCM V1 ya fue cargado y asociado a com.diafacil.app mediante EAS CLI 27.2.0, confirmado por el responsable. No repetir la carga. No pegarla en chat, logs, Spring Boot o codigo. FCM y google-services.json deben pertenecer al mismo proyecto Firebase.

No volver a ejecutar eas init: el responsable ya creo y vinculo @jhonatanvasquez/diafacil. EAS project:info confirmo UUID 1795613d-b14f-45f4-947a-96dabcbf71a0, coincidente con app.json y app.config.ts. Los identificadores Firebase/EAS son datos publicos; las claves privadas y el token de acceso Expo son secretos.

## 2. Vincular EAS y configurar archivos

Desde frontend-dia-facil, la cuenta y el proyecto ya estan confirmados. Solo comprobaciones de lectura:

~~~powershell
npx eas-cli@latest whoami
npx eas-cli@latest project:info
# No repetir init ni build:configure. Para credenciales, seguir el paso manual posterior.
~~~

Registra la version de EAS CLI utilizada. app.config.ts es dinamico: si init solicita actualizarlo manualmente, conserva su estructura y proporciona el UUID REAL mediante EAS_PROJECT_ID. No reemplazarlo por un identificador ficticio. app.json ya aporta extra.eas.projectId: no hace falta duplicarlo en .env.local. Si se utiliza EAS_PROJECT_ID como override, debe coincidir exactamente con 1795613d-b14f-45f4-947a-96dabcbf71a0. No cambies IDs automaticamente ni sobrescribas los cambios locales existentes.

GOOGLE_SERVICES_JSON ya esta registrado en EAS para development como File/Secret, confirmado por el responsable y por consulta de existencia sin leer su valor. No duplicar la variable. EAS proporcionara su ruta durante el build. Para uso local opcional conserva el archivo en frontend-dia-facil/google-services.json (ignorado en Git) o configura su ruta absoluta en GOOGLE_SERVICES_JSON. NO usar aqui la cuenta de servicio privada. Al resolver configuracion local no es necesario tener el archivo si no se esta construyendo un build remoto.

EXPO_PUBLIC_PUSH_ENABLED=true activa el cliente. Su valor y EAS_PROJECT_ID se configuran en el entorno local cuando estes listo; eas.json activa push en el perfil development y por ello el build exige UUID y archivo reales. Sin ellos el build se detiene con un error claro. El valor predeterminado local es false. Nunca guardar secretos en app.config.ts ni extra.

La firma/keystore Android se genera o configura en EAS bajo tu cuenta. Conserva sus mecanismos de recuperacion. No se necesita subir una clave de Firebase al backend: el backend usa Expo Push Service.

## 3. Backend y SQL antes de habilitar

Mantener ddl-auto=update en desarrollo y E3 activado. La guarda admite update y rechaza modos destructivos. Antes de arrancar contra MySQL real se requiere vista previa SQL, prueba en base desechable, respaldo y autorizacion explicita. Hibernate creara el esquema; el SQL incremental queda como referencia opcional. Nunca iniciar/reiniciar el backend automaticamente. Verificar todas las restricciones antes de habilitar push.

Push requiere EXPO_PROJECT_ID en Spring con el mismo UUID real de EAS_PROJECT_ID del frontend, EXPO_PUSH_ACCESS_TOKEN privado y diafacil.push.enabled=true (o DIAFACIL_PUSH_ENABLED=true). Mantener enabled=false hasta completar esquema y credenciales. En EAS habilita la proteccion de Expo Push Service por access token y crea el token bajo una cuenta apropiada; guardalo en el entorno privado de Spring, nunca en EXPO_PUBLIC_. Las pruebas no necesitan valores reales.

Revocar o renovar las credenciales se hace en los proveedores; actualizar el secreto privado y reiniciar manualmente el backend cuando corresponda. Un error de credenciales suspende envios y debe diagnosticarse sin imprimir claves ni tokens.

## 4. Build Android de desarrollo

~~~powershell
npx eas-cli@latest build --platform android --profile development
npx expo start --dev-client
~~~

Instala la APK generada en el Android fisico. No es Expo Go. El build development permite HTTP LAN exclusivamente para el backend local; conserva telefono y PC en una red accesible y EXPO_PUBLIC_API_URL correcto. Para una URL publica futura usar HTTPS; no se implementa despliegue. Los demas perfiles no permiten HTTP claro. Mantener Metro accesible durante pruebas con development build; para cerrar y abrir normalmente vuelve a conectar su runtime a Metro.

Cambios de plugins, credenciales cliente o modulos nativos requieren otro build. No editar android/ o ios/ manualmente: EAS genera los proyectos nativos. No ejecutar comandos de prebuild destructivos ni actualizar SDK para resolver warnings.

## 5. Prueba funcional fisica

1. Iniciar backend con esquema aprobado y configuracion real; autenticar cuidador en la APK propia.
2. Abrir Notificaciones y elegir Activar avisos. Solo el cuidador recibe el dialogo Android. Si se deniega, el historial sigue disponible y se ofrece Ajustes.
3. Vincular un usuario en otra instalacion. Solicitar ayuda general, ayuda contextual y completar una actividad. Crear eventos nuevos; no reutilizar historia anterior esperando una push.
4. Comprobar banner/sonido en primer plano, segundo plano y cierre normal. Con el centro visible evitar aviso redundante del evento ya mostrado.
5. Tocar una alerta con app abierta y en arranque frio: debe abrir Notificaciones, localizar el evento y mantener su tarjeta NO leida hasta tocarla.
6. Repetir sin permisos, sin conexion, con logout online/offline y cambio de cuenta. Una cuenta distinta o Usuario nunca puede abrir datos del cuidador anterior.
7. Confirmar que una actividad no cambia progreso al pedir ayuda y que el historial no se duplica.

Forzar detencion, restricciones de bateria/fabricante, falta de servicios Google o permisos revocados pueden impedir recepcion. Logout offline no puede avisar inmediatamente al servidor ni retirar mensajes ya enviados: se limpian avisos locales y se bloquea su apertura, manteniendo la revocacion pendiente existente. No prometer entrega instantanea ni exactamente una alerta.

Un ticket Expo indica aceptacion; un receipt exitoso indica aceptacion por FCM, no visualizacion en el telefono. Registrar evidencia fisica separada de mocks y pruebas MySQL.

## Fuentes

- https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://docs.expo.dev/push-notifications/fcm-credentials/
- https://docs.expo.dev/push-notifications/sending-notifications/
