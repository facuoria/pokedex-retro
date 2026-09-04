# Pokédex Retro

Pokédex interactiva (Gen I → Gen IX) pensada como herramienta de consulta mientras jugás:
debilidades ya calculadas para tipos duales, movepool filtrado **por juego**, tabla de tipos
18×18 interactiva y comparador. Estética pixel art / Game Boy.

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind CSS**, datos de
[PokeAPI](https://pokeapi.co). Sin API keys ni variables de entorno obligatorias.

---

## Arquitectura de datos y cache

La decisión central: **no pegarle a PokeAPI en cada interacción del usuario.**

| Dato | Dónde vive | Cuándo se genera |
| --- | --- | --- |
| Índice de 1025 Pokémon (id, nombre, tipos, generación, stats, juegos) | `data/pokedex-index.json` (326 KB) | `npm run seed`, commiteado al repo |
| Catálogo de 937 movimientos (tipo, categoría, potencia, precisión, PP) | `data/moves.json` (117 KB) | `npm run seed` |
| 32 grupos de versión (juegos) | `data/version-groups.json` | `npm run seed` |
| Ficha completa de un Pokémon | PokeAPI vía `fetch` con `revalidate: 30 días` + ISR de página (24 h) | on-demand, cacheado |

Consecuencias:

- El **buscador, el autocompletado, el grid y todos los filtros** (`/api/suggest`, `/api/pokemon`)
  se resuelven contra los JSON locales: cero llamadas de red, respuesta inmediata.
- Las **fichas** (`/pokemon/[nameOrId]`) usan ISR. Los 151 de Kanto se prerenderizan en build;
  el resto se genera on-demand la primera vez y queda cacheado.
- Los **movepools por juego** se piden a `/api/moves` solo cuando el usuario cambia el dropdown,
  para no mandar los ~25 movepools de un Pokémon al cliente de una.
- El **estado de filtros vive en la URL** (`?q=&type=&gen=&game=&sort=&order=`), así que las
  búsquedas son compartibles y el botón "atrás" funciona.

Volver a correr `npm run seed` es lo único necesario cuando salga una generación nueva
(≈1000 requests, unos 2 minutos).

## Lógica de tipos

`lib/type-chart.ts` es el corazón de la app y no depende de la red: la tabla está hardcodeada
y verificada con tests.

- `getMultiplier(atacante, defensor, gen)` → `0 | 0.5 | 1 | 2`
- `getTypeChart(gen)` → matriz completa 18×18
- `getDefensiveProfile(tipos[], gen)` → multiplica las relaciones de **ambos** tipos, así que
  Charizard sale ×4 a Roca y ×0 a Tierra, no solo la tabla simple.
- `groupEffectiveness(profile)` → buckets ×4 / ×2 / ×1 / ×½ / ×¼ / ×0 para la UI.

**Variaciones históricas** contempladas (selector de generación en `/type-chart`):

| Generación | Diferencias respecto de la tabla actual |
| --- | --- |
| I | Sin Siniestro, Acero ni Hada. Fantasma → Psíquico = ×0. Bicho ↔ Veneno = ×2. Fuego todavía no resistía Hielo. |
| II–V | Sin Hada. Acero resiste Fantasma y Siniestro (×½). |
| VI–IX | Tabla vigente. |

Tests: `npm test` (13 casos que cubren inmunidades, tipos duales y cada variación por generación).

> Nota: las categorías físico/especial de los movimientos son las **actuales**. Antes de Gen IV
> la categoría dependía del tipo del movimiento, no del movimiento en sí.

## Estructura

```
app/
  page.tsx                    Home: hero + buscador + grid con filtros
  pokemon/[nameOrId]/page.tsx Ficha (ISR)
  type-chart/page.tsx         Tabla 18x18 interactiva
  compare/page.tsx            Comparador de 2 Pokémon
  api/suggest|pokemon|moves   Rutas de datos (locales salvo /moves)
components/
  PokemonCard  TypeBadge  StatBar  EffectivenessGrid
  TypeChartGrid  TypeChartExplorer  MoveTable  MovesSection
  EvolutionChain  SearchBox  PokedexBrowser  SpriteViewer  ComparePicker
lib/
  type-chart.ts   Tabla de tipos + cálculo dual + variaciones por generación
  pokeapi.ts      Acceso tipado a PokeAPI (getPokemonDetail, getMovesByVersion)
  pokedex.ts      Consultas sobre el índice local (queryPokedex, suggest)
  constants.ts    Colores de tipo, stats, generaciones, labels
types/pokemon.ts  Tipos compartidos
scripts/seed.mjs  Generación del dataset
data/             Dataset generado (commiteado)
```

## Uso local

```bash
npm install
npm run seed     # opcional: data/ ya viene generado
npm run dev      # http://localhost:3000
```

Otros comandos:

```bash
npm test         # tests de la lógica de tipos
npm run build    # build de producción
npm start        # servir el build
```

## Despliegue en Vercel

No hace falta ninguna variable de entorno ni base de datos.

1. Subí el repo a GitHub (incluyendo `data/`, que es lo que evita depender de PokeAPI en runtime).
2. En Vercel: *New Project* → importá el repo → *Deploy*. El preset de Next.js se detecta solo.
3. `next.config.mjs` ya habilita los dominios de sprites
   (`raw.githubusercontent.com`, `play.pokemonshowdown.com`).

Si en el futuro querés cachear más agresivo las respuestas de PokeAPI, el lugar natural es
`lib/pokeapi.ts`: hoy usa `fetch(..., { next: { revalidate } })`, que en Vercel ya queda en el
Data Cache. Cambiar a Vercel KV solo requeriría envolver esa función.

## Accesibilidad y mobile

- Grid responsive de 2 a 6 columnas; la tabla de tipos scrollea en horizontal con la primera
  columna fija.
- Autocompletado navegable con flechas / Enter / Escape (`role="combobox"`).
- `image-rendering: pixelated` en sprites, foco visible amarillo, y `prefers-reduced-motion`
  respetado.

---

Proyecto de fans, sin fines comerciales. Pokémon es marca registrada de Nintendo / Game Freak.
Datos cortesía de [PokeAPI](https://pokeapi.co).
