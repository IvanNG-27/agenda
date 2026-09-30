/**
 * Novedades de cada versión, contadas para quien usa la app (no para quien la programa).
 * Al subir la versión con `npm version patch|minor|major`, añade arriba su entrada:
 * `npm run build` falla si falta la de la versión de package.json.
 * Las entradas de versiones posteriores a la actual no se muestran hasta que la app llega a ellas.
 */
export type Release = { version: string; changes: string[] };

export const CHANGELOG: Release[] = [
  {
    version: '1.2.0',
    changes: [
      'Cuando Nocta se actualice, te enseñará qué ha cambiado, como ahora.',
      'Puedes volver a ver las novedades en Ajustes, abajo del todo.',
    ],
  },
  {
    version: '1.1.1',
    changes: [
      'Al final de Ajustes puedes ver qué versión de Nocta tienes.',
      'En iPhone y iPad, el icono de la pantalla de inicio ahora es el de Nocta.',
    ],
  },
  {
    version: '1.1.0',
    changes: [
      'Nocta ya es una agenda para cualquier persona: empieza vacía y la adaptas a lo que estudies.',
      'Añade, edita y elimina tus asignaturas en Ajustes.',
      'Sincroniza el móvil y el ordenador iniciando sesión con Google (versión web).',
    ],
  },
  {
    version: '1.0.0',
    changes: [
      'Primera versión: apunta deberes y exámenes de cada asignatura.',
      'Pantallas Hoy, Semana, Calendario, Tablero y Exámenes.',
      'Copias de seguridad: exporta e importa tus datos desde Ajustes.',
      'App de escritorio para Windows.',
    ],
  },
];

/** Compara versiones "1.10.0" > "1.9.2": negativo si a < b, 0 si son iguales, positivo si a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Entradas posteriores a `since` hasta `current` incluida, de la más nueva a la más antigua. */
export function releasesBetween(since: string | null, current: string): Release[] {
  return CHANGELOG.filter(
    (r) => compareVersions(r.version, current) <= 0 && (since === null || compareVersions(r.version, since) > 0),
  ).sort((a, b) => compareVersions(b.version, a.version));
}
