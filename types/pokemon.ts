export const TYPE_NAMES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const;

export type TypeName = (typeof TYPE_NAMES)[number];

export type Multiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4;

export type StatKey = 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed';

/** Entrada del índice liviano precalculado (data/pokedex-index.json). */
export interface PokedexIndexEntry {
  id: number;
  name: string;
  /** Nombre legible en display (Mr. Mime, Nidoran♀, ...) */
  label: string;
  types: TypeName[];
  generation: number;
  /** Stats base en el orden de StatKey, para poder ordenar sin pegarle a la API. */
  stats: [number, number, number, number, number, number];
  total: number;
  /** Grupos de versión en los que aparece el Pokémon. */
  versionGroups: string[];
}

export interface Ability {
  name: string;
  label: string;
  isHidden: boolean;
  slot: number;
}

export interface MoveLearn {
  name: string;
  label: string;
  type: TypeName;
  damageClass: 'physical' | 'special' | 'status';
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  method: 'level-up' | 'machine' | 'tutor' | 'egg' | 'other';
  level: number;
}

export interface EvolutionNode {
  id: number;
  name: string;
  label: string;
  sprite: string | null;
  /** Condición para llegar a este nodo desde su padre (vacío en la raíz). */
  trigger: string;
  children: EvolutionNode[];
}

export interface PokemonDetail {
  id: number;
  name: string;
  label: string;
  genus: string;
  flavorText: string;
  generation: number;
  types: TypeName[];
  height: number;
  weight: number;
  baseExperience: number | null;
  stats: Record<StatKey, number>;
  statTotal: number;
  abilities: Ability[];
  sprites: {
    pixel: string | null;
    pixelBack: string | null;
    shiny: string | null;
    animated: string | null;
    artwork: string | null;
    /** Sprite pixel por generación: { 'generation-i': url, ... } */
    byGeneration: Record<string, string | null>;
  };
  /** Movimientos agrupados por version-group. */
  movesByVersionGroup: Record<string, MoveLearn[]>;
  versionGroups: string[];
  evolution: EvolutionNode | null;
  speciesName: string;
  varieties: { name: string; label: string; isDefault: boolean }[];
}
