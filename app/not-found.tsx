import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="panel mx-auto max-w-md p-8 text-center">
      <p className="font-pixel text-2xl text-dex-red text-shadow-pixel">404</p>
      <h1 className="mt-4 font-pixel text-[12px] leading-relaxed text-bone">
        No se encontro ese Pokemon
      </h1>
      <p className="mt-3 text-sm text-ink-400">
        Puede que el nombre este mal escrito o que sea una forma alternativa sin ficha propia.
      </p>
      <Link href="/" className="btn btn-primary mt-5">
        Volver a la Pokedex
      </Link>
    </div>
  );
}
