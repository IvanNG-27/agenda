/**
 * Novedades de cada versión, contadas para quien usa la app (no para quien la programa).
 * Al subir la versión con `npm version patch|minor|major`, añade arriba su entrada:
 * `npm run build` falla si falta la de la versión de package.json.
 * Las entradas de versiones posteriores a la actual no se muestran hasta que la app llega a ellas.
 */
export type Release = { version: string; changes: string[] };

export const CHANGELOG: Release[] = [
  {
    version: '1.5.0',
    changes: [
      'Nuevo: recordatorios. Al añadir una tarea, un examen o un evento, elige cuándo quieres que Nocta te avise (hasta 3 avisos).',
      'Activa las notificaciones en Ajustes → Notificaciones. Con la sesión iniciada te llegan aunque Nocta esté cerrada; en iPhone, añade antes Nocta a la pantalla de inicio.',
      'App de escritorio: al cerrar la ventana, Nocta se queda junto al reloj para avisarte. Puedes hacer que se abra sola al iniciar Windows.',
    ],
  },
  {
    version: '1.4.1',
    changes: [
      'Más privacidad: al cerrar sesión se borra tu agenda de este dispositivo (sigue en tu cuenta) y nunca se mezcla con la de otra persona.',
      'Puedes borrar tu cuenta y todos tus datos desde Ajustes → Sincronización.',
      'Nueva página de Privacidad en Ajustes: qué se guarda, dónde y cómo borrarlo.',
      'Mejoras de seguridad en la web, en la sincronización y en la app de escritorio.',
    ],
  },
  {
    version: '1.4.0',
    changes: [
      'Nuevo: rachas de estudio. En Exámenes, pulsa "He estudiado hoy" debajo de un examen cada día que estudies para él.',
      'Verás cuántos días seguidos llevas estudiando, en general y en cada examen (🔥), y tus últimos 7 días.',
      'Nocta guarda tu mejor racha y te felicita al llegar a 3, 7, 14, 30 días… y cuando bates tu récord.',
      'Si no has estudiado hoy, te recuerda que aún puedes mantener la racha antes de medianoche.',
    ],
  },
  {
    version: '1.3.0',
    changes: [
      'Nuevo: eventos. Apunta cumpleaños, comidas, quedadas, citas con el médico o días importantes con el botón + (elige "Evento").',
      'Cada evento puede llevar hora, lugar y notas; los cumpleaños se repiten solos cada año y te dice cuántos cumple.',
      'Verás tus próximos eventos en Hoy, y cada día en Semana y en el Calendario.',
      'La Semana del móvil ahora enseña también el sábado y el domingo.',
      'Ya no hace falta tener asignaturas: puedes usar Nocta solo para tus planes.',
    ],
  },
  {
    version: '1.2.0',
    changes: [
      'Cuando Nocta se actualice, te enseñará qué ha cambiado, como ahora.',
      'Puedes volver a ver las novedades en Ajustes, abajo del todo.',
      'App de escritorio: te avisa cuando hay una versión nueva para descargar.',
      'App de escritorio: ahora se descarga en un .zip que incluye un desinstalador.',
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
