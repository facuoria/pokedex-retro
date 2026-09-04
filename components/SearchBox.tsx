'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { TypeBadge } from '@/components/TypeBadge';
import { padId } from '@/lib/constants';
import { spriteUrl } from '@/lib/pokedex';
import type { TypeName } from '@/types/pokemon';

interface Suggestion {
  id: number;
  name: string;
  label: string;
  types: TypeName[];
}

interface Props {
  /** Valor inicial (viene de los search params). */
  defaultValue?: string;
  /** Si se pasa, el input queda controlado por el padre (estado en la URL). */
  value?: string;
  /** Si se define, el texto tipeado tambien filtra el grid via URL. */
  onQueryChange?: (value: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

/**
 * Buscador con autocompletado por nombre, numero o tipo.
 * Navega directo a la ficha al elegir una sugerencia (Enter / click / flechas).
 */
export function SearchBox({
  defaultValue = '',
  value: controlled,
  onQueryChange,
  autoFocus = false,
  placeholder = 'Buscar por nombre, numero o tipo...',
}: Props) {
  const router = useRouter();
  const listId = useId();
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Sugerencias con debounce corto: pegan a una ruta local, no a PokeAPI.
  useEffect(() => {
    const term = value.trim();
    if (!term) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setItems(data.items ?? []);
        setActive(0);
      } catch {
        /* abortado */
      }
    }, 120);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  // Cerrar al hacer click afuera.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleChange(next: string) {
    setInternal(next);
    setOpen(true);
    onQueryChange?.(next);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = items[active];
      if (target) {
        setOpen(false);
        router.push(`/pokemon/${target.name}`);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 border-2 border-ink-500 bg-ink-900 px-3 shadow-hard focus-within:border-dex-yellow">
        <span aria-hidden className="font-pixel text-[10px] text-dex-yellow">
          &gt;
        </span>
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          className="w-full bg-transparent py-3 text-sm text-bone placeholder:text-ink-400 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => handleChange('')}
            aria-label="Limpiar busqueda"
            className="font-pixel text-[10px] text-ink-400 hover:text-dex-red"
          >
            X
          </button>
        )}
      </div>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto border-2 border-ink-500 bg-ink-800 shadow-hard-lg"
        >
          {items.map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  setOpen(false);
                  router.push(`/pokemon/${item.name}`);
                }}
                className={`flex w-full items-center gap-3 border-b border-ink-700 px-3 py-2 text-left ${
                  i === active ? 'bg-ink-600' : 'hover:bg-ink-700'
                }`}
              >
                <Image
                  src={spriteUrl(item.id)}
                  alt=""
                  width={40}
                  height={40}
                  data-pixel="true"
                  unoptimized
                  className="h-10 w-10"
                />
                <span className="font-pixel text-[9px] text-ink-400">{padId(item.id)}</span>
                <span className="font-pixel text-[10px] text-bone">{item.label}</span>
                <span className="ml-auto flex gap-1">
                  {item.types.map((type) => (
                    <TypeBadge key={type} type={type} size="sm" />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
