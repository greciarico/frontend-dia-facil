# Pictogramas de pasos — piloto ARASAAC

Solo pasos, nunca iconos de actividad. Reutiliza expo-image, cliente privado y
modales Agregar/Editar paso, sin dependencias nuevas.

Buffer independiente de descripción y pictograma. Desde 3 caracteres, debounce
250 ms, GET /api/pictogramas/arasaac?texto=. Editar conserva el pictograma previo;
cambiar texto nunca selecciona/reemplaza la imagen. Guardar aplica ambos juntos;
Cancelar descarta ambos cambios. Cambiar solo imagen personaliza el borrador.
Selección múltiple, claves locales, orden y protección de pasos siguen iguales.

Hasta 3 sugerencias. Ver más pictogramas expande la galería dentro del mismo modal:
12 resultados y bloques adicionales de 12. Cerrar galería vuelve a 3 sin perder
selección. Tu selección muestra la imagen elegida si no está entre los resultados
visibles. No hay catálogo global. Loading, vacío y errores son distintos; nunca
borran la elección. Se puede preparar texto sin imagen. AbortSignal y revisión de
sesión impiden aplicar respuestas tardías, sin duplicar lógica de autenticación.

Miniaturas contain, caché de disco, fallback neutro ante fallo, etiquetas accesibles
y selección anunciada. Los créditos visibles se retiraron del selector y la lista
de Nueva actividad; su ubicación futura se definirá en un apartado separado.
No hay imágenes inventadas, descargas masivas ni Cloudinary.

idPictograma es local; idArasaac es externo. URL calculada por backend y validada
contra host/formato oficial. Rutas legacy no se renderizan. Las elecciones solo
viven en el borrador hasta crear. El [POST C](crear-actividad.md) ya verifica/resuelve
las referencias elegidas antes de crear PasoActividad independientes de plantillas.

Los cinco predeterminados de Desayunar ya fueron aprobados visualmente: 2443,
5549, 36965, 2349 y 8688, respectivamente. El DTO de plantilla entrega directamente
las imágenes al borrador, sin búsquedas individuales. Los textos de pasos no cambian.
Crear actividad ya persiste realmente mediante C/D; la selección del editor por
sí sola no escribe Pictograma/PasoActividad ni cambia plantillas.

Contrato, transición y licencia: ../../backend_dia_facil/docs/pictogramas-arasaac.md.

La ayuda temporal de revisión/compartir IDs de desarrollo se retiró después de la
aprobación. No quedan controles técnicos en la UI ni pruebas exclusivas de esa ayuda.
