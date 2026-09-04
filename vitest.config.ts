import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // JSX automatico via esbuild: alcanza para los tests y evita sumar el plugin
  // de React (que ya pide Vite 6).
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    // Los tests de logica corren en node; los de componentes declaran jsdom
    // con un comentario @vitest-environment al principio del archivo.
    environment: 'node',
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
  },
});
