import 'server-only';
import { generationForId, titleCase } from '@/lib/constants';
import type {
  Ability,
  EvolutionNode,
  MoveLearn,
  PokemonDetail,
  StatKey,
  TypeName,
} from '@/types/pokemon';
import moveIndex from '@/data/moves.json';

const API = 'https://pokeapi.co/api/v2';

/** Los datos de PokeAPI cambian rarisimo: cacheamos 30 dias con ISR. */
const REVALIDATE = 60 * 60 * 24 * 30;

type MoveMeta = {
  label: string;
  type: string;
  damageClass: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  generation: number;
};

const MOVES = moveIndex as unknown as Record<string, MoveMeta>;

async function api<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, { next: { revalidate: REVALIDATE } });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

const idFromUrl = (url: string): number => Number(url.split('/').filter(Boolean).pop());

const officialSprite = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

const pixelSprite = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

/* -------------------------------------------------------------------------- */
/* Movimientos                                                                */
/* -------------------------------------------------------------------------- */

const METHOD_MAP: Record<string, MoveLearn['method']> = {
  'level-up': 'level-up',
  machine: 'machine',
  tutor: 'tutor',
  egg: 'egg',
};

/**
 * Normaliza `pokemon.moves` de la API a un mapa version-group -> movimientos.
 * El movepool cambia entre juegos, asi que se preserva cada version-group.
 */
function buildMovesByVersionGroup(raw: any[]): Record<string, MoveLearn[]> {
  const byGroup: Record<string, MoveLearn[]> = {};

  for (const entry of raw) {
    const name: string = entry.move.name;
    const meta = MOVES[name];

    for (const detail of entry.version_group_details) {
      const group: string = detail.version_group.name;
      const move: MoveLearn = {
        name,
        label: meta?.label ?? titleCase(name),
        type: (meta?.type ?? 'normal') as TypeName,
        damageClass: (meta?.damageClass ?? 'status') as MoveLearn['damageClass'],
        power: meta?.power ?? null,
        accuracy: meta?.accuracy ?? null,
        pp: meta?.pp ?? null,
        method: METHOD_MAP[detail.move_learn_method.name] ?? 'other',
        level: detail.level_learned_at ?? 0,
      };
      (byGroup[group] ??= []).push(move);
    }
  }

  // Nivel primero (por nivel asc), despues MT, tutor y huevo; alfabetico dentro de cada bloque.
  const methodOrder: MoveLearn['method'][] = ['level-up', 'machine', 'tutor', 'egg', 'other'];
  for (const group of Object.keys(byGroup)) {
    byGroup[group].sort((a, b) => {
      const byMethod = methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method);
      if (byMethod !== 0) return byMethod;
      if (a.method === 'level-up' && a.level !== b.level) return a.level - b.level;
      return a.label.localeCompare(b.label);
    });
  }

  return byGroup;
}

/* -------------------------------------------------------------------------- */
/* Evoluciones                                                                */
/* -------------------------------------------------------------------------- */

/** Traduce `evolution_details` a una frase corta y legible. */
function describeTrigger(details: any[]): string {
  if (!details?.length) return '';
  const d = details[0];
  const trigger = d.trigger?.name;
  const extras: string[] = [];

  if (d.min_level) extras.push(`Nv. ${d.min_level}`);
  if (d.item?.name) extras.push(titleCase(d.item.name));
  if (d.held_item?.name) extras.push(`con ${titleCase(d.held_item.name)}`);
  if (d.known_move?.name) extras.push(`sabiendo ${titleCase(d.known_move.name)}`);
  if (d.known_move_type?.name) extras.push(`mov. ${titleCase(d.known_move_type.name)}`);
  if (d.min_happiness) extras.push('felicidad alta');
  if (d.min_affection) extras.push('afecto alto');
  if (d.min_beauty) extras.push('belleza alta');
  if (d.time_of_day) extras.push(d.time_of_day === 'day' ? 'de dia' : 'de noche');
  if (d.location?.name) extras.push(`en ${titleCase(d.location.name)}`);
  if (d.gender === 1) extras.push('hembra');
  if (d.gender === 2) extras.push('macho');
  if (d.needs_overworld_rain) extras.push('bajo lluvia');
  if (d.turn_upside_down) extras.push('consola al reves');

  if (trigger === 'trade') extras.unshift('Intercambio');
  else if (trigger === 'use-item' && !d.item?.name) extras.unshift('Objeto');
  else if (trigger === 'shed') extras.unshift('Espacio libre + Poke Ball');
  else if (trigger && trigger !== 'level-up') extras.unshift(titleCase(trigger));

  return extras.join(' - ') || 'Subir de nivel';
}

function buildEvolutionTree(chain: any): EvolutionNode {
  const id = idFromUrl(chain.species.url);
  return {
    id,
    name: chain.species.name,
    label: titleCase(chain.species.name),
    sprite: pixelSprite(id),
    trigger: describeTrigger(chain.evolution_details),
    children: (chain.evolves_to ?? []).map(buildEvolutionTree),
  };
}

/* -------------------------------------------------------------------------- */
/* API publica                                                                */
/* -------------------------------------------------------------------------- */

export async function getPokemonDetail(nameOrId: string): Promise<PokemonDetail | null> {
  const pokemon = await api<any>(`/pokemon/${nameOrId.toLowerCase()}`);
  if (!pokemon) return null;

  const species = await api<any>(`/pokemon-species/${pokemon.species.name}`);

  const stats = Object.fromEntries(
    pokemon.stats.map((s: any) => [s.stat.name, s.base_stat]),
  ) as Record<StatKey, number>;

  const abilities: Ability[] = pokemon.abilities.map((a: any) => ({
    name: a.ability.name,
    label: titleCase(a.ability.name),
    isHidden: a.is_hidden,
    slot: a.slot,
  }));

  const versions = pokemon.sprites.versions ?? {};
  const byGeneration: Record<string, string | null> = {};
  for (const [gen, games] of Object.entries<any>(versions)) {
    for (const game of Object.values<any>(games)) {
      const url = game?.front_default;
      if (url) {
        byGeneration[gen] = url;
        break;
      }
    }
  }

  const movesByVersionGroup = buildMovesByVersionGroup(pokemon.moves);

  let evolution: EvolutionNode | null = null;
  if (species?.evolution_chain?.url) {
    const chain = await api<any>(`/evolution-chain/${idFromUrl(species.evolution_chain.url)}`);
    if (chain) evolution = buildEvolutionTree(chain.chain);
  }

  const flavor =
    species?.flavor_text_entries?.find((e: any) => e.language.name === 'es') ??
    species?.flavor_text_entries?.find((e: any) => e.language.name === 'en');

  const genus =
    species?.genera?.find((g: any) => g.language.name === 'es')?.genus ??
    species?.genera?.find((g: any) => g.language.name === 'en')?.genus ??
    '';

  return {
    id: pokemon.id,
    name: pokemon.name,
    label: titleCase(pokemon.name),
    genus,
    flavorText: (flavor?.flavor_text ?? '').replace(/[\n\f\r]/g, ' '),
    generation: generationForId(species?.id ?? pokemon.id),
    types: pokemon.types
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => t.type.name as TypeName),
    height: pokemon.height,
    weight: pokemon.weight,
    baseExperience: pokemon.base_experience ?? null,
    stats,
    statTotal: Object.values(stats).reduce((a, b) => a + b, 0),
    abilities,
    sprites: {
      pixel: pokemon.sprites.front_default ?? pixelSprite(pokemon.id),
      pixelBack: pokemon.sprites.back_default ?? null,
      shiny: pokemon.sprites.front_shiny ?? null,
      animated: versions?.['generation-v']?.['black-white']?.animated?.front_default ?? null,
      artwork:
        pokemon.sprites.other?.['official-artwork']?.front_default ?? officialSprite(pokemon.id),
      byGeneration,
    },
    movesByVersionGroup,
    versionGroups: Object.keys(movesByVersionGroup),
    evolution,
    speciesName: species?.name ?? pokemon.name,
    varieties: (species?.varieties ?? []).map((v: any) => ({
      name: v.pokemon.name,
      label: titleCase(v.pokemon.name),
      isDefault: v.is_default,
    })),
  };
}

/** Movimientos de un Pokemon en un juego concreto. */
export async function getMovesByVersion(
  nameOrId: string,
  versionGroup: string,
): Promise<MoveLearn[]> {
  const detail = await getPokemonDetail(nameOrId);
  return detail?.movesByVersionGroup[versionGroup] ?? [];
}
