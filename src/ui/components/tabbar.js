import './tabbar.css';

/*
  tabbar — las tres pestañas. Nada más.

  Inicio · Movimientos · Análisis

  Sin swipe horizontal entre pestañas: se eliminó a propósito en esta
  versión. Se cambia tocando, y con las flechas cuando hay foco.

    const bar = createTabBar({
      tabs: [{ value: 'home', label: 'Inicio' }, ...],
      value: 'home',
      onChange: (value) => {},
    });
*/

export function createTabBar(options = {}) {
  const { tabs = [], value, onChange } = options;

  const el = document.createElement('nav');
  el.className = 'tabbar';
  el.setAttribute('role', 'tablist');
  el.setAttribute('aria-label', 'Secciones');

  let current = value ?? (tabs[0] && tabs[0].value);

  const buttons = tabs.map((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabbar__tab';
    button.setAttribute('role', 'tab');
    button.textContent = tab.label;
    button.dataset.value = String(tab.value);

    /* Una pestaña sin pantalla todavía se ve, pero no se puede
       activar. Fingir que lleva a algún sitio sería peor. */
    if (tab.enabled === false) {
      button.classList.add('tabbar__tab--pending');
      button.setAttribute('aria-disabled', 'true');
    }

    el.appendChild(button);
    return button;
  });

  function paint() {
    buttons.forEach((button, index) => {
      const active = tabs[index].value === current;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
  }

  function choose(next, focus) {
    const index = tabs.findIndex((tab) => tab.value === next);
    if (index === -1 || tabs[index].enabled === false || next === current) return;
    current = next;
    paint();
    if (focus) buttons[index].focus();
    if (typeof onChange === 'function') onChange(current);
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => choose(tabs[index].value, false));
    button.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      /* Se salta las pestañas que aún no existen. */
      for (let hop = 1; hop <= tabs.length; hop += 1) {
        const candidate = tabs[(index + step * hop + tabs.length * hop) % tabs.length];
        if (candidate && candidate.enabled !== false) {
          choose(candidate.value, true);
          return;
        }
      }
    });
  });

  paint();

  return {
    el,
    get value() {
      return current;
    },
    setValue(next) {
      const index = tabs.findIndex((tab) => tab.value === next);
      if (index === -1) return;
      current = next;
      paint();
    },
  };
}
