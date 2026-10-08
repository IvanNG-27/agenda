---
description: Auditoría de seguridad completa del proyecto (OWASP Top 10, ASVS, API Top 10, supply chain, infra)
---

# Auditoría de seguridad

Actúa como ingeniero senior de ciberseguridad (AppSec + DevSecOps). Audita TODO el repositorio contra cada punto de esta lista.

## Reglas de ejecución

1. **Primero reconocimiento, después auditoría.** Identifica stack, frameworks, versiones, base de datos, auth, despliegue (Docker, cloud, CI/CD), puntos de entrada (rutas, endpoints, colas, cron, websockets, webhooks) y flujos de datos sensibles. Lee `git log` para ver cambios recientes en zonas críticas.
2. **No modifiques código durante la auditoría.** Solo reporta. Los arreglos se aplican después, uno a uno, con mi aprobación.
3. **Evidencia obligatoria.** Cada hallazgo con `archivo:línea`, fragmento relevante y por qué es explotable. Nada de hallazgos genéricos sin ubicación.
4. **Si un punto no aplica al stack, márcalo como N/A con una línea de motivo.** No lo omitas.
5. **Ejecuta las herramientas disponibles** (ver sección 20) y cruza sus resultados con la revisión manual. Si una herramienta no está instalada, indica el comando para instalarla; no la instales sin preguntar.
6. **Sin falsos positivos inflados.** Si no estás seguro, márcalo como "Requiere verificación" y explica qué falta.

---

## 1. Secretos y credenciales
- [ ] Secretos hardcodeados (API keys, tokens, passwords, claves privadas, connection strings) en código, tests, fixtures, configs, notebooks, Dockerfiles, CI.
- [ ] Secretos en el **historial de git** (aunque ya se hayan borrado del HEAD).
- [ ] `.env`, `*.pem`, `*.key`, `credentials.json`, `id_rsa`, etc. ignorados en `.gitignore` y `.dockerignore`.
- [ ] Existe `.env.example` sin valores reales.
- [ ] Secretos expuestos al cliente (variables `NEXT_PUBLIC_*`, `VITE_*`, `REACT_APP_*`, bundles JS, apps móviles).
- [ ] Secretos impresos en logs, mensajes de error o respuestas de API.
- [ ] Uso de gestor de secretos (Vault, AWS Secrets Manager, Doppler…) y rotación posible.
- [ ] Claves distintas por entorno (dev/staging/prod).

## 2. Autenticación
- [ ] Hash de contraseñas con Argon2id, bcrypt (coste ≥12) o scrypt. Nunca MD5/SHA1/SHA256 sin sal ni cifrado reversible.
- [ ] Política de contraseñas razonable (longitud mínima ≥12, comprobación contra contraseñas filtradas, sin reglas absurdas).
- [ ] Protección contra fuerza bruta y credential stuffing: rate limiting por IP y por cuenta, bloqueo progresivo, CAPTCHA tras fallos.
- [ ] Mensajes de login/registro/recuperación que no permiten enumerar usuarios (mismo mensaje y mismo tiempo de respuesta).
- [ ] Recuperación de contraseña: token aleatorio criptográfico, de un solo uso, con expiración corta, invalidado tras uso y tras cambio de contraseña. Sin host header injection en el enlace.
- [ ] MFA disponible (TOTP/WebAuthn) y obligatorio para cuentas admin.
- [ ] Cambio de email/contraseña requiere reautenticación.
- [ ] OAuth/OIDC: parámetro `state`, PKCE, validación estricta de `redirect_uri`, validación de `iss`/`aud`/`nonce`.
- [ ] JWT: algoritmo fijado en el servidor (rechazar `alg: none` y confusión HS/RS), secreto fuerte, `exp` corto, validación de `iss`/`aud`, estrategia de revocación, sin datos sensibles en el payload.
- [ ] Comparaciones de tokens/secretos en tiempo constante.
- [ ] Cuentas y credenciales por defecto eliminadas.

## 3. Gestión de sesiones
- [ ] IDs de sesión aleatorios y largos, regenerados tras login y cambio de privilegios (anti session fixation).
- [ ] Cookies con `HttpOnly`, `Secure`, `SameSite=Lax/Strict`, `Path` y `Domain` restrictivos, prefijo `__Host-` cuando sea posible.
- [ ] Expiración por inactividad y absoluta.
- [ ] Logout invalida la sesión en el servidor (no solo borra la cookie).
- [ ] Invalidación de todas las sesiones tras cambio de contraseña.
- [ ] Tokens no almacenados en `localStorage` si existe alternativa más segura.
- [ ] Tokens nunca en la URL.

## 4. Autorización y control de acceso
- [ ] **Cada** endpoint y acción verifica autorización en el servidor (no solo ocultar botones en el front).
- [ ] IDOR / BOLA: acceso a recursos por ID verifica que pertenecen al usuario o tenant.
- [ ] BFLA: endpoints de admin/funciones privilegiadas protegidos por rol.
- [ ] Escalada de privilegios horizontal y vertical.
- [ ] Mass assignment: el usuario no puede modificar campos como `role`, `isAdmin`, `ownerId`, `balance`, `verified` (usar allowlists/DTOs).
- [ ] Aislamiento multi-tenant en todas las queries.
- [ ] Deny by default: rutas nuevas sin protección no quedan públicas por accidente (revisar middlewares y orden de rutas).
- [ ] Row Level Security si se usa Supabase/Postgres expuesto al cliente; reglas de Firebase/Firestore restrictivas.
- [ ] Archivos estáticos o subidos no accesibles sin autorización (URLs firmadas con expiración).

## 5. Validación de entrada e inyecciones
- [ ] Validación en servidor con esquemas (Zod, Joi, Pydantic, etc.): tipo, longitud, formato, rango. Allowlist antes que denylist.
- [ ] **SQL injection**: solo queries parametrizadas/ORM; revisar raw queries, concatenaciones, `ORDER BY`/nombres de columna dinámicos.
- [ ] **NoSQL injection**: operadores (`$ne`, `$gt`, `$where`) en objetos recibidos del cliente.
- [ ] **Command injection**: `exec`, `system`, `spawn` con `shell=true`, `child_process`, `subprocess`, `os.system`, backticks.
- [ ] **Code injection**: `eval`, `new Function`, `setTimeout(string)`, `pickle`, `yaml.load` inseguro, `vm`.
- [ ] **SSTI**: plantillas renderizadas con input del usuario (Jinja2, Handlebars, EJS, Twig…).
- [ ] **LDAP / XPath / header / log injection** (CRLF en cabeceras y logs).
- [ ] **Path traversal**: rutas de archivo construidas con input (`../`, rutas absolutas, null bytes, enlaces simbólicos).
- [ ] **XXE**: parsers XML con entidades externas deshabilitadas.
- [ ] **Deserialización insegura** de datos no confiables.
- [ ] **Prototype pollution** (JS): merges profundos, `__proto__`, `constructor.prototype`.
- [ ] **ReDoS**: expresiones regulares con backtracking catastrófico aplicadas a input del usuario.
- [ ] Límites de tamaño de body, JSON anidado, número de campos y arrays.

## 6. XSS y seguridad del front-end
- [ ] Escapado de salida según contexto (HTML, atributo, JS, URL, CSS).
- [ ] Uso de `dangerouslySetInnerHTML`, `v-html`, `innerHTML`, `[innerHTML]`, `document.write`, `insertAdjacentHTML`: justificado y sanitizado con DOMPurify.
- [ ] DOM XSS: `location`, `hash`, `postMessage`, `URLSearchParams` llegando a sinks peligrosos.
- [ ] URLs `javascript:` / `data:` en `href`/`src` controlados por el usuario.
- [ ] `postMessage` valida `origin` y el receptor también.
- [ ] Enlaces externos con `rel="noopener noreferrer"`.
- [ ] Markdown/HTML renderizado de usuarios sanitizado.
- [ ] Sin lógica de seguridad ni datos sensibles que dependan solo del cliente.
- [ ] Source maps no publicados en producción.

## 7. Cabeceras HTTP y configuración del navegador
- [ ] `Content-Security-Policy` estricta (sin `unsafe-inline`/`unsafe-eval`, con nonces/hashes, `frame-ancestors`, `object-src 'none'`, `base-uri 'self'`).
- [ ] `Strict-Transport-Security` con `max-age` largo, `includeSubDomains` (y `preload` si procede).
- [ ] `X-Content-Type-Options: nosniff`.
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` o más estricta.
- [ ] `Permissions-Policy` restringiendo cámara, micrófono, geolocalización, etc.
- [ ] Protección anti clickjacking (`frame-ancestors` / `X-Frame-Options`).
- [ ] `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` cuando aplique.
- [ ] Eliminar `X-Powered-By`, `Server` con versión y cabeceras que revelen tecnología.
- [ ] `Cache-Control: no-store` en respuestas con datos sensibles.

## 8. CORS y CSRF
- [ ] CORS con allowlist explícita de orígenes. Nunca reflejar el `Origin` recibido ni `*` con `credentials: true`. Revisar regex de orígenes (subdominios, `null`).
- [ ] Protección CSRF en acciones que cambian estado con cookies (tokens anti-CSRF, `SameSite`, verificación de `Origin`).
- [ ] Ninguna acción que cambie estado mediante `GET`.

## 9. SSRF y peticiones salientes
- [ ] Peticiones a URLs proporcionadas por el usuario (webhooks, previews, importación por URL, generación de PDF/imagen) validadas contra allowlist.
- [ ] Bloqueo de IPs internas, loopback, link-local y metadatos cloud (`169.254.169.254`, `metadata.google.internal`), IPv6 e IPs en formatos alternativos.
- [ ] Protección contra DNS rebinding y redirecciones a destinos internos.
- [ ] Timeouts y límite de tamaño de respuesta.
- [ ] Verificación TLS activada (sin `verify=False`, `rejectUnauthorized: false`).

## 10. Subida y manejo de archivos
- [ ] Validación de tipo por contenido (magic bytes), no solo extensión o `Content-Type`.
- [ ] Límite de tamaño y número de archivos.
- [ ] Nombres de archivo regenerados en servidor (sin input del usuario en la ruta).
- [ ] Almacenamiento fuera del webroot o en bucket privado; nunca ejecutables desde la ruta de subida.
- [ ] SVG, HTML y PDF tratados como potencialmente peligrosos (XSS); servir con `Content-Disposition: attachment` o dominio separado.
- [ ] Protección contra zip bombs, zip slip y decompression bombs en imágenes.
- [ ] Eliminación de metadatos EXIF si hay privacidad en juego.
- [ ] Escaneo antivirus si los archivos se comparten entre usuarios.

## 11. Seguridad de API
- [ ] Rate limiting y throttling en todos los endpoints, más estricto en login, registro, recuperación, OTP, envío de emails/SMS y endpoints costosos.
- [ ] Paginación con límites máximos.
- [ ] Respuestas sin exceso de datos (no devolver objetos completos de BD con hashes, emails de otros, campos internos).
- [ ] Inventario de endpoints: sin endpoints olvidados, de debug, versiones antiguas o rutas de test en producción.
- [ ] Documentación (Swagger/OpenAPI, GraphQL playground) deshabilitada o protegida en producción.
- [ ] **GraphQL**: introspección deshabilitada en prod, límite de profundidad y complejidad, batching limitado, autorización por resolver.
- [ ] **WebSockets**: autenticación en el handshake, autorización por mensaje/canal, validación de `Origin`, rate limiting.
- [ ] **Webhooks entrantes**: verificación de firma (HMAC) y protección contra replay (timestamp/nonce).
- [ ] Idempotencia en operaciones críticas (pagos, pedidos).
- [ ] Métodos HTTP no usados deshabilitados.

## 12. Lógica de negocio y condiciones de carrera
- [ ] Race conditions en operaciones de saldo, cupones, stock, votos, límites de uso (usar transacciones, locks o constraints únicos).
- [ ] Valores negativos, cero, decimales, desbordamientos y cantidades extremas en precios y cantidades.
- [ ] Precios y totales calculados en servidor, nunca aceptados del cliente.
- [ ] Flujos multipaso que no se pueden saltar (pago, verificación de email, onboarding).
- [ ] Abuso de funcionalidades: invitaciones, referidos, pruebas gratuitas, envío de emails a terceros.
- [ ] Open redirect en parámetros `next`, `redirect`, `returnUrl`, `callback`.

## 13. Criptografía y datos en tránsito/reposo
- [ ] TLS 1.2+ en todo, redirección HTTP→HTTPS, sin contenido mixto.
- [ ] Algoritmos modernos: AES-GCM o ChaCha20-Poly1305; nada de ECB, DES, RC4, MD5/SHA1 para seguridad.
- [ ] IV/nonces únicos; claves no hardcodeadas.
- [ ] Aleatoriedad criptográfica (`crypto.randomBytes`, `secrets`, `crypto.getRandomValues`). Nunca `Math.random()` ni `random` para tokens.
- [ ] Datos sensibles cifrados en reposo (PII, tokens de terceros, documentos).
- [ ] Backups cifrados y con acceso restringido.
- [ ] Sin criptografía casera.

## 14. Manejo de errores y logging
- [ ] Errores genéricos al usuario; sin stack traces, queries SQL, rutas internas ni versiones en producción.
- [ ] Modo debug deshabilitado en producción (`DEBUG=False`, `NODE_ENV=production`, etc.).
- [ ] Logging de eventos de seguridad: logins (éxito/fallo), cambios de permisos, cambios de contraseña/email, accesos denegados, acciones admin.
- [ ] Logs sin contraseñas, tokens, números de tarjeta, PII innecesaria.
- [ ] Logs protegidos contra inyección (CRLF) y manipulación.
- [ ] Alertas ante patrones anómalos.
- [ ] Fallos de seguridad "fail closed" (si falla la verificación, se deniega).

## 15. Privacidad y cumplimiento (RGPD / LOPDGDD)
- [ ] Minimización: solo se recogen los datos necesarios.
- [ ] Inventario de dónde se almacena PII.
- [ ] Derecho de acceso, rectificación, supresión y portabilidad implementables.
- [ ] Retención y borrado de datos definidos.
- [ ] Consentimiento de cookies previo a cargar analítica/tracking no esencial.
- [ ] Terceros (analítica, SDKs, IA) que reciben datos personales identificados.
- [ ] Si se procesan pagos: nunca almacenar datos de tarjeta; delegar en el proveedor (Stripe, etc.) y cumplir PCI DSS.

## 16. Dependencias y cadena de suministro
- [ ] Vulnerabilidades conocidas en dependencias directas y transitivas.
- [ ] Lockfile presente y versionado; instalación reproducible (`npm ci`, `pip install --require-hashes`, etc.).
- [ ] Paquetes abandonados, con typosquatting o de origen dudoso.
- [ ] Scripts `postinstall` sospechosos.
- [ ] Dependencias innecesarias que aumentan la superficie de ataque.
- [ ] Scripts externos cargados desde CDN con Subresource Integrity (`integrity`).
- [ ] Imágenes base de Docker actualizadas y con versión fijada (digest).
- [ ] Dependabot/Renovate configurado.

## 17. Infraestructura, contenedores y cloud
- [ ] Dockerfile: usuario no root, imagen mínima, multi-stage, sin secretos en capas ni `ARG`, `HEALTHCHECK`.
- [ ] docker-compose / Kubernetes: sin `privileged`, sin montar el socket de Docker, capabilities mínimas, filesystem read-only donde sea posible, límites de recursos, NetworkPolicies.
- [ ] Puertos expuestos mínimos; BD, Redis, colas y paneles admin no accesibles desde internet.
- [ ] Buckets/almacenamiento sin acceso público no intencionado.
- [ ] IAM con mínimo privilegio; sin claves de root/owner en la app.
- [ ] Infraestructura como código (Terraform, CloudFormation…) revisada.
- [ ] BD con usuario de app de privilegios mínimos (sin DROP/superuser).
- [ ] Redis/Mongo/Elasticsearch con autenticación.
- [ ] Servidor web (Nginx/Apache): sin listado de directorios, sin acceso a `.git`, `.env`, backups, archivos `.bak`/`.old`.
- [ ] Subdominios huérfanos (subdomain takeover) y registros DNS revisados.
- [ ] Email: SPF, DKIM y DMARC configurados si la app envía correos.

## 18. CI/CD
- [ ] Secretos de CI con alcance mínimo y no expuestos en logs.
- [ ] GitHub Actions: acciones de terceros fijadas por SHA, `permissions` mínimos, cuidado con `pull_request_target` y con interpolar `${{ github.event.* }}` en `run:` (inyección).
- [ ] Ramas protegidas, revisión obligatoria de PRs.
- [ ] Escaneo de seguridad automatizado en el pipeline (SAST, dependencias, secretos, contenedores).
- [ ] Artefactos de build sin secretos ni archivos de desarrollo.

## 19. Seguridad de IA / LLM (si la app usa modelos de lenguaje)
- [ ] Prompt injection directa e indirecta (contenido de documentos, webs, emails procesados por el modelo).
- [ ] Salida del modelo tratada como no confiable (no ejecutar, no renderizar como HTML sin sanitizar, no usar en queries).
- [ ] Herramientas/funciones del agente con mínimo privilegio y confirmación humana para acciones destructivas.
- [ ] Exfiltración de datos vía URLs, imágenes Markdown o llamadas a herramientas.
- [ ] System prompt sin secretos.
- [ ] Aislamiento de datos entre usuarios en RAG/embeddings.
- [ ] Límites de coste y uso por usuario (denial of wallet).

## 20. Herramientas a ejecutar (según stack)
- **Secretos:** `gitleaks detect`, `trufflehog git file://.`
- **Dependencias:** `npm audit` / `pnpm audit` / `yarn audit`, `pip-audit`, `safety`, `composer audit`, `bundle audit`, `cargo audit`, `govulncheck ./...`, `osv-scanner`
- **SAST:** `semgrep --config auto`, `bandit -r .` (Python), `gosec ./...` (Go), `brakeman` (Rails), ESLint con `eslint-plugin-security`
- **Contenedores e IaC:** `trivy fs .`, `trivy image <img>`, `hadolint Dockerfile`, `checkov -d .`, `tfsec`
- **CI:** `zizmor` o `actionlint` para GitHub Actions
- **Cabeceras (si hay URL desplegada):** comprobar con `curl -I` y securityheaders.com / Mozilla Observatory

---

## Formato del informe

Entrega el informe en `SECURITY_AUDIT_REPORT.md` con:

1. **Resumen ejecutivo:** stack detectado, superficie de ataque, número de hallazgos por severidad.
2. **Tabla de hallazgos** ordenada por severidad:

| ID | Severidad | Categoría (OWASP/CWE) | Ubicación | Descripción | Explotación | Remediación |
|----|-----------|-----------------------|-----------|-------------|-------------|-------------|

   Severidad: **Crítica / Alta / Media / Baja / Informativa**, justificada por impacto y probabilidad.
3. **Checklist completo** con cada punto marcado como ✅ OK, ❌ Fallo (con ID de hallazgo), ⚠️ Requiere verificación o N/A.
4. **Plan de remediación** priorizado: primero lo explotable sin autenticación y lo que expone datos o credenciales.

No apliques ningún arreglo hasta que yo lo apruebe.
