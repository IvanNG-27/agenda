import type { CSSProperties } from 'react';
import { groupOf, useStore } from '../data/store';
import { colorCss } from '../lib/rules';

/** Color del grupo como variable CSS (--g) para teñir lo que es de un grupo. */
export function useGroupStyle(id?: string): CSSProperties | undefined {
  const g = groupOf(useStore(), id);
  return g ? ({ ['--g' as string]: colorCss(g.color) } as CSSProperties) : undefined;
}

/** Etiqueta con el color y el nombre del grupo. Nada si el elemento es personal. */
export function GroupTag({ id }: { id?: string }) {
  const g = groupOf(useStore(), id);
  if (!g) return null;
  return (
    <span className="group-pill" style={{ ['--g' as string]: colorCss(g.color) } as CSSProperties} title={`Del grupo ${g.name}`}>
      <span className="group-pill__dot" aria-hidden="true" />
      {g.name}
    </span>
  );
}
