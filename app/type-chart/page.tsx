import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TypeChartExplorer } from '@/components/TypeChartExplorer';

export const metadata: Metadata = {
  title: 'Tabla de tipos',
  description:
    'Tabla de tipos 18x18 interactiva con variaciones por generación y resumen combinado para tipos duales.',
};

export default function TypeChartPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-pixel text-base text-bone text-shadow-pixel sm:text-xl">
          Tabla de tipos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-400">
          Las filas son el tipo <strong className="text-bone">atacante</strong> y las columnas el
          tipo <strong className="text-bone">defensor</strong>. Pasá el mouse (o tocá) una celda para
          resaltar su fila y columna. En mobile la tabla se desplaza en horizontal.
        </p>
      </header>

      <Suspense fallback={<div className="skeleton h-96 w-full" />}>
        <TypeChartExplorer />
      </Suspense>
    </div>
  );
}
