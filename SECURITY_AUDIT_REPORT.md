# Informe de auditoría de seguridad — Nocta

- **Fecha:** 2026-10-06
- **Commit auditado:** `3c66156` ("Eventos personales"), versión 1.3.0
- **Alcance:** todo el repositorio `agenda/`, la web publicada (`https://ivanng-27.github.io/agenda/`) y la configuración pública del proyecto de Firebase `nocta-5f52e`.
- **Método:** revisión manual del código y del historial de git, `npm audit` y comprobaciones de solo lectura contra la web publicada y las API públicas de Firebase.
- **Sin cambios:** no se ha modificado ningún archivo salvo este informe.

---

## 1. Resumen ejecutivo

### Stack detectado

| Capa | Tecnología |
|---|---|
| Front-end | React 19 + TypeScript 5.8, compilado con Vite 7. Es una SPA sin servidor propio. |
| PWA | `vite-plugin-pwa` (Workbox), con service worker y actualización automática. |
| Datos locales | `localStorage` (clave `nocta:v1`) en la web, y `%APPDATA%\Nocta` en la app de escritorio. |
| Backend | Firebase 12: Authentication (solo Google) y Cloud Firestore. No hay backend propio. |
| Autorización | `firestore.rules`: cada usuario solo puede leer y escribir `users/{uid}/**`. |
| Escritorio | Electron 37.10.3 + electron-builder 26. Se distribuye como `.zip` sin firma digital, con un desinstalador `.cmd`. |
| Despliegue | GitHub Pages mediante GitHub Actions (`.github/workflows/pages.yml`). |
| Peticiones salientes | La app de escritorio consulta `api.github.com/repos/IvanNG-27/agenda/releases/latest` para avisar de versiones nuevas. |

### Superficie de ataque

- **Web estática pública:** HTML, JS y CSS, sin endpoints propios.
- **Firestore:** es la única API con estado. Es accesible a cualquiera que tenga la configuración pública y una cuenta de Google.
- **Datos que importa el usuario:** las copias `.json` (Ajustes → Importar copia).
- **App de escritorio:** su canal de actualización (GitHub Releases) y los ejecutables sin firma.
- **Cadena de suministro:** dependencias de npm y acciones de GitHub.

**No existen:** contraseñas propias, cookies de sesión, servidor, base de datos SQL, subida de archivos a servidor, webhooks, WebSockets propios ni uso de IA.

### Hallazgos por severidad

| Crítica | Alta | Media | Baja | Informativa |
|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 5 | 6 | 4 |

No se ha encontrado nada explotable sin autenticación que exponga datos de otros usuarios:
- Firestore rechaza las lecturas sin sesión (`403 PERMISSION_DENIED`, comprobado).
- La web publicada no expone `.git`, `.env` ni *source maps* (comprobado).
- El historial de git no contiene secretos, aparte de la configuración pública de Firebase, que no es secreta por diseño.

**Los riesgos principales son cinco:**
1. **Datos que pasan de una cuenta a otra** en un dispositivo compartido.
2. **Firestore sin validación ni límites,** que deja agotar la cuota del proyecto.
3. **Electron sin soporte** y con vulnerabilidades conocidas.
4. **Distribución del `.exe` sin firma** ni verificación de integridad.
5. **Cumplimiento del RGPD,** porque se guardan datos de salud y de terceros.

---

## 2. Tabla de hallazgos

| ID | Severidad | Categoría (OWASP / CWE) | Ubicación | Descripción | Explotación | Remediación |
|----|-----------|------------------------|-----------|-------------|-------------|-------------|
| H-01 | **Media** | A04 Diseño inseguro / CWE-359 (exposición de información privada) | `src/sync/firebase.ts:116-120`, `src/sync/firebase.ts:123-127`, `src/sync/firebase.ts:159-166` | **Cerrar sesión no borra los datos locales**, y el siguiente inicio de sesión sube esos datos a la cuenta que entre. `signOut()` solo hace `stop()` y `firebaseSignOut(auth)`: las tareas, exámenes, eventos y asignaturas siguen en `localStorage`. Después, `signInWith()` captura `getState()` y `merge()` sube a la cuenta nueva todo lo que no exista en ella (`for (const t of local.tasks) if (!remoteTasks.has(t.id)) writes.push(...)`). | En un ordenador o móvil compartido, la persona A cierra sesión y su agenda sigue visible. Si la persona B inicia sesión con su cuenta, los datos de A (incluidas citas médicas y cumpleaños) se copian a la nube de B y quedan sincronizados en todos los dispositivos de B. No hace falta ninguna técnica: es el flujo normal. | Al cerrar sesión, ofrecer "Borrar los datos de este dispositivo" (o hacerlo por defecto) con `actions.replaceAll(initialState())` sin propagar al remoto. Antes de fusionar al iniciar sesión, si hay datos locales y la cuenta es distinta de la última usada en el dispositivo, preguntar si se quieren subir. |
| H-02 | **Media** | A05 Configuración insegura / CWE-770 (asignación sin límites), API4 Consumo de recursos sin restricción | `firestore.rules:7-8`; `src/sync/firebase.ts:63` (sin App Check) | Las reglas solo comprueban la propiedad (`request.auth.uid == uid`). **No validan el esquema, el tamaño ni el número de documentos**, y el proyecto no usa App Check. Google está abierto como proveedor, así que cualquier cuenta de Google puede autenticarse. | Con la configuración pública del bundle, un atacante inicia sesión con una cuenta de Google desechable y escribe documentos de hasta 1 MiB sin límite bajo su propio `uid`, con un script y sin usar la app. En el plan gratuito (Spark), agotar la cuota diaria (20 000 escrituras y 50 000 lecturas) **deja la sincronización caída para todos los usuarios** hasta el día siguiente. En el plan de pago (Blaze), genera coste (*denial of wallet*). | Añadir a las reglas validación por colección: campos permitidos (`keys().hasOnly([...])`), tipos, longitudes (`title.size() <= 120`) y `request.resource.size`. Activar **Firebase App Check** con reCAPTCHA Enterprise en la web. Configurar alertas de presupuesto y cuotas en Google Cloud. |
| H-03 | **Media** | A06 Componentes vulnerables y desactualizados / CWE-1104 | `package.json:26` (`"electron": "^37.10.3"`) | **Electron 37 está fuera de soporte** (la última es la 44.5.1, y Electron solo mantiene las tres últimas versiones principales). `npm audit` lo marca como *high*: `electron <=41.10.5`, con avisos como GHSA-5rqw-r77c-jp79. Además, el Chromium que trae no recibe parches de seguridad. | Explotarlo requiere que el renderer procese contenido malicioso. Hoy el renderer solo carga archivos locales (`main.cjs:30`) con CSP `script-src 'self'`, `sandbox: true`, `contextIsolation: true` y sin `nodeIntegration`, así que la probabilidad es baja. Por eso es Media y no Alta. El riesgo crece en cuanto la app muestre cualquier contenido remoto. | Actualizar a Electron 44 (`npm i -D electron@44`), recompilar y probar. Revisar el changelog de las versiones 38 a 44 por si hay cambios incompatibles. |
| H-04 | **Media** | A08 Fallos de integridad de software / CWE-494 (descarga de código sin comprobar su integridad) | `package.json:35-67` (sin firma); `src/updates.ts:35`; `src/components/UpdateNotice.tsx:23` | **`Nocta.exe` se distribuye sin firma de código**, y el aviso de actualización manda al usuario a descargar el `.zip` de la última Release sin ninguna verificación de integridad: ni firma, ni hash publicado, ni comprobación. `asar: false` (`package.json:67`) deja además el código JS de la app editable en `resources/app`. | Si alguien compromete la cuenta de GitHub o el repositorio (por ejemplo, un token robado), puede publicar una Release con un `.zip` modificado. El aviso de la app llevaría a todos los usuarios de escritorio a descargarlo, y Windows no puede distinguirlo del legítimo porque ninguno está firmado. | Firmar `Nocta.exe` con un certificado de firma de código (Certum Open Source, SignPath o Azure Trusted Signing). Publicar el SHA-256 del `.zip` en las notas de la Release. Activar la autenticación en dos pasos en la cuenta de GitHub y proteger las etiquetas `v*`. Volver a activar `asar` cuando el problema de bloqueos de archivos de la máquina de compilación lo permita. |
| H-05 | **Media** | Privacidad / RGPD arts. 9, 13 y 17; CWE-359 | `src/lib/events.ts:9` (tipo `medico`), `src/lib/events.ts:6` (cumpleaños de terceros); `src/views/SettingsView.tsx:291` (solo "Cerrar sesión") | La app guarda en Firestore **datos de salud** (eventos "Médico": "Revisión en el dentista", lugar y notas) y **datos de terceros** (nombres y fechas de nacimiento en "Cumple de Laura"). La web es pública y cualquiera puede usarla, pero no hay política de privacidad, información sobre el tratamiento, forma de borrar la cuenta y los datos de la nube (derecho de supresión) ni retención definida. | No es una vulnerabilidad técnica explotable, sino un riesgo legal y de confianza en cuanto haya usuarios en la UE distintos del autor. Los datos de salud son una categoría especial del RGPD (art. 9). | Añadir una página de privacidad (qué se guarda, dónde, con qué proveedor y cómo borrarlo). Añadir en Ajustes "Borrar mi cuenta y mis datos", que borre `users/{uid}/**` y la cuenta de Auth. Comprobar la región de Firestore (ver V-03). Valorar un aviso al crear eventos médicos. |
| H-06 | **Baja** | A05 Configuración insegura / CWE-693, CWE-1021 | `index.html:3-13` (sin CSP); `vite.config.ts:35` (la CSP solo se aplica en `mode === 'electron'`); cabeceras de GitHub Pages | **La web no tiene Content-Security-Policy**, y GitHub Pages no envía `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` ni `frame-ancestors` (comprobado con `curl -I`). Sí hay HSTS (`max-age=31556952`) y redirección de HTTP a HTTPS. | Hoy no hay ningún punto donde inyectar HTML: React escapa todo y no se usa `dangerouslySetInnerHTML` ni `innerHTML`. Falta la segunda capa de defensa si apareciera un XSS. La web se puede cargar dentro de un iframe (*clickjacking*), con impacto bajo porque las acciones destructivas piden confirmación. | Añadir en `index.html` una CSP con `<meta>`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; frame-src https://nocta-5f52e.firebaseapp.com; object-src 'none'; base-uri 'self'`, más `<meta name="referrer" content="strict-origin-when-cross-origin">`. `frame-ancestors` no funciona en una etiqueta `<meta>`: para tenerlo habría que pasar a Firebase Hosting o Cloudflare, que sí permiten cabeceras. |
| H-07 | **Baja** | A06 Componentes vulnerables / CWE-1395 | `package-lock.json` (dependencias transitivas de desarrollo) | `npm audit` encuentra 16 avisos (8 *high* y 8 *moderate*) en herramientas de compilación: `extract-zip` (escritura de archivos mediante enlaces simbólicos, en `@electron/get`), `http-cache-semantics`, `source-map-js`, `sprintf-js`, `global-agent`, `roarr` y la cadena `app-builder-lib`/`dmg-builder`. Los de `firebase`, `@firebase/firestore` y `@grpc/grpc-js` afectan al **servidor gRPC de Node**, que el navegador no usa. | Solo afectan al equipo que compila (descargas en `npm install`, *source maps*), no a quien usa la app. El arreglo que propone npm para `firebase` (bajar a la 9.14.0) **no se debe aplicar**: sería un retroceso. | `npm audit fix` para los que no cambian de versión principal (`http-cache-semantics`, `source-map-js`, `electron-builder-squirrel-windows`). Electron 44 (H-03) resuelve `extract-zip`, `global-agent`, `roarr` y `sprintf-js`. Revisar `firebase` cuando publique una versión que actualice `@grpc/grpc-js`. |
| H-08 | **Baja** | CI/CD / CWE-829 (inclusión de funcionalidad de origen no confiable) | `.github/workflows/pages.yml:9-12`, `:25-26`, `:32-33`, `:45` | **Las acciones se fijan por etiqueta móvil** (`actions/checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`) en lugar de por SHA. Los permisos `pages: write` e `id-token: write` se dan **a nivel de workflow**, así que también los recibe el job `build`, que ejecuta `npm ci` (con scripts de instalación de terceros). No hay Dependabot ni análisis de seguridad automático. | Si se compromete una acción o una dependencia de npm, durante el `build` tendría un token OIDC con permiso para desplegar en Pages, es decir, podría publicar una web modificada. La probabilidad es baja, pero el impacto sería servir código malicioso a todos los usuarios. | Fijar las acciones por SHA, con la versión en un comentario. Mover `pages: write` e `id-token: write` al job `deploy` y dejar `contents: read` en `build`. Añadir `.github/dependabot.yml` para `npm` y `github-actions`. Añadir un job con `npm audit --omit=dev` y, opcionalmente, `gitleaks` y `zizmor`. |
| H-09 | **Baja** | Endurecimiento de Electron / CWE-1188 (valores por defecto inseguros) | `package.json:35-67` (sin `electronFuses`); `electron/main.cjs:12-28` (sin `setPermissionRequestHandler`) | **Los *fuses* de Electron están con sus valores por defecto:** `RunAsNode`, `EnableNodeOptionsEnvironmentVariable` y `EnableNodeCliInspectArguments` siguen activos, y no se ha activado `EnableEmbeddedAsarIntegrityValidation`. Tampoco hay un manejador que deniegue permisos (cámara, micrófono, notificaciones, ubicación). | Con `ELECTRON_RUN_AS_NODE=1`, `Nocta.exe` funciona como un intérprete de Node completo. Un malware ya presente en el equipo puede usarlo como binario "de confianza" (técnica LOLBin) si el usuario lo tiene en una lista de permitidos. No da acceso remoto por sí mismo. | Añadir a `build` la configuración `electronFuses` (`runAsNode: false`, `enableNodeOptionsEnvironmentVariable: false`, `enableNodeCliInspectArguments: false`, `onlyLoadAppFromAsar: true` al reactivar asar). Añadir `session.defaultSession.setPermissionRequestHandler((_, __, cb) => cb(false))`. |
| H-10 | **Baja** | A01 / CWE-601 (redirección a un sitio no confiable) | `src/updates.ts:35`; `src/components/UpdateNotice.tsx:23`; `src/views/SettingsView.tsx:343`; `electron/main.cjs:35` | **La URL del botón "Descargar" sale tal cual del campo `html_url` de la respuesta de la API de GitHub**, sin comprobar que apunte a `https://github.com/IvanNG-27/agenda/`. Electron abre cualquier `http(s)` en el navegador con `shell.openExternal`. | Haría falta controlar la respuesta de `api.github.com` (TLS comprometido o una Release manipulada), y en ese caso H-04 ya sería peor. El riesgo añadido es pequeño: llevar al usuario a una web de descarga falsa. | Construir la URL en local (`https://github.com/IvanNG-27/agenda/releases/tag/v${version}`), o validar que `html_url` empiece por ese prefijo antes de usarla. |
| H-11 | **Baja** | CWE-78 (inyección de comandos del sistema operativo) | `build/Desinstalar Nocta.cmd:37` | El desinstalador mete la ruta de la carpeta dentro de un comando de PowerShell entre comillas simples (`"$d = '%DIR%'; ..."`) sin escaparla. **Una ruta con `'` cierra la cadena** y lo que venga detrás se ejecuta como PowerShell. | Habría que convencer al usuario de extraer el `.zip` en una carpeta con un nombre preparado, como `C:\x';Start-Process calc;'`. Es poco realista, pero además una ruta legítima con apóstrofo (`C:\Users\O'Neil\...`) hace que no se borren los accesos directos. | Pasar la ruta a PowerShell por variable de entorno en lugar de interpolarla: `set "NOCTA_DIR=%DIR%"` y, en el script, `$d = $env:NOCTA_DIR`. |
| H-12 | **Informativa** | A05 / CWE-200 | `src/sync/config.ts:4-9`; historial (`c474f1a`) | La configuración de Firebase (`apiKey: 'AIzaSyAV…'`, `appId`, `messagingSenderId`) está en el código y en el historial de git. **No es secreta por diseño:** identifica el proyecto y la seguridad depende de las reglas, que funcionan (H-02 aparte). Los dominios autorizados incluyen `localhost` (comprobado con `getProjectConfig`). | Cualquiera puede usar la configuración para llamar a Auth y Firestore desde su propio código. Eso es lo que explota H-02. | No hace falta rotarla. En Google Cloud → Credenciales, **restringir la clave** por referente HTTP (`https://ivanng-27.github.io/*`, y `localhost` solo si se usa para desarrollo) y por API (Identity Toolkit, Firestore y Token Service). Quitar `localhost` de los dominios autorizados cuando no se desarrolle. |
| H-13 | **Informativa** | CWE-312 (información sensible guardada en claro) / CWE-613 | `src/data/store.ts:6`, `:27`; `%APPDATA%\Nocta\Local Storage`; IndexedDB de Firebase Auth | Los datos de la agenda se guardan **en claro** en `localStorage` (web) y en `%APPDATA%\Nocta` (escritorio). Los tokens de Firebase Auth están en IndexedDB. `signOut()` no revoca el *refresh token* en el servidor. | Cualquiera con acceso a la cuenta de usuario del sistema operativo o al perfil del navegador puede leer la agenda. Es el modelo de amenaza normal de una app local. | Documentarlo en la página de privacidad (H-05). Valorar el borrado de datos al cerrar sesión (H-01). |
| H-14 | **Informativa** | CWE-400 / CWE-770 | `src/views/SettingsView.tsx:202`; `src/data/backup.ts:35-49` | **Importar una copia no tiene límite** de tamaño de archivo ni de número de elementos. Con sesión iniciada, `replaceAll` sube todo a Firestore en lotes de 400. | Un archivo enorme puede bloquear la pestaña o generar miles de escrituras, pero es el propio usuario quien lo elige: no lo puede provocar un tercero. Si se combina con H-02, facilita gastar la cuota. | Limitar el archivo (por ejemplo a 5 MB) y el número de elementos (por ejemplo, 5 000 en total) antes de llamar a `JSON.parse`. |
| H-15 | **Informativa** | Higiene de secretos | `.gitignore:1-11` | `.gitignore` no excluye `.env`, `.env.*` (salvo `*.local`), `*.pem`, `*.key` ni `credentials.json`. Hoy no existe ninguno de esos archivos (comprobado en todo el historial). | No hay exposición actual. Es una red de seguridad por si en el futuro se añade una cuenta de servicio o una clave de firma (H-04). | Añadir `.env`, `.env.*`, `!.env.example`, `*.pem`, `*.key`, `*.pfx`, `*.p12` y `credentials*.json` a `.gitignore`. |

### Puntos que requieren verificación (fuera del alcance del repositorio)

| ID | Qué falta | Cómo verificarlo |
|----|-----------|------------------|
| V-01 | **Que las reglas publicadas en la consola sean las de `firestore.rules`.** Las lecturas sin sesión dan `403` (comprobado), y las mismas reglas en el emulador bloquearon a un usuario intruso. Falta confirmar que las publicadas en producción impiden leer `users/{otro uid}` con una sesión válida. | Consola de Firebase → Firestore → Reglas: comparar con `firestore.rules`. También se puede ejecutar `firebase deploy --only firestore:rules` desde el repositorio. |
| V-02 | Plan de Firebase (Spark o Blaze), cuotas y alertas de presupuesto (relacionado con H-02). | Consola de Firebase → Uso y facturación. |
| V-03 | Región de Firestore (para el RGPD; relacionado con H-05). | Consola de Firebase → Firestore → pestaña de datos, ubicación. |
| V-04 | Restricciones de la clave de API (H-12). | Google Cloud → APIs y servicios → Credenciales. |
| V-05 | Protección de la rama `main` y de las etiquetas `v*`, y autenticación en dos pasos en la cuenta de GitHub. | GitHub → Settings → Branches / Rules, y Settings → Password and authentication. |

---

## 3. Checklist completo

Leyenda: ✅ OK · ❌ Fallo (ID del hallazgo) · ⚠️ Requiere verificación · N/A No aplica (con el motivo)

### 1. Secretos y credenciales
- ✅ **Secretos en el código:** no hay. La configuración de Firebase es pública por diseño (H-12).
- ✅ **Secretos en el historial de git:** no hay. Se buscaron claves privadas, tokens de GitHub, OpenAI y Slack, contraseñas y archivos sensibles en todas las ramas (`git log -p --all`).
- ❌ **`.gitignore` para `.env`, `*.pem`, `*.key`…:** faltan esos patrones (H-15). `.dockerignore`: N/A, no hay Docker.
- N/A **`.env.example`:** el proyecto no usa secretos. La única variable es `VITE_FIREBASE_EMULATOR`, solo para pruebas.
- ✅ **Secretos expuestos al cliente:** solo la configuración pública de Firebase. Se comprobó que el bundle publicado no incluye la función de pruebas `__noctaTestSignIn`.
- ✅ **Secretos en logs o errores:** no hay `console.*` en `src/`. `messageFor()` traduce los errores de Firebase sin datos internos.
- N/A **Gestor de secretos:** no hay secretos de servidor.
- N/A **Claves por entorno:** hay un solo proyecto de Firebase, y el emulador usa `demo-nocta`.

### 2. Autenticación
- N/A **Hash de contraseñas, política de contraseñas, protección contra fuerza bruta, enumeración de usuarios y recuperación de contraseña:** solo se usa Google, y el registro con email está deshabilitado (`ADMIN_ONLY_OPERATION`, comprobado).
- N/A **MFA:** depende de la cuenta de Google del usuario.
- N/A **Cambio de email o contraseña:** no existe en la app.
- ✅ **OAuth/OIDC:** lo gestiona el SDK de Firebase Auth (`state`, validación de `redirect_uri` por dominios autorizados). Los dominios autorizados incluyen `localhost` (H-12).
- ✅ **JWT:** los ID tokens de Firebase se validan en los servidores de Google y caducan en 1 hora.
- N/A **Comparación de tokens en tiempo constante:** no hay comparaciones de secretos en el código.
- N/A **Credenciales por defecto:** no hay cuentas propias.

### 3. Gestión de sesiones
- N/A **ID de sesión regenerado y cookies `HttpOnly`/`Secure`/`SameSite`:** no hay cookies ni sesiones de servidor.
- ✅ **Expiración:** el ID token dura 1 hora y lo renueva el SDK.
- ⚠️ **Logout en el servidor:** `signOut()` no revoca el *refresh token* (H-13) y deja los datos locales (H-01).
- N/A **Invalidar sesiones tras cambio de contraseña:** no hay contraseñas.
- ⚠️ **Tokens fuera de `localStorage`:** Firebase guarda los tokens en IndexedDB, el valor por defecto del SDK. No es peor que `localStorage`, pero cualquier XSS los alcanzaría (H-06, H-13).
- ✅ **Tokens nunca en la URL:** sí, con el flujo de *popup* y, como alternativa, el de redirección del SDK.

### 4. Autorización y control de acceso
- ✅ **Autorización en servidor:** las reglas de Firestore son la única barrera y comprueban `request.auth.uid == uid` (`firestore.rules:7-8`). Ver V-01.
- ✅ **IDOR/BOLA:** todas las rutas cuelgan de `users/{uid}`, y no se puede leer el `uid` de otro sin que coincida con el del token.
- N/A **BFLA:** no hay roles ni funciones de administración.
- ✅ **Escalada de privilegios:** no hay privilegios que escalar.
- ❌ **Mass assignment:** las reglas aceptan cualquier campo y cualquier tamaño (H-02). No hay campos de privilegio que sobrescribir, pero sí se pueden escribir datos arbitrarios.
- N/A **Multi-tenant:** cada usuario es su propio "tenant", aislado por las reglas.
- ✅ **Deny by default:** cualquier ruta fuera de `users/{uid}/**` está cerrada.
- ✅ **Reglas de Firestore restrictivas** en propiedad. ❌ en validación (H-02). ⚠️ Comprobar lo publicado en la consola (V-01).
- N/A **Archivos subidos protegidos:** no se usa Storage.

### 5. Validación de entrada e inyecciones
- ✅ **Validación de lo que llega de fuera:** `cleanSubject`, `cleanTask`, `cleanExam` y `cleanEvent` (`src/data/backup.ts`) validan tipo, longitud, formato ISO, hora y valores permitidos de color y tipo, tanto en las copias como en lo que llega de Firestore. ❌ En el servidor no hay validación (H-02).
- N/A **SQL injection:** no hay SQL.
- ✅ **NoSQL injection:** las consultas son por ruta e id fijos, sin operadores que vengan del usuario.
- ✅ **Command injection:** `scripts/zip.cjs:26` usa `execFileSync` con un array de argumentos, sin shell. ❌ Hay inyección en PowerShell en el desinstalador (H-11).
- ✅ **Code injection:** no hay `eval`, `new Function` ni `setTimeout` con texto.
- N/A **SSTI:** no se usan plantillas en servidor.
- N/A **Inyección LDAP, XPath, de cabeceras o de logs:** no aplica.
- ✅ **Path traversal:** las rutas de `zip.cjs` salen de `package.json`, no de lo que escribe el usuario.
- N/A **XXE:** no se procesa XML.
- ✅ **Deserialización:** se usa `JSON.parse` y luego se eligen campo a campo.
- ✅ **Prototype pollution:** no hay *merges* profundos. Los *spreads* de objetos que vienen de `JSON.parse` no contaminan `Object.prototype`.
- ✅ **ReDoS:** todas las expresiones regulares están ancladas y son lineales (`/^\d{4}-\d{2}-\d{2}$/`, la de la hora, `/^v/`, `/\.(zip|exe)$/i`).
- ❌ **Límites de tamaño:** no hay límite al importar copias (H-14), ni de tamaño en Firestore (H-02).

### 6. XSS y seguridad del front-end
- ✅ **Escapado de la salida:** todo se pinta con JSX. Los colores dinámicos (`var(--${color})`) se validan contra una lista cerrada.
- ✅ **`dangerouslySetInnerHTML`, `innerHTML`, `document.write`:** no se usan.
- ✅ **DOM XSS:** `location.hash` solo se compara con nombres de ruta fijos (`src/ui.tsx`), y los ids se pasan por `encodeURIComponent`.
- ✅ **URLs `javascript:` en `href`:** los únicos `href` dinámicos son las rutas internas y `update.url`, solo en escritorio (H-10). React 19 bloquea `javascript:`.
- N/A **`postMessage`:** no se usa.
- ✅ **Enlaces externos con `rel`:** usan `rel="noreferrer"`, que ya implica `noopener`.
- N/A **Markdown o HTML de usuarios:** no se renderiza.
- ✅ **Seguridad que dependa del cliente:** el control de acceso está en las reglas, no en el front.
- ✅ **Source maps:** no se publican (`.map` da 404 y el bundle no tiene `sourceMappingURL`).

### 7. Cabeceras HTTP
- ❌ **CSP:** la web no tiene (H-06). En la app de escritorio hay CSP con `script-src 'self'` y `style-src 'unsafe-inline'`.
- ✅ **HSTS:** `max-age=31556952`, lo pone GitHub, que no permite configurar `includeSubDomains` ni `preload`.
- ❌ **`X-Content-Type-Options`:** no se envía (H-06).
- ❌ **`Referrer-Policy`:** no se envía (H-06).
- ❌ **`Permissions-Policy`:** no se envía (H-06).
- ❌ **Anti-clickjacking:** no hay protección (H-06).
- N/A **COOP/CORP:** no son necesarias para esta app; el *popup* de Google necesita una COOP permisiva.
- ✅ **`X-Powered-By`:** no aparece. `Server: GitHub.com` es de la plataforma.
- N/A **`Cache-Control: no-store`:** no hay respuestas de servidor con datos sensibles, porque los datos van por Firestore.

### 8. CORS y CSRF
- N/A **CORS:** no hay API propia. `Access-Control-Allow-Origin: *` en GitHub Pages solo afecta a archivos estáticos públicos.
- N/A **CSRF:** no hay cookies de sesión. Firestore se autentica con un *bearer token*.
- N/A **Acciones que cambian estado por `GET`:** no hay endpoints propios.

### 9. SSRF y peticiones salientes
- N/A **URLs de usuario, IPs internas y DNS rebinding:** no hay servidor que haga peticiones.
- ✅ **Peticiones salientes desde el cliente:** solo a `api.github.com`, con la URL fija (`src/updates.ts`) y permitida por la CSP de escritorio.
- ✅ **Verificación TLS:** no se desactiva en ningún sitio.

### 10. Subida de archivos
- N/A **Validación por contenido, nombres en servidor, almacenamiento, zip bombs, EXIF y antivirus:** no se suben archivos a ningún servidor. La importación de copias se procesa solo en el navegador (H-14).
- ❌ **Límite de tamaño:** la importación de copias no lo tiene (H-14).

### 11. Seguridad de API (Firestore)
- ⚠️ **Rate limiting:** lo pone Firebase por cuota de proyecto, no por usuario. Sin App Check se puede abusar (H-02, V-02).
- ✅ **Paginación:** cada usuario escucha solo sus colecciones.
- ✅ **Exceso de datos:** cada usuario solo puede leer lo suyo.
- ✅ **Inventario:** no hay endpoints de depuración. La función de pruebas `__noctaTestSignIn` no está en producción.
- N/A **Swagger, GraphQL y WebSockets propios:** no existen.
- N/A **Webhooks entrantes:** no existen.
- N/A **Idempotencia de pagos:** no hay pagos.
- N/A **Métodos HTTP:** no hay servidor propio.

### 12. Lógica de negocio
- N/A **Saldos, cupones, precios, pagos, flujos de varios pasos e invitaciones:** no existen.
- ❌ **Abuso de funcionalidades:** los datos pasan de una cuenta a otra en dispositivos compartidos (H-01).
- ✅ **Open redirect:** no hay parámetros `next`/`redirect`, y las rutas son internas. El aviso de actualización se trata en H-10.

### 13. Criptografía
- ✅ **TLS:** HTTPS con redirección desde HTTP en GitHub Pages, y Firebase y GitHub API también por HTTPS.
- N/A **Algoritmos, IV/nonce y criptografía casera:** la app no cifra nada.
- ✅ **Aleatoriedad:** `Math.random()` solo se usa para ids de documentos dentro del espacio del propio usuario (`src/data/store.ts:75`), no para tokens ni secretos.
- ❌ **Datos sensibles en reposo:** están en claro en el dispositivo (H-13). En Firestore los cifra Google en reposo.
- ✅ **Backups:** las copias `.json` son archivos del usuario. Conviene mencionarlo en la privacidad (H-05).

### 14. Errores y logging
- ✅ **Errores genéricos:** son mensajes en español sin trazas.
- ✅ **Modo depuración:** Vite compila en `production`, y el emulador solo se activa con `VITE_FIREBASE_EMULATOR=1`.
- ⚠️ **Registro de eventos de seguridad:** no hay registro propio. Los inicios de sesión se ven en la consola de Firebase Auth, y no hay alertas (V-02).
- ✅ **Logs sin datos sensibles:** no hay logs en el cliente.
- N/A **Inyección en logs:** no hay logs propios.
- ⚠️ **Alertas ante anomalías:** no hay. Se recomiendan alertas de cuota y presupuesto (H-02).
- ✅ **Fail closed:** si falla la fusión al iniciar sesión, se cierra la sesión (`mergeOrSignOut`), y las reglas deniegan por defecto.

### 15. Privacidad (RGPD / LOPDGDD)
- ⚠️ **Minimización:** se guarda nombre, email (de Auth) y agenda. Los datos de salud y de terceros salen de lo que escribe el usuario (H-05).
- ❌ **Inventario de dónde está la PII:** no está documentado (H-05).
- ❌ **Derechos de acceso, rectificación, supresión y portabilidad:** la portabilidad existe (Exportar copia), pero no se puede borrar la cuenta ni los datos de la nube (H-05).
- ❌ **Retención:** no está definida (H-05).
- N/A **Consentimiento de cookies:** no hay analítica ni seguimiento.
- ⚠️ **Terceros:** Google/Firebase (Auth y Firestore) y GitHub (alojamiento y releases). Falta indicarlo en una política de privacidad, y comprobar la región (V-03).
- N/A **Pagos:** no hay.

### 16. Dependencias y cadena de suministro
- ❌ **Vulnerabilidades conocidas:** Electron (H-03) y dependencias de compilación (H-07).
- ✅ **Lockfile:** `package-lock.json` está versionado y el CI usa `npm ci`.
- ✅ **Paquetes dudosos:** todas las dependencias son oficiales y conocidas (react, firebase, vite, electron, @fontsource).
- ✅ **Scripts `postinstall`:** el proyecto no tiene ninguno. Electron usa el suyo para descargar el binario, y se omite en CI con `ELECTRON_SKIP_BINARY_DOWNLOAD`.
- ✅ **Dependencias innecesarias:** no hay. Todas son `devDependencies` y el bundle solo incluye lo que se usa.
- N/A **SRI:** no se cargan scripts de CDN; las fuentes van incluidas en la app.
- N/A **Imágenes de Docker:** no hay Docker.
- ❌ **Dependabot o Renovate:** no está configurado (H-08).

### 17. Infraestructura
- N/A **Dockerfile, docker-compose y Kubernetes:** no existen.
- N/A **Puertos, BD, Redis y paneles expuestos:** no hay servidores propios.
- ✅ **Almacenamiento público:** no se usa Storage. Firestore está cerrado sin sesión (comprobado).
- ⚠️ **IAM:** revisar los miembros del proyecto de Firebase y Google Cloud (V-04).
- N/A **Infraestructura como código:** no hay.
- N/A **Usuario de BD con privilegios mínimos:** Firestore se gobierna por reglas.
- N/A **Autenticación de Redis, Mongo o Elasticsearch:** no se usan.
- ✅ **Servidor web:** GitHub Pages no lista directorios, y `.git/config`, `.env`, `package.json` y `firestore.rules` dan 404 (comprobado).
- N/A **Subdominios y DNS propios:** se usa `*.github.io`.
- N/A **SPF, DKIM y DMARC:** la app no envía correos.

### 18. CI/CD
- ✅ **Secretos de CI:** el workflow no usa ninguno; el despliegue va por OIDC.
- ❌ **Acciones por SHA y permisos por job:** se fijan por etiqueta y los permisos están a nivel de workflow (H-08). ✅ No hay `pull_request_target` ni interpolaciones de `github.event` en `run:`.
- ⚠️ **Ramas protegidas:** sin verificar (V-05).
- ❌ **Escaneo de seguridad en el pipeline:** no hay (H-08).
- ✅ **Artefactos sin secretos:** el artefacto de Pages es `dist/`, sin *source maps* ni archivos de desarrollo. ❌ El `.zip` de escritorio no lleva firma (H-04).

### 19. IA / LLM
- N/A **Todo el apartado:** la app no usa modelos de lenguaje.

### 20. Herramientas
| Herramienta | Resultado |
|---|---|
| `npm audit` | Ejecutado: 16 avisos (8 *high* y 8 *moderate*). Analizados en H-03 y H-07. |
| Revisión del historial de git (búsqueda de patrones) | Ejecutada: solo aparece la clave pública de Firebase (H-12). |
| `curl -I` de la web publicada | Ejecutado: hay HSTS y redirección a HTTPS, y faltan el resto de cabeceras (H-06). |
| Pruebas de solo lectura contra Firebase | Ejecutadas: Firestore sin sesión da `403`, el registro con email da `ADMIN_ONLY_OPERATION`, y se listaron los dominios autorizados. |
| `gitleaks` | No instalado. Instalar con `winget install gitleaks` y ejecutar `gitleaks detect --source . -v`. |
| `trufflehog` | No instalado. Instalar con `winget install trufflesecurity.trufflehog` y ejecutar `trufflehog git file://. --only-verified`. |
| `semgrep` | No instalado. Instalar con `pip install semgrep` y ejecutar `semgrep --config auto`. |
| `osv-scanner` | No instalado. Instalar con `winget install Google.OSVScanner` y ejecutar `osv-scanner -r .`. |
| `trivy` | No instalado. Instalar con `winget install AquaSecurity.Trivy` y ejecutar `trivy fs .`. |
| `zizmor` / `actionlint` | No instalados. Instalar con `pip install zizmor` y ejecutar `zizmor .github/workflows/`; o `winget install rhysd.actionlint` y ejecutar `actionlint`. |
| ESLint + `eslint-plugin-security` | No está configurado en el proyecto. Instalar con `npm i -D eslint @eslint/js typescript-eslint eslint-plugin-security`. |
| `hadolint` / `checkov` / `tfsec` | N/A: no hay Dockerfile ni infraestructura como código. |

---

## 4. Plan de remediación

El orden empieza por lo que se puede explotar desde fuera o expone datos de otras personas, y termina por el endurecimiento.

1. **H-02 · Firestore sin límites.** Es lo único que un desconocido puede explotar hoy y afecta a todos los usuarios.
   - Validar en las reglas los campos, los tipos y el tamaño de cada colección.
   - Activar App Check.
   - Configurar alertas de cuota y presupuesto, y comprobar V-01 y V-02 en la consola.
2. **H-01 · Datos que pasan de una cuenta a otra.** Expone datos personales, incluidos los de salud, a otra persona.
   - Borrar o preguntar al cerrar sesión.
   - Pedir confirmación antes de subir datos locales a una cuenta distinta de la última usada.
3. **H-04 + H-10 · Integridad de las actualizaciones del `.exe`.**
   - Construir la URL de descarga en local (cambio de una línea).
   - Activar la autenticación en dos pasos en GitHub y proteger las etiquetas (V-05).
   - Publicar el SHA-256 del `.zip` en cada Release.
   - Pasar a ejecutables firmados.
4. **H-03 + H-07 · Dependencias.**
   - Actualizar a Electron 44 y recompilar.
   - `npm audit fix` sin `--force`, y no bajar `firebase`.
5. **H-05 · Privacidad.**
   - Página de privacidad.
   - Botón "Borrar mi cuenta y mis datos".
   - Comprobar la región (V-03).
6. **H-06 · CSP en la web** con `<meta>`, y `Referrer-Policy`.
7. **H-08 · CI.**
   - Permisos por job.
   - Acciones fijadas por SHA.
   - Dependabot y `npm audit` en el pipeline.
8. **H-09, H-11, H-12, H-14, H-15 · Endurecimiento.**
   - *Fuses* de Electron y denegación de permisos.
   - Escapar la ruta en el desinstalador.
   - Restringir la clave de API y quitar `localhost`.
   - Límite al importar copias.
   - Ampliar `.gitignore`.

No se ha aplicado ningún arreglo. Cada punto se puede abordar por separado cuando se apruebe.
