# DiaFacil móvil

Expo SDK 57, React Native, TypeScript y Expo Router. El alcance actual es la
bienvenida de Android/iOS; no se desarrolla ni valida Web.

## Ejecutar

1. Instalar las dependencias con npm install.
2. Ejecutar npm start y abrir el proyecto en Expo Go del teléfono.
3. Para Android físico, usar la misma red que el computador.

La bienvenida no requiere que el backend esté arrancado ni que exista una URL
de API. Solo mantiene la selección de rol en memoria, muestra su estado y la
anuncia para lectores de pantalla. No navega, guarda sesiones ni solicita OTP.
La ayuda explica brevemente ambos roles mediante un aviso nativo.

## Organización

- src/app: rutas y layout raíz de Expo Router. La única ruta de producto es index.
- src/theme: tokens de DiaFacil y resolución del tema del sistema.
- src/components/welcome: tarjeta de rol, compartida por las dos opciones.
- src/config/env.ts: lectura y validación diferida de la URL pública del backend.
- src/services/http.ts: cliente Axios diferido, sin llamadas de autenticación.
- assets/illustrations: recursos originales de bienvenida y tarjetas.
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

## URL del backend para el siguiente alcance

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
de 20 segundos, JSON y sin reintentos automáticos. Esta pantalla no lo utiliza
y no necesita CORS para Android/iOS. No se interpreta un ID de cuidador como
sesión ni se implementan aún los flujos HTTP posteriores.

## Validar

- npm run lint: código móvil y compartido; excluye variantes .web y .cache.
- npx tsc --noEmit: comprobación de tipos.
- Exportación Android con Expo CLI para verificar Metro, módulos y assets.
- Revisión en teléfono de ambos temas, TalkBack/VoiceOver, safe areas,
  selección de rol, ayuda y texto ampliado. No validar Web en este alcance.

Las únicas nuevas dependencias son de desarrollo: ESLint y eslint-config-expo.
No hay nuevas dependencias de ejecución ni se generaron proyectos nativos.
