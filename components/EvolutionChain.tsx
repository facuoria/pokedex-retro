import Image from 'next/image';
import Link from 'next/link';
import { padId } from '@/lib/constants';
import type { EvolutionNode } from '@/types/pokemon';

function Node({ node, current }: { node: EvolutionNode; current: string }) {
  const isCurrent = node.name === current;
  return (
    <Link
      href={`/pokemon/${node.name}`}
      className={`flex w-24 shrink-0 flex-col items-center gap-1 border-2 p-2 transition-transform hover:-translate-y-1 ${
        isCurrent ? 'border-dex-yellow bg-ink-700' : 'border-ink-600 bg-ink-900/60 hover:border-bone'
      }`}
    >
      {node.sprite && (
        <Image
          src={node.sprite}
          alt={node.label}
          width={72}
          height={72}
          data-pixel="true"
          unoptimized
          className="h-16 w-16"
        />
      )}
      <span className="font-pixel text-[7px] text-ink-400">{padId(node.id)}</span>
      <span className="text-center font-pixel text-[8px] leading-tight text-bone">
        {node.label}
      </span>
    </Link>
  );
}

/** Renderiza la cadena evolutiva completa, incluyendo ramas (Eevee, Wurmple...). */
function Branch({ node, current }: { node: EvolutionNode; current: string }) {
  return (
    <div className="flex items-center gap-3">
      <Node node={node} current={current} />

      {node.children.length > 0 && (
        <div className="flex flex-col gap-3">
          {node.children.map((child) => (
            <div key={child.name} className="flex items-center gap-3">
              <span className="flex flex-col items-center">
                <span aria-hidden className="font-pixel text-[10px] text-dex-yellow">
                  {'>'}
                </span>
                <span className="max-w-[7rem] text-center text-[10px] leading-tight text-ink-400">
                  {child.trigger}
                </span>
              </span>
              <Branch node={child} current={current} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EvolutionChain({
  chain,
  current,
}: {
  chain: EvolutionNode | null;
  current: string;
}) {
  if (!chain) {
    return <p className="p-3 text-sm text-ink-400">Sin datos de evolución.</p>;
  }

  if (chain.children.length === 0) {
    return (
      <div className="flex items-center gap-3 p-3">
        <Node node={chain} current={current} />
        <p className="text-sm text-ink-400">Este Pokémon no evoluciona.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-3">
      <Branch node={chain} current={current} />
    </div>
  );
}
