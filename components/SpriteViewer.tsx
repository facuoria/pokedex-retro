'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { PokemonDetail } from '@/types/pokemon';

type Mode = 'artwork' | 'pixel' | 'shiny' | 'animated';

/** Visor de sprites: artwork oficial, pixel art, shiny y sprite animado. */
export function SpriteViewer({ sprites, label }: { sprites: PokemonDetail['sprites']; label: string }) {
  const options = (
    [
      { mode: 'artwork', label: 'Arte', src: sprites.artwork, pixel: false },
      { mode: 'pixel', label: 'Pixel', src: sprites.pixel, pixel: true },
      { mode: 'shiny', label: 'Shiny', src: sprites.shiny, pixel: true },
      { mode: 'animated', label: 'Anim.', src: sprites.animated, pixel: true },
    ] as { mode: Mode; label: string; src: string | null; pixel: boolean }[]
  ).filter((option) => option.src);

  const [mode, setMode] = useState<Mode>(options[0]?.mode ?? 'artwork');
  const current = options.find((option) => option.mode === mode) ?? options[0];

  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="gb-screen scanlines relative flex h-44 w-44 items-center justify-center p-2 sm:h-52 sm:w-52">
        <Image
          key={current.src}
          src={current.src as string}
          alt={label}
          width={200}
          height={200}
          data-pixel={current.pixel ? 'true' : 'false'}
          unoptimized
          priority
          className="max-h-full w-auto animate-pixel-in object-contain"
        />
      </div>

      {options.length > 1 && (
        <div className="flex flex-wrap justify-center gap-1">
          {options.map((option) => (
            <button
              key={option.mode}
              type="button"
              onClick={() => setMode(option.mode)}
              className={`btn px-2 py-1.5 ${mode === option.mode ? 'btn-active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
