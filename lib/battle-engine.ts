/**
 * Motor de combate 1 vs 1. Modulo puro y testeable: no importa React ni toca la
 * red, y toda la aleatoriedad entra por el parametro `rng` para poder fijarla en
 * los tests.
 *
 * SIMPLIFICACIONES respecto de los juegos originales (deliberadas, v1):
 * - IVs 31, EVs 0 y naturaleza neutra para ambos Pokemon.
 * - Sin objetos, clima, terreno ni cambio de Pokemon.
 * - Sin estados alterados (paralisis, quemadura, sueno...) ni efectos
 *   secundarios: los movimientos de estado se anuncian pero no hacen nada.
 * - Sin PP: los movimientos se pueden usar sin limite.
 * - Sin precision: todos los movimientos aciertan.
 */
import { getMultiplier } from '@/lib/type-chart';
import type { MoveLearn, StatKey, TypeName } from '@/types/pokemon';

/** Valores fijos de la simulacion. */
export const BATTLE_ASSUMPTIONS = {
  iv: 31,
  ev: 0,
  nature: 1,
  critChance: 1 / 16,
  critMultiplier: 1.5,
  stab: 1.5,
} as const;

export type Side = 'player' | 'rival';

export interface BattleMove {
  name: string;
  label: string;
  type: TypeName;
  damageClass: MoveLearn['damageClass'];
  power: number | null;
  accuracy: number | null;
  level: number;
}

export interface Fighter {
  id: number;
  name: string;
  label: string;
  types: TypeName[];
  level: number;
  /** Stats base tal cual vienen de la Pokedex. */
  baseStats: Record<StatKey, number>;
  /** Stats ya calculadas para el nivel elegido. */
  stats: Record<StatKey, number>;
  maxHp: number;
  currentHp: number;
  moves: BattleMove[];
  sprites: { front: string | null; back: string | null };
}

/** Cuando un Pokemon no aprende ningun movimiento al nivel elegido. */
export const STRUGGLE: BattleMove = {
  name: 'struggle',
  label: 'Forcejeo',
  type: 'normal',
  damageClass: 'physical',
  power: 50,
  accuracy: 100,
  level: 1,
};

/* -------------------------------------------------------------------------- */
/* Estadisticas                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Formula estandar de stats con IV 31, EV 0 y naturaleza neutra.
 * HP lleva un termino aparte.
 */
export function calculateStat(base: number, level: number, isHp: boolean): number {
  const core = Math.floor(((2 * base + BATTLE_ASSUMPTIONS.iv) * level) / 100);
  return isHp ? core + level + 10 : core + 5;
}

export function calculateAllStats(
  baseStats: Record<StatKey, number>,
  level: number,
): Record<StatKey, number> {
  return {
    hp: calculateStat(baseStats.hp, level, true),
    attack: calculateStat(baseStats.attack, level, false),
    defense: calculateStat(baseStats.defense, level, false),
    'special-attack': calculateStat(baseStats['special-attack'], level, false),
    'special-defense': calculateStat(baseStats['special-defense'], level, false),
    speed: calculateStat(baseStats.speed, level, false),
  };
}

/** Arma un combatiente listo para pelear a partir de los datos de la Pokedex. */
export function createFighter(input: {
  id: number;
  name: string;
  label: string;
  types: TypeName[];
  baseStats: Record<StatKey, number>;
  level: number;
  moves: BattleMove[];
  sprites: { front: string | null; back: string | null };
}): Fighter {
  const stats = calculateAllStats(input.baseStats, input.level);
  return {
    ...input,
    stats,
    maxHp: stats.hp,
    currentHp: stats.hp,
    moves: input.moves.length > 0 ? input.moves : [STRUGGLE],
  };
}

/**
 * Movimientos disponibles a cierto nivel: los aprendidos por nivel hasta ese
 * punto, quedandose con los 4 mas recientes (como en los juegos).
 */
export function selectMovesForLevel(moves: MoveLearn[], level: number, limit = 4): BattleMove[] {
  const learned = moves
    .filter((move) => move.method === 'level-up' && move.level <= level)
    .map((move) => ({
      name: move.name,
      label: move.label,
      type: move.type,
      damageClass: move.damageClass,
      power: move.power,
      accuracy: move.accuracy,
      level: move.level,
    }));

  // Sin duplicados: un movimiento puede figurar varias veces en un version-group.
  const unique = new Map<string, BattleMove>();
  for (const move of learned) {
    const previous = unique.get(move.name);
    if (!previous || move.level > previous.level) unique.set(move.name, move);
  }

  return [...unique.values()]
    .sort((a, b) => a.level - b.level || a.label.localeCompare(b.label))
    .slice(-limit);
}

/* -------------------------------------------------------------------------- */
/* Daño                                                                       */
/* -------------------------------------------------------------------------- */

/** Multiplicador de tipo del movimiento contra el defensor (combina ambos tipos). */
export function typeEffectiveness(
  moveType: TypeName,
  defenderTypes: TypeName[],
  generation = 9,
): number {
  return Array.from(new Set(defenderTypes)).reduce(
    (acc, type) => acc * getMultiplier(moveType, type, generation),
    1,
  );
}

export interface DamageResult {
  damage: number;
  effectiveness: number;
  critical: boolean;
  stab: boolean;
}

/**
 * Formula de daño simplificada:
 *   (((2*Nivel/5 + 2) * Poder * (Ataque/Defensa)) / 50 + 2)
 *   * STAB * Efectividad * Random(0.85-1) * Critico
 */
export function calculateDamage(
  attacker: Fighter,
  defender: Fighter,
  move: BattleMove,
  rng: () => number = Math.random,
  generation = 9,
): DamageResult {
  const effectiveness = typeEffectiveness(move.type, defender.types, generation);

  // Los movimientos de estado no hacen daño en esta version.
  if (move.damageClass === 'status' || !move.power) {
    return { damage: 0, effectiveness, critical: false, stab: false };
  }

  if (effectiveness === 0) {
    return { damage: 0, effectiveness: 0, critical: false, stab: false };
  }

  const isPhysical = move.damageClass === 'physical';
  const attack = isPhysical ? attacker.stats.attack : attacker.stats['special-attack'];
  const defense = isPhysical ? defender.stats.defense : defender.stats['special-defense'];

  const base =
    ((2 * attacker.level) / 5 + 2) * move.power * (attack / defense) / 50 + 2;

  const stab = attacker.types.includes(move.type);
  const critical = rng() < BATTLE_ASSUMPTIONS.critChance;
  const spread = 0.85 + rng() * 0.15;

  const damage =
    base *
    (stab ? BATTLE_ASSUMPTIONS.stab : 1) *
    effectiveness *
    spread *
    (critical ? BATTLE_ASSUMPTIONS.critMultiplier : 1);

  // Un ataque que conecta siempre quita al menos 1 HP.
  return { damage: Math.max(1, Math.floor(damage)), effectiveness, critical, stab };
}

/* -------------------------------------------------------------------------- */
/* IA                                                                         */
/* -------------------------------------------------------------------------- */

/** Peso de cada movimiento segun lo bien que le venga contra el rival. */
export function moveWeight(move: BattleMove, defenderTypes: TypeName[], generation = 9): number {
  if (move.damageClass === 'status' || !move.power) return 0.2;

  const effectiveness = typeEffectiveness(move.type, defenderTypes, generation);
  if (effectiveness === 0) return 0.01;
  if (effectiveness >= 4) return 5;
  if (effectiveness === 2) return 3;
  if (effectiveness === 1) return 1;
  return 0.3; // x1/2 y x1/4
}

/**
 * La IA elige al azar pero ponderando por efectividad: prioriza lo super eficaz
 * sin ser totalmente predecible.
 */
export function chooseAiMove(
  attacker: Fighter,
  defender: Fighter,
  rng: () => number = Math.random,
  generation = 9,
): BattleMove {
  const moves = attacker.moves.length > 0 ? attacker.moves : [STRUGGLE];
  const weights = moves.map((move) => moveWeight(move, defender.types, generation));
  const total = weights.reduce((a, b) => a + b, 0);

  if (total <= 0) return moves[Math.floor(rng() * moves.length)] ?? moves[0];

  let roll = rng() * total;
  for (let i = 0; i < moves.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return moves[i];
  }
  return moves[moves.length - 1];
}

/* -------------------------------------------------------------------------- */
/* Turnos                                                                     */
/* -------------------------------------------------------------------------- */

/** Ataca primero el mas rapido; si empatan, se sortea. */
export function determineOrder(
  player: Fighter,
  rival: Fighter,
  rng: () => number = Math.random,
): Side[] {
  if (player.stats.speed > rival.stats.speed) return ['player', 'rival'];
  if (player.stats.speed < rival.stats.speed) return ['rival', 'player'];
  return rng() < 0.5 ? ['player', 'rival'] : ['rival', 'player'];
}

export type BattleEvent =
  | { kind: 'message'; text: string }
  | { kind: 'damage'; side: Side; amount: number; hpAfter: number }
  | { kind: 'faint'; side: Side }
  | { kind: 'end'; winner: Side };

export interface TurnResult {
  events: BattleEvent[];
  player: Fighter;
  rival: Fighter;
  winner: Side | null;
}

/** Mensajes clasicos segun el multiplicador de tipo. */
export function effectivenessMessage(effectiveness: number): string | null {
  if (effectiveness === 0) return 'No afecta al rival...';
  if (effectiveness > 1) return '¡Fue muy eficaz!';
  if (effectiveness < 1) return 'No es muy eficaz...';
  return null;
}

function applyMove(
  attackerSide: Side,
  attacker: Fighter,
  defender: Fighter,
  move: BattleMove,
  rng: () => number,
  generation: number,
): { defender: Fighter; events: BattleEvent[]; fainted: boolean } {
  const events: BattleEvent[] = [{ kind: 'message', text: `${attacker.label} usó ${move.label}.` }];
  const result = calculateDamage(attacker, defender, move, rng, generation);

  if (move.damageClass === 'status') {
    events.push({
      kind: 'message',
      text: 'Pero en esta simulación los movimientos de estado no tienen efecto.',
    });
    return { defender, events, fainted: false };
  }

  const hpAfter = Math.max(0, defender.currentHp - result.damage);
  const defenderSide: Side = attackerSide === 'player' ? 'rival' : 'player';

  if (result.critical && result.damage > 0) {
    events.push({ kind: 'message', text: '¡Un golpe crítico!' });
  }

  const message = effectivenessMessage(result.effectiveness);
  if (message) events.push({ kind: 'message', text: message });

  events.push({ kind: 'damage', side: defenderSide, amount: result.damage, hpAfter });

  const updated = { ...defender, currentHp: hpAfter };
  const fainted = hpAfter === 0;
  if (fainted) {
    events.push({ kind: 'message', text: `¡${defender.label} se debilitó!` });
    events.push({ kind: 'faint', side: defenderSide });
  }

  return { defender: updated, events, fainted };
}

/**
 * Resuelve un turno completo: ambos atacan en orden de velocidad, salvo que uno
 * se debilite antes.
 */
export function resolveTurn(
  player: Fighter,
  rival: Fighter,
  playerMove: BattleMove,
  rng: () => number = Math.random,
  generation = 9,
): TurnResult {
  const rivalMove = chooseAiMove(rival, player, rng, generation);
  const order = determineOrder(player, rival, rng);

  let currentPlayer = player;
  let currentRival = rival;
  const events: BattleEvent[] = [];
  let winner: Side | null = null;

  for (const side of order) {
    if (winner) break;

    if (side === 'player') {
      const result = applyMove('player', currentPlayer, currentRival, playerMove, rng, generation);
      currentRival = result.defender;
      events.push(...result.events);
      if (result.fainted) winner = 'player';
    } else {
      const result = applyMove('rival', currentRival, currentPlayer, rivalMove, rng, generation);
      currentPlayer = result.defender;
      events.push(...result.events);
      if (result.fainted) winner = 'rival';
    }
  }

  if (winner) events.push({ kind: 'end', winner });

  return { events, player: currentPlayer, rival: currentRival, winner };
}
