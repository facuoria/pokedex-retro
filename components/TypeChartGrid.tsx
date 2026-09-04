'use client';

import { useMemo, useState } from 'react';
import { TYPE_COLORS, TYPE_LABELS_ES, TYPE_SHORT } from '@/lib/constants';
import { getTypeChart, typesForGeneration } from '@/lib/type-chart';
import type { Multiplier, TypeName } from '@/types/pokemon';

/** Estilo de cada celda segun el multiplicador. */
const CELL: Record<string, { className: string; symbol: string; label: string }> = {
  '0': { className: 'bg-ink-900 text-ink-400', symbol: '0', label: 'Inmune' },
  '0.5': { className: 'bg-dex-darkred/70 text-white', symbol: '½', label: 'Poco eficaz' },
  '1': { className: 'bg-ink-700/40 text-ink-400', symbol: '', label: 'Normal' },
  '2': { className: 'bg-dex-green text-white', symbol: '2', label: 'Muy eficaz' },
};

interface Props {
  generation: number;
}

/**
 * Grilla atacante (filas) x defensor (columnas).
 * Hover/click resalta la fila y la columna completas.
 */
export function TypeChartGrid({ generation }: Props) {
  const types = useMemo(() => typesForGeneration(generation), [generation]);
  const chart = useMemo(() => getTypeChart(generation), [generation]);
  const [focus, setFocus] = useState<{ attacker?: TypeName; defender?: TypeName }>({});

  return (
    <div className="panel overflow-hidden">
      <div className="panel-heading flex items-center justify-between">
        <span>Atacante (fila) vs Defensor (columna)</span>
        {(focus.attacker || focus.defender) && (
          <button
            type="button"
            className="text-dex-yellow hover:underline"
            onClick={() => setFocus({})}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-max border-collapse text-center">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-ink-800 p-1" />
              {types.map((defender) => (
                <th
                  key={defender}
                  scope="col"
                  onMouseEnter={() => setFocus((f) => ({ ...f, defender }))}
                  onClick={() => setFocus((f) => ({ ...f, defender }))}
                  className={`cursor-pointer p-1 ${
                    focus.defender === defender ? 'ring-2 ring-dex-yellow' : ''
                  }`}
                  style={{ backgroundColor: TYPE_COLORS[defender] }}
                  title={TYPE_LABELS_ES[defender]}
                >
                  <span className="block w-8 font-pixel text-[7px] text-white text-shadow-pixel">
                    {TYPE_SHORT[defender]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody onMouseLeave={() => setFocus({})}>
            {types.map((attacker) => (
              <tr key={attacker}>
                <th
                  scope="row"
                  onMouseEnter={() => setFocus((f) => ({ ...f, attacker }))}
                  onClick={() => setFocus((f) => ({ ...f, attacker }))}
                  className={`sticky left-0 z-10 cursor-pointer p-1 text-left ${
                    focus.attacker === attacker ? 'ring-2 ring-dex-yellow' : ''
                  }`}
                  style={{ backgroundColor: TYPE_COLORS[attacker] }}
                  title={TYPE_LABELS_ES[attacker]}
                >
                  <span className="block w-8 font-pixel text-[7px] text-white text-shadow-pixel">
                    {TYPE_SHORT[attacker]}
                  </span>
                </th>

                {types.map((defender) => {
                  const value: Multiplier = chart[attacker][defender];
                  const cell = CELL[String(value)] ?? CELL['1'];
                  const highlighted =
                    focus.attacker === attacker || focus.defender === defender;

                  return (
                    <td
                      key={defender}
                      onMouseEnter={() => setFocus({ attacker, defender })}
                      className={`h-8 w-8 border border-ink-800 font-pixel text-[8px] transition-opacity ${
                        cell.className
                      } ${
                        focus.attacker || focus.defender
                          ? highlighted
                            ? 'opacity-100'
                            : 'opacity-30'
                          : ''
                      }`}
                      title={`${TYPE_LABELS_ES[attacker]} -> ${TYPE_LABELS_ES[defender]}: ${cell.label}`}
                    >
                      {cell.symbol}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t-2 border-ink-500 bg-ink-700 px-3 py-2">
        {[
          { key: '2', text: 'x2 muy eficaz' },
          { key: '0.5', text: 'x0.5 poco eficaz' },
          { key: '0', text: 'x0 inmune' },
          { key: '1', text: 'x1 neutro' },
        ].map(({ key, text }) => (
          <span key={key} className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center border border-ink-800 font-pixel text-[7px] ${CELL[key].className}`}
            >
              {CELL[key].symbol}
            </span>
            <span className="font-pixel text-[8px] text-ink-400">{text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
