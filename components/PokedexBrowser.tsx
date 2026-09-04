'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PokemonCard, PokemonCardSkeleton } from '@/components/PokemonCard';
import { SearchBox } from '@/components/SearchBox';
import { GENERATIONS, STAT_LABELS, TYPE_COLORS, TYPE_LABELS_ES } from '@/lib/constants';
import type { VersionGroup } from '@/lib/pokedex';
import { TYPE_NAMES, type PokedexIndexEntry, type TypeName } from '@/types/pokemon';

const PAGE_SIZE = 48;

const SORTS: { value: string; label: string }[] = [
  { value: 'id', label: 'Numero' },
  { value: 'name', label: 'Nombre' },
  { value: 'total', label: 'Total base' },
  { value: 'hp', label: STAT_LABELS.hp },
  { value: 'attack', label: STAT_LABELS.attack },
  { value: 'defense', label: STAT_LABELS.defense },
  { value: 'special-attack', label: STAT_LABELS['special-attack'] },
  { value: 'special-defense', label: STAT_LABELS['special-defense'] },
  { value: 'speed', label: STAT_LABELS.speed },
];

interface Props {
  initialItems: PokedexIndexEntry[];
  initialTotal: number;
  versionGroups: VersionGroup[];
}

/**
 * Grid principal con filtros. Todo el estado de filtros vive en la URL para que
 * las busquedas sean compartibles y funcione el boton "atras".
 */
export function PokedexBrowser({ initialItems, initialTotal, versionGroups }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterKey = searchParams.toString();
  const initialKey = useRef(filterKey);

  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const q = searchParams.get('q') ?? '';
  const gen = searchParams.get('gen') ?? '';
  const game = searchParams.get('game') ?? '';
  const sort = searchParams.get('sort') ?? 'id';
  const order = searchParams.get('order') ?? 'asc';
  const activeTypes = useMemo(() => searchParams.getAll('type'), [searchParams]);

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `/?${query}` : '/', { scroll: false });
    },
    [router, searchParams],
  );

  // Recarga la primera pagina cuando cambian los filtros.
  useEffect(() => {
    if (filterKey === initialKey.current) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pokemon?${filterKey}&offset=0&limit=${PAGE_SIZE}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
      } catch {
        /* abortado */
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [filterKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/pokemon?${filterKey}&offset=${items.length}&limit=${PAGE_SIZE}`,
      );
      const data = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    } finally {
      setLoadingMore(false);
    }
  }, [filterKey, items.length, loadingMore, total]);

  // Scroll infinito.
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '600px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const hasFilters = Boolean(q || gen || game || activeTypes.length || sort !== 'id' || order !== 'asc');

  return (
    <div className="space-y-5">
      <div id="buscador" className="scroll-mt-24">
        <SearchBox
          value={q}
          onQueryChange={(value) =>
            updateParams((params) => {
              if (value) params.set('q', value);
              else params.delete('q');
            })
          }
        />
      </div>

      {/* Filtro por tipo */}
      <div className="panel-flat p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-pixel text-[9px] uppercase tracking-wider text-ink-400">
            Tipo {activeTypes.length === 2 && '(combinacion)'}
          </span>
          {activeTypes.length > 0 && (
            <button
              type="button"
              className="font-pixel text-[8px] uppercase text-dex-yellow hover:underline"
              onClick={() => updateParams((params) => params.delete('type'))}
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_NAMES.map((type: TypeName) => {
            const isActive = activeTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={isActive}
                onClick={() =>
                  updateParams((params) => {
                    const current = params.getAll('type');
                    const next = isActive
                      ? current.filter((t) => t !== type)
                      : [...current, type].slice(-2); // maximo 2 tipos
                    params.delete('type');
                    next.forEach((t) => params.append('type', t));
                  })
                }
                style={{
                  backgroundColor: isActive ? TYPE_COLORS[type] : undefined,
                  borderColor: isActive ? '#ffcb05' : undefined,
                }}
                className={`chip ${
                  isActive ? 'scale-105' : 'bg-ink-700 text-ink-400 hover:text-bone'
                } transition-transform`}
              >
                {TYPE_LABELS_ES[type]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Generacion / juego / orden */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block font-pixel text-[9px] uppercase text-ink-400">Generacion</span>
          <select
            value={gen}
            onChange={(e) =>
              updateParams((params) => {
                if (e.target.value) params.set('gen', e.target.value);
                else params.delete('gen');
              })
            }
            className="field font-pixel text-[10px]"
          >
            <option value="">Todas</option>
            {GENERATIONS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} - {g.region}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block font-pixel text-[9px] uppercase text-ink-400">Juego</span>
          <select
            value={game}
            onChange={(e) =>
              updateParams((params) => {
                if (e.target.value) params.set('game', e.target.value);
                else params.delete('game');
              })
            }
            className="field font-pixel text-[10px]"
          >
            <option value="">Todos</option>
            {versionGroups.map((vg) => (
              <option key={vg.name} value={vg.name}>
                {vg.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block font-pixel text-[9px] uppercase text-ink-400">Ordenar por</span>
          <select
            value={sort}
            onChange={(e) =>
              updateParams((params) => {
                if (e.target.value === 'id') params.delete('sort');
                else params.set('sort', e.target.value);
              })
            }
            className="field font-pixel text-[10px]"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            type="button"
            className={`btn flex-1 ${order === 'desc' ? 'btn-active' : ''}`}
            onClick={() =>
              updateParams((params) => {
                if (order === 'desc') params.delete('order');
                else params.set('order', 'desc');
              })
            }
          >
            {order === 'desc' ? 'Desc' : 'Asc'}
          </button>
          {hasFilters && (
            <button type="button" className="btn flex-1" onClick={() => router.replace('/')}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between border-b-2 border-ink-600 pb-2">
        <span className="font-pixel text-[10px] text-bone">
          {total} {total === 1 ? 'Pokemon' : 'Pokemon'}
        </span>
        <span className="font-pixel text-[9px] text-ink-400">
          mostrando {Math.min(items.length, total)}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <PokemonCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-pixel text-[11px] text-bone">Sin resultados</p>
          <p className="mt-2 text-sm text-ink-400">
            Probá con otro nombre, tipo o quitá algún filtro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((entry, i) => (
            <PokemonCard key={entry.id} entry={entry} priority={i < 12} />
          ))}
        </div>
      )}

      <div ref={sentinel} className="h-8" />

      {loadingMore && (
        <p className="animate-blink text-center font-pixel text-[10px] text-dex-yellow">
          Cargando...
        </p>
      )}
    </div>
  );
}
