import Link from 'next/link';
import { Suspense } from 'react';
import { PokedexBrowser } from '@/components/PokedexBrowser';
import { PokemonCardSkeleton } from '@/components/PokemonCard';
import { GENERATIONS } from '@/lib/constants';
import { POKEDEX, VERSION_GROUPS, queryPokedex, type SortKey } from '@/lib/pokedex';

export const revalidate = 86400;

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

const asArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const asString = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

function Hero() {
  return (
    <section className="gb-screen scanlines relative mb-6 overflow-hidden p-5 sm:p-7">
      <p className="font-pixel text-[10px] uppercase tracking-wider text-screen-dark">
        Pokedex Nacional
      </p>
      <h1 className="mt-3 font-pixel text-lg leading-relaxed text-screen-ink sm:text-2xl">
        {POKEDEX.length} Pokemon
        <span className="ml-2 animate-blink">_</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-screen-dark">
        Gen I a Gen IX. Buscá por nombre, número o tipo; filtrá por juego para ver el movepool
        exacto de esa versión y consultá debilidades ya calculadas para tipos duales.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/type-chart"
          className="btn border-screen-ink bg-screen-dark text-screen-bg hover:bg-screen-ink"
        >
          Tabla de tipos
        </Link>
        <Link
          href="/compare"
          className="btn border-screen-ink bg-screen-dark text-screen-bg hover:bg-screen-ink"
        >
          Comparar
        </Link>
      </div>
    </section>
  );
}

function GenerationShortcuts() {
  return (
    <nav aria-label="Atajos por generacion" className="mb-6 flex flex-wrap gap-2">
      {GENERATIONS.map((gen) => (
        <Link key={gen.id} href={`/?gen=${gen.id}`} className="btn">
          {gen.label}
        </Link>
      ))}
    </nav>
  );
}

export default function HomePage({ searchParams }: PageProps) {
  const results = queryPokedex({
    q: asString(searchParams.q),
    types: asArray(searchParams.type),
    generation: searchParams.gen ? Number(asString(searchParams.gen)) : undefined,
    versionGroup: asString(searchParams.game),
    sort: (asString(searchParams.sort) as SortKey) ?? 'id',
    order: asString(searchParams.order) === 'desc' ? 'desc' : 'asc',
  });

  return (
    <>
      <Hero />
      <GenerationShortcuts />
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <PokemonCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <PokedexBrowser
          initialItems={results.slice(0, 48)}
          initialTotal={results.length}
          versionGroups={VERSION_GROUPS}
        />
      </Suspense>
    </>
  );
}
