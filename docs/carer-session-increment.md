# Sesión persistente y Paso 4

> **Alcance hist?rico.** Informe hist?rico del incremento de sesi?n. La ra?z temporal fue sustituida por Mis perfiles, y existen m?s endpoints privados. Ver [estado actual](../../documentacion-dia-facil/ESTADO_ACTUAL_PROYECTO.md); no repetir Sesi?n activa/Comprobar sesi?n como UI principal. Los resultados de pruebas y pendientes f?sicos inferiores pertenecen a ese incremento, no a una nueva validaci?n.

## Resultado

- Access/refresh opacos aleatorios de 256 bits; hashes SHA-256 BINARY(32) en BD.
- Access de 15 minutos, 30 días de inactividad y máximo absoluto de 90 días.
- Rotación estándar, historial de refresh y revocación solo de la sesión reutilizada.
- Access en memoria; refresh y revocaciones pendientes en SecureStore.
- Restauración antes de decidir Login/estado autenticado y sin selección de rol para sesión válida.
- Logout local durable, sin esperar red; la credencial pendiente nunca restaura acceso.
- Sesión emitida tanto al verificar cuidador existente como al registrar uno nuevo.
- Paso 4 solo tras nuevo registro, con nombre/avatar efectivos y copy neutral.
- Continuar lleva a la raíz con estado real de sesión. No se implementa Mis perfiles.

No se usan dispositivo, token_push, contraseñas, JWT, operacionId, recuperación HMAC,
confirmaciones de sucesores ni expo-crypto. Los 20 SVG y las reglas de registro se conservan.
Una rotación confirmada cuya respuesta se pierde puede requerir nuevo OTP.

## Organización y archivos

Nuevos frontend:

- src/utils/session-contract.ts
- src/services/session-manager.ts, session.ts y private-http.ts
- src/context/session.tsx
- src/components/session-boundary.tsx
- src/app/cuidador/paso-4.tsx
- scripts/test-session.cjs
- docs/carer-session-increment.md

Modificados frontend:

- src/app/_layout.tsx e index.tsx
- src/app/cuidador/_layout.tsx, paso-2.tsx y paso-3.tsx
- src/components/carer/account-layout.tsx
- src/services/carer-auth.ts y src/config/env.ts
- scripts/test-carer-auth.cjs y package.json
- README.md y docs/design-system.md

Nuevos backend (bajo src/main/java/dia_facil/backend):

- persistence/entity/SesionCuidador.java y CredencialSesionCuidador.java
- persistence/repository/SesionCuidadorRepository.java y CredencialSesionCuidadorRepository.java
- service/auth/SesionCuidadorService.java, CriptografiaSesion.java y SesionInvalidada.java
- configuration/AutenticacionBearerCuidador.java y LimpiezaSesiones.java
- web/auth/SesionCuidadorController.java y dto/RefreshRequest.java
- docs/sql/add-cuidador-sessions.sql
- src/test/java/dia_facil/backend/service/auth/SesionCuidadorServiceTest.java
- src/test/java/dia_facil/backend/web/auth/SesionCuidadorControllerTest.java

Modificados backend:

- configuration/AutenticacionConfiguration.java y SecurityConfiguration.java
- service/auth/AutenticacionCuidadorService.java y AutenticacionCuidadorTransaccionalService.java
- web/auth/AutenticacionCuidadorController.java
- web/auth/dto/VerificarCodigoResponse.java y CompletarRegistroResponse.java
- web/error/ProblemasHttp.java y AutenticacionExceptionHandler.java
- src/main/resources/application.properties
- pruebas de configuración, transacciones, contrato HTTP y metadatos de persistencia
- src/test/resources/persistence/sql-v7-model.tsv
- docs/auth-http.md, docs/persistence.md y README.md
- documentacion-dia-facil/scrip_diafacil_v7.sql y DiaFacil_Definicion_y_Arquitectura_v4.md

No se eliminan archivos de producto ni se agregan dependencias de ejecución.

## Ajuste de integración Spring

La descarga de módulos OAuth2 Resource Server no estuvo disponible en el entorno.
Se usan AuthenticationFilter, ProviderManager y AuthenticationProvider de Spring
Security instalado para el mismo Bearer opaco local. El filtro utiliza repositorio
de contexto nulo y sesiones HTTP STATELESS. El principal Identidad proviene de BD;
el endpoint de sesión ignora IDs y tokens enviados por query. No hay filtro que
interprete JWT ni autenticación por contraseña. GET sesion es el único privado
habilitado; futuros módulos deben extender explícitamente matcher y autorización.

## Preparación y prueba manual

Revisar add-cuidador-sessions.sql y aplicar las dos tablas en la base de prueba.
No se ejecutó SQL real ni se habilitó Flyway. Local con ddl-auto=update puede
agregarlas al reiniciar; otros entornos necesitan el script revisado.
Recompilar/reiniciar backend y recargar Expo para consumir el contrato ampliado.
No cambiar las claves de OTP/registro para implementar sesión: no se agrega otra
clave HMAC. En producción la URL del frontend debe ser HTTPS; HTTP queda limitado
a __DEV__. SecureStore funciona en Expo Go sin biometría obligatoria.

1. Correo nuevo → OTP → Paso 3 → registro → Paso 4 con nombre/avatar → Continuar.
2. Raíz: Sesión activa y Comprobar sesión debe responder con la identidad real.
3. Cerrar/reabrir, recargar JS y reiniciar teléfono: restaura sin Login ni Pasos 3/4.
4. Logout online: Login y esa familia revocada, sin borrar cuenta.
5. Logout offline: Login sin restaurar credencial pendiente; al reconectar se revoca
   en arranque/foreground o en el reintento cada 30 segundos con la app activa.
6. Correo existente → OTP → confirmación → raíz, sin Pasos 3/4.
7. Otra instalación → mismo correo/OTP → sesión adicional; la anterior sigue válida.
8. Probar expiración, rotación perdida y revocación: sesión inválida vuelve a Login.

Validaciones físicas y de concurrencia con MySQL real quedan pendientes. Las pruebas
aisladas usan repositorios/almacenamiento simulados, no SMTP ni base de desarrollo.

## Validación ejecutada

- TypeScript y lint: correctos, sin errores ni advertencias frontend.
- 17 pruebas del flujo/contrato y 15 de sesión/Axios/navegación: exitosas.
- 108 pruebas backend aisladas: contrato, identidad Bearer, revocación, límites,
  rotación, rollback/commit y metadatos, incluyendo generaciones cambiadas durante el lock.
- Exportación Android: correcta, con assets y SecureStore ya instalado.

Se usó compilación Java y JUnit directo con dependencias locales ante las limitaciones
Maven/descarga del entorno. El compilador local emite AccessDeniedException al cerrar
un JAR aunque termina con código cero y las clases compiladas ejecutan correctamente
las pruebas. Logs: backend_dia_facil/target/session-compile.log y session-validation.log.

## Corrección de la transición al Paso 4

Paso 3 permite también la etapa autenticada `onboarding` para que publicar la
sesión recién persistida no retire la pantalla antes de reemplazarla por Paso 4.
Paso 4 ya no llama `finishOnboarding` desde el cleanup de un efecto: un desmontaje
transitorio no equivale a finalizar el flujo. Continuar y el botón volver mantienen
su finalización explícita. La restauración sigue produciendo `ready`, sin repetir
Paso 4 ni persistir la etapa de onboarding.

Cuatro pruebas adicionales ejecutan las protecciones y componentes reales con
adaptadores nativos: transición tras persistir, montaje/desmontaje y acciones de
Paso 4, exclusión de cuentas existentes/restauradas y recuperación de almacenamiento.
No se modifican backend, contratos ni credenciales por esta corrección.
