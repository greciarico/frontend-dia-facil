# DiaF?cil m?vil

Una aplicaci?n React Native/Expo con dos experiencias: Cuidador y Usuario.
Antes de retomar trabajo, leer [AGENTS ra?z](../AGENTS.md), [instrucciones frontend](AGENTS.md)
y [estado actual del proyecto](../documentacion-dia-facil/ESTADO_ACTUAL_PROYECTO.md).
Ese documento distingue implementaci?n, evidencia f?sica, pendientes y decisiones;
este README es la entrada operativa, no otro historial de incrementos.

## Stack y alcance actual

Expo 57.0.27, React Native 0.86.3, React 19.2.3, Expo Router 57.0.25 y
TypeScript 6.0.3 (package-lock). Nunito, tokens light/dark, safe areas y React Compiler.
Las versiones completas est?n en package.json/package-lock.json.

- Cuidador: OTP y sesi?n persistente; registro/Paso 4; Mis perfiles, creaci?n y hub;
  creaci?n real de actividades con pasos/ARASAAC; listado y vinculaci?n E1.
- Usuario: onboarding QR/c?digo manual inline y credencial E3 persistente;
  Mi agenda real, detalle, gu?a/reanudaci?n, finalizaci?n y consulta posterior.
- Apoyo, notificaciones, Mi perfil, accesibilidad configurable, voz y gesti?n E2
  siguen pendientes. Tener dependencias o prototipos no los vuelve funcionales.
- Desarrollo/validaci?n principalmente Android f?sico con Expo Go. No se afirma
  validaci?n f?sica iOS ni compatibilidad Web por existir configuraci?n web.

## Ejecutar

Desde esta carpeta, instalar con npm ci (hay package-lock.json), configurar
.env.local desde .env.example si no existe y ejecutar npm start. Abrir en Expo Go.
No hay Node fijado por el proyecto; respetar engines del lockfile. Entorno de
auditoría: Node 24.19.0, no una versión impuesta para otros equipos.
En PowerShell con scripts restringidos usar npm.cmd y npx.cmd.
No ejecutar reset-project como parte de preparaci?n o pruebas: es una utilidad heredada.

EXPO_PUBLIC_API_URL debe apuntar al backend accesible desde el tel?fono:

- Tel?fono f?sico: URL LAN de la PC con puerto 8080; localhost apunta al tel?fono.
- Emulador Android est?ndar: http://10.0.2.2:8080.
- Producci?n: HTTPS; HTTP solo est? admitido durante desarrollo.

Comprobar red/firewall y reiniciar Expo tras cambiar la variable. Es p?blica y
se incorpora al bundle; nunca poner secretos SMTP, claves o credenciales de BD ah?.
No sobrescribir una .env.local ya v?lida por actualizar la plantilla.
Backend local requiere su configuraci?n privada y m?dulos auth/E3 activos;
ver [README backend](../backend_dia_facil/README.md).

## Organizaci?n

- src/app: Expo Router; cuidador/paso-1 a paso-4, (cuidador-autenticado), usuario
  y (usuario-autenticado). No guardar un perfil seleccionado global en la sesi?n.
- src/context y src/services: sesi?n del cuidador y acceso E3 separados; cliente
  p?blico, privado del cuidador y privado de Usuario. No usar Axios en pantallas
  ni duplicar refresh en m?dulos.
- src/hooks y src/utils: consultas/cancelaci?n, drafts y validaci?n de contratos.
- src/components: primitivas compartidas y componentes por experiencia;
  BottomNavigation comparte presentaci?n, los wrappers mantienen sus destinos.
- src/theme: tokens; docs/design-system.md documenta el lenguaje visual.
- src/constants: cat?logos expl?citos de 52 iconos de actividad y 20 avatares.
- assets/illustrations: recursos locales. design/ es referencia, no assets ejecutables.
- scripts/test-*.cjs: pruebas con adaptadores de React Native/servicios; no sustituyen tel?fono.

Credenciales sensibles solo en SecureStore; access del cuidador en memoria.
El comprobante de registro y resultados de onboarding viven solo en memoria.
Restauraci?n omite Login/rol; una nueva cuenta ve Paso 4 inmediatamente despu?s
registrarse, no al restaurar. E3 restaura directamente a /mi-agenda.
Salir del perfil Usuario es pausa local, distinta del logout del cuidador y de E2.

## Validar

Desde esta carpeta:

~~~powershell
node --test scripts/test-*.cjs
npm.cmd exec -- tsc --noEmit
npm.cmd run lint
npm.cmd exec -- expo export --platform android --output-dir .expo/validacion-android
~~~

Las rutas tipadas se generan en .expo al iniciar Expo. Si en un checkout nuevo
TypeScript informa rutas ausentes, iniciar Expo para generar sus tipos antes de
interpretarlo como fallo funcional; no versionar caches ni crear rutas ficticias.
No usar variantes de lint que reescriban c?digo durante una auditor?a documental.

?ltima evidencia registrada: 194 pruebas correctas, TypeScript/lint y export
Android correctos. Estos resultados pertenecen al ?ltimo refinamiento funcional;
no se reejecutaron por consolidar documentaci?n. Las pruebas son aisladas y no
confirman funcionamiento real de MySQL/SMTP/c?mara ni accesibilidad completa.

Prueba f?sica siguiente: detalle de primera gu?a sin instrucciones repetidas;
consulta libre de actividad ya COMPLETADA sin escrituras; celebraci?n sin fecha,
nombre real y movimiento reducido. Conservar las verificaciones de ejecuci?n,
reanudaci?n y check diario ya reportadas como correctas.

## Documentos de m?dulo

- [Mi agenda, detalle, ejecuci?n y consulta](docs/mi-agenda.md).
- [Creaci?n real y cierre de actividades](docs/crear-actividad.md).
- [Pictogramas ARASAAC](docs/pictogramas-arasaac.md).
- [Vinculaci?n/restauraci?n Usuario](docs/usuario-vinculacion.md) y [E1 cuidador](docs/vincular-dispositivo.md).
- [Design system](docs/design-system.md) y [teclado](docs/keyboard-forms.md).
- [Ajustes por perfil, aplicación de accesibilidad y voz](docs/accesibilidad-perfil.md).
- [Contratos backend](../backend_dia_facil/README.md).

Los documentos *-increment y nueva-actividad-ux conservan decisiones/evidencia de
entregas anteriores, identificadas como hist?ricas. Leer el estado central antes
de repetir un supuesto pendiente. La b?squeda din?mica y el piloto ARASAAC ya
est?n implementados; foto propia/Cloudinary no.

## Otro equipo

Frontend y backend son repositorios independientes. Conservar tambi?n las carpetas
hermanas documentacion-dia-facil y design y el AGENTS ra?z; no aparecen por clonar
solo este repositorio. No depender de node_modules, .expo o caches de otro equipo.
Instalar dependencias y configurar secretos privadamente. No se promete conservar
SecureStore al desinstalar/borrar datos o trasladarse a otra instalaci?n.
