# Nocta · Agenda

Agenda oscura y personalizable para deberes, exámenes y eventos (cumpleaños, comidas, quedadas, citas…), basada en `../Bocetos/Nocta_especificacion_diseno.pdf`.
React + TypeScript + Vite, instalable como PWA. Los datos se guardan en `localStorage` del navegador.

```bash
npm install
npm run dev      # desarrollo en http://localhost:5173
npm run build    # compila a dist/
npm run preview  # sirve dist/ en http://localhost:4173
```

## Web en GitHub Pages

Cada `git push` a `main` publica la web en https://ivanng-27.github.io/agenda/ (workflow `.github/workflows/pages.yml`).
Desde ahí, en Chrome o Edge, "Instalar Nocta" la deja como app de escritorio; en el móvil, "Añadir a pantalla de inicio".
Para probar la versión de Pages en local: `npm run build:pages`.

## Sincronización (Firebase)

Con sesión iniciada con Google (Ajustes → Sincronización), las tareas, exámenes, eventos y asignaturas se guardan en Firestore
y se ven en todos los dispositivos. Funciona sin conexión: los cambios se suben al volver.

- Configuración del proyecto: `src/sync/config.ts` (valores de la consola de Firebase; no son secretos).
- Reglas de seguridad: `firestore.rules` (cada usuario solo accede a `users/{su uid}`). Hay que publicarlas en la consola.
- Solo en la versión web: la app de escritorio no puede iniciar sesión con Google.

## App de escritorio (Windows)

```bash
npm run app    # abre la versión de escritorio (Electron) sin instalarla
npm run dist   # genera instaladores/<versión>/Nocta-<versión>-windows.zip
```

El `.zip` lleva una carpeta `Nocta` con la app (`Nocta.exe`) y `Desinstalar Nocta.cmd` (sale de `build/`). El
desinstalador quita los accesos directos que apunten a la carpeta, la borra y, si se le pide, borra también los datos.

No se genera instalador NSIS: en un PC con Smart App Control, electron-builder se queda a medias al crear el
desinstalador. En su lugar, electron-builder deja la app en `win-unpacked` y `scripts/zip.cjs` la comprime con el
`tar` de Windows.

### Versiones

La versión sale de `"version"` en `package.json` y cada una se genera en su carpeta (`instaladores/1.0.0/`,
`instaladores/1.1.0/`…), así que las anteriores se conservan.

```bash
npm version minor --no-git-tag-version   # 1.0.0 → 1.1.0 (patch: 1.0.1, major: 2.0.0)
npm run dist                             # genera instaladores/1.1.0/
```

#### Aviso de versión nueva (app de escritorio)

La web se actualiza sola; la app de escritorio no. Al arrancar (y cada 6 horas) la app de escritorio consulta la última Release
de GitHub y, si es más nueva que la suya, avisa con un enlace para descargarla (`src/updates.ts`). Para que funcione:

- La etiqueta de la Release tiene que ser la versión con `v` delante: `v1.2.0`.
- Tiene que llevar adjunto `Nocta-<versión>-windows.zip`; sin él no avisa.
- No debe estar marcada como borrador ni como pre-release.

Quien actualiza borra la carpeta Nocta antigua y extrae la nueva; sus datos siguen en `%APPDATA%\Nocta`.

#### Novedades

Al abrir la app después de una actualización, se enseña qué ha cambiado desde la última versión que vio ese dispositivo
(y se pueden volver a ver en Ajustes → Novedades). Los textos están en `src/data/changelog.ts`: cada vez que subas
la versión, añade arriba su entrada contando los cambios como los notaría quien usa la app.
Si falta la entrada de la versión de `package.json`, `npm run build` y `npm run dist` fallan y te lo recuerdan.

Los datos de la app de escritorio se guardan en `%APPDATA%\Nocta` y son independientes de los del navegador.

### ⚠️ Windows 11: Smart App Control

`Nocta.exe` no está firmado digitalmente. Si en tu PC está activado **Smart App Control**, Windows lo bloquea
sin opción de abrirlo igualmente, y no admite excepciones por programa. Para usar la app de escritorio hay que desactivarlo:

1. Abre **Seguridad de Windows** → **Control de aplicaciones y navegador**.
2. Entra en **Configuración de Smart App Control** y elige **Desactivado**.

> **Importante:** en la mayoría de versiones de Windows 11, una vez desactivado no se puede volver a activar sin
> reinstalar o restablecer Windows. El antivirus (Microsoft Defender) sigue protegiendo el equipo igual.

Si prefieres no desactivarlo, usa la versión web (https://ivanng-27.github.io/agenda/) e instálala desde Chrome o Edge
con el icono de instalar de la barra de direcciones: funciona igual y no la bloquea.

Sin Smart App Control, la primera vez puede aparecer el aviso azul de SmartScreen: "Más información" → "Ejecutar de todas formas".

## Pantallas

- Móvil (< 900 px): Hoy · Semana · Tablero · Exámenes, botón + y Ajustes desde el avatar del Tablero.
- Escritorio (≥ 900 px): Hoy (tres columnas) · Calendario (mes/semana) · Tablero kanban (arrastrar tareas) · Exámenes · Ajustes.
- Asignaturas editables (nombre, abreviatura y color) en Ajustes.
- Eventos personales (cumpleaños, comidas, quedadas, médico, días importantes…) con hora, lugar y repetición anual, desde el botón + → Evento. Se ven en Hoy, Semana y Calendario y no necesitan asignatura.

Estructura: `src/styles/tokens.css` (tokens de diseño), `src/components` (SubjectChip, TaskItem, ExamCard…),
`src/data` (modelo y almacenamiento), `src/lib` (fechas y reglas), `src/views` (pantallas).
