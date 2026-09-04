import { describe, expect, it } from 'vitest';
import {
  getDefensiveProfile,
  getMultiplier,
  getTypeChart,
  groupEffectiveness,
  typesForGeneration,
} from '../type-chart';
import { TYPE_NAMES } from '@/types/pokemon';

describe('getMultiplier (Gen 9)', () => {
  it('resuelve relaciones simples', () => {
    expect(getMultiplier('fire', 'grass')).toBe(2);
    expect(getMultiplier('water', 'fire')).toBe(2);
    expect(getMultiplier('fire', 'water')).toBe(0.5);
    expect(getMultiplier('normal', 'normal')).toBe(1);
  });

  it('resuelve inmunidades', () => {
    expect(getMultiplier('normal', 'ghost')).toBe(0);
    expect(getMultiplier('ghost', 'normal')).toBe(0);
    expect(getMultiplier('electric', 'ground')).toBe(0);
    expect(getMultiplier('dragon', 'fairy')).toBe(0);
    expect(getMultiplier('poison', 'steel')).toBe(0);
    expect(getMultiplier('fighting', 'ghost')).toBe(0);
    expect(getMultiplier('psychic', 'dark')).toBe(0);
    expect(getMultiplier('ground', 'flying')).toBe(0);
  });

  it('la tabla es de 18x18 y todos los valores son válidos', () => {
    const chart = getTypeChart(9);
    expect(Object.keys(chart)).toHaveLength(18);
    for (const attacker of TYPE_NAMES) {
      expect(Object.keys(chart[attacker])).toHaveLength(18);
      for (const defender of TYPE_NAMES) {
        expect([0, 0.5, 1, 2]).toContain(chart[attacker][defender]);
      }
    }
  });
});

describe('tipos duales', () => {
  it('Charizard (fire/flying) es x4 a roca y x0 a tierra', () => {
    const profile = getDefensiveProfile(['fire', 'flying']);
    expect(profile.rock).toBe(4);
    expect(profile.ground).toBe(0);
    expect(profile.grass).toBe(0.25);
    expect(profile.bug).toBe(0.25);
    expect(profile.water).toBe(2);
  });

  it('Skarmory (steel/flying): x2 a fuego y x2 a electricidad', () => {
    const profile = getDefensiveProfile(['steel', 'flying']);
    expect(profile.fire).toBe(2);
    expect(profile.electric).toBe(2); // acero no resiste eléctrico, volador sí lo sufre
    expect(profile.poison).toBe(0);
    expect(profile.ground).toBe(0);
    expect(profile.grass).toBe(0.25);
    expect(profile.bug).toBe(0.25);
  });

  it('Scizor (bug/steel) es x4 a fuego', () => {
    expect(getDefensiveProfile(['bug', 'steel']).fire).toBe(4);
  });

  it('Sableye (ghost/dark) no tiene debilidades antes de Hada', () => {
    const gen5 = getDefensiveProfile(['ghost', 'dark'], 5);
    expect(Object.values(gen5).every((v) => v <= 1)).toBe(true);

    const gen6 = getDefensiveProfile(['ghost', 'dark'], 6);
    expect(gen6.fairy).toBe(2);
  });

  it('un tipo repetido no duplica el multiplicador', () => {
    expect(getDefensiveProfile(['fire', 'fire']).water).toBe(2);
  });

  it('agrupa correctamente en buckets', () => {
    const groups = groupEffectiveness(getDefensiveProfile(['fire', 'flying']));
    expect(groups.x4).toEqual(['rock']);
    expect(groups.x0).toEqual(['ground']);
    expect(groups.x025.sort()).toEqual(['bug', 'grass']);
  });
});

describe('variaciones históricas', () => {
  it('Gen 1 no tiene Siniestro, Acero ni Hada', () => {
    const gen1 = typesForGeneration(1);
    expect(gen1).toHaveLength(15);
    expect(gen1).not.toContain('dark');
    expect(getTypeChart(1).fire.grass).toBe(2);
  });

  it('Gen 1: Fantasma no afecta a Psíquico y Bicho/Veneno se pegan x2', () => {
    expect(getMultiplier('ghost', 'psychic', 1)).toBe(0);
    expect(getMultiplier('ghost', 'psychic', 9)).toBe(2);
    expect(getMultiplier('bug', 'poison', 1)).toBe(2);
    expect(getMultiplier('poison', 'bug', 1)).toBe(2);
    expect(getMultiplier('ice', 'fire', 1)).toBe(1);
    expect(getMultiplier('ice', 'fire', 2)).toBe(0.5);
  });

  it('Gen 2-5: Acero resiste Fantasma y Siniestro', () => {
    expect(getMultiplier('ghost', 'steel', 5)).toBe(0.5);
    expect(getMultiplier('dark', 'steel', 5)).toBe(0.5);
    expect(getMultiplier('ghost', 'steel', 6)).toBe(1);
    expect(getMultiplier('dark', 'steel', 6)).toBe(1);
  });

  it('Hada sólo existe desde Gen 6', () => {
    expect(typesForGeneration(5)).not.toContain('fairy');
    expect(typesForGeneration(6)).toContain('fairy');
    expect(getMultiplier('fairy', 'dragon', 5)).toBe(1);
    expect(getMultiplier('fairy', 'dragon', 6)).toBe(2);
  });
});
