# Creación de PerfilUsuario

Nota posterior: el incremento descrito en [perfil-inicio-increment.md](perfil-inicio-increment.md)
cambia el destino de Comenzar al detalle del perfil creado por su ID real.
El flujo de creación y su contrato permanecen iguales.

## Flujo

Mis perfiles → Crear mi primer perfil / Agregar nuevo perfil → /crear-perfil →
POST real → /perfil-creado → Comenzar → /perfiles → GET actualizado.

El grupo privado conserva sus guards. (principal) envuelve Mis perfiles con el
header y menú existentes; (creacion-perfil) presenta formulario y confirmación
sin ese marco, como los prototipos. La URL /perfiles no cambia. El resultado de
201 solo vive en ProfileCreationProvider, vinculado a cuenta/revisión de sesión,
y se descarta al salir. Confirmación directa, JS recargado o sesión restaurada
sin resultado vuelven a Mis perfiles sin consultar ni recrear desde confirmación.

Nombre obligatorio trim, máximo 60; avatar opcional/null, inicial del nombre.
Se reutilizan selector/grid/20 SVG y tokens, con etiquetas configurables sin
cambiar defaults del Paso 3. La cámara está deshabilitada, sin permisos ni APIs
de fotografía. Confirmación usa el DTO devuelto y confeti SVG estático.

Mientras se envía no hay envíos duplicados. Un 409 bloquea y permite revisar la
lista; validación mantiene el formulario; red/timeout/5xx o 201 inválido muestran
resultado incierto y bloquean reenvío hasta salir a revisar Mis perfiles. Los
resultados tardíos tras salir o cambiar sesión se ignoran. El cliente privado
solo conserva status/códigos/campos permitidos, sin detail, body, headers ni
objetos Axios. Se mantiene su refresh y opt-in de un reintento tras 401 renovable;
no hay repetición automática por fallos de transporte. No hay logs nuevos.

## Backend y persistencia

Contrato: backend_dia_facil/docs/perfiles-http.md. POST obtiene el propietario
del principal. La transacción bloquea el cuidador antes de contar activos,
valida cuatro, crea perfil/configuración y confirma antes de devolver 201.
Se conservan columna avatar y trigger. Sin migración, Flyway, cambios de tokens
ni tablas nuevas. Código interno DF-000000 aleatorio y único; solo colisiones
de su restricción reintentan transacciones completas (máximo tres).

## Archivos

Backend nuevos:
- service/avatares/CatalogoAvatares.java
- service/perfiles/CrearPerfilService.java, CreacionPerfilTransaccionalService.java,
  GeneradorCodigoPerfil.java y RechazoPerfil.java
- web/perfiles/dto/CrearPerfilRequest.java
- pruebas CrearPerfilServiceTest, CreacionPerfilTransaccionesTest y CreacionPerfilMySqlTest

Backend modificados:
- PerfilUsuario y ConfiguracionPerfil: factories, sin cambiar mapeos
- CuidadorRepository: bloqueo; PerfilUsuarioRepository: conteo
- PerfilUsuarioController, SecurityConfiguration, AutenticacionExceptionHandler
- CatalogoAvatarCuidador: delega al catálogo común; sus consumidores mantienen reglas
- PerfilUsuarioControllerTest, docs/perfiles-http.md y docs/auth-http.md

Frontend nuevos:
- src/app/(cuidador-autenticado)/(principal)/_layout.tsx
- src/app/(cuidador-autenticado)/(creacion-perfil)/_layout.tsx, crear-perfil.tsx y perfil-creado.tsx
- src/context/profile-creation.tsx, src/components/carer/profile-flow-layout.tsx
- src/utils/create-profile.ts y este informe

Frontend modificados/movidos:
- perfiles.tsx se mueve a (principal), conservando URL y consulta
- layout del grupo privado; selector/avatar labels; area-icon
- services/profiles.ts, services/private-http.ts, utils/profiles.ts y theme/tokens.ts
- scripts/test-profiles.cjs, scripts/test-session.cjs, README y design-system

No se eliminan pantallas funcionales. No se agregan dependencias, fotografía,
Cloudinary, agenda, accesibilidad configurable ni vinculación.

## Validación

Pruebas aisladas de contrato HTTP, validación/catálogo, principal, transacciones
commit/rollback, conteo/bloqueo, colisiones y metadatos. Frontend prueba navegación,
201 real, doble pulsación, errores, respuestas tardías, resultado en memoria,
Comenzar y reglas de refresh. TypeScript/lint y exportación Android.

Resultado ejecutado: 48 pruebas frontend aprobadas; 127 pruebas backend aisladas
aprobadas y una MySQL omitida por falta de configuración exclusiva. TypeScript,
lint y exportación Android correctos. No se afirma validación MySQL con mocks.

La prueba real CreacionPerfilMySqlTest queda opt-in. Requiere esquema previamente
preparado con el SQL del proyecto, en una base EXCLUSIVA diafacil_test_*, y variables
DIAFACIL_TEST_MYSQL_URL, DIAFACIL_TEST_MYSQL_USER, DIAFACIL_TEST_MYSQL_PASSWORD.
Ejemplo de URL sin secretos: jdbc:mysql://localhost:3306/diafacil_test_perfiles.
No usa application-local ni crea/migra esquema. Solo inserta fixtures con cuenta
aleatoria propia y limpia sus filas. Dos hilos desde tres activos (y un inactivo)
deben terminar con un éxito, un límite y cuatro activos. No sustituir por mocks.
Ejecutar con Maven: ./mvnw -Dtest=CreacionPerfilMySqlTest test (mvnw.cmd en Windows).

En este entorno no hay DIAFACIL_TEST_MYSQL_URL: se informa como omitida, no aprobada.
No se conectó a MySQL/SMTP ni se ejecutó SQL sobre la base de desarrollo. Backend
aislado se valida con javac/JUnit y dependencias locales, por la limitación Maven
previa; logs target/create-profile-compile.log y create-profile-validation.log.
El aviso local del compilador al cerrar un JAR no impide salida cero ni ejecución.

Prueba en teléfono pendiente: reiniciar backend/Expo; crear con avatar y sin avatar;
ver confirmación y retorno con GET; cuarto permitido/quinto rechazado; logout,
restauración, texto ampliado, teclado, TalkBack y light/dark.
