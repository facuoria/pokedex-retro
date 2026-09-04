'use client';

import { useEffect, useState } from 'react';
import { MoveTable } from '@/components/MoveTable';
import type { MoveLearn } from '@/types/pokemon';

interface Option {
  name: string;
  label: string;
  generation: number;
}

interface Props {
  pokemon: string;
  options: Option[];
  initialGroup: string;
  initialMoves: MoveLearn[];
}

/**
 * Selector de juego + tabla de movimientos.
 * Los movepools de cada version se piden bajo demanda a /api/moves para que la
 * ficha siga siendo estatica (ISR) y liviana.
 */
export function MovesSection({ pokemon, options, initialGroup, initialMoves }: Props) {
  const [group, setGroup] = useState(initialGroup);
  const [moves, setMoves] = useState<MoveLearn[]>(initialMoves);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (group === initialGroup) {
      setMoves(initialMoves);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/moves?pokemon=${encodeURIComponent(pokemon)}&game=${encodeURIComponent(group)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setMoves(data.moves ?? []);
      })
      .catch(() => {
        if (!cancelled) setMoves([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [group, initialGroup, initialMoves, pokemon]);

  const current = options.find((o) => o.name === group);

  return (
    <section className="panel">
      <div className="panel-heading flex flex-wrap items-center justify-between gap-2">
        <span>Movimientos por juego</span>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="border-2 border-ink-500 bg-ink-900 px-2 py-1 font-pixel text-[9px] text-bone focus:border-dex-yellow focus:outline-none"
          aria-label="Elegir juego"
        >
          {options.map((option) => (
            <option key={option.name} value={option.name}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-full" />
          ))}
        </div>
      ) : (
        <MoveTable moves={moves} versionGroupLabel={current?.label ?? group} />
      )}
    </section>
  );
}
