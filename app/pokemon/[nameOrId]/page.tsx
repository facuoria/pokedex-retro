import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EffectivenessGrid } from '@/components/EffectivenessGrid';
import { EvolutionChain } from '@/components/EvolutionChain';
import { MovesSection } from '@/components/MovesSection';
import { SpriteViewer } from '@/components/SpriteViewer';
import { StatBar } from '@/components/StatBar';
import { TypeBadge } from '@/components/TypeBadge';
import { GENERATIONS, padId } from '@/lib/constants';
import { getPokemonDetail } from '@/lib/pokeapi';
import { POKEDEX, VERSION_GROUP_MAP, VERSION_GROUPS } from '@/lib/pokedex';
import { getDefensiveProfile } from '@/lib/type-chart';

/** ISR: los datos casi no cambian, revalidamos una vez por dia. */
export const revalidate = 86400;
export const dynamicParams = true;

/** Prerenderiza Kanto en build; el resto se genera on-demand y queda cacheado. */
export function generateStaticParams() {
  return POKEDEX.slice(0, 151).map((entry) => ({ nameOrId: entry.name }));
}

interface PageProps {
  params: { nameOrId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const detail = await getPokemonDetail(decodeURIComponent(params.nameOrId));
  if (!detail) return { title: 'Pokemon no encontrado' };

  return {
    title: `${detail.label} ${padId(detail.id)}`,
    description:
      detail.flavorText ||
      `Estadisticas, debilidades, habilidades y movimientos de ${detail.label}.`,
    openGraph: { images: detail.sprites.artwork ? [detail.sprites.artwork] : [] },
  };
}

function Section({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <h2 className="panel-heading">{title}</h2>
      <div className="p-3">{children}</div>
    </section>
  );
}

export default async function PokemonPage({ params }: PageProps) {
  const detail = await getPokemonDetail(decodeURIComponent(params.nameOrId));
  if (!detail) notFound();

  const profile = getDefensiveProfile(detail.types, 9);

  // Juegos donde aparece, ordenados de mas nuevo a mas viejo.
  const gameOptions = detail.versionGroups
    .map((name) => VERSION_GROUP_MAP.get(name))
    .filter((vg): vg is NonNullable<typeof vg> => Boolean(vg))
    .sort((a, b) => b.order - a.order)
    .map((vg) => ({ name: vg.name, label: vg.label, generation: vg.generation }));

  const defaultGroup = gameOptions[0]?.name ?? VERSION_GROUPS[VERSION_GROUPS.length - 1].name;
  const initialMoves = detail.movesByVersionGroup[defaultGroup] ?? [];

  const generation = GENERATIONS.find((g) => g.id === detail.generation);
  const typeQuery = detail.types.map((t) => `type=${t}`).join('&');

  const previous = POKEDEX.find((e) => e.id === detail.id - 1);
  const next = POKEDEX.find((e) => e.id === detail.id + 1);

  return (
    <div className="space-y-4">
      {/* Navegacion entre fichas */}
      <div className="flex items-center justify-between gap-2">
        {previous ? (
          <Link href={`/pokemon/${previous.name}`} className="btn">
            &lt; {previous.label}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/" className="btn">
          Pokedex
        </Link>
        {next ? (
          <Link href={`/pokemon/${next.name}`} className="btn">
            {next.label} &gt;
          </Link>
        ) : (
          <span />
        )}
      </div>

      {/* Header */}
      <header className="panel flex flex-col items-center gap-5 p-4 sm:flex-row sm:items-start">
        <SpriteViewer sprites={detail.sprites} label={detail.label} />

        <div className="flex-1 text-center sm:text-left">
          <p className="font-pixel text-[10px] text-ink-400">{padId(detail.id)}</p>
          <h1 className="mt-1 font-pixel text-xl text-bone text-shadow-pixel sm:text-3xl">
            {detail.label}
          </h1>
          {detail.genus && <p className="mt-2 text-sm text-ink-400">{detail.genus}</p>}

          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {detail.types.map((type) => (
              <TypeBadge key={type} type={type} href={`/type-chart?${typeQuery}`} />
            ))}
          </div>

          {detail.flavorText && (
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-bone/80">
              {detail.flavorText}
            </p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {[
              { label: 'Altura', value: `${(detail.height / 10).toFixed(1)} m` },
              { label: 'Peso', value: `${(detail.weight / 10).toFixed(1)} kg` },
              { label: 'Gen', value: generation ? `${detail.generation} (${generation.region})` : '—' },
              { label: 'Exp. base', value: detail.baseExperience ?? '—' },
            ].map((item) => (
              <div key={item.label} className="border-2 border-ink-600 bg-ink-900/60 p-2">
                <dt className="font-pixel text-[8px] uppercase text-ink-400">{item.label}</dt>
                <dd className="mt-1 font-pixel text-[10px] text-bone">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Debilidades y resistencias">
          <EffectivenessGrid profile={profile} />
          <Link
            href={`/type-chart?${typeQuery}`}
            className="btn mt-3 w-full justify-center btn-primary"
          >
            Ver en la tabla de tipos
          </Link>
        </Section>

        <div className="space-y-4">
          <Section title="Estadisticas base">
            <StatBar stats={detail.stats} total={detail.statTotal} />
          </Section>

          <Section title="Habilidades">
            <ul className="space-y-2">
              {detail.abilities.map((ability) => (
                <li
                  key={`${ability.name}-${ability.slot}`}
                  className="flex items-center justify-between border-2 border-ink-600 bg-ink-900/60 p-2"
                >
                  <span className="font-pixel text-[10px] text-bone">{ability.label}</span>
                  {ability.isHidden && (
                    <span className="chip bg-dex-blue px-1.5 py-1 text-[8px]">Oculta</span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <section className="panel">
        <h2 className="panel-heading">Cadena evolutiva</h2>
        <EvolutionChain chain={detail.evolution} current={detail.speciesName} />
      </section>

      <MovesSection
        pokemon={detail.name}
        options={gameOptions}
        initialGroup={defaultGroup}
        initialMoves={initialMoves}
      />
    </div>
  );
}
