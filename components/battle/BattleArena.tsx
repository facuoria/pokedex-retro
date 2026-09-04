'use client';

import { useState } from 'react';
import { BattleScreen } from '@/components/battle/BattleScreen';
import { BattleSetup } from '@/components/battle/BattleSetup';
import type { Fighter } from '@/lib/battle-engine';
import type { VersionGroup } from '@/lib/pokedex';

interface Matchup {
  player: Fighter;
  rival: Fighter;
  generation: number;
}

const restore = (fighter: Fighter): Fighter => ({ ...fighter, currentHp: fighter.maxHp });

/**
 * Contenedor del modulo de combate: alterna entre configuracion y batalla.
 * `round` remonta BattleScreen para que la revancha arranque de cero sin
 * arrastrar estado del combate anterior.
 */
export function BattleArena({ versionGroups }: { versionGroups: VersionGroup[] }) {
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [round, setRound] = useState(0);
  const [battlesPlayed, setBattlesPlayed] = useState(0);

  if (!matchup) {
    return (
      <BattleSetup
        versionGroups={versionGroups}
        onReady={(player, rival, generation) => {
          setMatchup({ player, rival, generation });
          setRound((value) => value + 1);
          setBattlesPlayed((value) => value + 1);
        }}
      />
    );
  }

  return (
    <BattleScreen
      key={round}
      player={restore(matchup.player)}
      rival={restore(matchup.rival)}
      generation={matchup.generation}
      // Expandido solo en el primer combate de la sesion.
      hintOpenByDefault={battlesPlayed <= 1}
      onRematch={() => {
        setRound((value) => value + 1);
        setBattlesPlayed((value) => value + 1);
      }}
      onNewBattle={() => setMatchup(null)}
    />
  );
}
