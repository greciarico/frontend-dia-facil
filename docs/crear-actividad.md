# Nueva actividad — incrementos C y D

Contrato único: [actividades HTTP backend](../../backend_dia_facil/docs/actividades-http.md).
El formulario conserva su diseño y estado local; pasos sugeridos/manuales,
selección múltiple, modales, ARASAAC y drag siguen siendo el borrador de B.

Crear requiere nombre válido, hora, icono y al menos un paso válido, sin modal o
drag activo. No se impone un máximo funcional de pasos. Sin sugerencias también
puede crearse. El payload copia solo definición final, idArasaac opcional y el
orden del array; nunca claves locales, nombres/URL del proveedor, selección o
identidad de plantilla. Una selección legacy no se pierde silenciosamente: hay
que quitarla o seleccionar una imagen ARASAAC antes de crear.

`useCreateActivity` utiliza el cliente privado; bloqueo síncrono de doble envío,
loading, bloqueo de edición/aplicación de plantilla durante el POST y éxito
terminal antes de navegar. No duplica refresh ni almacena credenciales/borrador.
Al abandonar/cambiar sesión cancela/ignora respuestas tardías. No escribe logs.

Desde D, un 201 válido abre el modal de éxito dentro de Nueva actividad y
desmonta inmediatamente el formulario enviado. El estado de éxito vive en la
pantalla, solo en memoria, con id/nombre real del perfil. El hook de creación
conserva su bloqueo terminal y no cambia POST, validaciones, errores o reintentos.

Crear otra cierra el modal y remonta un formulario nuevo para el mismo perfil:
nombre vacío, hora/icono sin seleccionar, pasos vacíos, flags, selección y modales
reiniciados. Ver actividades, X, escape accesible y Atrás nativo del Modal usan
la misma salida. Una referencia impide activaciones repetidas; el estado leaving
cierra el modal sin remontar un formulario durante la navegación. dismissTo
quita Nueva actividad del historial y el hook existente refetch al recuperar foco.
No hay segunda creación, perfil seleccionado global ni alta optimista local.

ActivityCreatedModal reutiliza ActivityDialog, imagen local carer-success.png
(contain, proporciones/transparencia originales) y botones size=modal. Crear otra
es secondary, Ver actividades primary; no hay estilos destructivos. El diálogo
compartido admite título compuesto y closeLabel opcional, y sus acciones permiten
secondaryLabel; conservan defaults de Cancelar para todos los otros diálogos.
Sin animación, temporizador o espera decorativa. Ambos botones pueden apilarse
con texto ampliado/ancho estrecho; foco inicial y cierre de TalkBack conservados.

Sin actividades se conserva ScrollView del empty state y botón grande. Con datos
se usa una FlatList independiente con tarjetas de icono 3D, nombre y hora, sin
fechas/progreso/completado/detalle. Conserva el orden recibido (backend ID asc).
No se utilizan pictogramas de pasos como iconos de actividad.
CreateActivityButton ofrece floating=true: FAB de 56 derivado de tokens, plus
vectorial, label Nueva actividad y colores de acción de ambos temas. Queda fuera
de la lista, abajo/derecha, dentro de su área limitada a contentMaxWidth. El
layout ya reserva navegación inferior y safe areas; no se suman otra vez sus
alturas/insets. Padding final = tamaño del FAB + dos spacing.lg, dejando desplazar
la última tarjeta por encima. No cambia header, avatar ni menú. No existen
flotantes de ajustes en esta pantalla y no se añade uno.

Errores conservan todo el formulario. Red/timeout/5xx/respuesta ilegible significan
resultado desconocido, no fracaso demostrado: no hay replay automático. Ver
actividades permite comprobar la lista; un reenvío manual desde el formulario
exige confirmar el riesgo de duplicación. La confirmación conserva Cancelar.
Solo un 401 renovable rechazado antes del comando admite el replay privado
controlado existente. Backend no tiene idempotencia persistente en este alcance.

Validación automática: serialización, mínimo de un paso, hora local, campos,
double submit, éxito terminal, errores, respuesta desconocida, blur/sesión,
navegación, refetch y filas reales sin estados ficticios, además de regresiones B.
Validación manual pendiente en Android: crear con Desayunar personalizado y con
pasos propios, imágenes opcionales, fallo/red, retorno al listado y reapertura.

Resultado de C: 100 pruebas frontend correctas, TypeScript, lint y
exportación Android correcta en .expo/increment-c-export. La exportación no
equivale a validar visualmente ni a probar el flujo contra MySQL en un teléfono.

Validación D: 102 pruebas frontend correctas, TypeScript, lint y exportación
Android en .expo/increment-d-export. Incluye transiciones de éxito, formulario nuevo y salida única,
X/Atrás, acciones modales no destructivas, asset local, listado de 12 elementos,
padding/FAB, temas y regresiones de C. Revisión manual pendiente con Android,
TalkBack, texto ampliado, light/dark y dos creaciones seguidas mediante Crear otra.

Último ajuste acotado de tarjetas: nombre y hora se alinean a la izquierda
localmente. El nombre heredaba textAlign=center del estilo compartido de cuenta,
produciendo separación aparente dentro del bloque flex; ese estilo global no se
modifica. Se conservan gap, flex del texto, ajuste de líneas y escalado de fuente;
el círculo mantiene su tamaño sin encogerse.

`utils/activity-icon-surface.ts` expone getActivityIconSurface(index), con índice
visual desde cero y repetición módulo cinco: yellow.light, green.light,
orange.light, blue.light, purple.light. Los tonos pastel son los mismos en ambos
temas; tarjeta/texto conservan sus tokens semánticos. FlatList pasa el índice a
ActivitySummaryCard, sin usar ID, persistir color ni cambiar orden. La futura
agenda puede reutilizar directamente esa función sin implementar ese módulo ahora.
Validación del ajuste: 103 pruebas frontend, TypeScript y lint correctos.
