import Image from 'next/image';
import Link from 'next/link';
import { TypeBadge } from '@/components/TypeBadge';
import { TYPE_COLORS, padId } from '@/lib/constants';
import { spriteUrl } from '@/lib/pokedex';
import type { PokedexIndexEntry } from '@/types/pokemon';

/** Tarjeta del grid: sprite pixel, numero, nombre y tipos. */
export function PokemonCard({ entry, priority = false }: { entry: PokedexIndexEntry; priority?: boolean }) {
  const [first, second] = entry.types;
  const tint = `linear-gradient(150deg, ${TYPE_COLORS[first]}33, ${
    TYPE_COLORS[second ?? first]
  }14)`;

  return (
    <Link
      href={`/pokemon/${entry.name}`}
      className="group panel relative flex flex-col items-center gap-2 p-3 transition-transform
                 duration-75 hover:-translate-y-1 hover:border-dex-yellow focus-visible:-translate-y-1"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: tint }}
      />

      <span className="relative z-10 self-start font-pixel text-[9px] text-ink-400">
        {padId(entry.id)}
      </span>

      <Image
        src={spriteUrl(entry.id)}
        alt={entry.label}
        width={96}
        height={96}
        data-pixel="true"
        priority={priority}
        unoptimized
        className="relative z-10 h-20 w-20 transition-transform duration-100 group-hover:scale-110"
      />

      <span className="relative z-10 text-center font-pixel text-[10px] leading-tight text-bone">
        {entry.label}
      </span>

      <span className="relative z-10 flex flex-wrap justify-center gap-1">
        {entry.types.map((type) => (
          <TypeBadge key={type} type={type} size="sm" />
        ))}
      </span>
    </Link>
  );
}

export function PokemonCardSkeleton() {
  return (
    <div className="panel flex flex-col items-center gap-2 p-3">
      <div className="skeleton h-3 w-10 self-start" />
      <div className="skeleton h-20 w-20 rounded-full" />
      <div className="skeleton h-3 w-16" />
      <div className="skeleton h-4 w-20" />
    </div>
  );
}
