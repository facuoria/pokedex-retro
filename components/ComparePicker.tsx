'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TypeName } from '@/types/pokemon';

interface Suggestion {
  id: number;
  name: string;
  label: string;
  types: TypeName[];
}

/** Selector de un Pokemon para el comparador. Escribe el slug en ?a= o ?b=. */
export function ComparePicker({ slot, current }: { slot: 'a' | 'b'; current?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);

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

  function pick(name: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(slot, name);
    router.replace(`/compare?${params.toString()}`, { scroll: false });
    setTerm('');
    setItems([]);
  }

  return (
    <div className="relative">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={current ? `Cambiar (${current})` : `Elegir Pokemon ${slot.toUpperCase()}`}
        className="field"
      />
      {items.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full border-2 border-ink-500 bg-ink-800 shadow-hard-lg">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => pick(item.name)}
                className="w-full border-b border-ink-700 px-3 py-2 text-left font-pixel text-[10px] text-bone hover:bg-ink-600"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
