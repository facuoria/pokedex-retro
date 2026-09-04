import type { StatKey, TypeName } from '@/types/pokemon';

/** Colores oficiales de cada tipo, usados en chips, barras y la tabla. */
export const TYPE_COLORS: Record<TypeName, string> = {
  normal: '#9FA19F',
  fire: '#E62829',
  water: '#2980EF',
  electric: '#FAC000',
  grass: '#3FA129',
  ice: '#3FD8FF',
  fighting: '#FF8000',
  poison: '#9141CB',
  ground: '#915121',
  flying: '#81B9EF',
  psychic: '#EF4179',
  bug: '#91A119',
  rock: '#AFA981',
  ghost: '#704170',
  dragon: '#5060E1',
  dark: '#50413F',
  steel: '#60A1B8',
  fairy: '#EF70EF',
};

export const TYPE_LABELS_ES: Record<TypeName, string> = {
  normal: 'Normal',
  fire: 'Fuego',
  water: 'Agua',
  electric: 'Eléctrico',
  grass: 'Planta',
  ice: 'Hielo',
  fighting: 'Lucha',
  poison: 'Veneno',
  ground: 'Tierra',
  flying: 'Volador',
  psychic: 'Psíquico',
  bug: 'Bicho',
  rock: 'Roca',
  ghost: 'Fantasma',
  dragon: 'Dragón',
  dark: 'Siniestro',
  steel: 'Acero',
  fairy: 'Hada',
};

/** Abreviatura de 3 letras para la grilla 18x18. */
export const TYPE_SHORT: Record<TypeName, string> = {
  normal: 'NOR', fire: 'FUE', water: 'AGU', electric: 'ELE', grass: 'PLA', ice: 'HIE',
  fighting: 'LUC', poison: 'VEN', ground: 'TIE', flying: 'VOL', psychic: 'PSI', bug: 'BIC',
  rock: 'ROC', ghost: 'FAN', dragon: 'DRA', dark: 'SIN', steel: 'ACE', fairy: 'HAD',
};

export const STAT_KEYS: StatKey[] = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

export const STAT_LABELS: Record<StatKey, string> = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'At. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidad',
};

export const STAT_COLORS: Record<StatKey, string> = {
  hp: '#FF5959',
  attack: '#F5AC78',
  defense: '#FAE078',
  'special-attack': '#9DB7F5',
  'special-defense': '#A7DB8D',
  speed: '#FA92B2',
};

/** Rango de IDs de la Pokédex nacional por generación. */
export const GENERATIONS: { id: number; label: string; region: string; range: [number, number] }[] = [
  { id: 1, label: 'Gen I', region: 'Kanto', range: [1, 151] },
  { id: 2, label: 'Gen II', region: 'Johto', range: [152, 251] },
  { id: 3, label: 'Gen III', region: 'Hoenn', range: [252, 386] },
  { id: 4, label: 'Gen IV', region: 'Sinnoh', range: [387, 493] },
  { id: 5, label: 'Gen V', region: 'Teselia', range: [494, 649] },
  { id: 6, label: 'Gen VI', region: 'Kalos', range: [650, 721] },
  { id: 7, label: 'Gen VII', region: 'Alola', range: [722, 809] },
  { id: 8, label: 'Gen VIII', region: 'Galar', range: [810, 905] },
  { id: 9, label: 'Gen IX', region: 'Paldea', range: [906, 1025] },
];

export function generationForId(id: number): number {
  for (const gen of GENERATIONS) {
    if (id >= gen.range[0] && id <= gen.range[1]) return gen.id;
  }
  return 9;
}

export const DAMAGE_CLASS_LABELS: Record<string, string> = {
  physical: 'Físico',
  special: 'Especial',
  status: 'Estado',
};

export const METHOD_LABELS: Record<string, string> = {
  'level-up': 'Nivel',
  machine: 'MT/MO',
  tutor: 'Tutor',
  egg: 'Huevo',
  other: 'Otro',
};

/** Convierte "mr-mime" / "red-blue" en algo legible. */
export function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function padId(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}
