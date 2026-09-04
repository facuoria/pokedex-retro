'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { EffectivenessGrid } from '@/components/EffectivenessGrid';
import { TypeChartGrid } from '@/components/TypeChartGrid';
import { GENERATIONS, TYPE_COLORS, TYPE_LABELS_ES } from '@/lib/constants';
import {
  formatMultiplier,
  getDefensiveProfile,
  getOffensiveProfile,
  typesForGeneration,
} from '@/lib/type-chart';
import type { TypeName } from '@/types/pokemon';

/**
 * Explorador de la tabla de tipos: generacion + combinacion de hasta 2 tipos,
 * con resumen defensivo (combinado) y ofensivo. Estado en la URL.
 */
export function TypeChartExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const generation = Number(searchParams.get('gen') ?? 9);
  const available = useMemo(() => typesForGeneration(generation), [generation]);
  const selected = useMemo(
    () => searchParams.getAll('type').filter((t) => available.includes(t as TypeName)) as TypeName[],
    [searchParams, available],
  );

  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.replace(query ? `/type-chart?${query}` : '/type-chart', { scroll: false });
  }

  function toggleType(type: TypeName) {
    update((params) => {
      const current = params.getAll('type');
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type].slice(-2);
      params.delete('type');
      next.forEach((t) => params.append('type', t));
    });
  }

  const defensive = selected.length ? getDefensiveProfile(selected, generation) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block font-pixel text-[9px] uppercase text-ink-400">
            Generacion
          </span>
          <select
            value={generation}
            onChange={(e) =>
              update((params) => {
                if (e.target.value === '9') params.delete('gen');
                else params.set('gen', e.target.value);
              })
            }
            className="field font-pixel text-[10px]"
          >
            {GENERATIONS.map((gen) => (
              <option key={gen.id} value={gen.id}>
                {gen.label}
              </option>
            ))}
          </select>
        </label>

        <p className="max-w-md text-xs leading-relaxed text-ink-400">
          {generation <= 1 &&
            'Gen I: sin Siniestro, Acero ni Hada. Fantasma no afecta a Psíquico y Bicho/Veneno se pegan x2 entre sí.'}
          {generation >= 2 &&
            generation <= 5 &&
            'Gen II-V: sin Hada. Acero todavía resiste Fantasma y Siniestro.'}
          {generation >= 6 && 'Gen VI en adelante: tabla vigente, con Hada incluida.'}
        </p>
      </div>

      {/* Selector de combinacion */}
      <div className="panel-flat p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-pixel text-[9px] uppercase tracking-wider text-ink-400">
            Elegí 1 o 2 tipos para ver el resumen combinado
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              className="font-pixel text-[8px] uppercase text-dex-yellow hover:underline"
              onClick={() => update((params) => params.delete('type'))}
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {available.map((type) => {
            const isActive = selected.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={isActive}
                onClick={() => toggleType(type)}
                style={{
                  backgroundColor: isActive ? TYPE_COLORS[type] : undefined,
                  borderColor: isActive ? '#ffcb05' : undefined,
                }}
                className={`chip ${
                  isActive ? 'scale-105' : 'bg-ink-700 text-ink-400 hover:text-bone'
                } transition-transform`}
              >
                {TYPE_LABELS_ES[type]}
              </button>
            );
          })}
        </div>
      </div>

      {selected.length > 0 && defensive && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="panel">
            <h2 className="panel-heading">
              Defensa: {selected.map((t) => TYPE_LABELS_ES[t]).join(' / ')}
            </h2>
            <div className="p-3">
              <EffectivenessGrid profile={defensive} />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-heading">Ataque con estos tipos</h2>
            <div className="space-y-3 p-3">
              {selected.map((attacker) => {
                const offensive = getOffensiveProfile(attacker, generation);
                const strong = available.filter((d) => offensive[d] === 2);
                const weak = available.filter((d) => offensive[d] === 0.5);
                const none = available.filter((d) => offensive[d] === 0);

                return (
                  <div key={attacker} className="border-2 border-ink-600 bg-ink-900/60 p-2">
                    <p
                      className="mb-2 inline-block border-2 border-black/50 px-2 py-1 font-pixel text-[9px] text-white"
                      style={{ backgroundColor: TYPE_COLORS[attacker] }}
                    >
                      {TYPE_LABELS_ES[attacker]}
                    </p>
                    {[
                      { label: formatMultiplier(2), list: strong },
                      { label: formatMultiplier(0.5), list: weak },
                      { label: formatMultiplier(0), list: none },
                    ]
                      .filter((row) => row.list.length > 0)
                      .map((row) => (
                        <div key={row.label} className="mb-1 flex flex-wrap items-center gap-1">
                          <span className="w-8 font-pixel text-[9px] text-ink-400">{row.label}</span>
                          {row.list.map((type) => (
                            <span
                              key={type}
                              className="chip px-1.5 py-1 text-[8px]"
                              style={{ backgroundColor: TYPE_COLORS[type] }}
                            >
                              {TYPE_LABELS_ES[type]}
                            </span>
                          ))}
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      <TypeChartGrid generation={generation} />
    </div>
  );
}
