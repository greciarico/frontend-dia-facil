# Mi perfil y accesibilidad propia del Cuidador

Implementado el 31 de octubre de 2026. Referencia visual:
design/vista-cuidador/mi-perfil-configurar-accesibilidad-cuidador-ejemplo.
No hay edición de nombre/avatar, fotografía, Cloudinary ni voz del Cuidador.

## Destinos y acciones

- `/mi-perfil`: datos reales de caregiver en la sesión, avatar local/fallback,
  nombre y rol Cuidador. No se muestran email ni datos personales adicionales.
  Un nombre legacy ausente se comunica como «Nombre no disponible».
- `/mi-perfil/accesibilidad`: tamaño, alto contraste y reset confirmado.
- `/mi-perfil/accesibilidad-diafacil`: «Accesibilidad en DiaFácil» es una pantalla
  informativa real, con chevron y navegación desde su tarjeta. No modifica ajustes.
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

247 pruebas frontend, TypeScript, lint y export Android correctos. La suite
test-carer-account.cjs cubre contrato, aislamiento de apariencia/voz, input/ref,
autosave/reconciliación/reset, provider/foreground/respuestas tardías, navegación,
Mi perfil, confirmación de logout y controles de preferencias. Las pruebas de
Usuario existentes siguen incluidas; las simulaciones no sustituyen validación física.

Pendiente Android físico: cuenta existente/nueva, logout/login/restauración,
MEDIANO/PEQUENO/GRANDE + escalado del sistema, contraste en todas las pantallas y
diálogos, red perdida/reconciliación, dos cuentas/instalaciones, TalkBack y retorno
de foco. iOS/VoiceOver no se dan por validados mediante export Android.
Futuro incremento: edición real de perfil. La multimedia editorial ya está implementada;
ver [assets, reproducción y validación](accesibilidad-multimedia.md).

## Accesibilidad en DiaFácil: información

Referencia completa: `design/vista-cuidador/accesibilidad-diafacil/DiaFacil_Accesibilidad_Prototipo_v3.html`.
Se conserva su estructura narrativa, no su CSS ni sus emojis/animaciones.

La ruta está dentro del stack de Mi perfil: header existente con volver y menú
inferior de Cuidador con Mi perfil seleccionado. El hero reutiliza el PNG local
transparente `user-account.png`, sin personajes nuevos ni teléfonos simulados.
AppText y useAppTheme heredan automáticamente tamaño y contraste de cuenta.

Orden: hero → Accesibilidad en acción (dos videos locales) → Cómo DiaFácil acompaña
→ seis capacidades → fotografía y reflexión → filosofía final. La pantalla
distingue información de configuración. El placeholder se reemplazó por
reproducción silenciosa por visibilidad y controles manuales, sin loop ni remoto;
con reducción de movimiento solo hay Play manual. Ver [detalle multimedia](accesibilidad-multimedia.md).

Contenido local en `src/constants/accessibility-information.ts`: Apoyo visual,
Paso a paso, Lectura de voz, Texto adaptable, Alto contraste y Solicitar ayuda.
Solo Solicitar ayuda se marca como **Próximamente**, con redacción en futuro y
sin prometer envío/notificaciones actuales. No implementa ese módulo.
La lectura de voz se explica para Usuario, no se activa TTS del Cuidador.
El ejemplo bread es un icono de actividad; no se utiliza como pictograma de paso.

El carrusel usa ScrollView horizontal con seis tarjetas de altura natural, dentro
del scroll vertical. Mide el viewport disponible para calcular ancho y siguiente
tarjeta parcialmente visible; no usa breakpoints por teléfono. Tiene gesto,
flechas de anterior/siguiente e indicador de posición. No hay avance automático
ni transiciones programáticas animadas. Conserva el índice al cambiar el ancho.

Solo el botón + abre el detalle: ActivityDialog con safe areas, scroll, X y
Entendido. Atrás de Android/escape accesible usan su cierre existente; el foco
regresa al + y se conservan la posición del carrusel y el scroll vertical.
Los bloques de información y video no simulan ser acciones.

Pruebas automatizadas: contrato narrativo, función futura, slot sin reproducción,
seis diálogos en tema normal/Alto contraste, texto sin truncamiento para las tres
escalas, apertura/cierre, gesto/flechas, límites, cambio de viewport y retorno de
foco. Pendiente revisión física Android: gestos y foco real, GRANDE + texto del
sistema, teléfonos pequeños y scroll de modal; también VoiceOver/iOS.
No se tocaron TTS Usuario, preferencias por PerfilUsuario, backend ni contratos.

### Demostraciones y familias cromáticas

Las tarjetas reutilizan getActivityVisualFamily(index, highContrast) igual que
Mi agenda: light para tarjeta, stroke para borde y hover para la escena, tanto
en tema normal como con Alto contraste. Se conserva la repetición de cinco
familias: amarillo, verde, naranja, azul, morado y amarillo. Texto y controles
usan los tokens semánticos; no se cambió ninguna paleta compartida.

AccessibilityCapabilityDemo es compartido por tarjetas y sus diálogos:

- Apoyo visual: tres iconos 3D locales (bread, open-book y run), con variación
  estática mínima de posición/escala, sin fondos individuales, flechas, números,
  labels ni interacción. No mezcla iconos de actividad y pictogramas de pasos.
- Paso a paso: dos miniaturas ARASAAC aprobadas (2443/5549), con números 1/2 y
  una flecha. Sin bloques de instrucciones largos ni apilado vertical.
- Lectura de voz: mini instrucción, icono audio y ondas vectoriales decorativas.
- Texto adaptable: tres Aa con tamaños progresivos de tokens y escalado nativo,
  con secuencia decorativa de pulsos solo al activarse su tarjeta; modal estático.
- Alto contraste: muestras Normal/Alto contraste con las paletas reales; no son
  switches ni cambian configuración. La muestra clara está acotada a la demostración.
- Solicitar ayuda: im-user.png → support → im-carer.png, horizontal con labels
  Usuario/Cuidador. Descripción dirigida al Cuidador: «Permite que la persona
  usuaria te avise cuando necesita ayuda durante una actividad». El detalle
  explica que podrá saber la actividad y el paso. Próximamente sigue visible
  porque el módulo funcional todavía no existe; no se envía ninguna solicitud.

Se eliminó la regla que apilaba escenas enteras y elevaba todo el carrusel.
Las miniaturas se ajustan al ancho medido y las escenas visual/pasos/ayuda se
mantienen horizontales dentro de una franja compacta común. No se fijan alturas
que recorten texto: etiquetas y contenido explicativo conservan su escalado.
Texto adaptable y la comparación de Alto contraste no se modificaron.
Su contenido decorativo no añade paradas redundantes al lector de pantalla;
la descripción informativa y el botón + siguen disponibles.

AccessibilityVoiceWaves usa Reanimated existente y un solo pulso de dos tiempos
de motion.userCelebrationDuration, sin sonido ni bucle. Solo anima en la escena
activa y con foco; abrir su diálogo desactiva la escena de la tarjeta. Se detiene
en background, blur, cambio de tarjeta, movimiento reducido y desmontaje. Una
respuesta tardía de accesibilidad no reinicia una escena cancelada. El video
no fue modificado por ese refinamiento de escenas. La integración multimedia
posterior se describe en su documento específico.

Los dos ejemplos ARASAAC se usan exclusivamente en Paso a paso. Son referencias informativas a IDs ya aprobados para
Desayunar (ver backend/docs/desayunar-arasaac.md), sin idPictograma interno.
La URL oficial se calcula desde idArasaac. Se autorizó su carga remota aquí:
StepPictogramImage conserva contain, caché disco y fallback existente. Si falla
la imagen, la ficha numerada de Paso a paso mantiene su orden. Se usa una pequeña
superficie clara para legibilidad de los trazos sin invertir la imagen.
No hay búsquedas, consulta de plantillas, cambios de datos base ni endpoints.

Pruebas adicionales: correspondencia de familias (incluida la sexta repetida),
seis demostraciones con tres tamaños/ambos temas, flujo horizontal compacto,
dos IDs aprobados, fallback/caché, paletas de comparación, separación semántica
y ciclo de vida/cleanup de ondas. Pendiente
revisión física de composición, tipografía ampliada, contraste y movimiento reducido.

### Pulso de Texto adaptable

AccessibilityTextSample conserva los tres tamaños, líneas y distribución previos.
Animated.createAnimatedComponent(AppText) aplica solo transform: scale, sin añadir
wrappers que cambien la alineación de las letras. Cada Aa hace 1 → 1.06 → 1, en
dos tramos de motion.accessibilityTextPulseDuration (180 ms); los inicios se
escalonan 0/360/720 ms para completar uno antes de comenzar el siguiente.
No hay bucle ni cambios dinámicos de tipografía, padding, márgenes o alturas.

El carrusel habilita animateText solo en la tarjeta activa; su modal no lo activa.
Los renders con la misma activación no reinician el efecto. Al salir, perder foco,
pasar a background o desmontar, se cancelan los tres valores y vuelven a 1.
Con movimiento reducido no se inicia; cambios del sistema y respuestas tardías
también se protegen. Reentrar en la tarjeta permite una nueva secuencia.
No se cambió la animación de voz ni otras demostraciones. Pruebas cubren orden,
duraciones, cancelación, reentrada, layout/estilos constantes y ambas paletas/tres
tamaños. La ausencia de saltos/recortes reales requiere comprobarse en Android.

[Contrato y transición de esquema](../../backend_dia_facil/docs/accesibilidad-cuidador-http.md).
