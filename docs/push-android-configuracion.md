# Push Android: integraci?n sobre develop

## Identidad definitiva

- Android: com.rico999.diafacil.
- Expo/EAS: @rico999/diafacil, proyecto 9625ba7e-e2ca-4f45-8ba6-f24f2abdb39e.
- API de producci?n: https://52-6-141-216.sslip.io (sin agregar /api).
- Expo SDK 57, React Native 0.86.3 y React 19.2.3 conservados.

La configuraci?n Firebase/EAS de la rama original de Jonathan pertenece a otra aplicaci?n. No reutilizar su google-services.json, owner, proyecto EAS ni credenciales FCM como configuraci?n de esta aplicaci?n. El informe build-android-primera-compilacion.md es hist?rico.

## Estado integrado

Push est? desactivado por defecto: extra.push.enabled=false y EXPO_PUBLIC_PUSH_ENABLED=false en ambos perfiles EAS. El historial interno y las solicitudes de ayuda no dependen de activar push; s? requieren la transici?n de BD del backend.

app.config.ts conserva la identidad de app.json, rechaza un EAS_PROJECT_ID distinto al configurado y a?ade un ?nico plugin de notificaciones y de build-properties. Conserva expo-video, icono/adaptive icon y el splash de assets/splash/transparent.xml. Solo adjunta googleServicesFile cuando push se activa expl?citamente. No configura Firebase por encontrar un archivo local mientras push est? apagado.

eas.json mantiene production (APK y URL HTTPS) y a?ade development (developmentClient, distribuci?n interna y HTTP LAN permitido). Ninguno activa push autom?ticamente. .env.local no se modifica.

## Preparaci?n manual posterior (no realizada)

1. Preparar y aprobar la transici?n de BD en un esquema aislado antes de iniciar el backend real. Ver ../../backend_dia_facil/docs/integracion-notificaciones.md.
2. Registrar com.rico999.diafacil en Firebase; comprobar que el archivo cliente pertenece exactamente a ese paquete. No copiar la configuraci?n del paquete anterior.
3. Configurar FCM V1 bajo el proyecto EAS de rico999. La cuenta de servicio privada pertenece a EAS, nunca al bundle, Git o Spring.
4. Proporcionar GOOGLE_SERVICES_JSON como archivo del entorno EAS correspondiente; opcionalmente usar el archivo local ignorado google-services.json. No es la cuenta de servicio privada.
5. Backend: EXPO_PROJECT_ID debe coincidir con el UUID definitivo; EXPO_PUSH_ACCESS_TOKEN es privado. Mantener DIAFACIL_PUSH_ENABLED=false hasta completar esquema y credenciales.
6. Activar EXPO_PUBLIC_PUSH_ENABLED=true ?nicamente en el entorno de compilaci?n autorizado para la prueba; los perfiles versionados siguen apagados. Autorizar cualquier build/reinicio/despliegue por separado.

El c?digo nativo de notificaciones requiere una compilaci?n propia; Expo Go Android no permite verificar recepci?n push remota. Los cambios de plugins y credenciales requieren una nueva compilaci?n. No editar proyectos nativos generados ni migrar el SDK para esta integraci?n.

## Dependencias y validaci?n

Se conserv? el manifiesto de develop y se a?adieron expo-build-properties 57.0.22 y expo-dev-client 57.0.19. expo-notifications ~57.0.22 ya exist?a; expo-video 57.0.2 se conserva. No hubo actualizaci?n de versiones principales ni de dependencias previamente resueltas en el lock.

El entorno de integraci?n no pudo descargar los nuevos paquetes (red restringida). El lock fue reconciliado por npm Arborist usando los metadatos y las integridades de ambos locks Git; su grafo virtual no presenta dependencias inv?lidas. Antes de una compilaci?n, instalar desde este lock con npm ci en un entorno con acceso al registro. No reemplazarlo por el lock original de Jonathan.

Ver integracion-notificaciones.md para resultados y l?mites de las validaciones. Las pruebas simuladas no demuestran recepci?n real. Verificar permisos, foreground/background, apertura en fr?o, cambio de cuenta, revocaci?n y logout en Android f?sico. Tickets/receipts no garantizan visualizaci?n ni entrega exactamente una vez.

## Referencias

- https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- https://docs.expo.dev/push-notifications/fcm-credentials/
