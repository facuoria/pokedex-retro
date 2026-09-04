/** Barra de HP estilo pixel: verde > 50%, amarilla > 20%, roja debajo. */
export function HpBar({
  current,
  max,
  label,
  level,
}: {
  current: number;
  max: number;
  label: string;
  level: number;
}) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const color = percent > 50 ? '#3fa129' : percent > 20 ? '#ffcb05' : '#d0342c';

  return (
    <div className="panel-flat w-full max-w-xs p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-pixel text-[10px] text-bone">{label}</span>
        <span className="font-pixel text-[9px] text-ink-400">Nv{level}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="font-pixel text-[8px] text-dex-yellow">PS</span>
        <span className="relative h-3 flex-1 border-2 border-ink-500 bg-ink-900">
          <span
            className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-linear"
            style={{
              width: `${percent}%`,
              backgroundColor: color,
              backgroundImage:
                'repeating-linear-gradient(90deg, rgba(0,0,0,0.2) 0 2px, transparent 2px 6px)',
            }}
          />
        </span>
      </div>

      <p className="mt-1 text-right font-pixel text-[9px] tabular-nums text-bone">
        {current}/{max}
      </p>
    </div>
  );
}
