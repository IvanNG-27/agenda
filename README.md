# Nocta · Agenda 2º DAM

Agenda oscura para deberes y exámenes de 2º DAM, basada en `../Bocetos/Nocta_especificacion_diseno.pdf`.
React + TypeScript + Vite, instalable como PWA. Los datos se guardan en `localStorage` del navegador.

```bash
npm install
npm run dev      # desarrollo en http://localhost:5173
npm run build    # compila a dist/
npm run preview  # sirve dist/ en http://localhost:4173
```

## App de escritorio (Windows)

```bash
npm run app    # abre la versión de escritorio (Electron) sin instalarla
npm run dist   # genera los ejecutables en instaladores/
```

- `instaladores/Nocta-Setup-1.0.0.exe`: instalador (acceso directo en el escritorio y en el menú Inicio).
- `instaladores/Nocta-1.0.0-portable.exe`: se abre sin instalar.

Los datos de la app de escritorio se guardan en `%APPDATA%\Nocta` y son independientes de los del navegador.
Los ejecutables no están firmados: la primera vez Windows SmartScreen avisa ("Más información" → "Ejecutar de todas formas").

## Pantallas

- Móvil (< 900 px): Hoy · Semana · Tablero · Exámenes, botón + y Ajustes desde el avatar del Tablero.
- Escritorio (≥ 900 px): Hoy (tres columnas) · Calendario (mes/semana) · Tablero kanban (arrastrar tareas) · Exámenes · Ajustes.
- Asignaturas editables (nombre, abreviatura y color) en Ajustes.

Estructura: `src/styles/tokens.css` (tokens de diseño), `src/components` (SubjectChip, TaskItem, ExamCard…),
`src/data` (modelo y almacenamiento), `src/lib` (fechas y reglas), `src/views` (pantallas).
