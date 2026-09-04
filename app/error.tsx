'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel mx-auto max-w-md p-8 text-center">
      <p className="font-pixel text-lg text-dex-yellow text-shadow-pixel">!</p>
      <h1 className="mt-4 font-pixel text-[12px] leading-relaxed text-bone">
        Algo salio mal
      </h1>
      <p className="mt-3 text-sm text-ink-400">
        Puede ser un problema momentaneo de PokeAPI. Reintenta en unos segundos.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-5">
        Reintentar
      </button>
    </div>
  );
}
