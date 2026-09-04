'use client';

import Image from 'next/image';
import { useEffect, useReducer, useRef } from 'react';
import { HpBar } from '@/components/battle/HpBar';
import { TypeHintPanel } from '@/components/battle/TypeHintPanel';
import { TypeBadge } from '@/components/TypeBadge';
import { DAMAGE_CLASS_LABELS } from '@/lib/constants';
import { resolveTurn, type BattleEvent, type BattleMove, type Fighter, type Side } from '@/lib/battle-engine';

/** Ritmo de aparicion de cada linea del log, en ms. */
const EVENT_DELAY = 850;

/**
 * Tope de turnos. Sin PP ni Forcejeo, dos Pokemon que solo tienen movimientos
 * de estado no podrian debilitarse nunca: el combate se corta en empate.
 */
const MAX_TURNS = 100;

type Phase = 'awaiting-input' | 'resolving' | 'finished';

interface State {
  player: Fighter;
  rival: Fighter;
  generation: number;
  phase: Phase;
  log: string[];
  queue: BattleEvent[];
  /** null con phase 'finished' significa empate por agotamiento. */
  winner: Side | null;
  turn: number;
}

type Action =
  | { type: 'player-move'; move: BattleMove }
  | { type: 'tick' }
  | { type: 'restart'; player: Fighter; rival: Fighter };

/**
 * Reducer del combate. Las transiciones son explicitas y los eventos se
 * consumen de a uno, asi no hay condiciones de carrera entre la animacion del
 * log y el estado de los combatientes.
 */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'player-move': {
      if (state.phase !== 'awaiting-input') return state;
      const result = resolveTurn(
        state.player,
        state.rival,
        action.move,
        Math.random,
        state.generation,
      );
      const turn = state.turn + 1;

      if (!result.winner && turn >= MAX_TURNS) {
        return {
          ...state,
          phase: 'resolving',
          turn,
          queue: [
            ...result.events,
            { kind: 'message', text: 'El combate se alargó demasiado y terminó en empate.' },
          ],
        };
      }

      return { ...state, phase: 'resolving', queue: result.events, turn };
    }

    case 'tick': {
      const [event, ...rest] = state.queue;
      if (!event) {
        // Se vacio la cola: o termino el combate o le toca elegir al jugador.
        const over = state.winner !== null || state.turn >= MAX_TURNS;
        return { ...state, phase: over ? 'finished' : 'awaiting-input' };
      }

      const next: State = { ...state, queue: rest };

      if (event.kind === 'message') {
        next.log = [...state.log, event.text];
      } else if (event.kind === 'damage') {
        const target = event.side === 'player' ? 'player' : 'rival';
        next[target] = { ...state[target], currentHp: event.hpAfter };
      } else if (event.kind === 'end') {
        next.winner = event.winner;
      }

      return next;
    }

    case 'restart':
      return {
        ...state,
        player: action.player,
        rival: action.rival,
        phase: 'awaiting-input',
        log: [`¡${action.rival.label} salvaje apareció!`, `¡Adelante, ${action.player.label}!`],
        queue: [],
        winner: null,
        turn: 0,
      };

    default:
      return state;
  }
}

function initialState(player: Fighter, rival: Fighter, generation: number): State {
  return {
    player,
    rival,
    generation,
    phase: 'awaiting-input',
    log: [`¡${rival.label} salvaje apareció!`, `¡Adelante, ${player.label}!`],
    queue: [],
    winner: null,
    turn: 0,
  };
}

interface Props {
  player: Fighter;
  rival: Fighter;
  generation: number;
  /** true la primera vez que se entra a un combate en esta sesion. */
  hintOpenByDefault: boolean;
  onRematch: () => void;
  onNewBattle: () => void;
}

export function BattleScreen({
  player,
  rival,
  generation,
  hintOpenByDefault,
  onRematch,
  onNewBattle,
}: Props) {
  const [state, dispatch] = useReducer(reducer, initialState(player, rival, generation));
  const logRef = useRef<HTMLDivElement>(null);

  // Consume la cola de eventos de a uno para que el log se lea como en el juego.
  useEffect(() => {
    if (state.phase !== 'resolving') return;
    const timer = setTimeout(() => dispatch({ type: 'tick' }), EVENT_DELAY);
    return () => clearTimeout(timer);
  }, [state.phase, state.queue, state.log.length]);

  // El log siempre muestra la ultima linea.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [state.log]);

  const busy = state.phase !== 'awaiting-input';

  return (
    <div className="space-y-4">
      {/* Campo de batalla */}
      <div className="panel relative overflow-hidden p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 75% 25%, rgba(155,188,15,0.35), transparent 45%), radial-gradient(circle at 25% 80%, rgba(155,188,15,0.35), transparent 45%)',
          }}
        />

        {/* Rival arriba */}
        <div className="relative flex items-start justify-between gap-3">
          <HpBar
            current={state.rival.currentHp}
            max={state.rival.maxHp}
            label={state.rival.label}
            level={state.rival.level}
          />
          {state.rival.sprites.front && (
            <Image
              src={state.rival.sprites.front}
              alt={state.rival.label}
              width={110}
              height={110}
              data-pixel="true"
              unoptimized
              className={`h-24 w-24 transition-opacity duration-500 sm:h-28 sm:w-28 ${
                state.rival.currentHp === 0 ? 'opacity-20' : ''
              }`}
            />
          )}
        </div>

        {/* Jugador abajo */}
        <div className="relative mt-4 flex flex-row-reverse items-end justify-between gap-3">
          <HpBar
            current={state.player.currentHp}
            max={state.player.maxHp}
            label={state.player.label}
            level={state.player.level}
          />
          {(state.player.sprites.back ?? state.player.sprites.front) && (
            <Image
              src={(state.player.sprites.back ?? state.player.sprites.front) as string}
              alt={state.player.label}
              width={130}
              height={130}
              data-pixel="true"
              unoptimized
              className={`h-28 w-28 transition-opacity duration-500 sm:h-32 sm:w-32 ${
                state.player.currentHp === 0 ? 'opacity-20' : ''
              }`}
            />
          )}
        </div>
      </div>

      {/* Log de batalla */}
      <div
        ref={logRef}
        className="gb-screen h-28 overflow-y-auto p-3 font-pixel text-[10px] leading-relaxed"
        role="log"
        aria-live="polite"
      >
        {state.log.map((line, i) => (
          <p key={`${i}-${line}`} className="mb-1.5 animate-pixel-in">
            {line}
          </p>
        ))}
      </div>

      {/* Menu de movimientos o pantalla final */}
      {state.phase === 'finished' ? (
        <div className="panel p-4 text-center">
          <p
            className={`font-pixel text-lg text-shadow-pixel ${
              state.winner === 'player'
                ? 'text-dex-green'
                : state.winner === 'rival'
                  ? 'text-dex-red'
                  : 'text-dex-yellow'
            }`}
          >
            {state.winner === 'player' ? '¡Ganaste!' : state.winner === 'rival' ? 'Perdiste' : 'Empate'}
          </p>
          <p className="mt-2 text-sm text-ink-400">
            {state.winner === 'player'
              ? `${state.rival.label} se debilitó en el turno ${state.turn}.`
              : state.winner === 'rival'
                ? `${state.player.label} se debilitó en el turno ${state.turn}.`
                : `Ninguno logró debilitar al otro en ${MAX_TURNS} turnos.`}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onRematch} className="btn btn-primary">
              Revancha
            </button>
            <button type="button" onClick={onNewBattle} className="btn">
              Volver a elegir
            </button>
          </div>
        </div>
      ) : (
        <div className="panel">
          <h2 className="panel-heading">
            {busy ? 'Resolviendo turno...' : `¿Qué debería hacer ${state.player.label}?`}
          </h2>
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {state.player.moves.map((move) => (
              <button
                key={move.name}
                type="button"
                disabled={busy}
                onClick={() => dispatch({ type: 'player-move', move })}
                className="flex items-center justify-between gap-2 border-2 border-ink-500 bg-ink-700 p-2
                           text-left shadow-hard-sm transition-[transform,box-shadow] duration-75
                           hover:bg-ink-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                           disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>
                  <span className="block font-pixel text-[10px] text-bone">{move.label}</span>
                  <span className="mt-1 block text-[10px] text-ink-400">
                    {DAMAGE_CLASS_LABELS[move.damageClass]} · Pot. {move.power ?? '—'}
                  </span>
                </span>
                <TypeBadge type={move.type} size="sm" />
              </button>
            ))}
          </div>
        </div>
      )}

      <TypeHintPanel
        types={state.player.types}
        label={state.player.label}
        generation={generation}
        defaultOpen={hintOpenByDefault}
      />
    </div>
  );
}
