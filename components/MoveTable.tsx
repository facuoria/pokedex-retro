'use client';

import { useMemo, useState } from 'react';
import { TypeBadge } from '@/components/TypeBadge';
import { DAMAGE_CLASS_LABELS, METHOD_LABELS } from '@/lib/constants';
import type { MoveLearn } from '@/types/pokemon';

interface Props {
  /** Movimientos del version-group ya seleccionado. */
  moves: MoveLearn[];
  versionGroupLabel: string;
}

const METHODS: MoveLearn['method'][] = ['level-up', 'machine', 'tutor', 'egg'];

const CLASS_STYLES: Record<string, string> = {
  physical: 'bg-[#C92112] text-white',
  special: 'bg-[#4F5870] text-white',
  status: 'bg-[#8C888C] text-white',
};

/** Tabla de movimientos filtrable por metodo de aprendizaje y por nombre. */
export function MoveTable({ moves, versionGroupLabel }: Props) {
  const [method, setMethod] = useState<MoveLearn['method'] | 'all'>('all');
  const [term, setTerm] = useState('');

  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const move of moves) acc[move.method] = (acc[move.method] ?? 0) + 1;
    return acc;
  }, [moves]);

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return moves.filter(
      (move) =>
        (method === 'all' || move.method === method) &&
        (!needle || move.label.toLowerCase().includes(needle)),
    );
  }, [moves, method, term]);

  if (moves.length === 0) {
    return (
      <p className="p-4 text-sm text-ink-400">
        Este Pokémon no aprende movimientos en {versionGroupLabel} (o no está disponible en ese
        juego).
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink-600 p-3">
        <button
          type="button"
          onClick={() => setMethod('all')}
          className={`btn ${method === 'all' ? 'btn-active' : ''}`}
        >
          Todos ({moves.length})
        </button>
        {METHODS.filter((m) => counts[m]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`btn ${method === m ? 'btn-active' : ''}`}
          >
            {METHOD_LABELS[m]} ({counts[m]})
          </button>
        ))}
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Filtrar movimiento..."
          className="field ml-auto w-full sm:w-48"
        />
      </div>

      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-ink-700">
            <tr className="font-pixel text-[8px] uppercase text-ink-400">
              <th className="p-2 text-left">Mov.</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Cat.</th>
              <th className="p-2 text-right">Pot.</th>
              <th className="p-2 text-right">Prec.</th>
              <th className="p-2 text-right">PP</th>
              <th className="p-2 text-right">Como</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((move) => (
              <tr
                key={`${move.name}-${move.method}-${move.level}`}
                className="border-b border-ink-700 hover:bg-ink-700/60"
              >
                <td className="p-2 font-medium text-bone">{move.label}</td>
                <td className="p-2">
                  <TypeBadge type={move.type} size="sm" />
                </td>
                <td className="p-2">
                  <span
                    className={`chip px-1.5 py-1 text-[8px] ${CLASS_STYLES[move.damageClass]}`}
                  >
                    {DAMAGE_CLASS_LABELS[move.damageClass]}
                  </span>
                </td>
                <td className="p-2 text-right tabular-nums text-ink-400">{move.power ?? '—'}</td>
                <td className="p-2 text-right tabular-nums text-ink-400">
                  {move.accuracy ?? '—'}
                </td>
                <td className="p-2 text-right tabular-nums text-ink-400">{move.pp ?? '—'}</td>
                <td className="p-2 text-right font-pixel text-[8px] text-dex-yellow">
                  {move.method === 'level-up'
                    ? move.level > 0
                      ? `Nv. ${move.level}`
                      : 'Inicial'
                    : METHOD_LABELS[move.method]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="p-4 text-center text-sm text-ink-400">Sin movimientos con ese filtro.</p>
        )}
      </div>
    </div>
  );
}
