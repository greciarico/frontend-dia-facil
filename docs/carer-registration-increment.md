# Paso 3: creación de la cuenta del cuidador

> **Alcance hist?rico.** Informe hist?rico del primer registro. Sus notas sobre ausencia de sesi?n/Paso 4 y ?xito terminal en Paso 3 fueron sustituidas por [sesi?n y Paso 4](carer-session-increment.md). AUTENTICADO y REGISTRO_COMPLETADO actuales s? emiten sesi?n. Los resultados de pruebas y pendientes f?sicos inferiores pertenecen a ese incremento, no a una nueva validaci?n.

## Resultado y límites

REGISTRO_PENDIENTE → Entendido → Paso 3. AUTENTICADO no abre Paso 3 y no es una
sesión. El comprobante viaja solo en contexto React del navegador cuidador, sin
URL, almacenamiento o logs. Crear cuenta o abandonar el flujo lo descarta.

Nombre obligatorio (recortado y hasta 100 caracteres) para ambas acciones:
Continuar guarda avatar opcional; Personalizar más tarde siempre envía avatarId
null y, solo después de éxito mediante esa acción, muestra:
“Podrás personalizar tu perfil más adelante desde Mi perfil.”
El fallback visual es la inicial del nombre. Se usan los 20 SVG originales
locales y solo su ID se guarda en backend. No se crea PerfilUsuario, sesión/JWT,
foto propia/Cloudinary, pantalla terminal adicional ni Paso 4.

La petición de registro tiene bloqueo inmediato de duplicados, estados de carga,
mensajes seguros, cancelación al abandonar e ignorado de resultados tardíos.
El éxito es el texto Cuenta creada dentro del Paso 3 existente, con controles
deshabilitados. Una respuesta perdida puede haber creado cuenta: 409 obliga a
verificar otra vez el correo y no se interpreta como sesión.

## Archivos creados

Frontend (rutas relativas a frontend_dia_facil):

- src/app/cuidador/_layout.tsx
- src/app/cuidador/paso-3.tsx
- src/context/carer-registration.tsx
- src/utils/carer-registration.ts
- src/constants/carer-avatars.ts
- src/components/carer/account-avatar.tsx
- src/components/carer/avatar-selector.tsx
- docs/carer-registration-increment.md

Backend (rutas relativas a backend_dia_facil):

- src/main/java/dia_facil/backend/service/auth/CatalogoAvatarCuidador.java
- src/main/java/dia_facil/backend/web/auth/dto/CompletarRegistroRequest.java
- src/main/java/dia_facil/backend/web/auth/dto/CompletarRegistroResponse.java
- src/test/java/dia_facil/backend/service/auth/CatalogoAvatarCuidadorTest.java
- docs/sql/add-cuidador-avatar.sql

## Archivos modificados

Frontend:

- src/app/cuidador/paso-1.tsx y paso-2.tsx
- src/components/carer/account-layout.tsx y code-success-modal.tsx
- src/services/carer-auth.ts y src/theme/tokens.ts
- scripts/test-carer-auth.cjs, README.md y docs/design-system.md

Backend:

- src/main/java/dia_facil/backend/service/auth/AutenticacionCuidadorService.java
- src/main/java/dia_facil/backend/service/auth/AutenticacionCuidadorTransaccionalService.java
- src/main/java/dia_facil/backend/persistence/entity/Cuidador.java
- src/main/java/dia_facil/backend/web/auth/AutenticacionCuidadorController.java
- src/main/java/dia_facil/backend/web/error/ProblemasHttp.java y AutenticacionExceptionHandler.java
- src/main/java/dia_facil/backend/configuration/SecurityConfiguration.java
- src/test/java/dia_facil/backend/service/auth/AutenticacionCuidadorServiceTest.java
- src/test/java/dia_facil/backend/service/auth/AutenticacionCuidadorTransaccionalServiceTest.java
- src/test/java/dia_facil/backend/web/auth/AutenticacionCuidadorControllerTest.java
- src/test/java/dia_facil/backend/configuration/SecurityConfigurationTest.java
- src/test/resources/persistence/sql-v7-model.tsv
- docs/auth-http.md, docs/persistence.md y README.md

Documentación funcional y referencia SQL:

- documentacion-dia-facil/DiaFacil_Definicion_y_Arquitectura_v4.md
- documentacion-dia-facil/scrip_diafacil_v7.sql

No se eliminan archivos ni se modifican los SVG originales.

## Esquema y validación manual

Agregar avatar_id VARCHAR(32) NULL permite recordar el ID sin imágenes ni binarios.
Se entregó el script incremental revisable, sin ejecutarlo contra una base real ni
habilitar Flyway. Confirmar esa columna antes de probar registro: el perfil local
con ddl-auto=update puede agregarla al reiniciar; otros entornos necesitan el SQL
revisado. El backend debe recompilarse para exponer completar-registro y cargar la
política de 45 segundos ya existente. La duración frontend procede de la respuesta.

Prueba física: correo nuevo → OTP → Entendido → nombre → avatar opcional → crear.
Repetir con otro correo y Personalizar más tarde, comprobando nombre persistido,
avatar_id null, inicial del nombre y feedback exclusivo de esa acción.
Comprobar también expiración, cuenta existente, volver, pegado/navegación del flujo,
temas, texto ampliado y TalkBack. Paso 4 y acceso autenticado siguen pendientes.

## Validaciones ejecutadas

- TypeScript y lint correctos, sin errores ni advertencias frontend.
- 17 pruebas frontend aisladas exitosas: servicios, nombre, avatar opcional,
  limpieza de estado, catálogo local, OTP y contador basado en respuesta.
- 94 pruebas backend exitosas, incluidos servicios de registro, transacción,
  comprobante, catálogo, contrato HTTP, seguridad y metadatos de persistencia.
- Exportación Android correcta, con los 20 SVG originales incluidos.

Backend se validó con javac y JUnit directo usando dependencias locales, ante las
limitaciones Maven ya identificadas en el incremento anterior. El compilador local
emite AccessDeniedException al cerrar un JAR, aunque termina con código cero y
JUnit ejecuta las clases compiladas. Logs en backend_dia_facil/target/registration-compile.log
y target/registration-validation.log. No se enviaron correos reales ni se accedió
a una base real durante estas pruebas.
