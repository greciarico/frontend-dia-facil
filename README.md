# DiaFacil móvil

Expo SDK 57, React Native, TypeScript y Expo Router. El alcance actual es la
bienvenida, OTP, sesión persistente y cuenta del cuidador en Android/iOS; no se desarrolla ni valida Web.

## Ejecutar

1. Instalar las dependencias con npm install.
2. Ejecutar npm start y abrir el proyecto en Expo Go del teléfono.
3. Para Android físico, usar la misma red que el computador.

La bienvenida no requiere que el backend esté arrancado ni que exista una URL
de API. Solo mantiene la selección de rol en memoria, muestra su estado y la
anuncia para lectores de pantalla. Seleccionar “Soy cuidador” y pulsar su flecha
abre el Paso 1. “Soy usuario” no tiene navegación en este alcance.
La ayuda explica brevemente ambos roles mediante un aviso nativo.

## Organización

- src/app: raíz con Login/estado autenticado y rutas cuidador/paso-1 a paso-4, con Expo Router.
- src/context/session.tsx y src/services/session-manager.ts: restauración, credenciales y logout.
- src/context/carer-registration.tsx: comprobante de registro únicamente en memoria del navegador cuidador.
- src/theme: tokens de DiaFacil y resolución del tema del sistema.
- src/components/welcome: tarjeta de rol, compartida por las dos opciones.
- src/config/env.ts: lectura y validación diferida de la URL pública del backend.
- src/services/http.ts: cliente Axios diferido; carer-auth.ts solicita/verifica códigos y traduce errores seguros.
- src/components/carer: composición de autenticación e indicador de pasos, y botón con carga.
- src/utils/carer-email.ts: validación del correo en Paso 1.
- assets/illustrations: recursos locales; carer-code-back/card/front.svg son las capas del sobre del Paso 2.
- docs/design-system.md: fuente de verdad visual y extensión semántica de temas.

Nunito se carga en el layout raíz con los archivos estáticos 400, 500, 600 y
700. El splash se mantiene mientras cargan; un error muestra un mensaje
legible en lugar de dejar una pantalla bloqueada. No se añaden variantes.

El tema sigue light/dark del sistema, con fallback a light. El fondo principal
es blanco; amarillo y morado tienen roles alternativos propios. La bienvenida
combina encabezado lavanda, cuerpo amarillo y superficies blancas en light.
En dark consume los equivalentes documentados, conservando la identidad morada.
Los textos respetan la escala del sistema y las tarjetas se apilan cuando
el ancho o el tamaño de texto requieren más espacio.

Los módulos y variantes Web heredados no fueron limpiados. La ruta demo Explore
se retiró al sustituir la entrada porque dependía de assets previamente
eliminados. La configuración nativa dejó de referenciar esos assets ausentes;
los iconos de marca definitivos se definirán cuando exista su recurso original.

## URL del backend

Copiar .env.example a .env.local y ajustar EXPO_PUBLIC_API_URL:

- Android/iPhone físico: dirección LAN del computador, por ejemplo
  http://192.168.1.10:8080.
- Emulador Android estándar: http://10.0.2.2:8080.

En el teléfono, localhost representa el propio dispositivo. Comprobar que
el backend es accesible por la red y el firewall permite el puerto de desarrollo.
Reabrir la app tras cambiar la variable para cargar su valor actualizado.

EXPO_PUBLIC_API_URL se incluye en el bundle y no es secreta. Nunca colocar
contraseñas SMTP, secretos HMAC ni credenciales de base de datos en el frontend.
Los design tokens no son variables de entorno.

getHttpClient crea el cliente solo cuando un consumidor lo solicita: timeout
de 20 segundos, JSON y sin reintentos automáticos. carer-auth.ts lo utiliza para
la solicitud; las pantallas no importan Axios. Android/iOS no necesitan CORS.
El contrato de referencia es backend_dia_facil/docs/auth-http.md. Debe estar
habilitado diafacil.auth.enabled y configurado SMTP. El cooldown oficial de
reenvío es de 45 segundos, centralizado en PoliticaCodigoAcceso del backend.
Reiniciar el backend para cargar esta política si no se ha recargado aún.

## Prueba manual del cuidador

1. Configurar la URL del backend y reiniciar Expo para incorporarla al bundle.
2. Login → seleccionar “Soy cuidador” → pulsar su flecha → Paso 1.
3. Ingresar un correo real y pulsar Continuar: solo se envía si es válido y de
   hasta 150 caracteres, recortando espacios exteriores. Durante el envío se
   bloquean edición y duplicados y se muestra “Enviando…”.
4. Tras HTTP 200 con CODIGO_SOLICITADO, Paso 2 muestra el mismo correo.
5. Confirmar recepción del OTP real en el correo, incluida la carpeta de spam.
   La respuesta confirma ejecución del envío, no llegada a la bandeja.
6. Volver al Paso 1 conserva el correo. Paso 2 sin parámetro o con correo vacío
   redirige al Paso 1 sin petición ni nueva validación de formato.
7. Ingresar el OTP en las seis casillas, escribir o pegar sus seis dígitos,
   incluidos ceros iniciales. Verificar solo se habilita con el código completo;
   la petición muestra “Verificando…” y bloquea duplicados y reenvío simultáneo.
8. Un código correcto muestra una animación breve del sobre y el modal de éxito.
   Con movimiento reducido se muestra el modal directamente. “Entendido” deja
   Paso 3 para cuenta nueva o la raíz autenticada para cuidador existente.
9. Esperar el contador “Enviar de nuevo (00:45)” → “(00:01)” → “Enviar de nuevo”.
   Solicitar otro código y comprobar que las casillas se vacían y el contador
   vuelve a empezar según reenvioEnSegundos recibido, nunca un valor fijo del frontend.
10. Pasar a segundo plano y volver: se recalcula desde el instante objetivo.
    El contador es conservador, no tiempo exacto del servidor. REENVIO_PREMATURO
    prevalece y aplica Retry-After. Sin un header válido se pide volver al Paso 1.
11. Para correo sin cuenta, Entendido abre Paso 3; para cuidador existente no lo abre.
12. Ingresar nombre (obligatorio, hasta 100 caracteres) y elegir avatar opcional.
    Ver todos abre los 20 originales; Usar la inicial de mi nombre elimina selección.
13. Continuar envía nombre y avatar opcional. Personalizar más tarde envía el mismo
    nombre con avatarId null. Ambos bloquean duplicados y muestran carga.
14. HTTP 201 REGISTRO_COMPLETADO guarda sesión y abre Paso 4: ¡Cuenta creada!, con
    nombre y avatar efectivos del backend, sin nueva petición. Solo Personalizar más tarde muestra:
    “Podrás personalizar tu perfil más adelante desde Mi perfil.”

Antes de probar el registro, revisar backend_dia_facil/docs/sql/add-cuidador-avatar.sql
y docs/sql/add-cuidador-sessions.sql, confirmando columna y dos tablas de sesión.
El incremento no
ejecutó SQL ni habilitó Flyway. El entorno local configurado con ddl-auto=update
puede crear la columna al reiniciar; fuera de él se requiere aplicar el script revisado.

Errores de validación aparecen junto al campo; errores HTTP, conexión y timeout
se muestran con textos comprensibles y anuncios accesibles. Una salida del
formulario cancela la espera y evita navegación tardía. No hay logs sensibles.
El correo solo es un parámetro de presentación: no crea ni persiste una sesión.
REGISTRO_PENDIENTE se transfiere del Paso 2 al Paso 3 solo en un contexto en memoria.
El comprobante no se transporta en URL y no se registra OTP, correo, cuerpos,
tokens ni comprobantes. Al salir se descarta
el resultado; completar el registro también borra el comprobante. El código se
borra al verificar correctamente o confirmar reenvío. Acceso directo a Paso 3
sin comprobante vuelve al Paso 1. Comprobante vencido o cuenta existente permite
volver a verificar correo sin inventar una sesión.

Código incorrecto permite corregirlo; código inexistente, vencido, usado o límite
de intentos requiere uno nuevo; cuenta inactiva bloquea ambos envíos. Una respuesta
de verificación perdida puede haber consumido el código: no hay reintento automático.
La animación bloquea acciones de Paso 2, sin bloquear la navegación nativa; salir
cancela/ignora peticiones y aperturas tardías del modal.

## Continuación pendiente

Paso 3 personaliza la cuenta del cuidador; no crea un PerfilUsuario. Los 20 SVG
de assets/avatars se mantienen originales y backend guarda solo el ID o null.
La inicial se deriva del nombre; ninguna de las dos acciones puede omitirlo.
Foto propia/Cloudinary, Mi perfil y la creación de perfiles siguen pendientes. AUTENTICADO y
REGISTRO_COMPLETADO ahora entregan credenciales opacas; idCuidador nunca es credencial.

## Sesión persistente y Paso 4

Access solo en memoria, refresh en expo-secure-store. Al arrancar se espera
restauración junto con fuentes, evitando flash de Login. Renovación automática:
15 minutos de access, 30 días de inactividad y 90 días absolutos desde OTP/registro.
SecureStore conserva credencial al cerrar/reabrir, recargar JS y reiniciar el teléfono;
no se promete conservación al desinstalar/borrar datos. Funciona en Expo Go sin
biometría obligatoria. Los valores seguros no van a AsyncStorage.

Sesión válida abre Mis perfiles (/perfiles), con consulta Bearer real, estado
vacío/lista/loading/error y menú superior de logout. Ver docs/mis-perfiles-increment.md.
Paso 4 aparece solo tras crear cuenta nueva; Continuar finaliza onboarding y
abre esa raíz. Restaurar o acceder como cuidador existente no repite Pasos 3/4.

El cliente privado renueva una vez ante 401 renovable y comparte un refresh entre
peticiones. GET/HEAD pueden repetirse una vez; mutaciones futuras requieren opt-in
authReplaySafe. No reintenta refresh por red/5xx ni 403. Una respuesta de rotación
perdida puede dejar el refresh anterior consumido y requerir nuevo OTP, como se acordó.
Fallo transitorio conserva credencial y muestra Reintentar; fallo de escritura
permite guardar el resultado aún en memoria sin repetir registro/OTP.

Logout invalida memoria y marca la credencial local solo para revocación. Si está
offline se vuelve a Login y nunca se restaura esa credencial. Las revocaciones se
reintentan al arrancar, regresar al foreground y cada 30 segundos mientras la app
está activa, sin bloquearla. Tras confirmar HTTP 204 se borran. No borra la cuenta.
HTTP solo se permite en desarrollo (__DEV__); fuera de él EXPO_PUBLIC_API_URL debe ser HTTPS.

## Validar

- npm run lint: código móvil y compartido; excluye variantes .web y .cache.
- npx tsc --noEmit: comprobación de tipos.
- npm run test:carer-auth: pruebas aisladas de servicio, correo, OTP y contador, sin SMTP.
- npm run test:session: restauración, rotación, SecureStore simulado, logout y Axios privado.
- npm run test:profiles: contrato, carga, acciones pendientes y navegación privada.
- npx expo export --platform android --output-dir .cache/carer-android: Metro, módulos y assets.
- Revisión en teléfono de ambos temas, TalkBack/VoiceOver, safe areas,
  selección de rol, ayuda y texto ampliado. No validar Web en este alcance.

Al añadir rutas, iniciar Expo para regenerar .expo/types/router.d.ts antes de
comprobar tipos si la caché todavía contiene únicamente la bienvenida.
En PowerShell con scripts deshabilitados, usar npm.cmd y npx.cmd.
No se añadieron dependencias para el flujo del cuidador ni proyectos nativos.
