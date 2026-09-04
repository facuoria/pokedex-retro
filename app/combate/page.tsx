import type { Metadata } from 'next';
import { BattleArena } from '@/components/battle/BattleArena';
import { VERSION_GROUPS } from '@/lib/pokedex';

export const metadata: Metadata = {
  title: '¡A luchar!',
  description:
    'Simulá un combate 1 vs 1 entre dos Pokémon con stats por nivel, movimientos del juego que elijas y la tabla de tipos aplicada.',
};

export default function CombatePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-pixel text-base text-bone text-shadow-pixel sm:text-xl">¡A luchar!</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-400">
          Elegí tu Pokémon y un rival, poneles nivel y decidí de qué juego salen sus movimientos.
          El combate usa las fórmulas de stats y daño de los juegos principales, con la misma
          tabla de tipos del resto de la app.
        </p>
      </header>

      <BattleArena versionGroups={VERSION_GROUPS} />
    </div>
  );
}
