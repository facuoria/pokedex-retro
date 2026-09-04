import { POKEDEX } from '@/lib/pokedex';

/**
 * Portada de la home: solo presenta la app. Sin botones, porque el buscador
 * esta justo abajo y las secciones ya viven en el nav superior.
 */
export function HeroBanner() {
  return (
    <section className="gb-screen scanlines relative mb-6 overflow-hidden p-5 sm:p-7">
      <p className="font-pixel text-[10px] uppercase tracking-wider text-screen-dark">
        Gen I - Gen IX
      </p>

      <h1 className="mt-3 font-pixel text-lg leading-relaxed text-screen-ink sm:text-2xl">
        Pokedex Retro
        <span className="ml-2 animate-blink">_</span>
      </h1>

      <p className="mt-3 max-w-xl text-sm leading-relaxed text-screen-dark">
        Explorá los {POKEDEX.length} Pokémon de todas las generaciones, consultá tipos y
        debilidades ya calculadas, mirá qué movimientos aprende cada uno en cada juego y poné a
        prueba tus estrategias en combates simulados.
      </p>
    </section>
  );
}
