# Pokédex Retro

Pokédex interactiva de la Gen I a la Gen IX, pensada como herramienta de consulta mientras jugás:
debilidades ya calculadas para tipos duales, movepool filtrado **por juego**, tabla de tipos
18×18 interactiva y combates simulados por turnos. Estética pixel art / Game Boy.

**Next.js 14 (App Router) · TypeScript · Tailwind CSS**, con datos de [PokeAPI](https://pokeapi.co).
Sin API keys, sin base de datos y sin variables de entorno.

---

## Qué incluye

- **Pokédex completa** — 1025 Pokémon con grid paginado por scroll infinito.
- **Buscador con autocompletado** por nombre, número o tipo, navegable con teclado.
- **Filtros combinables** de tipo (hasta dos), generación y juego, más ordenamiento por
  cualquier estadística base. Todo el estado vive en la URL, así que las búsquedas son
  compartibles y el botón "atrás" funciona.
- **Ficha de detalle** con tipos, debilidades/resistencias/inmunidades ya combinadas,
  estadísticas base, habilidades (incluidas las ocultas), sprites (pixel, shiny, animado y
  artwork oficial) y cadena evolutiva con sus condiciones.
- **Movimientos por juego** — el movepool cambia entre versiones, así que hay un selector de
  juego que muestra qué aprende ese Pokémon ahí y cómo (nivel, MT/MO, tutor o huevo).
- **Tabla de tipos 18×18** interactiva, con selector de generación y resumen combinado para
  cualquier par de tipos.
- **Comparador** de dos Pokémon lado a lado.
- **Combates simulados** (*¡A luchar!*) — 1 contra 1 por turnos contra una IA, con stats
  calculadas por nivel, movimientos del juego que elijas, barras de HP, log de batalla y un
  panel de ayuda con las debilidades de tu Pokémon.

## Cómo correrlo

Requiere Node 18 o superior.

```bash
git clone https://github.com/facuoria/pokedex-retro.git
cd pokedex-retro
npm install
npm run dev
```

Y listo: http://localhost:3000. El dataset ya viene generado en `data/`, no hace falta ningún
paso extra.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build de producción y servirlo |
| `npm test` | Tests de la lógica de tipos y del motor de combate (40 casos) |
| `npm run seed` | Regenera el dataset desde PokeAPI (~1000 requests, ~2 min) |

`npm run seed` solo es necesario si querés actualizar los datos, por ejemplo cuando sale una
generación nueva.

## Arquitectura de datos y cache

La decisión central del proyecto: **no pegarle a PokeAPI en cada interacción del usuario.**

| Dato | Dónde vive | Cuándo se genera |
| --- | --- | --- |
| Índice de 1025 Pokémon (id, nombre, tipos, generación, stats, juegos) | `data/pokedex-index.json` (326 KB) | `npm run seed`, commiteado al repo |
| Catálogo de 937 movimientos (tipo, categoría, potencia, precisión, PP) | `data/moves.json` (117 KB) | `npm run seed` |
| 32 grupos de versión | `data/version-groups.json` | `npm run seed` |
| Ficha completa de un Pokémon | PokeAPI vía `fetch` con `revalidate` de 30 días, más ISR de página de 24 h | on-demand, cacheada |

De ahí se desprende que:

- El **buscador, el autocompletado, el grid y todos los filtros** (`/api/suggest`, `/api/pokemon`)
  se resuelven contra los JSON locales: cero llamadas de red y respuesta inmediata. Si PokeAPI
  se cae, esa parte de la app sigue funcionando.
- Las **fichas** (`/pokemon/[nameOrId]`) usan ISR. Los 151 de Kanto se prerenderizan en el build
  y el resto se genera la primera vez que alguien lo visita, quedando cacheado después.
- Los **movepools por juego** se piden a `/api/moves` solo al cambiar el dropdown, para no
  mandarle al cliente los ~25 movepools de un Pokémon de una sola vez.

El dataset está commiteado a propósito: es lo que permite que el repo funcione recién clonado
y que el deploy no dependa de PokeAPI en runtime.

## Lógica de tipos

`lib/type-chart.ts` es el corazón de la app. No depende de la red: la tabla está escrita a mano
y verificada con tests.

```ts
getMultiplier('fire', 'grass')            // 2
getDefensiveProfile(['fire', 'flying'])   // { rock: 4, ground: 0, grass: 0.25, ... }
getTypeChart(1)                           // matriz completa de la Gen I (15 tipos)
```

- `getMultiplier(atacante, defensor, gen)` → `0 | 0.5 | 1 | 2`
- `getTypeChart(gen)` → matriz completa
- `getDefensiveProfile(tipos[], gen)` → multiplica las relaciones de **ambos** tipos, así que
  Charizard da ×4 a Roca y ×0 a Tierra, y no solo lo que dice la tabla simple
- `groupEffectiveness(perfil)` → buckets ×4 / ×2 / ×1 / ×½ / ×¼ / ×0 para la UI

### Variaciones por generación

La tabla no siempre fue la misma, y el selector de generación de `/type-chart` lo contempla:

| Generación | Diferencias respecto de la tabla actual |
| --- | --- |
| I | Sin Siniestro, Acero ni Hada. Fantasma → Psíquico es ×0. Bicho ↔ Veneno son ×2 entre sí. Fuego todavía no resistía Hielo. |
| II–V | Sin Hada. Acero resiste Fantasma y Siniestro (×½). |
| VI–IX | Tabla vigente. |

`npm test` corre 13 casos que cubren inmunidades, tipos duales y cada una de esas variaciones,
más 27 del motor de combate.

**Limitación conocida:** los datos de cada movimiento (potencia, precisión y categoría) son los
**actuales**, no los históricos. Dos consecuencias: antes de la Gen IV la categoría
física/especial dependía del tipo del movimiento y no del movimiento en sí, y varios
movimientos cambiaron de potencia entre generaciones (Burbuja pasó de 20 a 40, por ejemplo).
La tabla de tipos sí respeta la generación elegida.

## Motor de combate

`lib/battle-engine.ts` es un módulo puro: no importa React ni toca la red, y toda la
aleatoriedad entra por un parámetro `rng`, lo que permite fijarla en los tests.

```ts
calculateStat(108, 78, true)                       // 280 (HP, IV 31, EV 0)
selectMovesForLevel(movepool, 36)                  // los 4 ultimos aprendidos por nivel
calculateDamage(atacante, defensor, movimiento)    // { damage, effectiveness, critical, stab }
resolveTurn(jugador, rival, movimiento)            // eventos del turno + estado resultante
```

Fórmulas implementadas:

- **Stats:** `HP = floor((2*Base + IV) * Nivel/100) + Nivel + 10` y
  `Stat = floor((2*Base + IV) * Nivel/100) + 5`, con IV 31, EV 0 y naturaleza neutra.
- **Daño:** `(((2*Nivel/5 + 2) * Poder * (Ataque/Defensa)) / 50 + 2) * STAB * Efectividad *
  Random(0.85–1) * Crítico`, con STAB 1.5, crítico 1/16 a ×1.5 y la efectividad saliendo del
  mismo `lib/type-chart.ts` que usa el resto de la app.
- **IA:** elige al azar pero ponderando por efectividad (×4 pesa 5, ×2 pesa 3, neutro 1,
  ×½ pesa 0.3, e inmune queda prácticamente descartado), así que prioriza lo súper eficaz sin
  ser predecible.

Simplificaciones deliberadas de esta versión, aclaradas también en la propia UI: sin objetos,
clima, terreno ni cambios de Pokémon; sin estados alterados ni efectos secundarios (los
movimientos de estado se anuncian pero no hacen nada); sin PP y sin fallos de precisión. Un
combate que llega a 100 turnos sin definirse termina en empate.

El estado del combate se maneja con un `useReducer` que consume los eventos de a uno, para que
la animación del log no compita con la actualización de los HP.

## Estructura

```
app/
  page.tsx                    Home: buscador + grid con filtros
  pokemon/[nameOrId]/page.tsx Ficha de detalle (ISR)
  type-chart/page.tsx         Tabla de tipos interactiva
  compare/page.tsx            Comparador
  combate/page.tsx            Simulador de combates
  api/...                     Rutas de datos (locales, salvo /moves y /battle-pokemon)
components/
  HeroBanner  PokemonCard  TypeBadge  StatBar  EffectivenessGrid
  TypeChartGrid  TypeChartExplorer  MoveTable  MovesSection
  EvolutionChain  SearchBox  PokedexBrowser  SpriteViewer  ComparePicker
  battle/  BattleArena  BattleSetup  BattleScreen  HpBar  TypeHintPanel
lib/
  type-chart.ts   Tabla de tipos, cálculo dual y variaciones por generación
  battle-engine.ts  Stats por nivel, fórmula de daño, IA y turnos (modulo puro)
  pokeapi.ts      Acceso tipado a PokeAPI
  pokedex.ts      Consultas sobre el índice local
  constants.ts    Colores de tipo, stats, generaciones y labels
types/pokemon.ts  Tipos compartidos
scripts/seed.mjs  Generación del dataset
data/             Dataset generado (commiteado)
```

## Desplegarlo

El proyecto no necesita ninguna variable de entorno, así que en Vercel alcanza con importar el
repo desde [vercel.com/new](https://vercel.com/new) y darle *Deploy*: el preset de Next.js se
detecta solo.

Funciona igual en cualquier plataforma que soporte Next.js 14 con App Router e ISR.
`next.config.mjs` ya habilita los dominios de sprites (`raw.githubusercontent.com` y
`play.pokemonshowdown.com`).

## Accesibilidad y mobile

- Grid responsive de 2 a 6 columnas; la tabla de tipos scrollea en horizontal con la primera
  columna fija.
- Autocompletado navegable con flechas, Enter y Escape (`role="combobox"`).
- `image-rendering: pixelated` en los sprites, foco visible y `prefers-reduced-motion` respetado.

---

Proyecto de fans, sin fines comerciales. Pokémon es marca registrada de Nintendo, Creatures y
Game Freak; este proyecto no está afiliado ni respaldado por ellos. Datos cortesía de
[PokeAPI](https://pokeapi.co).
