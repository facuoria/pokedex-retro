'use client';

import { useState } from 'react';
import { TypeBadge } from '@/components/TypeBadge';
import { TYPE_LABELS_ES } from '@/lib/constants';
import { getMultiplier, groupEffectiveness, typesForGeneration } from '@/lib/type-chart';
import { getDefensiveProfile } from '@/lib/type-chart';
import type { TypeName } from '@/types/pokemon';

interface Props {
  types: TypeName[];
  label: string;
  generation: number;
  /** Expandido la primera vez que se entra a un combate. */
  defaultOpen?: boolean;
}

function Row({ title, hint, types }: { title: string; hint: string; types: TypeName[] }) {
  if (types.length === 0) return null;
  return (
    <li className="flex flex-col gap-2 border-2 border-ink-600 bg-ink-900/60 p-2 sm:flex-row sm:items-center">
      <span className="w-full shrink-0 sm:w-40">
        <span className="block font-pixel text-[9px] text-bone">{title}</span>
        <span className="block font-pixel text-[7px] uppercase text-ink-400">{hint}</span>
      </span>
      <span className="flex flex-wrap gap-1">
        {types.map((type) => (
          <TypeBadge key={type} type={type} size="sm" />
        ))}
      </span>
    </li>
  );
}

/**
 * Ayuda memoria durante el combate, SOLO sobre el Pokemon del jugador: mostrar
 * lo mismo del rival le sacaria la gracia de adivinar contra que se enfrenta.
 *
 * Reutiliza el mismo modulo de tipos que la ficha de detalle (lib/type-chart),
 * incluida la combinacion de ambos tipos si el Pokemon es dual.
 */
export function TypeHintPanel({ types, label, generation, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const defensive = getDefensiveProfile(types, generation);
  const groups = groupEffectiveness(defensive);

  // Ofensiva: para cada tipo rival, el mejor multiplicador que consigue este
  // Pokemon atacando con alguno de SUS tipos (los movimientos son de un tipo,
  // asi que aca no se multiplican entre si como en defensa).
  const best = new Map<TypeName, number>();
  for (const target of typesForGeneration(generation)) {
    best.set(
      target,
      Math.max(...types.map((own) => getMultiplier(own, target, generation))),
    );
  }
  const strongAgainst = [...best.entries()]
    .filter(([, value]) => value >= 2)
    .map(([type]) => type);

  return (
    <section className="panel">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="panel-heading flex w-full items-center justify-between text-left"
      >
        <span>Para tener en cuenta</span>
        <span className="text-dex-yellow">{open ? '- ocultar' : '+ mostrar'}</span>
      </button>

      {open && (
        <div className="p-3">
          <p className="mb-3 text-xs leading-relaxed text-ink-400">
            Sobre <strong className="text-bone">{label}</strong> ({types.map((t) => TYPE_LABELS_ES[t]).join(' / ')}).
            Del rival vas a tener que darte cuenta solo.
          </p>

          <ul className="space-y-2">
            <Row
              title="Es fuerte contra"
              hint="tus ataques pegan x2 o mas"
              types={strongAgainst}
            />
            <Row
              title="Es debil contra"
              hint="te pegan x2 o x4"
              types={[...groups.x4, ...groups.x2]}
            />
            <Row
              title="Resiste"
              hint="te pegan x1/2 o x1/4"
              types={[...groups.x05, ...groups.x025]}
            />
            <Row title="No le afecta" hint="inmune, x0" types={groups.x0} />
          </ul>
        </div>
      )}
    </section>
  );
}
