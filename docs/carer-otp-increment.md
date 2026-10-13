# Incremento del Paso 2 del cuidador

Ingreso de seis dígitos, verificación y reenvío real, contador y estado confirmado.
El flujo termina en Paso 2; no se crean rutas de Paso 3, JWT o sesiones.

## Archivos creados

Rutas relativas a la raíz DiaFacil:

- backend_dia_facil/src/main/java/dia_facil/backend/service/auth/PoliticaCodigoAcceso.java
- frontend_dia_facil/src/utils/carer-otp.ts
- frontend_dia_facil/src/components/carer/otp-input.tsx
- frontend_dia_facil/src/components/carer/code-envelope.tsx
- frontend_dia_facil/src/components/carer/code-success-modal.tsx
- frontend_dia_facil/assets/illustrations/carer-code-back.svg
- frontend_dia_facil/assets/illustrations/carer-code-card.svg
- frontend_dia_facil/assets/illustrations/carer-code-front.svg
- frontend_dia_facil/docs/carer-otp-increment.md

## Archivos modificados

- backend_dia_facil/src/main/java/dia_facil/backend/service/auth/AutenticacionCuidadorTransaccionalService.java
- backend_dia_facil/src/main/java/dia_facil/backend/web/auth/AutenticacionCuidadorController.java
- backend_dia_facil/src/main/java/dia_facil/backend/web/error/ProblemasHttp.java
- backend_dia_facil/src/test/java/dia_facil/backend/service/auth/AutenticacionCuidadorTransaccionalServiceTest.java
- backend_dia_facil/src/test/java/dia_facil/backend/web/auth/AutenticacionCuidadorControllerTest.java
- backend_dia_facil/docs/auth-http.md
- frontend_dia_facil/src/app/cuidador/paso-1.tsx
- frontend_dia_facil/src/app/cuidador/paso-2.tsx
- frontend_dia_facil/src/services/carer-auth.ts
- frontend_dia_facil/src/components/carer/continue-button.tsx
- frontend_dia_facil/src/theme/tokens.ts
- frontend_dia_facil/scripts/test-carer-auth.cjs
- frontend_dia_facil/README.md
- frontend_dia_facil/docs/design-system.md

## Archivo sustituido

- frontend_dia_facil/assets/illustrations/carer-code.svg se eliminó y su geometría
  se distribuyó en las tres capas SVG locales, utilizadas por el mismo componente.

## Comportamiento

Paso 1 transporta correo e instante local de disponibilidad; Paso 2 no revalida
el formato del correo. El servicio existente solicita y verifica códigos con el
cliente HTTP compartido. Los errores llevan solo mensaje seguro, código de dominio
y Retry-After validado; no cuerpos ni errores Axios completos hacia la interfaz.

Verificar y reenviar comparten un bloqueo inmediato mientras exista una petición.
La verificación se envía solo con seis dígitos ASCII y preserva ceros iniciales.
AUTENTICADO y REGISTRO_PENDIENTE se conservan temporalmente en memoria, sin interpretar
el ID como credencial ni trasladar comprobantes a parámetros o almacenamiento.

El backend centraliza 45 segundos en PoliticaCodigoAcceso. El frontend no contiene
esa duración como política; utiliza reenvioEnSegundos y el instante objetivo para
el contador, incluido el retorno del segundo plano. Un rechazo del servidor aplica
Retry-After; si es inválido se bloquea reenvío y se permite volver al Paso 1.

Después del éxito se borra el OTP, se animan sobre y tarjeta y se muestra el modal.
Movimiento reducido omite la animación. Entendido deja confirmado Paso 2; volver
con navegación nativa continúa permitido. Salir descarta datos y evita éxito tardío.

## Validación

- TypeScript sin errores y lint sin errores ni advertencias.
- 12 pruebas frontend: contrato, errores seguros, ceros iniciales, código completo,
  pegado, edición, contador con distinta duración y Retry-After.
- 78 pruebas backend aisladas exitosas: servicios de autenticación, criptografía,
  transacciones, configuración, contrato HTTP y seguridad. Incluyen rechazo a 44 s,
  aceptación a 45 s, respuesta de 45 y Retry-After de 45.
- Exportación Android con Metro y assets locales.

El wrapper Maven no arrancó y Maven instalado no pudo resolver los identificadores
de repositorio de la caché en modo offline. Para la validación se compilaron las
fuentes Java y se ejecutó JUnit directamente con las dependencias locales existentes,
en target/cooldown-validation-classes, sin MySQL, SMTP ni modificaciones a pom.xml.
El resumen está en backend_dia_facil/target/cooldown-validation.log.

Pendiente comprobación manual en Android físico: OTP real, pegado, teclado, TalkBack,
texto ampliado, light/dark, reenvío, segundo plano y animación/movimiento reducido.
Los pasos para realizarla están en README.md.
