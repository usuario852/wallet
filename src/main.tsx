// Primero el modo laboratorio: si hay ?lab=1, cambia almacenamiento y red por memoria antes de que cargue el store.
import { LAB } from './lab/mode';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

if (LAB) {
  // El laboratorio vive en su propio archivo: no pesa en el arranque normal.
  import('./lab/Lab').then(({ Lab }) => root.render(<Lab />));
} else {
  root.render(<App />);
  if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
}
