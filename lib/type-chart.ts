import { TYPE_NAMES, type TypeName, type Multiplier } from '@/types/pokemon';

type Relations = {
  double: TypeName[];
  half: TypeName[];
  zero: TypeName[];
};

/**
 * Tabla vigente (Gen 6 en adelante). Clave = tipo ATACANTE.
 * Todo lo que no aparece listado es x1.
 */
const MODERN: Record<TypeName, Relations> = {
  normal: { double: [], half: ['rock', 'steel'], zero: ['ghost'] },
  fire: { double: ['grass', 'ice', 'bug', 'steel'], half: ['fire', 'water', 'rock', 'dragon'], zero: [] },
  water: { double: ['fire', 'ground', 'rock'], half: ['water', 'grass', 'dragon'], zero: [] },
  electric: { double: ['water', 'flying'], half: ['electric', 'grass', 'dragon'], zero: ['ground'] },
  grass: {
    double: ['water', 'ground', 'rock'],
    half: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
    zero: [],
  },
  ice: { double: ['grass', 'ground', 'flying', 'dragon'], half: ['fire', 'water', 'ice', 'steel'], zero: [] },
  fighting: {
    double: ['normal', 'ice', 'rock', 'dark', 'steel'],
    half: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
    zero: ['ghost'],
  },
  poison: { double: ['grass', 'fairy'], half: ['poison', 'ground', 'rock', 'ghost'], zero: ['steel'] },
  ground: {
    double: ['fire', 'electric', 'poison', 'rock', 'steel'],
    half: ['grass', 'bug'],
    zero: ['flying'],
  },
  flying: { double: ['grass', 'fighting', 'bug'], half: ['electric', 'rock', 'steel'], zero: [] },
  psychic: { double: ['fighting', 'poison'], half: ['psychic', 'steel'], zero: ['dark'] },
  bug: {
    double: ['grass', 'psychic', 'dark'],
    half: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
    zero: [],
  },
  rock: { double: ['fire', 'ice', 'flying', 'bug'], half: ['fighting', 'ground', 'steel'], zero: [] },
  ghost: { double: ['psychic', 'ghost'], half: ['dark'], zero: ['normal'] },
  dragon: { double: ['dragon'], half: ['steel'], zero: ['fairy'] },
  dark: { double: ['psychic', 'ghost'], half: ['fighting', 'dark', 'fairy'], zero: [] },
  steel: { double: ['ice', 'rock', 'fairy'], half: ['fire', 'water', 'electric', 'steel'], zero: [] },
  fairy: { double: ['fighting', 'dragon', 'dark'], half: ['fire', 'poison', 'steel'], zero: [] },
};

/** Tipos existentes en cada generación. */
export function typesForGeneration(gen: number): TypeName[] {
  if (gen <= 1) return TYPE_NAMES.filter((t) => t !== 'dark' && t !== 'steel' && t !== 'fairy');
  if (gen <= 5) return TYPE_NAMES.filter((t) => t !== 'fairy');
  return [...TYPE_NAMES];
}

/**
 * Excepciones históricas respecto de la tabla moderna.
 * Formato: [atacante, defensor, multiplicador].
 */
const HISTORICAL: Record<number, [TypeName, TypeName, Multiplier][]> = {
  // Gen 1: sin Siniestro/Acero/Hada, y algunas relaciones distintas.
  1: [
    ['poison', 'bug', 2],
    ['bug', 'poison', 2],
    ['ghost', 'psychic', 0],
    ['ice', 'fire', 1], // Fuego todavía no resistía Hielo
  ],
  // Gen 2-5: Acero resistía Fantasma y Siniestro; Hada no existía.
  2: [
    ['ghost', 'steel', 0.5],
    ['dark', 'steel', 0.5],
  ],
};

function overridesFor(gen: number): [TypeName, TypeName, Multiplier][] {
  if (gen <= 1) return HISTORICAL[1];
  if (gen <= 5) return HISTORICAL[2];
  return [];
}

/** Multiplicador de un tipo atacante contra UN tipo defensor, en una generación dada. */
export function getMultiplier(attacker: TypeName, defender: TypeName, generation = 9): Multiplier {
  const available = typesForGeneration(generation);
  if (!available.includes(attacker) || !available.includes(defender)) return 1;

  for (const [a, d, m] of overridesFor(generation)) {
    if (a === attacker && d === defender) return m;
  }

  const rel = MODERN[attacker];
  if (rel.zero.includes(defender)) return 0;
  if (rel.double.includes(defender)) return 2;
  if (rel.half.includes(defender)) return 0.5;
  return 1;
}

/** Matriz completa atacante -> defensor -> multiplicador. */
export function getTypeChart(generation = 9): Record<TypeName, Record<TypeName, Multiplier>> {
  const types = typesForGeneration(generation);
  const chart = {} as Record<TypeName, Record<TypeName, Multiplier>>;
  for (const attacker of types) {
    chart[attacker] = {} as Record<TypeName, Multiplier>;
    for (const defender of types) {
      chart[attacker][defender] = getMultiplier(attacker, defender, generation);
    }
  }
  return chart;
}

/**
 * Defensa combinada: multiplica las relaciones de todos los tipos del Pokémon.
 * Devuelve, para CADA tipo atacante, el multiplicador de daño recibido.
 */
export function getDefensiveProfile(
  defenderTypes: TypeName[],
  generation = 9,
): Record<TypeName, Multiplier> {
  const types = typesForGeneration(generation);
  const defenders = Array.from(new Set(defenderTypes)).filter((t) => types.includes(t));
  const profile = {} as Record<TypeName, Multiplier>;

  for (const attacker of types) {
    let value = 1;
    for (const defender of defenders) {
      value *= getMultiplier(attacker, defender, generation);
    }
    profile[attacker] = value as Multiplier;
  }
  return profile;
}

export interface EffectivenessGroups {
  x4: TypeName[];
  x2: TypeName[];
  x1: TypeName[];
  x05: TypeName[];
  x025: TypeName[];
  x0: TypeName[];
}

/** Agrupa el perfil defensivo en los buckets que muestra la UI. */
export function groupEffectiveness(profile: Record<TypeName, Multiplier>): EffectivenessGroups {
  const groups: EffectivenessGroups = { x4: [], x2: [], x1: [], x05: [], x025: [], x0: [] };
  for (const type of Object.keys(profile) as TypeName[]) {
    const value = profile[type];
    if (value === 4) groups.x4.push(type);
    else if (value === 2) groups.x2.push(type);
    else if (value === 0.5) groups.x05.push(type);
    else if (value === 0.25) groups.x025.push(type);
    else if (value === 0) groups.x0.push(type);
    else groups.x1.push(type);
  }
  return groups;
}

/** Contra qué tipos pega fuerte / flojo un tipo atacante. */
export function getOffensiveProfile(attacker: TypeName, generation = 9): Record<TypeName, Multiplier> {
  const profile = {} as Record<TypeName, Multiplier>;
  for (const defender of typesForGeneration(generation)) {
    profile[defender] = getMultiplier(attacker, defender, generation);
  }
  return profile;
}

export function formatMultiplier(value: Multiplier): string {
  if (value === 0) return '×0';
  if (value === 0.25) return '×¼';
  if (value === 0.5) return '×½';
  return `×${value}`;
}
