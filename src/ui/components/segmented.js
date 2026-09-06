import './segmented.css';

/*
  segmented — selección única entre 2 y 4 opciones.

  Gasto / Ingreso, Pasado / Por venir, Semana / Mes / 3M / Año.
  Opción activa: fondo --accent-soft, texto --accent. El cambio es
  un cruce de opacidad de 140ms, sin desplazamiento.

    const seg = createSegmented({
      options: [{ value: 'expense', label: 'Gasto' },
                { value: 'income',  label: 'Ingreso' }],
      value: 'expense',
      onChange: (v) => {},
    });
    seg.el
    seg.value
    seg.setValue('income')   // no dispara onChange
*/

function normalizeOption(option) {
  if (typeof option === 'string') return { value: option, label: option };
  return { value: option.value, label: option.label ?? String(option.value) };
}

export function createSegmented(options = {}) {
  const { options: rawOptions = [], value, onChange } = options;
  const items = rawOptions.map(normalizeOption);

  const el = document.createElement('div');
  el.className = 'segmented';
  el.setAttribute('role', 'radiogroup');

  let current = value ?? (items[0] && items[0].value);

  const buttons = items.map((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'segmented__option';
    button.setAttribute('role', 'radio');
    button.textContent = item.label;
    button.dataset.value = String(item.value);
    el.appendChild(button);
    return button;
  });

  function paint() {
    buttons.forEach((button, index) => {
      const active = items[index].value === current;
      button.setAttribute('aria-checked', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
  }

  const api = {
    el,
    get value() {
      return current;
    },
    setValue(next) {
      if (!items.some((item) => item.value === next)) return;
      current = next;
      paint();
    },
  };

  function choose(next, focus) {
    if (next === current) return;
    api.setValue(next);
    if (focus) {
      const index = items.findIndex((item) => item.value === next);
      if (index >= 0) buttons[index].focus();
    }
    if (typeof onChange === 'function') onChange(next);
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => choose(items[index].value, false));
    button.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
        : 0;
      if (step === 0) return;
      event.preventDefault();
      const nextIndex = (index + step + items.length) % items.length;
      choose(items[nextIndex].value, true);
    });
  });

  paint();
  return api;
}
