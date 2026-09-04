import { NextResponse } from 'next/server';
import { selectMovesForLevel } from '@/lib/battle-engine';
import { getPokemonDetail } from '@/lib/pokeapi';
import { generationOfVersionGroup } from '@/lib/pokedex';

export const dynamic = 'force-dynamic';

/**
 * Arma el payload de un combatiente: stats base, tipos, sprites y los
 * movimientos que aprende POR NIVEL en el juego elegido hasta el nivel dado.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const name = params.get('name');
  const game = params.get('game');
  const level = Math.min(100, Math.max(1, Number(params.get('level') ?? 50)));

  if (!name || !game) {
    return NextResponse.json({ error: 'Faltan parametros: name y game' }, { status: 400 });
  }

  try {
    const detail = await getPokemonDetail(name);
    if (!detail) {
      return NextResponse.json({ error: 'Pokemon no encontrado' }, { status: 404 });
    }

    const pool = detail.movesByVersionGroup[game] ?? [];
    const moves = selectMovesForLevel(pool, level);

    return NextResponse.json(
      {
        id: detail.id,
        name: detail.name,
        label: detail.label,
        types: detail.types,
        baseStats: detail.stats,
        sprites: { front: detail.sprites.pixel, back: detail.sprites.pixelBack },
        moves,
        generation: generationOfVersionGroup(game),
        /** El Pokemon no aparece en ese juego o no aprende nada por nivel aun. */
        availableInGame: pool.length > 0,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
    );
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar PokeAPI' }, { status: 502 });
  }
}
