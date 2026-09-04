import { describe, expect, it } from 'vitest';
import {
  calculateAllStats,
  calculateDamage,
  calculateStat,
  chooseAiMove,
  createFighter,
  determineOrder,
  moveWeight,
  resolveTurn,
  selectMovesForLevel,
  typeEffectiveness,
  type BattleMove,
} from '../battle-engine';
import type { MoveLearn, StatKey, TypeName } from '@/types/pokemon';

const baseStats = (
  hp: number,
  atk: number,
  def: number,
  spa: number,
  spd: number,
  spe: number,
): Record<StatKey, number> => ({
  hp,
  attack: atk,
  defense: def,
  'special-attack': spa,
  'special-defense': spd,
  speed: spe,
});

const move = (partial: Partial<BattleMove>): BattleMove => ({
  name: 'tackle',
  label: 'Placaje',
  type: 'normal',
  damageClass: 'physical',
  power: 40,
  accuracy: 100,
  level: 1,
  ...partial,
});

function fighter(
  label: string,
  types: TypeName[],
  stats: Record<StatKey, number>,
  level = 50,
  moves: BattleMove[] = [move({})],
) {
  return createFighter({
    id: 1,
    name: label.toLowerCase(),
    label,
    types,
    baseStats: stats,
    level,
    moves,
    sprites: { front: null, back: null },
  });
}

/** RNG determinista: devuelve los valores en orden y despues repite el ultimo. */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('calculo de estadisticas', () => {
  it('coincide con la formula oficial para Garchomp nivel 78', () => {
    // Caso de referencia de Bulbapedia: con 74 EVs da 289; sin EVs (que es lo
    // que asume esta simulacion) da 280.
    expect(calculateStat(108, 78, true)).toBe(280);
  });

  it('el HP usa un termino distinto al resto de las stats', () => {
    // Pikachu base 35 HP / 55 ataque a nivel 50.
    expect(calculateStat(35, 50, true)).toBe(110);
    expect(calculateStat(55, 50, false)).toBe(75);
  });

  it('a nivel 1 las stats son minimas pero validas', () => {
    const stats = calculateAllStats(baseStats(45, 49, 49, 65, 65, 45), 1);
    expect(stats.hp).toBeGreaterThan(0);
    expect(stats.attack).toBeGreaterThanOrEqual(5);
  });

  it('createFighter arranca con el HP al maximo', () => {
    const bulbasaur = fighter('Bulbasaur', ['grass', 'poison'], baseStats(45, 49, 49, 65, 65, 45));
    expect(bulbasaur.currentHp).toBe(bulbasaur.maxHp);
    expect(bulbasaur.maxHp).toBe(calculateStat(45, 50, true));
  });
});

describe('movimientos por nivel', () => {
  const pool: MoveLearn[] = [
    { name: 'a', label: 'A', type: 'normal', damageClass: 'physical', power: 40, accuracy: 100, pp: 35, method: 'level-up', level: 1 },
    { name: 'b', label: 'B', type: 'normal', damageClass: 'status', power: null, accuracy: 100, pp: 30, method: 'level-up', level: 7 },
    { name: 'c', label: 'C', type: 'fire', damageClass: 'special', power: 60, accuracy: 100, pp: 25, method: 'level-up', level: 13 },
    { name: 'd', label: 'D', type: 'fire', damageClass: 'special', power: 90, accuracy: 100, pp: 15, method: 'level-up', level: 25 },
    { name: 'e', label: 'E', type: 'flying', damageClass: 'physical', power: 60, accuracy: 100, pp: 20, method: 'level-up', level: 40 },
    { name: 'mt', label: 'MT', type: 'water', damageClass: 'special', power: 80, accuracy: 100, pp: 15, method: 'machine', level: 0 },
  ];

  it('solo incluye lo aprendido por nivel hasta el nivel elegido', () => {
    const moves = selectMovesForLevel(pool, 13);
    expect(moves.map((m) => m.name)).toEqual(['a', 'b', 'c']);
  });

  it('excluye MT, tutor y huevo', () => {
    expect(selectMovesForLevel(pool, 100).some((m) => m.name === 'mt')).toBe(false);
  });

  it('se queda con los 4 mas recientes', () => {
    const moves = selectMovesForLevel(pool, 100);
    expect(moves).toHaveLength(4);
    expect(moves.map((m) => m.name)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('sin movimientos disponibles, el combatiente recibe Forcejeo', () => {
    const empty = fighter('Magikarp', ['water'], baseStats(20, 10, 55, 15, 20, 80), 50, []);
    expect(empty.moves).toHaveLength(1);
    expect(empty.moves[0].name).toBe('struggle');
  });
});

describe('efectividad de tipos', () => {
  it('combina ambos tipos del defensor', () => {
    expect(typeEffectiveness('rock', ['fire', 'flying'])).toBe(4);
    expect(typeEffectiveness('ground', ['fire', 'flying'])).toBe(0);
    expect(typeEffectiveness('electric', ['water'])).toBe(2);
  });

  it('respeta la generacion elegida', () => {
    expect(typeEffectiveness('ghost', ['psychic'], 1)).toBe(0);
    expect(typeEffectiveness('ghost', ['psychic'], 9)).toBe(2);
  });
});

describe('calculo de daño', () => {
  const attacker = fighter('Charizard', ['fire', 'flying'], baseStats(78, 84, 78, 109, 85, 100));
  const defender = fighter('Venusaur', ['grass', 'poison'], baseStats(80, 82, 83, 100, 100, 80));

  // rng: primer valor -> critico, segundo -> spread.
  const noCrit = seq([0.9, 1]);

  it('el daño es positivo y determinista con un rng fijo', () => {
    const flamethrower = move({ name: 'flamethrower', label: 'Lanzallamas', type: 'fire', damageClass: 'special', power: 90 });
    const result = calculateDamage(attacker, defender, flamethrower, noCrit);
    expect(result.damage).toBeGreaterThan(0);
    expect(result.effectiveness).toBe(2);
    expect(result.stab).toBe(true);
    expect(result.critical).toBe(false);
  });

  it('STAB aumenta el daño un 50%', () => {
    const fireMove = move({ type: 'fire', damageClass: 'special', power: 90 });
    const conStab = calculateDamage(attacker, defender, fireMove, seq([0.9, 1]));
    const sinStab = calculateDamage(
      { ...attacker, types: ['water'] },
      defender,
      fireMove,
      seq([0.9, 1]),
    );
    expect(conStab.damage / sinStab.damage).toBeCloseTo(1.5, 1);
  });

  it('un golpe critico pega mas fuerte', () => {
    const fireMove = move({ type: 'fire', damageClass: 'special', power: 90 });
    const critico = calculateDamage(attacker, defender, fireMove, seq([0.01, 1]));
    const normal = calculateDamage(attacker, defender, fireMove, seq([0.9, 1]));
    expect(critico.critical).toBe(true);
    expect(critico.damage).toBeGreaterThan(normal.damage);
  });

  it('la inmunidad deja el daño en cero', () => {
    const earthquake = move({ type: 'ground', damageClass: 'physical', power: 100 });
    const result = calculateDamage(defender, attacker, earthquake, noCrit);
    expect(result.damage).toBe(0);
    expect(result.effectiveness).toBe(0);
  });

  it('los movimientos de estado no hacen daño', () => {
    const growl = move({ type: 'normal', damageClass: 'status', power: null });
    expect(calculateDamage(attacker, defender, growl, noCrit).damage).toBe(0);
  });

  it('usa ataque fisico o especial segun la categoria', () => {
    const glass = fighter('Alakazam', ['psychic'], baseStats(55, 50, 45, 135, 95, 120));
    const target = fighter('Snorlax', ['normal'], baseStats(160, 110, 65, 65, 110, 30));
    const fisico = move({ type: 'normal', damageClass: 'physical', power: 80 });
    const especial = move({ type: 'normal', damageClass: 'special', power: 80 });
    const dFisico = calculateDamage(glass, target, fisico, seq([0.9, 1]));
    const dEspecial = calculateDamage(glass, target, especial, seq([0.9, 1]));
    // Alakazam tiene mucho mas ataque especial que fisico.
    expect(dEspecial.damage).toBeGreaterThan(dFisico.damage);
  });

  it('un ataque que conecta siempre quita al menos 1 HP', () => {
    const weak = fighter('Caterpie', ['bug'], baseStats(45, 30, 35, 20, 20, 45), 1);
    const tank = fighter('Steelix', ['steel', 'ground'], baseStats(75, 85, 200, 55, 65, 30), 100);
    const result = calculateDamage(weak, tank, move({ power: 10 }), seq([0.9, 0.85]));
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });
});

describe('IA', () => {
  const player = fighter('Venusaur', ['grass', 'poison'], baseStats(80, 82, 83, 100, 100, 80));

  it('pondera mas alto lo super eficaz', () => {
    const fire = move({ type: 'fire', damageClass: 'special', power: 90 });
    const water = move({ type: 'water', damageClass: 'special', power: 90 });
    const ground = move({ type: 'ground', damageClass: 'physical', power: 90 });
    const ice = move({ type: 'ice', damageClass: 'special', power: 90 });

    // Venusaur es planta/veneno: fuego x2, agua x1/2, tierra x1 (0.5 * 2).
    expect(moveWeight(fire, player.types)).toBe(3);
    expect(moveWeight(ground, player.types)).toBe(1);
    expect(moveWeight(water, player.types)).toBe(0.3);

    // Torterra es planta/tierra: hielo pega x4 y se lleva el peso maximo.
    expect(moveWeight(ice, ['grass', 'ground'])).toBe(5);
  });

  it('casi descarta lo que no hace efecto y castiga los de estado', () => {
    const ghost = move({ type: 'normal', damageClass: 'physical', power: 80 });
    expect(moveWeight(ghost, ['ghost'])).toBe(0.01);
    expect(moveWeight(move({ damageClass: 'status', power: null }), ['normal'])).toBe(0.2);
  });

  it('elige cada movimiento en proporcion a su peso', () => {
    const torterra = fighter('Torterra', ['grass', 'ground'], baseStats(95, 109, 105, 75, 85, 56));
    const iceBeam = move({ name: 'ice-beam', label: 'Rayo Hielo', type: 'ice', damageClass: 'special', power: 90 });
    const rockSlide = move({ name: 'rock-slide', label: 'Avalancha', type: 'rock', power: 75 });
    const rival = fighter('Articuno', ['ice', 'flying'], baseStats(90, 85, 100, 95, 125, 85), 50, [
      rockSlide,
      iceBeam,
    ]);

    const pesoHielo = moveWeight(iceBeam, torterra.types);
    const pesoRoca = moveWeight(rockSlide, torterra.types);
    const esperado = pesoHielo / (pesoHielo + pesoRoca);

    let superEficaz = 0;
    const tiradas = 2000;
    for (let i = 0; i < tiradas; i += 1) {
      if (chooseAiMove(rival, torterra).name === 'ice-beam') superEficaz += 1;
    }

    // La frecuencia observada debe seguir a los pesos, con margen de muestreo.
    expect(superEficaz / tiradas).toBeCloseTo(esperado, 1);
    // Y el super eficaz tiene que dominar claramente al poco eficaz.
    expect(pesoHielo).toBeGreaterThan(pesoRoca * 5);
  });

  it('nunca devuelve undefined aunque todos los pesos sean minimos', () => {
    const rival = fighter('Ghost', ['ghost'], baseStats(50, 50, 50, 50, 50, 50), 50, [
      move({ name: 'tackle', type: 'normal', power: 40 }),
    ]);
    const target = fighter('Gengar', ['ghost', 'poison'], baseStats(60, 65, 60, 130, 75, 110));
    expect(chooseAiMove(rival, target, seq([0.5])).name).toBe('tackle');
  });
});

describe('orden de turno', () => {
  const fast = fighter('Jolteon', ['electric'], baseStats(65, 65, 60, 110, 95, 130));
  const slow = fighter('Snorlax', ['normal'], baseStats(160, 110, 65, 65, 110, 30));

  it('ataca primero el mas rapido', () => {
    expect(determineOrder(fast, slow, seq([0.9]))[0]).toBe('player');
    expect(determineOrder(slow, fast, seq([0.9]))[0]).toBe('rival');
  });

  it('en empate desempata el azar', () => {
    const a = fighter('A', ['normal'], baseStats(60, 60, 60, 60, 60, 60));
    const b = fighter('B', ['normal'], baseStats(60, 60, 60, 60, 60, 60));
    expect(determineOrder(a, b, seq([0.2]))[0]).toBe('player');
    expect(determineOrder(a, b, seq([0.8]))[0]).toBe('rival');
  });
});

describe('resolucion de turnos', () => {
  it('resta HP al defensor y genera los eventos del turno', () => {
    const player = fighter('Charizard', ['fire', 'flying'], baseStats(78, 84, 78, 109, 85, 100), 50, [
      move({ name: 'flamethrower', label: 'Lanzallamas', type: 'fire', damageClass: 'special', power: 90 }),
    ]);
    const rival = fighter('Venusaur', ['grass', 'poison'], baseStats(80, 82, 83, 100, 100, 80), 50, [
      move({ name: 'vine-whip', label: 'Latigo Cepa', type: 'grass', power: 45 }),
    ]);

    const result = resolveTurn(player, rival, player.moves[0], seq([0.9, 1]));

    expect(result.rival.currentHp).toBeLessThan(rival.maxHp);
    expect(result.events.some((e) => e.kind === 'message' && e.text.includes('Lanzallamas'))).toBe(true);
    expect(result.events.some((e) => e.kind === 'damage')).toBe(true);
  });

  it('el combate termina cuando un Pokemon llega a 0 HP', () => {
    const strong = fighter('Groudon', ['ground'], baseStats(100, 150, 140, 100, 90, 90), 100, [
      move({ name: 'eq', label: 'Terremoto', type: 'ground', power: 100 }),
    ]);
    const frail = fighter('Caterpie', ['bug'], baseStats(45, 30, 35, 20, 20, 45), 1, [
      move({ name: 'tackle', label: 'Placaje', power: 40 }),
    ]);

    const result = resolveTurn(strong, frail, strong.moves[0], seq([0.9, 1]));

    expect(result.winner).toBe('player');
    expect(result.rival.currentHp).toBe(0);
    expect(result.events.some((e) => e.kind === 'faint')).toBe(true);
    expect(result.events.at(-1)).toEqual({ kind: 'end', winner: 'player' });
  });

  it('si el defensor cae primero, el que se debilito no llega a atacar', () => {
    const fastKiller = fighter('Deoxys', ['psychic'], baseStats(50, 180, 20, 180, 20, 180), 100, [
      move({ name: 'psychic', label: 'Psiquico', type: 'psychic', damageClass: 'special', power: 90 }),
    ]);
    const doomed = fighter('Caterpie', ['bug'], baseStats(45, 30, 35, 20, 20, 45), 1, [
      move({ name: 'tackle', label: 'Placaje', power: 40 }),
    ]);

    const result = resolveTurn(fastKiller, doomed, fastKiller.moves[0], seq([0.9, 1]));

    expect(result.winner).toBe('player');
    expect(result.player.currentHp).toBe(fastKiller.maxHp); // no recibio daño
  });

  it('no muta los combatientes originales', () => {
    const player = fighter('A', ['normal'], baseStats(60, 60, 60, 60, 60, 60));
    const rival = fighter('B', ['normal'], baseStats(60, 60, 60, 60, 60, 60));
    const hpAntes = rival.currentHp;
    resolveTurn(player, rival, player.moves[0], seq([0.9, 1]));
    expect(rival.currentHp).toBe(hpAntes);
  });
});
