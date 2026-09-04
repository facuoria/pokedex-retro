import index from '@/data/pokedex-index.json';
import versionGroupsData from '@/data/version-groups.json';
import type { PokedexIndexEntry, StatKey } from '@/types/pokemon';
import { STAT_KEYS } from '@/lib/constants';

export interface VersionGroup {
  name: string;
  label: string;
  generation: number;
  order: number;
}

/** Indice completo precalculado por `npm run seed`. */
export const POKEDEX: PokedexIndexEntry[] = index as unknown as PokedexIndexEntry[];

export const VERSION_GROUPS: VersionGroup[] = versionGroupsData as VersionGroup[];

export const VERSION_GROUP_MAP = new Map(VERSION_GROUPS.map((vg) => [vg.name, vg]));

export function versionGroupLabel(name: string): string {
  return VERSION_GROUP_MAP.get(name)?.label ?? name;
}

export function generationOfVersionGroup(name: string): number {
  return VERSION_GROUP_MAP.get(name)?.generation ?? 9;
}

export type SortKey = 'id' | 'name' | 'total' | StatKey;

export interface PokedexQuery {
  q?: string;
  types?: string[];
  generation?: number;
  versionGroup?: string;
  sort?: SortKey;
  order?: 'asc' | 'desc';
}

/** Normaliza acentos y mayusculas para comparar nombres. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function sortValue(entry: PokedexIndexEntry, sort: SortKey): number | string {
  if (sort === 'id') return entry.id;
  if (sort === 'name') return entry.name;
  if (sort === 'total') return entry.total;
  const statIndex = STAT_KEYS.indexOf(sort as StatKey);
  return statIndex >= 0 ? entry.stats[statIndex] : entry.id;
}

/** Filtra y ordena el indice completo. Todo sucede en memoria: es un JSON de 1025 filas. */
export function queryPokedex(query: PokedexQuery): PokedexIndexEntry[] {
  const term = query.q ? normalize(query.q) : '';
  const types = query.types?.filter(Boolean) ?? [];

  let result = POKEDEX.filter((entry) => {
    if (query.generation && entry.generation !== query.generation) return false;
    if (types.length && !types.every((t) => entry.types.includes(t as never))) return false;
    if (query.versionGroup && !entry.versionGroups.includes(query.versionGroup)) return false;
    if (term) {
      const matchesName = normalize(entry.name).includes(term);
      const matchesId = String(entry.id) === term || String(entry.id).padStart(3, '0') === term;
      const matchesType = entry.types.some((t) => normalize(t).startsWith(term));
      if (!matchesName && !matchesId && !matchesType) return false;
    }
    return true;
  });

  const sort = query.sort ?? 'id';
  const direction = query.order === 'desc' ? -1 : 1;

  result = [...result].sort((a, b) => {
    const av = sortValue(a, sort);
    const bv = sortValue(b, sort);
    if (typeof av === 'string' || typeof bv === 'string') {
      return String(av).localeCompare(String(bv)) * direction;
    }
    if (av === bv) return a.id - b.id;
    return (av - bv) * direction;
  });

  return result;
}

/** Sugerencias para el autocompletado: prioriza prefijos y coincidencias por numero. */
export function suggest(term: string, limit = 8): PokedexIndexEntry[] {
  const needle = normalize(term);
  if (!needle) return [];

  const scored: { entry: PokedexIndexEntry; score: number }[] = [];
  for (const entry of POKEDEX) {
    const name = normalize(entry.name);
    let score = -1;
    if (String(entry.id) === needle) score = 0;
    else if (name === needle) score = 1;
    else if (name.startsWith(needle)) score = 2;
    else if (String(entry.id).padStart(4, '0').includes(needle)) score = 3;
    else if (name.includes(needle)) score = 4;
    else if (entry.types.some((t) => normalize(t).startsWith(needle))) score = 5;
    if (score >= 0) scored.push({ entry, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.entry.id - b.entry.id)
    .slice(0, limit)
    .map((s) => s.entry);
}

export function getEntry(nameOrId: string): PokedexIndexEntry | undefined {
  const needle = normalize(nameOrId);
  return POKEDEX.find((e) => normalize(e.name) === needle || String(e.id) === needle);
}

/** Sprite pixel deterministico servido desde el repo de sprites de PokeAPI. */
export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}
