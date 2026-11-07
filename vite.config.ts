import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', sourcemap: false, target: 'es2020',
    // React y los íconos de marcas casi nunca cambian: en trozos aparte, el teléfono los guarda
    // y tras cada versión nueva solo baja el código de la app.
    rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/react') || id.includes('node_modules/scheduler') ? 'react' : id.includes('brandIcons') || id.includes('brands.json') ? 'brands' : undefined) } }
  },
  server: { port: 5173 }
});
