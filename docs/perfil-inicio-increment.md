# Pantalla principal de PerfilUsuario

> **Alcance hist?rico.** Informe hist?rico del hub inicial. Actualmente Crear sus actividades y Vincular dispositivo son funcionales; solo Configurar accesibilidad sigue pendiente. Ver [estado actual](../../documentacion-dia-facil/ESTADO_ACTUAL_PROYECTO.md). Los resultados de pruebas y pendientes f?sicos inferiores pertenecen a ese incremento, no a una nueva validaci?n.

Actualización posterior: [Actividades vacías](actividades-vacias-increment.md)
habilita Crear sus actividades y mueve esta ruta a `perfiles/[idPerfilUsuario]/index.tsx`
sin cambiar su URL. Las otras dos acciones continúan deshabilitadas.

Las tarjetas de Mis perfiles y Comenzar tras una creación real abren
`/perfiles/[idPerfilUsuario]`. Solo se transporta el ID; los datos proceden de
`GET /api/perfiles/{idPerfilUsuario}` mediante el cliente privado existente.

El endpoint deriva el cuidador del principal y filtra conjuntamente ID, propietario
y estado ACTIVO. Devuelve el DTO mínimo existente. Un perfil ajeno, inactivo o
inexistente devuelve el mismo 404 PERFIL_NO_ENCONTRADO. No cambia SQL ni sesiones.

La pantalla contempla loading sin datos ficticios, error con Reintentar y no
encontrado con regreso a Mis perfiles. Cancela/ignora respuestas al abandonar la
pantalla o cambiar sesión/ID. Usa el avatar existente con fallback y tamaño 168,
sin lápiz, cámara ni check. Las tres acciones futuras permanecen deshabilitadas;
el componente admite callbacks opcionales para conectarlas cuando existan.

El grupo principal conserva un único menú inferior. Perfiles sigue seleccionado
y permite volver a la lista. Su Stack tiene ancla en Mis perfiles. Comenzar usa
replace con withAnchor para retirar el grupo de creación; volver usa dismissTo.
No se repite POST ni se busca por nombre. La navegación se verifica con el parser
y StackRouter instalados; esto no sustituye la prueba física de Android.

## Archivos del incremento

Nuevos: ruta `src/app/(cuidador-autenticado)/(principal)/perfiles/[idPerfilUsuario].tsx`,
`src/hooks/use-profile-detail.ts`, `src/utils/profile-navigation.ts`,
`src/components/carer/profile-actions.tsx` y este documento.

Modificados en frontend: servicio profiles y clasificación segura en private-http;
header, layout, navegación, iconos y avatar compartidos; layout principal, lista y
confirmación; tokens y pruebas profiles; README y documentación del design system.
Se conservan los cambios anteriores del flujo de creación presentes en el workspace.

Modificados en backend: repository, service y RechazoPerfil; controller,
SecurityConfiguration y exception handler; pruebas de seguridad, controller,
servicio y repositorio; contratos HTTP. Se actualiza la definición funcional.
No se eliminan archivos ni se crean migraciones en este incremento.

## Validación

- Backend: compilación aislada javac y JUnit, 131 pruebas correctas y una prueba
  MySQL opt-in omitida. Logs en target/profile-detail-compile.log y
  target/profile-detail-validation.log. El compilador mantiene el aviso del
  entorno al cerrar un JAR, con salida 0; no se afirma ejecución completa Maven.
- Frontend: 55 pruebas correctas entre carer-auth, session y profiles; TypeScript, ESLint y exportación
  Android. Incluyen ownership del servicio/consulta, contrato y errores, respuestas
  tardías, acciones no disponibles y navegación con los componentes instalados.
- No se ejecutan escrituras MySQL ni envíos SMTP. Queda pendiente revisión visual
  y botón físico Atrás en Android, temas, texto ampliado y TalkBack.

Prueba manual: abrir una tarjeta y volver; crear perfil, Comenzar y volver sin
regresar a ¡Listo!; comprobar persistencia en la lista; probar fallo de red y
Reintentar; comprobar con datos de prueba que IDs ajenos/inactivos no son visibles.
Las acciones de actividades, accesibilidad y vinculación no deben navegar.
