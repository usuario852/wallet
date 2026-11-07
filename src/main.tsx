import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Alto real de la pantalla. En el iPhone, con la app instalada y la barra de estado translúcida,
// el sistema reporta un alto menor (le resta la franja de la hora) y la app no llegaba hasta abajo.
// Instalada, la app siempre ocupa la pantalla entera: se usa el alto de la pantalla según la orientación.
export function appHeight() {
  const standalone = (navigator as any).standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
  const ih = window.innerHeight;
  if (!standalone || !screen || !screen.width) return ih;
  const landscape = window.innerWidth > window.innerHeight;
  const sh = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  return Math.max(ih, sh);
}
function setAppHeight() { document.documentElement.style.setProperty('--app-h', appHeight() + 'px'); }
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 250));

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
