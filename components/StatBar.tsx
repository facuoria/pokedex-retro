import { STAT_COLORS, STAT_KEYS, STAT_LABELS } from '@/lib/constants';
import type { StatKey } from '@/types/pokemon';

/** 255 es el maximo teorico de una stat base (Blissey en PS). */
const MAX_STAT = 255;

function Bar({ statKey, value }: { statKey: StatKey; value: number }) {
  const percent = Math.min(100, (value / MAX_STAT) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 font-pixel text-[8px] uppercase text-ink-400 sm:w-20">
        {STAT_LABELS[statKey]}
      </span>
      <span className="w-8 shrink-0 text-right font-pixel text-[10px] text-bone">{value}</span>
      <span className="relative h-4 flex-1 border-2 border-ink-600 bg-ink-900">
        {/* Barra "pixelada": bloques duros, sin gradientes ni bordes redondeados. */}
        <span
          className="absolute inset-y-0 left-0"
          style={{
            width: `${percent}%`,
            backgroundColor: STAT_COLORS[statKey],
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 6px)',
          }}
        />
      </span>
    </div>
  );
}

export function StatBar({
  stats,
  total,
}: {
  stats: Record<StatKey, number>;
  total: number;
}) {
  return (
    <div className="space-y-2">
      {STAT_KEYS.map((key) => (
        <Bar key={key} statKey={key} value={stats[key] ?? 0} />
      ))}
      <div className="flex items-center gap-2 border-t-2 border-ink-600 pt-2">
        <span className="w-16 shrink-0 font-pixel text-[8px] uppercase text-dex-yellow sm:w-20">
          Total
        </span>
        <span className="w-8 shrink-0 text-right font-pixel text-[10px] text-dex-yellow">
          {total}
        </span>
      </div>
    </div>
  );
}
