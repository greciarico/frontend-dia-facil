## Sistema visual

Mi agenda usa variantes visuales de los componentes existentes: ActivitySummaryCard
`appearance="agenda"` y BottomNavigation `appearance="user"`. Los valores por defecto
conservan el aspecto del cuidador. `getActivityVisualFamily(index)` devuelve las
familias Yellow, Green, Orange, Blue y Purple mediante index % 5; mantiene la
función previa getActivityIconSurface y normaliza hoverLight de Purple como hover.
No hay colores nuevos ni relación entre color e identidad de la actividad.
La variante agenda integra la zona del PNG en la tarjeta, sin círculo; en light
utiliza light/stroke/hover/default de la familia y en dark reutiliza superficies
y bordes semánticos. Pendiente utiliza text.disabled y completada un check blanco.
`layout.userAgenda.navigationMaxWidth=256` limita solo la barra Usuario con texto
normal; con texto ampliado se permite el ancho disponible hasta contentMaxWidth.

La ayuda contextual de conexión Usuario reutiliza `ActivityDialog`, `ContinueButton size="modal"` y los iconos de cámara/teclado. Sus alternativas son secciones informativas sin fondo ni forma de tarjeta, con iconos morados, títulos Nunito bold y texto flexible; se distinguen únicamente mediante espaciado. `respectSafeArea` es una opción del diálogo compartido, desactivada por defecto y usada aquí; no cambia los diálogos previos. El modal no tiene animaciones y conserva foco accesible y contenido desplazable.

Los formularios de onboarding comparten [el patrón de teclado medido](keyboard-forms.md). Conserva la composición normal y safe areas; con teclado se adapta el viewport y se desplaza solo lo necesario para mostrar el campo enfocado, con separación `spacing.md`, sin offsets por dispositivo.

El onboarding de Usuario reutiliza `welcome.hero`/`welcome.body`, la curva SVG continua del cuidador y los PNG locales transparentes. Su variante de layout no altera la pantalla autenticada temporal ni los estados de recuperación. `layout.userOnboarding` conserva la proporción de los PNG y el ancho máximo de la ilustración de error. `motion.userConnectionTransitionDuration` define 1.200 ms de transición exclusivamente visual; no representa progreso backend, no anuncia porcentajes y respeta movimiento reducido.

Los estilos globales de DiaFacil deben centralizarse mediante **design tokens** reutilizables.

Los tokens se definen desde el inicio del proyecto. Si durante el desarrollo surge un nuevo valor global necesario, debe incorporarse al sistema existente.

Los componentes reutilizables, en cambio, se crearán progresivamente conforme aparezcan patrones reales durante la implementación de las pantallas.

### Colores

| Token | Valor |
|---|---|
| `colors.success` | `#56AF4E` |
| `colors.bug` | `#D92A16` |
| `colors.destructive.default` | `#EB5361` |
| `colors.destructive.surface` | `rgba(255, 172, 169, 0.24)` |
| `colors.destructive.onDefault` | `#FFFFFF` |
| `colors.blue.hover` | `#E2EFFA` |
| `colors.blue.light` | `#F2F8FC` |
| `colors.blue.default` | `#498FCF` |
| `colors.blue.stroke` | `#EAF1F9` |
| `colors.orange.light` | `#FEF6F2` |
| `colors.orange.hover` | `#FEE8D9` |
| `colors.orange.default` | `#E78F4C` |
| `colors.orange.stroke` | `#FDEDE5` |
| `colors.green.light` | `#F6FAF3` |
| `colors.green.hover` | `#E6F2DF` |
| `colors.green.default` | `#71BA47` |
| `colors.green.stroke` | `#E5EFE0` |
| `colors.yellow.light` | `#FEFDF6` |
| `colors.yellow.hover` | `#FEF3D4` |
| `colors.yellow.default` | `#FDCA2D` |
| `colors.yellow.stroke` | `#FDF0CF` |
| `colors.purple.default` | `#6552B7` |
| `colors.purple.light` | `#F8F3FA` |
| `colors.purple.hoverLight` | `#EAE3F4` |
| `colors.purple.dark` | `#4E438D` |
| `colors.purple.stroke` | `#EAE6F4` |
| `colors.greenDark.default` | `#31B079` |
| `colors.greenDark.light` | `#E4F7EC` |
| `colors.text.primary` | `#0A0B0A` |
| `colors.text.secondary` | `#686E7F` |
| `colors.text.disabled` | `#BBBDC6` |

### Fondos y temas

Los fondos utilizados actualmente en los prototipos son:

| Token | Valor |
|---|---|
| `colors.background.primary` | `#FFFFFF` |
| `colors.background.yellow` | `#FEFDF6` |
| `colors.background.purple` | `#EAE3F4` |

`background.yellow` corresponde a `colors.yellow.light`.
`background.purple` corresponde a `colors.purple.hoverLight`.

Estos fondos alternativos se utilizan principalmente en las pantallas iniciales y de autenticación según el prototipo.

La aplicación debe soportar modo claro y oscuro. El modo claro mantiene los colores definidos por los prototipos. Para el modo oscuro se deben definir tokens semánticos equivalentes que conserven el morado como color principal y mantengan contraste y legibilidad.

La selección de rol utiliza borde y superficie de acción, además de cambiar
la flecha por una marca de selección. No depende únicamente del color y expone
su estado a los lectores de pantalla.

No reemplazar los colores de marca por una escala gris genérica ni invertir automáticamente los colores del modo claro.

#### Tokens semánticos de la aplicación

La implementación está en src/theme/tokens.ts y se consume con
src/theme/use-theme.ts. Los fondos conservan roles diferentes, aunque algunos
coincidan en un tema. Las primitivas originales de Figma no se modifican.

| Rol | Light | Dark |
|---|---|---|
| background.primary | #FFFFFF | #121116 |
| background.yellow | #FEFDF6 | #1C1A23 |
| background.purple | #EAE3F4 | #272332 |
| surface.default | #FFFFFF | #1C1A23 |
| surface.elevated | #FFFFFF | #272332 |
| text.primary | #0A0B0A | #F6F3FB |
| text.secondary | #686E7F | #C4BDCF |
| text.disabled | #BBBDC6 | #908799 |
| action.primary | #6552B7 | #B9A7EF |
| action.pressed | #4E438D | #CBBBF5 |
| action.onPrimary | #FFFFFF | #19132B |
| action.disabled | #EAE6F4 | #3D3749 |
| border.decorative | #EAE6F4 | #3D3749 |
| border.control | #6552B7 | #8B829B |
| border.selected | #6552B7 | #B9A7EF |
| status.error / status.errorSurface | #D92A16 / #FEF6F2 | #FF8F83 / #3A1D20 |
| status.success / status.successSurface | #2C6E28 / #E6F2DF | #8EDC83 / #183321 |

Los colores dark son derivados aprobados, separados en derivedColors.dark,
no primitivas originales de Figma. El verde de texto #2C6E28 es un derivado
light para éxito; colors.success conserva su valor original.

Texto principal, secundario, sobre acciones y estados: contraste mínimo
4.5:1 con sus fondos. Bordes de control y selección: al menos 3:1. Bordes
decorativos y estados deshabilitados no transmiten información imprescindible.
Se utiliza el tema del sistema, con fallback a light, sin selector manual.

#### Composición de bienvenida

| Rol | Light | Dark |
|---|---|---|
| welcome.hero | colors.purple.light: #F8F3FA | #1C1A23 |
| welcome.body | background.yellow: #FEFDF6 | background.primary: #121116 |
| welcome.intro | colors.purple.light: #F8F3FA | #272332 |
| welcome.iconSurface | background.purple: #EAE3F4 | #1C1A23 |
| welcome.userAction | colors.purple.light: #F8F3FA | #272332 |
| welcome.carerAction | colors.orange.light: #FEF6F2 | #272332 |

Esta pantalla combina encabezado lavanda, zona amarilla y tarjetas blancas
según design/Login.png. El fondo principal del resto del sistema sigue siendo
blanco. Los assets originales se utilizan completos, sin recortar capturas.

### Tipografía

La familia tipográfica global es **Nunito**.

#### Tamaños

| Token | Valor |
|---|---:|
| `typography.size.xs` | `12` |
| `typography.size.sm` | `14` |
| `typography.size.md` | `16` |
| `typography.size.lg` | `18` |
| `typography.size.xl` | `20` |
| `typography.size.2xl` | `24` |
| `typography.size.3xl` | `28` |
| `typography.size.4xl` | `32` |

#### Pesos

| Token | Valor |
|---|---:|
| `typography.weight.regular` | `400` |
| `typography.weight.medium` | `500` |
| `typography.weight.semibold` | `600` |
| `typography.weight.bold` | `700` |

Solo deben cargarse y utilizarse las variantes de Nunito correspondientes a estos pesos.

Familias de ejecución: Nunito_400Regular, Nunito_500Medium,
Nunito_600SemiBold y Nunito_700Bold. Se cargan una vez desde sus cuatro archivos
estáticos en el layout raíz; no se importan las otras variantes del paquete.
Cada texto usa la familia de su peso, evitando negritas sintéticas.

Escala de interlineado, en orden de tamaños:
18, 20, 24, 26, 28, 32, 36, 40. Se respeta el escalado de texto del sistema.

### Dimensiones adicionales de bienvenida

- sizes.touchTarget: 48; icon: 24; iconSmall: 20; stroke: 2.
- borders.default: 1; selected: 2.
- shadows.card: desplazamiento vertical 3, opacidad 0.12, radio 3 y elevación Android 3.
- layout.contentMaxWidth: 480.
- welcome.heroHeight: 280; illustrationWidth: 248; illustrationRatio: 234/197;
  curveHeight: 32; roleIllustrationHeight: 96; roleMinHeight: 216.
- Las tarjetas se apilan bajo 340 de ancho o con escala de texto superior a 1.35.

Estas dimensiones de composición no sustituyen las escalas de espaciado.
El encabezado adapta su altura en pantallas pequeñas y el contenido admite
desplazamiento; no se truncan textos para conservar una altura fija.

### Composición de cuenta del cuidador

`layout.carer` centraliza las dimensiones de los pasos actuales: encabezado del
Paso 1 de 314 y Paso 2 de 396, ilustración de ancho 248, proporciones 250/183
y 240/190, curva de 32, puntos de progreso de 12 con separación 28 y casillas
de código de altura mínima 60. Son mínimos de composición: el contenido
crece con texto ampliado y admite desplazamiento y teclado.

Los pasos consumen `welcome.hero`, `welcome.body`, superficies, acciones,
bordes y estados semánticos existentes en ambos temas. El sobre SVG local es
una aproximación ilustrativa con colores de marca, no un recorte del diseño.
El OTP usa seis campos numéricos que crecen y se reacomodan con texto ampliado.
El contador representa la respuesta del backend y su instante objetivo local;
no es un token visual ni una duración fija del frontend.

El sobre se compone de tres capas SVG locales, reutilizadas en la pantalla y el
modal. `motion` centraliza transición de éxito de 700 ms, balanceo de 175 ms y
ángulo de 4 grados. La tarjeta sube spacing.2xl. Movimiento reducido omite la
transición. El modal usa surface.elevated y overlay.scrim (light rgba(10,11,10,.55),
dark rgba(10,11,10,.75)), foco accesible y una salida explícita “Entendido”.

Paso 3 usa layout.carer.profileHeroHeight (336), avatarSize (152) y avatarOptionSize
(56). El avatar grande y el selector consumen los originales de assets/avatars con
expo-image; el círculo fallback usa background.purple e inicial del nombre.
El selector indica selección únicamente con borde circular morado, sin checks.
Cuatro avatares rápidos y “+” ocupan cinco espacios iguales en una sola fila,
reduciendo el diámetro al ancho disponible. El modal presenta los 20 avatares
en grid sin nombres visibles; las etiquetas descriptivas y selected/checked
permanecen para lectores de pantalla. Se permite quitar selección.
No se usan capturas como assets ni nuevas
fuentes/colores fuera del sistema. La respuesta de registro alimenta la sesión
y el Paso 4; no se crea otra pantalla terminal adicional.

El nuevo Paso 4 consume perfil efectivo del contexto de sesión: ¡Cuenta creada!,
saludo por nombre, avatar local o inicial y filas neutrales de actividades,
accesibilidad y solicitudes de ayuda. Usa la composición de perfil existente,
sin nuevos colores ni fuentes. La raíz conserva carga/restauración/error y,
con sesión ready, dirige al módulo autenticado Mis perfiles.

En Paso 4, la curva ocupa el ancho completo del encabezado en un contenedor
absoluto sin padding. El contenido superior, el avatar y su check se dibujan por
encima; el tamaño del avatar se conserva. Esta composición se limita al Paso 4.
Los roles `onboarding.activities`, `onboarding.accessibility` y `onboarding.help`
definen pares `icon`/`surface`: en light usan purple.default/hoverLight,
green.default/hover y yellow.default/hover. En dark usan primary/elevated,
success/successSurface y el mismo par amarillo de marca. No se agregan colores.

### Espaciado

Mis perfiles utiliza header y navegación inferior compartidos, con safe areas
y contenido desplazable. `profiles.information` y `profiles.cards` reutilizan
purple.light, blue.light y orange.light en light; elevated/surface en dark.
`layout.profiles` define avatarSize 80, confirmationAvatarSize 200 y la proporción 1536/1024 del asset
local thoughtful-carer. Las tarjetas no dibujan progreso sin datos reales.
Los destinos futuros permanecen deshabilitados; las tarjetas abren el perfil real,
con estado accesible; Perfiles expone selected. Mi perfil muestra el avatar
efectivo del cuidador. Texto ampliado permite ajustar altura y envolver etiquetas.
Los botones de creación abren el formulario protegido sin menú inferior. Se
reutiliza el selector circular con etiquetas configurables, sin modificar las del
Paso 3. Cámara deshabilitada y fallback con inicial. Confirmación usa avatar
efectivo y decoración SVG estática, sin fotografías ni assets del prototipo.

La misma escala debe utilizarse para `padding`, `margin`, `gap` y separación entre elementos.

Actividades reutiliza el header del área con etiqueta de regreso configurable y
avatar pasivo a la derecha. El título envuelve con texto ampliado. Su estado vacío
usa una ilustración SVG local de calendario con círculo decorativo integrado,
colores semánticos y `layout.activities.emptyIllustrationSize` (120). El contenido
es desplazable y comparte la única barra inferior del área. Solo se dibuja el vacío
tras finalizar la consulta; loading, error y datos presentes son distintos.

Nueva actividad abre un formulario protegido con nombre, hora, icono y borrador
de pasos en memoria. Reutiliza header y barra inferior; tarjetas con radii.card, superficies
semánticas y sombras existentes. El icono usa layout.activities.iconSize (64) en
una opción de iconTileSize (88) en galería; las sugerencias
usan suggestionTileSize (72) e imagen de 48. El borde y check circular morados
indican selección; el check es decorativo y se conserva el estado accesible.
Los encabezados comparten un contenedor lila de sectionIconSize (36), radio
sectionIconRadius (8), icono SVG morado y título Nunito bold. La descripción de
iconos queda alineada con el título. AreaIcon incluye lápiz, imagen+, destellos,
cuadrícula y check sin alterar los símbolos existentes. El input mantiene 48 de
altura mínima, borde decorativo en reposo y borde de control al enfocar.
Las sugerencias son dinámicas desde tres caracteres con debounce de 250 ms, hasta
tres opciones reales. Antes de ese umbral se muestra solo la introducción, sin
instrucción adicional. La banda lila usa destellos y destaca el nombre consultado
en morado y bold. Ver más íconos centra cuadrícula y texto en un borde discontinuo
y abre la galería completa, sin buscador, con
safe areas, foco accesible y cierre explícito. No hay selección automática y el
icono elegido permanece visible al editar el nombre. No hay tarjeta duplicada de
selección: si el elegido sale de las sugerencias, aparece Tu selección con una
tarjeta compacta no interactiva de 72, imagen de 48, nombre y check. Ver más íconos sigue siendo el acceso
explícito al catálogo. La selección usa PNG locales
con contentFit contain. Crear actividad está deshabilitado hasta el incremento
de persistencia real. No hay assets inventados.

Hora y Paso a paso reutilizan ActivitySectionHeading con reloj/lista SVG del
AreaIcon existente. La hora es un campo táctil de 48 mínimo con selector nativo
instalado, sin fecha en el dominio. Los pasos muestran número y descripción, sin
imágenes porque las referencias actuales de Pictograma no son renderizables.
La sección de pasos forma una tarjeta continua con cabecera, filas compactas y
pie, usando el mismo borde, superficie, radio, sombra y padding que las demás.
Selector circular y número comparten un área táctil de 48; lápiz y handle tienen
áreas de 48, con lápiz sobre un bloque lila pequeño. No se trunca la descripción.
Seleccionar pasos no edita ni personaliza el borrador. La selección múltiple usa
claves estables y checkbox accesibles. Agregar paso usa una acción secundaria lila;
seleccionar pasos la cambia por Eliminar paso / Eliminar N pasos con
status.error/status.errorSurface y papelera. Cancelar su única confirmación conserva
la selección; confirmar elimina en una operación y limpia. Las claves mantienen
la selección al mover y se descartan si una plantilla reemplaza esos pasos.

El formulario usa una sola DraggableFlatList y GestureHandlerRootView local, sin
listas anidadas ni nuevas dependencias. Se arrastra desde el handle SVG con
pulsación prolongada; los lectores de pantalla tienen acciones Subir/Bajar. El
orden local se valida por claves, se renumera y solo un cambio efectivo marca
personalización. Durante el gesto se suspende la aplicación de plantillas.
Los textos usan activityQuery(nombre), no el título canónico de plantilla. Un
borrador personalizado tiene descripción neutra; la propuesta pendiente se ofrece
en una acción secundaria lila con destellos, oculta al aceptar sus mismos pasos.
La marca de protección permanece. Edición, eliminación y sustitución usan ActivityDialog con superficies
semánticas, foco en el título y contenido desplazable. El editor admite texto
ampliado, multiline y máximo 120 caracteres. Los pasos y hora no se guardan en B.

La [revisión final de UX de B](nueva-actividad-ux.md) documenta el trabajo acotado
del arrastre y el warning de InteractionManager originado en dependencias, sin
actualizarlas ni ocultar mensajes.

| Token | Valor |
|---|---:|
| `spacing.xs` | `4` |
| `spacing.sm` | `8` |
| `spacing.md` | `12` |
| `spacing.lg` | `16` |
| `spacing.xl` | `20` |
| `spacing.2xl` | `24` |
| `spacing.3xl` | `32` |
| `spacing.4xl` | `40` |
| `spacing.5xl` | `48` |

### Border radius

| Token | Valor | Uso |
|---|---:|---|
| `radii.control` | `16` | Botones, inputs y controles similares |
| `radii.card` | `20` | Tarjetas y contenedores |

### Implementación

`ContinueButton` mantiene el tamaño `screen` por defecto y ofrece `size="modal"`:
target mínimo de 48, padding vertical 8/horizontal 12 y texto Nunito de 16.
`StepDialogActions` distribuye las acciones por su ancho de contenido, permite
wrap y las apila en pantallas estrechas o con texto ampliado; no trunca etiquetas
ni limita el escalado de fuente. Se conserva Cancelar además del cierre X.

Los tokens semánticos `destructive` están separados de `status.error` y conservan
los valores de Figma en ambos temas. Eliminar utiliza fondo destructive.default
y texto onDefault; su Cancelar utiliza borde/texto destructive.default sobre
superficie neutra. Ambas etiquetas destructivas usan Nunito bold de 20 para
cumplir contraste AA de texto grande con el rojo especificado (umbral 3:1).
La validación de campos sigue utilizando status.error sin cambios.

Los design tokens deben centralizarse en el frontend y consumirse desde pantallas y componentes.

Ejemplo conceptual:

```ts
padding: spacing.lg,
gap: spacing.sm,
borderRadius: radii.control,
fontSize: typography.size.md,
fontWeight: typography.weight.semibold,
color: colors.text.primary,
backgroundColor: colors.blue.default,
```

Evitar valores hardcodeados cuando exista un token equivalente.

Los design tokens **no son variables de entorno**. Las variables de entorno se reservan para configuraciones que cambian según el entorno, como la URL del backend.

Las imágenes de `design/` son la referencia visual de las pantallas y la documentación (documentacion-dia-facil) define su comportamiento funcional.
