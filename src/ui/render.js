import './app.css';

import { createTabBar } from './components/tabbar.js';
import { renderHome } from './screens/home.js';
import { renderSettings } from './screens/settings.js';
import { openRegisterSheet } from './sheets/register.js';
import { t } from '../copy.js';

/*
  render — el armazón: una pantalla y tres pestañas.

  Sin framework. Cada cambio de estado repinta la pantalla activa
  entera. A esta escala —el inicio muestra tres filas— repintar
  cuesta menos que mantener un árbol de diferencias, y no hay estado
  escondido en el DOM que se pueda desincronizar del store.

  Movimientos y Análisis llegan en las fases 4 y 5. Sus pestañas se
  dibujan, para que la app tenga su forma real, pero no se activan.
*/

export function mountApp(options = {}) {
  const { store, root, now = () => new Date() } = options;

  let tab = 'home';
  /* Ajustes no es una pestaña: se entra desde el engranaje y se sale
     volviendo. Las pestañas siguen siendo tres. */
  let view = 'home';

  const screen = document.createElement('main');
  screen.className = 'app__screen';
  screen.id = 'screen';

  const language = () => store.getState().settings.language || 'es';

  const tabbar = createTabBar({
    tabs: [
      { value: 'home', label: t(language(), 'tabHome') },
      { value: 'movements', label: t(language(), 'tabMovements'), enabled: false },
      { value: 'analysis', label: t(language(), 'tabAnalysis'), enabled: false },
    ],
    value: tab,
    onChange: (next) => {
      tab = next;
      view = 'home';
      paint();
    },
  });

  const shell = document.createElement('div');
  shell.className = 'app';
  shell.appendChild(screen);
  shell.appendChild(tabbar.el);
  root.replaceChildren(shell);

  function openRegister() {
    openRegisterSheet({ store, language: language(), now });
  }

  function openSettings() {
    view = 'settings';
    paint();
    screen.scrollTop = 0;
  }

  function closeSettings() {
    view = 'home';
    paint();
  }

  /* Repinta la pantalla activa. Se llama al arrancar y en cada
     mutación del estado. */
  function paint() {
    if (view === 'settings') {
      screen.replaceChildren(renderSettings({
        store,
        language: language(),
        onBack: closeSettings,
      }));
      return;
    }

    if (tab !== 'home') return;
    screen.replaceChildren(renderHome({
      store,
      language: language(),
      now,
      onRegister: openRegister,
      onSettings: openSettings,
    }));
  }

  const unsubscribe = store.subscribe(paint);
  paint();

  return {
    el: shell,
    openRegister,
    destroy() {
      unsubscribe();
      root.replaceChildren();
    },
  };
}
