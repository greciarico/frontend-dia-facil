# Nueva actividad: revisión final del incremento B

Este documento conserva la revisión del incremento B. La persistencia y la
habilitación posterior de Crear actividad están en [incremento C](crear-actividad.md).

El formulario sigue sin persistencia: Crear actividad está deshabilitado. Esta
revisión no cambia backend, hora, consultas, keywords, plantillas ni dependencias.

## Sugerencias y elección manual

Las sugerencias mantienen su significado y sus propios resultados. Si el icono
elegido no está entre los resultados visibles, Tu selección muestra por separado
una tarjeta de 72 con imagen de 48, check y nombre. Es una representación no
interactiva y reutiliza el renderer y manejo de fallo de imagen del selector.
Si vuelve a aparecer entre las sugerencias, no se duplica. Ver más íconos permanece
debajo y continúa siendo el acceso explícito al catálogo completo.

## Selección múltiple de pasos

Conjunto local de claves estables, independiente del contenido del borrador.
Los círculos son controles checkbox accesibles; alternarlos no edita ni activa
personalización. Las claves seleccionadas sobreviven a reordenamientos y se
depuran cuando desaparecen sus pasos.

Sin selección se muestra Agregar paso; con uno, Eliminar paso; con varios,
Eliminar N pasos. El modal singular conserva la descripción del paso; el plural
indica la cantidad total. Cancelar conserva contenido y selección. Confirmar
despacha una única acción removeMany, conserva las claves de los supervivientes,
renumera desde 1, activa la protección y limpia la selección. Una sustitución
explícita de plantilla también limpia la selección.

## Arrastre y alcance de la optimización

Se mantiene la lista desplazable única, los handles y la librería instalada.
Nuestro código no actualiza estado por cada movimiento del dedo, solo en los
límites del gesto. Las posiciones visibles son las confirmadas; se renumeran al
soltar, sin introducir orden provisional en el dominio.

Cambios pequeños: guardas antes de intentar aplicar una plantilla ya aplicada o
protegida; la acción editing devuelve el mismo estado si el valor no cambia;
extractor de claves, callbacks y renderItem estables, y valores derivados memoizados.
La selección usa Set y extraData para actualizar correctamente la lista. No se
añadieron comparadores personalizados, temporizadores ni cambios de arquitectura.
React Compiler permanece habilitado. Estos cambios evitan trabajo identificable,
pero no prueban por sí solos una mejora perceptible: debe compararse en Android.

## Warning InteractionManager

No hay usos de InteractionManager en src. En react-native-draggable-flatlist
4.0.3, src/components/DraggableFlatList.tsx importa InteractionManager (línea 13)
y usa runAfterInteractions (líneas 119–124) al cambiar la secuencia de claves,
para reiniciar el estado interno del gesto. Esto explica su aparición al cargar
o reordenar pasos. Expo Router contiene además llamadas internas en
build/react-navigation/stack/views/Stack/Card.js.

Es una API de React Native deprecada utilizada por dependencias; el warning no
demuestra un fallo funcional ni establece la causa del retraso percibido. Se
conserva como limitación de desarrollo: no se actualizan paquetes, no se editan
node_modules ni se oculta mediante LogBox u otro filtro.

## Validación manual pendiente

Comparar antes/después del arrastre en el mismo Android físico. Revisar también
selección múltiple, eliminación singular/plural cancelada y confirmada, selección
tras mover pasos, sustitución de plantilla, TalkBack y texto ampliado en ambos
temas. Las pruebas automatizadas verifican estado/contrato, no la fluidez nativa.
# Último pase de modales — cierre del incremento B

Agregar y Editar paso comparten StepFormDialog, controlado por el estado existente
de ActivityStepsEditor. Solo cambia la presentación: título/ayuda, tarjetas Nombre
del paso y Elige un pictograma con iconos vectoriales y superficie/borde/sombra del
design system. El campo conserva multiline, máximo 120 y validación accesible.
Crear usa Cancelar/Guardar; editar Cancelar/Guardar cambios. Los valores precargados,
selección manual y buffer de cambios pendientes se mantienen sin lógica nueva.

DeleteStepsDialog centra la papelera SVG existente sobre círculo errorSurface y
adapta título/texto a singular/plural. Cancelar conserva selección; Eliminar sigue
llamando una sola vez a removeMany, renumera y limpia selección al confirmar.
No añade operaciones de persistencia ni modifica claves, reordenamiento o plantilla.

ActivityDialog mantiene sus defaults para Hora y sustitución de plantilla. Los
modales de pasos optan por cierre X, títulos compactos, decoración/alineación y
evitación de teclado. ScrollView, foco inicial en título y Atrás como Cancelar se
conservan; el escape accesible llama al mismo cierre. Sin animaciones decorativas.
StepDialogActions usa Cancelar delineado secundario y confirmación primaria/roja;
apila acciones en ancho pequeño o fontScale grande con los breakpoints existentes.
ContinueButton añade variantes secondary/destructive, conservando primary por
defecto y los colores semánticos light/dark. Targets mínimos de 48 y contraste de
texto comprobado para los tres estilos. Las miniaturas del selector se adaptan al
espacio de la tarjeta sin deformarse; se mantienen tres resultados iniciales y la
misma ampliación de resultados. No se renderizan créditos ARASAAC en esta sección.

No cambia backend, datos base, IDs, búsqueda, debounce, cancelación de solicitudes,
galería, sesión, navegación ni POST. Crear actividad continúa deshabilitado.
Validación: 96 pruebas frontend, TypeScript, lint y exportación Android; la revisión en Android físico
con teclado, TalkBack, texto ampliado y ambos temas queda pendiente de la usuaria.

Último ajuste de layout: las acciones usan `ContinueButton size="modal"`, con
target mínimo 48, padding 8/12 y etiqueta 16. Conservan Cancelar y los textos
Guardar / Guardar cambios / Eliminar. Distribuyen el ancho por contenido en vez
de forzar mitades iguales, permiten wrap y se apilan con pantalla estrecha/texto
ampliado. No se truncan etiquetas ni se limita la escala de fuente.
Eliminar opta por ActivityDialog compacto (gap 12 y padding vertical 16), círculo
80 y tokens destructive independientes de status.error. Eliminar y su Cancelar
usan etiquetas bold 20 para contraste AA de texto grande con el rojo de Figma;
el resto de las acciones de formulario conserva texto 16. No cambia callbacks,
campos, tarjetas, selector ni estado del borrador.

