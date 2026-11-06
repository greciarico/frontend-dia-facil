# Teclado en los formularios de onboarding

`KeyboardAwareForm` comparte un `KeyboardAvoidingView`, un único `ScrollView` acotado y un contexto de foco. `KeyboardAwareTextInput` conserva props, estilos, callbacks y ref nativa; únicamente notifica foco, blur y cambios de layout. No lee ni registra el contenido del campo. Fuera de un provider funciona como un TextInput normal.

Aplicado a `OnboardingLayout` de Usuario y a `AccountLayout` del cuidador: código manual, correo del Paso 1, las seis casillas OTP y nombre del Paso 3. Los formularios de perfiles, Nueva actividad y sus modales quedan fuera de este incremento. La pantalla autenticada temporal y recuperación mantienen su layout anterior.

## Comportamiento

- iOS utiliza `behavior="padding"`; Android, `behavior="height"`, con `softwareKeyboardLayoutMode="resize"` explícito (el valor predeterminado de Expo). No usar `pan` como parche.
- `keyboardVerticalOffset=0`: estos layouts no tienen un header nativo externo; las safe areas continúan dentro de su contenido. No hay correcciones por modelo/altura de teléfono.
- Se mide el viewport nativo del ScrollView después del reajuste y el TextInput enfocado mediante `measureInWindow`, en las mismas coordenadas. El controlador solo desplaza el solapamiento real, incluido un margen `spacing.md`. No suma de nuevo la altura del teclado ni combina insets automáticos de teclado con KeyboardAvoidingView.
- El pequeño espacio inferior adicional solo existe con teclado visible y asegura separación para un último campo. No es un desplazamiento fijo de toda la pantalla. La distancia efectiva se calcula a partir de las mediciones y se limita al rango desplazable.
- Foco, eventos nativos de teclado, layout y tamaño de contenido solicitan una medición en el próximo frame; solicitudes simultáneas se agrupan. No hay timeout de 200/300 ms, polling ni uso de APIs privadas del teclado.
- El ScrollView conserva `keyboardShouldPersistTaps="handled"`: la flecha y Continuar mantienen su acción al primer toque. Sin teclado, el contenido crece con `flexGrow:1` dentro del viewport, sin imponer `minHeight:window.height` al formulario del cuidador.
- Ilustraciones y cabeceras pueden salir del viewport al desplazarse; no se ocultan ni escalan artificialmente. Al cerrar el teclado se restaura el scroll anterior a su apertura, limitado al contenido vigente, sin forzar siempre cero.
- Cambio de casilla OTP con teclado ya visible vuelve a medir el nuevo campo, sin sustituir la posición original de restauración. Pegado, retroceso y avance automático siguen usando las refs nativas existentes.
- Al perder foco/desmontar se eliminan listeners, se cancela el frame pendiente y se ignoran resultados de medición antiguos. Movimiento de scroll inmediato evita competir con otra animación nativa del teclado.

Expo Go sigue utilizando su host nativo. El arreglo no depende exclusivamente de la propiedad de app.json: la medición y la compensación del layout compartido también se ejecutan en JavaScript. Las compilaciones propias incorporarán explícitamente `resize`; no se generan ni modifican carpetas Android/iOS.

## Verificación

`node --test scripts/test-form-keyboard.cjs` cubre geometría, campo ya visible, rango máximo, cambio de viewport, restauración, foco OTP/texto ampliado, mediciones tardías, cleanup, refs/callbacks y configuración por plataforma. Ejecutar además suites frontend, TypeScript, lint y export Android.

Prueba física pendiente en cada plataforma:

1. Usuario: desplegar código con autoFocus y comprobar que se ve completo al escribir/pegar; enviar con flecha y teclado conserva E3.
2. Cuidador Paso 1: correo visible, validación, primer toque en Continuar y vuelta tras error.
3. Paso 2: recorrer casillas, pegar seis dígitos, retroceder y cambiar de fila con texto ampliado.
4. Paso 3: nombre visible, validación y guardado sin cambios funcionales.
5. Repetir desde una posición de scroll distinta de cero y cerrar con Atrás/ocultar teclado: vuelve a la posición previa, sin espacio residual.
6. Repetir con pantalla baja, fuente ampliada, teclado alfabético/numérico, distintas alturas del teclado y light/dark; salir de pantalla durante la apertura no debe publicar actualizaciones tardías.
7. Comparar visualmente las pantallas con teclado cerrado. El export Android no sustituye la comprobación física Android/Expo Go ni la prueba iOS.
