## Sistema visual

Los estilos globales de DiaFacil deben centralizarse mediante **design tokens** reutilizables.

Los tokens se definen desde el inicio del proyecto. Si durante el desarrollo surge un nuevo valor global necesario, debe incorporarse al sistema existente.

Los componentes reutilizables, en cambio, se crearán progresivamente conforme aparezcan patrones reales durante la implementación de las pantallas.

### Colores

| Token | Valor |
|---|---|
| `colors.success` | `#56AF4E` |
| `colors.bug` | `#D92A16` |
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

### Espaciado

La misma escala debe utilizarse para `padding`, `margin`, `gap` y separación entre elementos.

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
