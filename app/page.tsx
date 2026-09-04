import { Suspense } from 'react';
import { HeroBanner } from '@/components/HeroBanner';
import { PokedexBrowser } from '@/components/PokedexBrowser';
import { PokemonCardSkeleton } from '@/components/PokemonCard';
import { GAMES_WITH_DEX, queryPokedex, type SortKey } from '@/lib/pokedex';

export const revalidate = 86400;

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

const asArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const asString = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

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
      <HeroBanner />
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
          versionGroups={GAMES_WITH_DEX}
        />
      </Suspense>
    </>
  );
}
