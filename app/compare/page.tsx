import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { ComparePicker } from '@/components/ComparePicker';
import { EffectivenessGrid } from '@/components/EffectivenessGrid';
import { StatBar } from '@/components/StatBar';
import { TypeBadge } from '@/components/TypeBadge';
import { STAT_KEYS, STAT_LABELS, padId } from '@/lib/constants';
import { getPokemonDetail } from '@/lib/pokeapi';
import { getDefensiveProfile } from '@/lib/type-chart';
import type { PokemonDetail } from '@/types/pokemon';

export const metadata: Metadata = {
  title: 'Comparador',
  description: 'Compará dos Pokémon lado a lado: stats base, tipos y debilidades.',
};

export const revalidate = 86400;

interface PageProps {
  searchParams: { a?: string; b?: string };
}

function Column({ detail, slot }: { detail: PokemonDetail | null; slot: 'a' | 'b' }) {
  return (
    <div className="space-y-4">
      <ComparePicker slot={slot} current={detail?.label} />

      {!detail ? (
        <div className="panel flex h-64 items-center justify-center p-4 text-center">
          <p className="font-pixel text-[10px] leading-relaxed text-ink-400">
            Elegí un Pokémon
            <br />
            para comparar
          </p>
        </div>
      ) : (
        <>
          <div className="panel flex flex-col items-center gap-2 p-4">
            {detail.sprites.artwork && (
              <Image
                src={detail.sprites.artwork}
                alt={detail.label}
                width={140}
                height={140}
                unoptimized
                className="h-32 w-32 object-contain"
              />
            )}
            <p className="font-pixel text-[9px] text-ink-400">{padId(detail.id)}</p>
            <Link
              href={`/pokemon/${detail.name}`}
              className="font-pixel text-[12px] text-bone hover:text-dex-yellow"
            >
              {detail.label}
            </Link>
            <div className="flex gap-1">
              {detail.types.map((type) => (
                <TypeBadge key={type} type={type} size="sm" />
              ))}
            </div>
          </div>

          <section className="panel">
            <h2 className="panel-heading">Estadisticas base</h2>
            <div className="p-3">
              <StatBar stats={detail.stats} total={detail.statTotal} />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-heading">Debilidades</h2>
            <div className="p-3">
              <EffectivenessGrid profile={getDefensiveProfile(detail.types, 9)} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** Fila de diferencias: marca en verde la stat mas alta de cada uno. */
function StatDiff({ a, b }: { a: PokemonDetail; b: PokemonDetail }) {
  return (
    <section className="panel">
      <h2 className="panel-heading">Diferencia de stats</h2>
      <div className="divide-y divide-ink-700">
        {STAT_KEYS.map((key) => {
          const left = a.stats[key];
          const right = b.stats[key];
          return (
            <div key={key} className="grid grid-cols-3 items-center gap-2 px-3 py-2 text-center">
              <span
                className={`font-pixel text-[11px] ${
                  left > right ? 'text-dex-green' : left < right ? 'text-ink-400' : 'text-bone'
                }`}
              >
                {left}
              </span>
              <span className="font-pixel text-[8px] uppercase text-ink-400">
                {STAT_LABELS[key]}
              </span>
              <span
                className={`font-pixel text-[11px] ${
                  right > left ? 'text-dex-green' : right < left ? 'text-ink-400' : 'text-bone'
                }`}
              >
                {right}
              </span>
            </div>
          );
        })}
        <div className="grid grid-cols-3 items-center gap-2 px-3 py-2 text-center">
          <span className="font-pixel text-[11px] text-dex-yellow">{a.statTotal}</span>
          <span className="font-pixel text-[8px] uppercase text-ink-400">Total</span>
          <span className="font-pixel text-[11px] text-dex-yellow">{b.statTotal}</span>
        </div>
      </div>
    </section>
  );
}

export default async function ComparePage({ searchParams }: PageProps) {
  const [a, b] = await Promise.all([
    searchParams.a ? getPokemonDetail(searchParams.a) : Promise.resolve(null),
    searchParams.b ? getPokemonDetail(searchParams.b) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-pixel text-base text-bone text-shadow-pixel sm:text-xl">Comparador</h1>
        <p className="mt-2 text-sm text-ink-400">
          Dos Pokémon lado a lado: stats base, tipos y debilidades ya combinadas.
        </p>
      </header>

      <Suspense fallback={<div className="skeleton h-64 w-full" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <Column detail={a} slot="a" />
          <Column detail={b} slot="b" />
        </div>
      </Suspense>

      {a && b && <StatDiff a={a} b={b} />}
    </div>
  );
}
