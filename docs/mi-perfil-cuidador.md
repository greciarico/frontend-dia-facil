# Mi perfil y accesibilidad propia del Cuidador

Implementado el 31 de octubre de 2026. Referencia visual:
design/vista-cuidador/mi-perfil-configurar-accesibilidad-cuidador-ejemplo.
No hay edición de nombre/avatar, fotografía, Cloudinary ni voz del Cuidador.

## Destinos y acciones

- `/mi-perfil`: datos reales de caregiver en la sesión, avatar local/fallback,
  nombre y rol Cuidador. No se muestran email ni datos personales adicionales.
  Un nombre legacy ausente se comunica como «Nombre no disponible».
- `/mi-perfil/accesibilidad`: tamaño, alto contraste y reset confirmado.
- «Accesibilidad en Día Fácil» permanece visible y explícitamente no disponible,
  con estado accesible deshabilitado, sin chevron, handler ni ruta ficticia.
- Cerrar sesión abre LogoutDialog y llama al manager.logout existente una vez.
  Cancelar/X no cambia la sesión. Se retiró la entrada duplicada de tres puntos
  del header normal; la recuperación de sesión mantiene su salida de emergencia.

Mi perfil queda seleccionado en AreaNavigation también en su pantalla hija.
Se conservan los stacks/anchors de Perfiles y creación. No se toca E3 ni Usuario.

## Preferencias y ciclo de vida

CarerAccessibilityProvider cubre únicamente `(cuidador-autenticado)`, incluyendo
creación de perfiles. Su instancia depende de cuenta/revisión de sesión y se
descarta al salir o cambiar identidad. No guarda preferencias en SecureStore ni
AsyncStorage: backend es la fuente de verdad y persiste entre instalaciones.

GET inicial antes de mostrar pantallas evita un flash de tamaño/tema incorrecto.
Si falla, hay Reintentar y logout real. Con una configuración ya conocida, un
fallo posterior conserva pantallas y borradores montados y muestra recuperación.
Una consulta central refresca en foreground y al recuperar foco de stacks;
coalesce consultas pendientes y no interrumpe escrituras. Sin polling/WebSocket.
Las respuestas tardías de un scope abandonado no se aplican a otra cuenta.

Autosave utiliza AccessibilityEditor tipado con solo dos campos: actualización
optimista estable, PATCH absoluto, DTO de confirmación, rollback ante rechazo
conocido y GET de reconciliación ante resultado incierto. Nunca repite un PATCH
por pérdida de red. Durante incertidumbre se bloquean nuevas escrituras; un
Reintentar permite reconciliar. Reset confirmado es una única operación backend.
No se desmonta el formulario por guardar ni se cambia su valor a defaults mientras
confirma. Otra instalación obtiene cambios al refrescar, no en tiempo real.

## Presentación compartida sin mezclar identidades

AppearanceContext contiene tamaño/contraste de la cuenta; ProfileAppearanceContext
sigue reservado a PerfilUsuario e incluye voz. useAppearance permite a AppText,
AppTextInput, useAppTheme y useEffectiveFontScale reutilizar las mismas escalas y
paleta ya aprobadas. Los providers tienen ámbitos autenticados independientes.
No se cambió la lógica de consulta, TTS ni ejecución del Usuario.

Defaults propios: MEDIANO/false. Alto contraste activa la misma paleta oscura de
alta legibilidad con imágenes sin invertir; false conserva el tema normal existente.
No se añade selector de modo oscuro ni se modifica ConfiguracionPerfil.

TextSizeSelector comparte el diseño aprobado (único contenedor, opción morada,
círculo SVG blanco y check morado). AppText y AppTextInput aplican la preferencia
sin desactivar ni limitar el escalado nativo. Formularios, headers, diálogos y
componentes del área Cuidador utilizan esas primitivas; el onboarding fuera del
provider conserva su apariencia. El selector nativo de hora mantiene la apariencia
y accesibilidad de la plataforma: no se reemplaza ni se introduce otra dependencia.

## Verificación y pendientes

226 pruebas frontend, TypeScript, lint y export Android correctos. La suite nueva
test-carer-account.cjs cubre contrato, aislamiento de apariencia/voz, input/ref,
autosave/reconciliación/reset, provider/foreground/respuestas tardías, navegación,
Mi perfil, confirmación de logout y controles de preferencias. Las pruebas de
Usuario existentes siguen incluidas; las simulaciones no sustituyen validación física.

Pendiente Android físico: cuenta existente/nueva, logout/login/restauración,
MEDIANO/PEQUENO/GRANDE + escalado del sistema, contraste en todas las pantallas y
diálogos, red perdida/reconciliación, dos cuentas/instalaciones, TalkBack y retorno
de foco. iOS/VoiceOver no se dan por validados mediante export Android.
Futuros incrementos: edición real de perfil y pantalla informativa de accesibilidad.

[Contrato y transición de esquema](../../backend_dia_facil/docs/accesibilidad-cuidador-http.md).
