# Primera build Android: resultado y correccion localizada

> Informe hist?rico de la rama de Jonathan. Sus identificadores, credenciales y builds NO corresponden a la aplicaci?n definitiva de rico999. La configuraci?n vigente est? en [push-android-configuracion.md](push-android-configuracion.md).

Fecha: 2026-11-01.

## Intento autorizado

- EAS: @jhonatanvasquez/diafacil.
- ID: e2a151d5-4e13-43ed-9c90-ab54e761b88c.
- Enlace: https://expo.dev/accounts/jhonatanvasquez/projects/diafacil/builds/e2a151d5-4e13-43ed-9c90-ab54e761b88c
- Perfil development, distribucion INTERNAL, Android com.diafacil.app, SDK 57, version 1.0.0, versionCode 1.
- EAS genero y guardo el keystore automaticamente en la nube. Reutilizarlo; no generar otro.
- FCM v1 ya estaba asociado por el responsable. GOOGLE_SERVICES_JSON ya existe en development como archivo Secret.
- Resultado del primer intento: ERRORED, sin APK. Posteriormente se autorizo el segundo intento descrito abajo.

## Causa comprobada

La fase Run gradlew fallo en :app:processDebugResources:

~~~text
Android resource linking failed
resource drawable/splashscreen_logo (aka com.diafacil.app:drawable/splashscreen_logo) not found.
~~~

El plugin instalado expo-splash-screen 57.0.9 siempre genera el tema que referencia @drawable/splashscreen_logo. Con la configuracion existente (solo backgroundColor y dark.backgroundColor, sin image ni drawable) no genera ese recurso. Esto se reprodujo con las funciones reales del plugin en una carpeta temporal. Las comprobaciones previas TypeScript/configuracion no ejecutaban esta generacion nativa.

La CLI no cambio ningun archivo del frontend durante el primer intento: comparacion de hashes de 319 archivos antes/despues. El fallo no requiere volver a cargar FCM ni cambiar las credenciales.

## Correccion preparada, sin recompilar

- app.json: se agrega exclusivamente android.drawable.icon dentro del plugin expo-splash-screen.
- assets/splash/splashscreen_logo.xml: vector transparente valido. Conserva el splash previsto sin imagen, con fondos claro #FFFFFF y oscuro #121116.
- scripts/test-native-push-config.cjs: prueba que ejecuta el generador real del recurso en una carpeta temporal y comprueba XML y transparencia.

No se modificaron app.config.ts, eas.json, package.json ni package-lock.json. No se editaron node_modules ni carpetas nativas del proyecto. La comparacion estructural de app.json confirma que todo lo anterior se conserva.

## Validacion local

- 259 pruebas frontend correctas, 0 fallos.
- TypeScript: correcto.
- ESLint: correcto, sin advertencias.
- Prueba temporal: configuracion original no genera logo; candidato genera drawable/splashscreen_logo.xml.
- La nueva prueba requiere permiso de escritura temporal; el sandbox de solo lectura bloqueo inicialmente mkdtemp. Se repitio fuera de ese bloqueo y paso.

Esta prueba no sustituye una compilacion Gradle correcta. La correccion quedo validada por la segunda build FINISHED.

## Comando autorizado para el segundo intento

~~~powershell
npx eas-cli@27.2.0 build --platform android --profile development
~~~

El responsable autorizo una segunda build independiente, con la correccion anterior y el keystore existente. No repetir init, no cargar otra clave FCM y no actualizar dependencias. Cualquier tercer intento requiere una nueva confirmacion.

No se modifico la base MySQL de trabajo, no se inicio/reinicio el backend y su envio push sigue desactivado. No se ha probado recepcion real en Android.

## Segundo intento autorizado

- ID: 2712245a-e1c7-4c63-ab3f-1bf986dfb7b2.
- Enlace: https://expo.dev/accounts/jhonatanvasquez/projects/diafacil/builds/2712245a-e1c7-4c63-ab3f-1bf986dfb7b2
- Inicio EAS: 2026-11-01T08:05:10.490Z.
- Estado final confirmado por EAS CLI: FINISHED.
- Finalizacion EAS: 2026-11-01T08:23:47.388Z.
- Paquete confirmado en metadatos EAS: com.diafacil.app.
- APK: https://expo.dev/artifacts/eas/dcRY91uYAOeaQvCC7ef3x-nySBPIf42dybJ2TVVkgdY.apk
- Tamano aproximado reportado por EAS: 262 MB.
- Firma reutilizada: Build Credentials SG_H59ZKE3 (default). No se genero un segundo keystore.
- Mismo perfil development, SDK 57, version 1.0.0, versionCode 1, distribucion INTERNAL.
- Gradle finalizo y produjo app-debug.apk. La correccion de splashscreen_logo supero la compilacion nativa.
- Se rechazo instalar/ejecutar en un emulador; la prueba sera en Android fisico.
- Verificacion posterior: package.json, package-lock.json, app.config.ts y eas.json intactos. app.json conserva todo salvo la adicion de splash previamente autorizada.
- Pendiente: instalacion manual en celular y prueba inicial con Metro. Aun no hay prueba fisica ni envio push real.

## Instalacion y autorizaciones pendientes

Descargar la APK desde el Android fisico y confirmar instalacion. Si aparece conflicto de firma, no desinstalar ni borrar datos automaticamente. Al abrir la APK puede aparecer el cliente de desarrollo hasta iniciar Metro. Esperar confirmacion de instalacion antes de coordinar Metro.

No se inicio el backend, no se modifico MySQL real y el envio push del backend sigue desactivado. El Incremento 2 no se considera terminado: falta preparar el backend con autorizacion expresa y verificar ayuda general/contextual y finalizacion mediante push real.
