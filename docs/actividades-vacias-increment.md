# Actividades de PerfilUsuario — estado vacío

Mis perfiles → Perfil → Crear sus actividades → Actividades del perfil.
La pantalla obtiene por ID el perfil real y después consulta
GET /api/perfiles/{idPerfilUsuario}/actividades con el mismo cliente privado.
Ambas consultas deben terminar correctamente antes de presentar el vacío.
No se transportan nombre/avatar como autoridad ni existe perfil seleccionado global.

El backend valida propiedad y estado ACTIVO mediante PerfilUsuarioService antes
de consultar una proyección de actividades ACTIVA. El DTO contiene actividades:
array de idActividad y nombre. Ajeno/inactivo/inexistente conservan el mismo
404 PERFIL_NO_ENCONTRADO. No hay filtro por día, ejecución ni nueva tabla.

## UI y navegación

Header con nombre morado y ProfileAvatar pasivo (incluye fallback). AreaHeader
admite etiqueta de regreso y contenido derecho, conservando defaults de cuenta.
El calendario se dibuja con react-native-svg y tokens del tema; no usa capturas,
dependencias nuevas ni imagen externa. El contenido permite scroll/texto ampliado.

Se diferencia loading, vacío, error recuperable, perfil no disponible y datos
presentes. Una respuesta inválida muestra error seguro, nunca vacío. Datos presentes
solo muestran un aviso neutral; no se desarrolla la agenda llena. Nueva actividad
está deshabilitada, con callback opcional único onCreateActivity(id), sin ruta,
POST ni handler ficticio. Accesibilidad y vinculación continúan deshabilitadas.

La ruta de detalle se mueve de [idPerfilUsuario].tsx a [idPerfilUsuario]/index.tsx,
sin cambiar /perfiles/{id}. Un Stack interno con ancla index añade actividades.
La flecha vuelve al perfil mediante dismissTo; Atrás físico tiene el perfil debajo.
El padre conserva el ancla Mis perfiles y la única AreaNavigation; Perfiles sigue
seleccionado y permite regresar a la lista. Creación/confirmación mantienen replace
con withAnchor. No se altera sesión, restauración, SecureStore ni contratos GET/POST
de colección o GET de detalle del perfil.

## Archivos

Backend nuevos: ActividadRepository; service/actividades (ActividadService y
ActividadResumen); web/actividades (ActividadController y ActividadesResponse);
ActividadServiceTest y ActividadControllerTest. Modificados: SecurityConfiguration,
PerfilUsuarioRepositoryTest y contratos auth-http/perfiles-http.

Frontend nuevos: ruta actividades y layout interno del perfil; utils/activities,
services/activities, hooks/use-profile-activities; ActivitiesEmptyIllustration y
CreateActivityButton. Movida: pantalla de detalle a index dentro de su carpeta.
Modificados: layout principal, AreaHeader, profile-navigation, tokens,
test-profiles, README y documentación del design system/detalle.
Se actualiza la definición funcional. No se eliminan capacidades existentes ni se
aplican migraciones; se conservan cambios anteriores del workspace.

## Validación realizada

- 63 pruebas frontend: 17 carer-auth, 16 session, 30 profiles. Incluyen parsers,
  errores, carga secuencial, cancelación, respuestas tardías, botón deshabilitado,
  header y navegación con parser/StackRouter instalados, incluidos enlaces directos.
- TypeScript y ESLint correctos; rutas tipadas regeneradas mediante Expo offline.
- Exportación Android correcta en .cache/activities-empty-android.
- Backend: 138 pruebas correctas, una MySQL opt-in omitida. Incluye controller con
  filtros reales de seguridad, servicio, proyección JPQL compilada por Hibernate y
  regresiones de perfiles/autenticación. Sin acceso a BD ni SMTP.
- Maven offline no pudo abrir su repositorio configurado C:\.m2\repository. Se usó
  javac/JUnit con las dependencias locales de target/isolated-test-libs. El compilador
  emitió el aviso existente de cierre de JAR del entorno, con salida 0 y pruebas
  correctas. Logs: backend target/activities-maven.log, activities-compile.log y
  activities-validation.log. No se afirma una ejecución Maven completa.

## Pendiente de comprobación física

1. Perfil sin actividades: abrir desde Mis perfiles, comprobar nombre/avatar y vacío.
2. Flecha y Atrás de Android deben llevar al perfil; Perfiles inferior a la lista.
3. Crear perfil → ¡Listo! → Comenzar → Perfil → Actividades → Atrás, sin volver a creación.
4. Verificar dark/light, texto ampliado y TalkBack; Nueva actividad debe anunciarse
   deshabilitada y el avatar no debe abrir menús.
5. Probar red fallida y Reintentar; IDs no disponibles deben mostrar feedback seguro.
6. Con datos existentes en una BD de prueba, comprobar que no se muestra vacío y
   que perfiles ajenos/inactivos no pueden consultarse. No se sembraron esos datos.
