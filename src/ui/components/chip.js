import './chip.css';

/*
  chip — píldora de una palabra, solo tipografía.

  Sin íconos, sin emojis, sin números. Se usa para la marca de
  estado al guardar un gasto y para filtros. Sin seleccionar:
  borde 1px --line, texto --ink-soft. Seleccionado: fondo
  --accent-soft, texto --accent, ensanchamiento de 4px con resorte.

    const c = createChip({ label: 'antojo', onToggle: (on) => {} });
    c.el                 // el <button>
    c.selected           // estado actual
    c.setSelected(true)  // fija el estado sin disparar onToggle
*/

export function createChip(options = {}) {
  const { label = '', selected = false, onToggle } = options;

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'chip';
  el.textContent = label;

  const api = {
    el,
    get selected() {
      return el.getAttribute('aria-pressed') === 'true';
    },
    setSelected(next) {
      el.setAttribute('aria-pressed', next ? 'true' : 'false');
    },
    toggle() {
      const next = !api.selected;
      api.setSelected(next);
      if (typeof onToggle === 'function') onToggle(next, label);
    },
  };

  api.setSelected(selected);
  el.addEventListener('click', api.toggle);

  return api;
}
