import type { Metadata } from 'next';
import { Inter, Press_Start_2P } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const pixel = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
});

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Pokedex Retro',
    template: '%s · Pokedex Retro',
  },
  description:
    'Pokedex completa de la Gen I a la IX: debilidades por tipo dual, estadisticas base, movimientos por juego y tabla de tipos interactiva.',
};

const NAV = [
  { href: '/', label: 'Pokedex' },
  { href: '/type-chart', label: 'Tipos' },
  { href: '/compare', label: 'Comparar' },
  { href: '/combate', label: '¡A luchar!' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${pixel.variable} ${sans.variable}`}>
      <body className="min-h-screen">
        <header className="sticky top-0 z-40 border-b-2 border-black bg-dex-red">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <span
                aria-hidden
                className="h-6 w-6 shrink-0 rounded-full border-2 border-black bg-white shadow-hard-sm
                           [background:linear-gradient(#fff_0_45%,#000_45%_55%,#fff_55%)]"
              />
              <span className="font-pixel text-[11px] leading-tight text-white text-shadow-pixel sm:text-sm">
                POKEDEX
              </span>
            </Link>

            <nav className="ml-auto flex items-center gap-1 sm:gap-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-2 border-black/60 bg-dex-darkred px-2 py-1.5 font-pixel text-[9px]
                             uppercase text-white shadow-hard-sm transition-colors hover:bg-black/40 sm:px-3"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        <footer className="mt-12 border-t-2 border-ink-600 px-4 py-6 text-center text-xs text-ink-400">
          Datos de{' '}
          <a href="https://pokeapi.co" className="text-dex-yellow underline" rel="noreferrer">
            PokeAPI
          </a>
          . Proyecto de fans, sin fines comerciales. Pokemon es marca de Nintendo / Game Freak.
        </footer>
      </body>
    </html>
  );
}
