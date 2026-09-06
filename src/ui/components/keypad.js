import './keypad.css';

/*
  keypad — teclado numérico propio, no el nativo.

  Existe para poner Guardar junto al pulgar y para tener control
  del layout. Emite pulsaciones; la aritmética (18+25) y el formato
  los resuelve la lógica de la app, no este componente.

    const pad = createKeypad({ onKey: (key) => {} });
    pad.el
    // key: '0'..'9' | '.' | 'back'

  Con el foco dentro, el teclado físico (dígitos, punto,
  Backspace) también dispara onKey.
*/

const KEYS = [
  { key: '1', label: '1' }, { key: '2', label: '2' }, { key: '3', label: '3' },
  { key: '4', label: '4' }, { key: '5', label: '5' }, { key: '6', label: '6' },
  { key: '7', label: '7' }, { key: '8', label: '8' }, { key: '9', label: '9' },
  { key: '.', label: '.' }, { key: '0', label: '0' }, { key: 'back', label: '⌫' },
];

export function createKeypad(options = {}) {
  const { onKey } = options;

  const el = document.createElement('div');
  el.className = 'keypad';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Teclado numérico');

  function emit(key) {
    if (typeof onKey === 'function') onKey(key);
  }

  KEYS.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'keypad__key';
    if (entry.key === 'back') {
      button.classList.add('keypad__key--back');
      button.setAttribute('aria-label', 'Borrar');
    }
    button.textContent = entry.label;
    button.addEventListener('click', () => emit(entry.key));
    el.appendChild(button);
  });

  el.addEventListener('keydown', (event) => {
    if (event.key >= '0' && event.key <= '9') {
      emit(event.key);
    } else if (event.key === '.' || event.key === ',') {
      emit('.');
    } else if (event.key === 'Backspace') {
      emit('back');
    } else {
      return;
    }
    event.preventDefault();
  });

  return { el };
}
