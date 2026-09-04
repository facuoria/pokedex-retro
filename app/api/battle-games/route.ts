import { NextResponse } from 'next/server';
import { getPokemonDetail } from '@/lib/pokeapi';
import { VERSION_GROUP_MAP } from '@/lib/pokedex';

export const dynamic = 'force-dynamic';

/**
 * Juegos en los que un Pokemon tiene learnset POR NIVEL.
 *
 * No alcanza con "aparece en el juego": hay version-groups (Champions, por
 * ejemplo) donde PokeAPI no publica movimientos por nivel sino otros metodos,
 * y ahi un combate se quedaria sin movimientos que ofrecer.
 */
export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'Falta el parametro name' }, { status: 400 });
  }

  try {
    const detail = await getPokemonDetail(name);
    if (!detail) {
      return NextResponse.json({ error: 'Pokemon no encontrado' }, { status: 404 });
    }

    const games = Object.entries(detail.movesByVersionGroup)
      .filter(([, moves]) => moves.some((move) => move.method === 'level-up'))
      .map(([group]) => VERSION_GROUP_MAP.get(group))
      .filter((vg): vg is NonNullable<typeof vg> => Boolean(vg))
      .sort((a, b) => b.order - a.order);

    return NextResponse.json(
      { name: detail.name, label: detail.label, games },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
    );
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar PokeAPI' }, { status: 502 });
  }
}
