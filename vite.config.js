import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/*
  Sin plugins. Sin framework. Sin dependencias de runtime salvo la
  fuente de las cifras.

  Dos entradas: la app y la página de componentes de la fase 1, que
  se conserva porque sigue siendo la única forma de ver un componente
  aislado en los dos modos.
*/
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        app: resolve(process.cwd(), 'index.html'),
        demo: resolve(process.cwd(), 'demo.html'),
      },
    },
  },
});
