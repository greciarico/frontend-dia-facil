# Mis perfiles

Este informe describe el incremento inicial de consulta. La creación real y sus
rutas están implementadas posteriormente en crear-perfil-increment.md; las
referencias a creación deshabilitada de este informe son históricas.

## Resultado y navegación

La raíz redirige únicamente authenticated/ready a /perfiles. El grupo
(cuidador-autenticado) está protegido por ese mismo estado y comparte header,
menú de cuenta y barra inferior. Paso 4 → Continuar sigue pasando por la raíz;
cuidador existente y restauración llegan a Mis perfiles sin repetir onboarding.
No cambian Pasos 1–4, SessionManager, SecureStore ni refresh. SessionBoundary
conserva restauración/error/reintento/logout; deja de ser la UI principal.

GET /api/perfiles usa el cliente privado y el principal backend. El hook carga
al enfocar, evita duplicados, aborta al salir e ignora resultados de sesiones
anteriores. No almacena perfiles ni credenciales adicionales. La respuesta
se valida antes de decidir vacío/lista; un fallo nunca representa lista vacía.

La ilustración thoughtful-carer.png ya existía y se reutiliza completa. La UI
usa Nunito, safe areas, superficies semánticas light/dark y texto ampliado.
Tarjetas muestran nombre/avatar reales; no contienen progreso ni cantidades
de actividades. El slot details permite añadir contenido secundario después.

Crear mi primer perfil y Agregar nuevo perfil comparten CreateProfileButton y
onCreateProfile. Creación/acceso al perfil, campana y tres destinos futuros
están deshabilitados y se anuncian como tales. Con el máximo recibido se oculta
Agregar nuevo perfil. Perfiles es el único destino real. Logout está en Opciones
de cuenta, con modal accesible y cierre mediante atrás de Android.

## Archivos de este incremento

Nuevos frontend:
- src/app/(cuidador-autenticado)/_layout.tsx y perfiles.tsx
- src/components/carer/area-layout.tsx, area-header.tsx, area-navigation.tsx y area-icon.tsx
- src/components/carer/notification-bell.tsx, profile-card.tsx, profile-avatar.tsx y create-profile-button.tsx
- src/constants/carer-navigation.ts, src/hooks/use-profiles.ts
- src/services/profiles.ts, src/utils/profiles.ts, scripts/test-profiles.cjs
- docs/mis-perfiles-increment.md

Modificados frontend:
- src/app/_layout.tsx e index.tsx
- src/components/session-boundary.tsx y carer/continue-button.tsx (icono opcional)
- src/theme/tokens.ts, package.json, README.md y docs/design-system.md

Nuevos backend (src/main/java/dia_facil/backend):
- persistence/repository/PerfilUsuarioRepository.java
- service/perfiles/PerfilUsuarioService.java, PerfilResumen.java y PoliticaPerfiles.java
- web/perfiles/PerfilUsuarioController.java y dto/PerfilesResponse.java
- pruebas de repositorio, servicio y controller; docs/perfiles-http.md

Modificados backend/documentación:
- configuration/SecurityConfiguration.java y su prueba
- docs/auth-http.md
- documentacion-dia-facil/DiaFacil_Definicion_y_Arquitectura_v4.md

No se eliminan archivos, cambian entidades/esquema ni agregan dependencias.
El asset existente no se recrea.

## Validación y prueba manual

Pruebas frontend: contrato, servicio privado, estados de pantalla, máximo,
acciones pendientes, respuestas tardías y protección/navegación. Se conservan
las pruebas de OTP, registro y sesiones. Backend añade pruebas de DTO, principal,
errores de seguridad, propietario/ACTIVO y compilación de la consulta JPA.
TypeScript, lint y exportación Android completan las validaciones disponibles.

Resultado: 40 pruebas frontend (8 nuevas), 116 backend aisladas (8 nuevas),
TypeScript y lint sin errores, exportación Android correcta con 59 assets.
El compilador local conserva el aviso AccessDeniedException al cerrar un JAR,
pero termina con código cero y las clases compiladas ejecutan todas las pruebas.

Recompilar/reiniciar backend y recargar Expo. No se requiere migración. Probar:
cuenta nueva → Paso 4 → Continuar → vacío; existente/restaurada → Mis perfiles;
lista con filas reales de la base de prueba; excluir perfiles ajenos/inactivos;
falta de conexión → Reintentar; access vencido → refresh; logout online/offline.
Datos de prueba se preparan fuera de este incremento: no hay POST de creación.

La prueba aislada backend usa Java/JUnit directo con dependencias locales,
por las limitaciones Maven previamente documentadas. Logs en target/profiles-compile.log
y profiles-validation.log. Las pruebas no conectan a MySQL ni SMTP. La revisión
visual en Android físico y la ejecución con filas reales quedan pendientes.
