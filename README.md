# Nocta · Agenda 2º DAM

Agenda oscura para deberes y exámenes de 2º DAM, basada en `../Bocetos/Nocta_especificacion_diseno.pdf`.
React + TypeScript + Vite, instalable como PWA. Los datos se guardan en `localStorage` del navegador.

```bash
npm install
npm run dev      # desarrollo en http://localhost:5173
npm run build    # compila a dist/
npm run preview  # sirve dist/ en http://localhost:4173
```

- Móvil (< 900 px): Hoy · Semana · Tablero · Exámenes, botón + y Ajustes desde el avatar del Tablero.
- Escritorio (≥ 900 px): Hoy (tres columnas) · Calendario (mes/semana) · Tablero kanban (arrastrar tareas) · Exámenes · Ajustes.
- Asignaturas editables (nombre, abreviatura y color) en Ajustes.

Estructura: `src/styles/tokens.css` (tokens de diseño), `src/components` (SubjectChip, TaskItem, ExamCard…),
`src/data` (modelo y almacenamiento), `src/lib` (fechas y reglas), `src/views` (pantallas).
