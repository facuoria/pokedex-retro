/**
 * Genera el índice liviano de la Pokédex (data/pokedex-index.json) y el catálogo
 * de version-groups (data/version-groups.json) pegándole una sola vez a PokeAPI.
 *
 *   npm run seed
 *
 * De esta forma el buscador, el grid y los filtros del home no dependen de N
 * llamadas a la API en cada carga: se sirven desde un JSON estático.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://pokeapi.co/api/v2';
const MAX_ID = 1025; // hasta Paldea (sin formas alternativas)
const CONCURRENCY = 12;
const OUT_DIR = path.join(process.cwd(), 'data');

const GEN_RANGES = [
  [1, 1, 151], [2, 152, 251], [3, 252, 386], [4, 387, 493], [5, 494, 649],
  [6, 650, 721], [7, 722, 809], [8, 810, 905], [9, 906, 1025],
];

const generationForId = (id) => GEN_RANGES.find(([, lo, hi]) => id >= lo && id <= hi)?.[0] ?? 9;

const titleCase = (slug) =>
  slug.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

async function getJson(url, attempt = 0) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.json();
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return getJson(url, attempt + 1);
  }
}

/** Ejecuta `worker` sobre `items` con concurrencia limitada. */
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

async function buildPokemonIndex() {
  const ids = Array.from({ length: MAX_ID }, (_, i) => i + 1);
  let done = 0;

  const entries = await pool(ids, CONCURRENCY, async (id) => {
    const data = await getJson(`${API}/pokemon/${id}`);
    done += 1;
    if (done % 100 === 0) process.stdout.write(`  ${done}/${MAX_ID}\n`);

    const statMap = Object.fromEntries(data.stats.map((s) => [s.stat.name, s.base_stat]));
    const stats = STAT_ORDER.map((key) => statMap[key] ?? 0);

    const versionGroups = [
      ...new Set(
        data.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)),
      ),
    ].sort();

    return {
      id: data.id,
      name: data.name,
      label: titleCase(data.name),
      types: data.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      generation: generationForId(data.id),
      stats,
      total: stats.reduce((a, b) => a + b, 0),
      versionGroups,
    };
  });

  return entries.sort((a, b) => a.id - b.id);
}

async function buildVersionGroups() {
  const list = await getJson(`${API}/version-group?limit=200`);
  const groups = await pool(list.results, CONCURRENCY, async (item) => {
    const data = await getJson(item.url);
    return {
      name: data.name,
      label: data.versions.map((v) => titleCase(v.name)).join(' · '),
      generation: Number(data.generation.url.split('/').filter(Boolean).pop()),
      order: data.order,
    };
  });
  return groups.sort((a, b) => a.order - b.order);
}

/** Catálogo de movimientos: nombre -> tipo, categoría, poder, precisión, PP. */
async function buildMoveIndex() {
  const list = await getJson(`${API}/move?limit=2000`);
  let done = 0;
  const moves = await pool(list.results, CONCURRENCY, async (item) => {
    const data = await getJson(item.url);
    done += 1;
    if (done % 200 === 0) process.stdout.write(`  ${done}/${list.results.length}
`);
    return [
      data.name,
      {
        label: titleCase(data.name),
        type: data.type.name,
        damageClass: data.damage_class?.name ?? 'status',
        power: data.power,
        accuracy: data.accuracy,
        pp: data.pp,
        generation: Number(data.generation.url.split('/').filter(Boolean).pop()),
      },
    ];
  });
  return Object.fromEntries(moves);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log('› Descargando version-groups…');
  const versionGroups = await buildVersionGroups();
  await writeFile(path.join(OUT_DIR, 'version-groups.json'), JSON.stringify(versionGroups, null, 0));
  console.log(`  ${versionGroups.length} grupos de versión`);

  console.log(`› Descargando ${MAX_ID} Pokémon (concurrencia ${CONCURRENCY})…`);
  const index = await buildPokemonIndex();
  await writeFile(path.join(OUT_DIR, 'pokedex-index.json'), JSON.stringify(index, null, 0));
  console.log(`  ${index.length} Pokémon en el índice`);

  console.log('› Descargando catálogo de movimientos…');
  const moves = await buildMoveIndex();
  await writeFile(path.join(OUT_DIR, 'moves.json'), JSON.stringify(moves, null, 0));
  console.log(`  ${Object.keys(moves).length} movimientos`);

  console.log('✓ Listo.');
}

main().catch((error) => {
  console.error('✗ Falló el seed:', error);
  process.exit(1);
});
