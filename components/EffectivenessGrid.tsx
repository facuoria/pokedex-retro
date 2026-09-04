import { TypeBadge } from '@/components/TypeBadge';
import { groupEffectiveness, type EffectivenessGroups } from '@/lib/type-chart';
import type { Multiplier, TypeName } from '@/types/pokemon';

const BUCKETS: {
  key: keyof EffectivenessGroups;
  title: string;
  hint: string;
  accent: string;
}[] = [
  { key: 'x4', title: 'x4', hint: 'Debilidad doble', accent: '#7f1d1d' },
  { key: 'x2', title: 'x2', hint: 'Debil', accent: '#b91c1c' },
  { key: 'x05', title: 'x1/2', hint: 'Resiste', accent: '#166534' },
  { key: 'x025', title: 'x1/4', hint: 'Resiste mucho', accent: '#14532d' },
  { key: 'x0', title: 'x0', hint: 'Inmune', accent: '#334155' },
];

interface Props {
  profile: Record<TypeName, Multiplier>;
  /** Muestra tambien el bucket neutro (x1). */
  showNeutral?: boolean;
}

/** Resumen defensivo ya combinado para tipos duales. */
export function EffectivenessGrid({ profile, showNeutral = false }: Props) {
  const groups = groupEffectiveness(profile);
  const buckets = showNeutral
    ? [...BUCKETS, { key: 'x1' as const, title: 'x1', hint: 'Neutro', accent: '#3f3f46' }]
    : BUCKETS;

  const visible = buckets.filter((bucket) => groups[bucket.key].length > 0);

  if (visible.length === 0) {
    return <p className="text-sm text-ink-400">Sin relaciones especiales.</p>;
  }

  return (
    <ul className="space-y-2">
      {visible.map((bucket) => (
        <li
          key={bucket.key}
          className="flex flex-col gap-2 border-2 border-ink-600 bg-ink-900/60 p-2 sm:flex-row sm:items-center"
        >
          <span
            className="flex w-full shrink-0 items-center justify-between gap-2 border-2 border-black/50 px-2 py-1 sm:w-32 sm:flex-col sm:items-start"
            style={{ backgroundColor: bucket.accent }}
          >
            <span className="font-pixel text-[11px] text-white">{bucket.title}</span>
            <span className="font-pixel text-[7px] uppercase text-white/70">{bucket.hint}</span>
          </span>
          <span className="flex flex-wrap gap-1">
            {groups[bucket.key].map((type) => (
              <TypeBadge key={type} type={type} size="sm" href={`/type-chart?type=${type}`} />
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
