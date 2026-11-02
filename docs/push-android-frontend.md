# Push Android: frontend

Requiere una compilacion Android propia con extra.push.enabled=true y extra.eas.projectId real. Expo Go y web mantienen push desactivado y no cargan expo-notifications. La configuracion nativa y la guia estan preparadas en app.config.ts, eas.json y push-android-configuracion.md; no se generaron proyectos ni credenciales.

Solo el cuidador puede activar permisos desde Notificaciones. La restauracion y el foco consultan permisos sin solicitar autorizacion automaticamente. El UUID de instalacion se conserva en SecureStore. Registro, consulta y revocacion usan /api/push/registro; el servidor obtiene cuidador y sesion de la autenticacion y no devuelve el token.

Cada operacion push queda ligada a la revision de sesion: se valida antes y despues de obtener credenciales, al recibir respuestas y al reintentar. El proveedor cancela operaciones obsoletas, incluso al cambiar de sesion con el mismo cuidador. Una rotacion durante otra operacion deja una conciliacion pendiente.

Logout cancela inmediatamente el trabajo push y limpia las alertas locales e intenciones de navegaci?n. Se reutiliza la revocacion persistente de sesion existente, incluyendo sus reintentos offline; el trabajador rechaza tokens de sesiones revocadas aunque el registro conserve activo=true. No se programa un DELETE autenticado despues de cerrar sesion. El DELETE explicito se conserva para retirar el registro si no hay permisos. No se puede retirar una alerta ya enviada ni avisar al servidor durante logout sin red.

Se validan version del payload, cuidador, registro y generacion; no se abren URLs recibidas. Se espera autenticacion, navegaci?n y registro, y un GET autorizado valida la notificacion antes de abrir Todas y destacar la tarjeta. Abrir push no marca le?do: solo seleccionar su tarjeta lo hace. Los errores definitivos 400/401/403/404/410 se descartan; los temporales se reintentan al volver a primer plano.

Pruebas locales: node --test scripts/test-*.cjs tests/*.test.cjs; TypeScript y ESLint. Las pruebas de ciclo ejecutan el proveedor y los interceptores reales con adaptadores nativos y HTTP simulados. No equivalen a pruebas fisicas de Android o Firebase.

Referencia SDK 57: https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
