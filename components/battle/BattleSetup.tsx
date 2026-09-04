'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { TypeBadge } from '@/components/TypeBadge';
import { padId } from '@/lib/constants';
import { spriteUrl, type VersionGroup } from '@/lib/pokedex';
import { createFighter, type Fighter } from '@/lib/battle-engine';
import type { TypeName } from '@/types/pokemon';

interface Choice {
  id: number;
  name: string;
  label: string;
  types: TypeName[];
}

interface Props {
  onReady: (player: Fighter, rival: Fighter, generation: number) => void;
}

/** Juegos en los que ese Pokemon tiene movimientos por nivel. */
async function fetchGames(name: string): Promise<VersionGroup[]> {
  const res = await fetch(`/api/battle-games?name=${encodeURIComponent(name)}`);
  if (!res.ok) return [];
  return (await res.json()).games ?? [];
}

/** Buscador con autocompletado para elegir un combatiente. */
function FighterPicker({
  title,
  choice,
  onPick,
  onRandom,
  level,
  onLevel,
}: {
  title: string;
  choice: Choice | null;
  onPick: (choice: Choice) => void;
  onRandom?: () => void;
  level: number;
  onLevel: (level: number) => void;
}) {
  const [term, setTerm] = useState('');
  const [items, setItems] = useState<Choice[]>([]);

  useEffect(() => {
    const needle = term.trim();
    if (!needle) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(needle)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setItems(data.items ?? []))
        .catch(() => undefined);
    }, 120);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term]);

  return (
    <section className="panel">
      <h2 className="panel-heading flex items-center justify-between">
        <span>{title}</span>
        {onRandom && (
          <button type="button" onClick={onRandom} className="text-dex-yellow hover:underline">
            Aleatorio
          </button>
        )}
      </h2>

      <div className="space-y-3 p-3">
        <div className="relative">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={choice ? `Cambiar (${choice.label})` : 'Buscar por nombre o numero...'}
            className="field"
          />
          {items.length > 0 && (
            <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto border-2 border-ink-500 bg-ink-800 shadow-hard-lg">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(item);
                      setTerm('');
                      setItems([]);
                    }}
                    className="flex w-full items-center gap-2 border-b border-ink-700 px-3 py-2 text-left hover:bg-ink-600"
                  >
                    <Image
                      src={spriteUrl(item.id)}
                      alt=""
                      width={32}
                      height={32}
                      data-pixel="true"
                      unoptimized
                      className="h-8 w-8"
                    />
                    <span className="font-pixel text-[10px] text-bone">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex min-h-[7rem] items-center justify-center border-2 border-ink-600 bg-ink-900/60 p-3">
          {choice ? (
            <div className="flex flex-col items-center gap-1">
              <Image
                src={spriteUrl(choice.id)}
                alt={choice.label}
                width={96}
                height={96}
                data-pixel="true"
                unoptimized
                className="h-24 w-24"
              />
              <span className="font-pixel text-[8px] text-ink-400">{padId(choice.id)}</span>
              <span className="font-pixel text-[10px] text-bone">{choice.label}</span>
              <span className="flex gap-1">
                {choice.types.map((type) => (
                  <TypeBadge key={type} type={type} size="sm" />
                ))}
              </span>
            </div>
          ) : (
            <p className="font-pixel text-[9px] text-ink-400">Sin elegir</p>
          )}
        </div>

        <label className="block">
          <span className="mb-1 flex items-center justify-between font-pixel text-[9px] uppercase text-ink-400">
            Nivel
            <span className="font-pixel text-[11px] text-dex-yellow">{level}</span>
          </span>
          <input
            type="range"
            min={1}
            max={100}
            value={level}
            onChange={(e) => onLevel(Number(e.target.value))}
            className="w-full accent-dex-red"
          />
        </label>
      </div>
    </section>
  );
}

/** Pantalla de configuracion previa al combate. */
export function BattleSetup({ onReady }: Props) {
  const [player, setPlayer] = useState<Choice | null>(null);
  const [rival, setRival] = useState<Choice | null>(null);
  const [playerLevel, setPlayerLevel] = useState(50);
  const [rivalLevel, setRivalLevel] = useState(50);
  const [playerGames, setPlayerGames] = useState<VersionGroup[] | null>(null);
  const [rivalGames, setRivalGames] = useState<VersionGroup[] | null>(null);
  const [game, setGame] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo tiene sentido pelear en un juego donde AMBOS tengan learnset por nivel.
  const loadingGames = Boolean((player && !playerGames) || (rival && !rivalGames));
  const games = useMemo(
    () =>
      playerGames && rivalGames
        ? playerGames.filter((vg) => rivalGames.some((other) => other.name === vg.name))
        : [],
    [playerGames, rivalGames],
  );

  // Al cambiar los combatientes, se recalcula la lista y se elige el juego mas
  // nuevo que sirva para los dos.
  useEffect(() => {
    if (games.length === 0) {
      setGame('');
      return;
    }
    setGame((current) =>
      games.some((vg) => vg.name === current) ? current : games[0].name,
    );
  }, [games]);

  async function choose(side: 'player' | 'rival', choice: Choice) {
    if (side === 'player') {
      setPlayer(choice);
      setPlayerGames(null);
      setPlayerGames(await fetchGames(choice.name));
    } else {
      setRival(choice);
      setRivalGames(null);
      setRivalGames(await fetchGames(choice.name));
    }
  }

  async function pickRandom() {
    const res = await fetch('/api/random');
    await choose('rival', await res.json());
  }

  async function fetchFighter(name: string, level: number) {
    const res = await fetch(
      `/api/battle-pokemon?name=${encodeURIComponent(name)}&game=${encodeURIComponent(game)}&level=${level}`,
    );
    if (!res.ok) throw new Error('No se pudo preparar el combate');
    return res.json();
  }

  /** Un combatiente sin movimientos solo podria usar Forcejeo: no tiene gracia. */
  function movepoolProblem(data: any, level: number): string | null {
    if (data.moves.length > 0) return null;
    const juego = games.find((g) => g.name === game)?.label ?? game;
    return `${data.label} no aprende ningun movimiento por nivel hasta el nivel ${level} en ${juego}. Probá subiendo el nivel o cambiando de juego.`;
  }

  async function start() {
    if (!player || !rival) return;
    setLoading(true);
    setError(null);
    try {
      const [playerData, rivalData] = await Promise.all([
        fetchFighter(player.name, playerLevel),
        fetchFighter(rival.name, rivalLevel),
      ]);

      const problema =
        movepoolProblem(playerData, playerLevel) ?? movepoolProblem(rivalData, rivalLevel);
      if (problema) {
        setError(problema);
        return;
      }

      onReady(
        createFighter({ ...playerData, level: playerLevel }),
        createFighter({ ...rivalData, level: rivalLevel }),
        playerData.generation ?? 9,
      );
    } catch {
      setError('No se pudo preparar el combate. Puede ser un problema momentaneo de PokeAPI.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FighterPicker
          title="Tu Pokemon"
          choice={player}
          onPick={(choice) => choose('player', choice)}
          level={playerLevel}
          onLevel={setPlayerLevel}
        />
        <FighterPicker
          title="Rival"
          choice={rival}
          onPick={(choice) => choose('rival', choice)}
          onRandom={pickRandom}
          level={rivalLevel}
          onLevel={setRivalLevel}
        />
      </div>

      <div className="panel p-3">
        <label className="block">
          <span className="mb-1 block font-pixel text-[9px] uppercase text-ink-400">
            Juego (define que movimientos aprende cada uno por nivel)
          </span>
          <select
            value={game}
            onChange={(e) => setGame(e.target.value)}
            disabled={games.length === 0}
            className="field font-pixel text-[10px] disabled:opacity-50"
          >
            {games.length === 0 ? (
              <option value="">
                {loadingGames
                  ? 'Buscando juegos en comun...'
                  : 'Elegí los dos Pokémon primero'}
              </option>
            ) : (
              games.map((vg) => (
                <option key={vg.name} value={vg.name}>
                  {vg.label}
                </option>
              ))
            )}
          </select>
        </label>

        <p className="mt-2 text-xs leading-relaxed text-ink-400">
          {games.length > 0
            ? `Solo se listan los ${games.length} juegos en los que ambos aprenden movimientos por nivel.`
            : player && rival && !loadingGames
              ? 'No hay ningún juego en el que los dos aprendan movimientos por nivel. Probá con otra combinación.'
              : 'La lista se arma con los juegos que comparten los dos Pokémon.'}
        </p>
      </div>

      {error && (
        <p className="panel border-dex-red p-3 text-sm text-dex-red">{error}</p>
      )}

      <button
        type="button"
        onClick={start}
        disabled={!player || !rival || !game || loading || loadingGames}
        className="btn btn-primary w-full justify-center py-4 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Preparando...' : loadingGames ? 'Cargando juegos...' : '¡Comenzar combate!'}
      </button>

      <section className="panel">
        <h2 className="panel-heading">Como funciona esta simulacion</h2>
        <ul className="space-y-1.5 p-3 text-sm leading-relaxed text-ink-400">
          <li>
            · Ambos Pokemon pelean con <strong className="text-bone">IVs 31, EVs 0 y naturaleza
            neutra</strong>: no hay crianza ni entrenamiento.
          </li>
          <li>· Combate 1 contra 1 hasta que uno se debilite. Sin cambios, objetos, clima ni terreno.</li>
          <li>
            · Solo movimientos <strong className="text-bone">aprendidos por nivel</strong> hasta el
            nivel elegido, en el juego que selecciones (los ultimos 4, como en los juegos).
          </li>
          <li>
            · Sin estados alterados ni efectos secundarios: los movimientos de estado se anuncian
            pero todavia no hacen nada.
          </li>
          <li>· Todos los ataques aciertan y no se gastan PP.</li>
        </ul>
      </section>
    </div>
  );
}
