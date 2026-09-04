import { NextResponse } from 'next/server';
import { suggest } from '@/lib/pokedex';

// Depende de los search params, asi que se resuelve por request (sin red: solo JSON local).
export const dynamic = 'force-dynamic';

/** Autocompletado del buscador (nombre, numero o tipo). */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const items = suggest(params.get('q') ?? '', 8).map((entry) => ({
    id: entry.id,
    name: entry.name,
    label: entry.label,
    types: entry.types,
  }));
  return NextResponse.json({ items });
}
