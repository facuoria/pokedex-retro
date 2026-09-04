import { NextResponse } from 'next/server';
import { getMovesByVersion } from '@/lib/pokeapi';

// Los datos vienen de PokeAPI con revalidate de 30 dias; la ruta en si depende
// de los search params.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pokemon = params.get('pokemon');
  const game = params.get('game');

  if (!pokemon || !game) {
    return NextResponse.json({ error: 'Faltan parametros: pokemon y game' }, { status: 400 });
  }

  try {
    const moves = await getMovesByVersion(pokemon, game);
    return NextResponse.json(
      { moves },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
    );
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar PokeAPI' }, { status: 502 });
  }
}
