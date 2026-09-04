import { NextResponse } from 'next/server';
import { POKEDEX } from '@/lib/pokedex';

export const dynamic = 'force-dynamic';

/** Sortea un Pokemon de toda la Pokedex (rival aleatorio del combate). */
export function GET() {
  const entry = POKEDEX[Math.floor(Math.random() * POKEDEX.length)];
  return NextResponse.json({
    id: entry.id,
    name: entry.name,
    label: entry.label,
    types: entry.types,
  });
}
