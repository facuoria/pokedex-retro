import { NextResponse } from 'next/server';
import { queryPokedex, type SortKey } from '@/lib/pokedex';

// Depende de los search params, asi que se resuelve por request (sin red: solo JSON local).
export const dynamic = 'force-dynamic';

/**
 * Paginado del grid principal. Trabaja sobre el indice estatico, asi que no
 * toca PokeAPI ni depende de la red.
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const offset = Number(params.get('offset') ?? 0);
  const limit = Math.min(Number(params.get('limit') ?? 48), 200);

  const results = queryPokedex({
    q: params.get('q') ?? undefined,
    types: params.getAll('type'),
    generation: params.get('gen') ? Number(params.get('gen')) : undefined,
    versionGroup: params.get('game') ?? undefined,
    sort: (params.get('sort') as SortKey) ?? 'id',
    order: params.get('order') === 'desc' ? 'desc' : 'asc',
  });

  return NextResponse.json({
    total: results.length,
    offset,
    items: results.slice(offset, offset + limit),
  });
}
