import Link from 'next/link';
import { TYPE_COLORS, TYPE_LABELS_ES } from '@/lib/constants';
import type { TypeName } from '@/types/pokemon';

interface Props {
  type: TypeName;
  size?: 'sm' | 'md';
  href?: string;
  className?: string;
}

/** Chip con el color oficial del tipo. Se usa en tarjetas, fichas y tabla. */
export function TypeBadge({ type, size = 'md', href, className = '' }: Props) {
  const style = { backgroundColor: TYPE_COLORS[type] };
  const sizing = size === 'sm' ? 'px-1.5 py-1 text-[8px]' : 'px-2 py-1.5 text-[9px]';
  const content = (
    <span className={`chip ${sizing} ${className}`} style={style}>
      {TYPE_LABELS_ES[type]}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="transition-transform hover:-translate-y-0.5">
      {content}
    </Link>
  );
}
