// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { PokedexBrowser } from '@/components/PokedexBrowser';
import type { PokedexIndexEntry } from '@/types/pokemon';

/* -------------------------------------------------------------------------- */
/* Mocks                                                                      */
/* -------------------------------------------------------------------------- */

/** URL simulada; los tests la mueven como lo haria el router. */
let currentQuery = '';
const replace = vi.fn((url: string) => {
  currentQuery = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(currentQuery),
}));

vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

const entry = (id: number, name: string): PokedexIndexEntry => ({
  id,
  name,
  label: name,
  types: ['normal'],
  generation: 1,
  stats: [1, 1, 1, 1, 1, 1],
  total: 6,
  versionGroups: [],
});

const BULBASAUR = entry(1, 'Bulbasaur');
const TREECKO = entry(252, 'Treecko');

/** Respuestas de /api/pokemon segun los filtros que se pidan. */
function mockApi() {
  return vi.fn(async (url: string) => {
    const filtered = url.includes('gen=3');
    return {
      ok: true,
      json: async () => ({
        total: filtered ? 1 : 2,
        items: filtered ? [TREECKO] : [BULBASAUR, TREECKO],
      }),
    } as Response;
  });
}

const PROPS = {
  initialItems: [BULBASAUR, TREECKO],
  initialTotal: 2,
  versionGroups: [{ name: 'emerald', label: 'Emerald', generation: 3, order: 8 }],
};

function renderBrowser() {
  return render(<PokedexBrowser {...PROPS} />);
}

/* -------------------------------------------------------------------------- */

describe('PokedexBrowser', () => {
  beforeEach(() => {
    currentQuery = '';
    replace.mockClear();
    vi.stubGlobal('fetch', mockApi());
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('muestra los resultados del servidor sin pedir nada al montar', async () => {
    renderBrowser();
    expect(screen.getByText('Bulbasaur')).toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('recarga al aplicar un filtro', async () => {
    const { rerender } = renderBrowser();

    currentQuery = 'gen=3';
    rerender(<PokedexBrowser {...PROPS} />);

    // Hay un paso intermedio con skeletons, asi que se espera al resultado.
    await waitFor(() => expect(screen.getByText('Treecko')).toBeDefined());
    expect(screen.queryByText('Bulbasaur')).toBeNull();
  });

  /**
   * Regresion: el guard comparaba contra los filtros del montaje, asi que
   * volver a "todos" (o de desc a asc) parecia "sin cambios" y el grid se
   * quedaba con los resultados filtrados.
   */
  it('vuelve a mostrar todo al limpiar el filtro', async () => {
    const { rerender } = renderBrowser();

    // Filtro aplicado.
    currentQuery = 'gen=3';
    rerender(<PokedexBrowser {...PROPS} />);
    await waitFor(() => expect(screen.queryByText('Bulbasaur')).toBeNull());

    // Y ahora "Todas": se vuelve exactamente al estado inicial.
    currentQuery = '';
    rerender(<PokedexBrowser {...PROPS} />);
    await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeDefined());
    expect(screen.getByText('Treecko')).toBeDefined();
  });

  it('vuelve a ascendente despues de ordenar descendente', async () => {
    const { rerender } = renderBrowser();
    const calls = (): string[] =>
      (global.fetch as any).mock.calls.map((c: any[]) => String(c[0]));

    currentQuery = 'order=desc';
    rerender(<PokedexBrowser {...PROPS} />);
    await waitFor(() => expect(calls().some((u) => u.includes('order=desc'))).toBe(true));

    // Volver a ascendente = volver a los filtros del montaje: tiene que pedir
    // los datos de nuevo igual.
    currentQuery = '';
    rerender(<PokedexBrowser {...PROPS} />);
    await waitFor(() => {
      const sinOrder = calls().filter((u) => !u.includes('order=desc'));
      expect(sinOrder.length).toBeGreaterThan(0);
    });
  });
});
