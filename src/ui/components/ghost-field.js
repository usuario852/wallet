import './ghost-field.css';

/*
  ghost-field — el campo único de Registrar, con texto fantasma.

    Campo:   alm
    Muestra: alm[uerzo]     ← el resto en --ink-soft

    Aceptar con: flecha derecha, tecla Tab, o tocar el texto gris

  Cómo está hecho: un espejo detrás del input, con la parte ya
  escrita en transparente y el resto en gris. El input de arriba
  pinta el texto real y conserva el cursor y la selección del
  sistema. Los dos comparten métricas de fuente exactas; si alguien
  cambia el padding de uno, tiene que cambiarlo en el otro.

    const field = createGhostField({
      onInput: (value) => {},
      onSubmit: () => {},        // Enter
    });
    field.el
    field.value                  // lectura y escritura
    field.setGhost('uerzo')
    field.focus()
*/

export function createGhostField(options = {}) {
  const {
    value = '',
    placeholder = '',
    ariaLabel = '',
    onInput,
    onSubmit,
    onAccept,
  } = options;

  const el = document.createElement('div');
  el.className = 'ghost-field';

  const mirror = document.createElement('div');
  mirror.className = 'ghost-field__mirror';
  mirror.setAttribute('aria-hidden', 'true');

  const typedEl = document.createElement('span');
  typedEl.className = 'ghost-field__typed';

  const ghostEl = document.createElement('span');
  ghostEl.className = 'ghost-field__ghost';

  mirror.appendChild(typedEl);
  mirror.appendChild(ghostEl);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ghost-field__input';
  input.value = value;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  /* Safari en iOS solo respeta autocorrect como atributo. El
     autocorrector no sabe de "chifa" ni de "Yape". */
  input.setAttribute('autocorrect', 'off');
  /* El navegador no debe autocompletar por su cuenta: aquí completa
     el índice local, que sabe de qué gasta esta persona. */
  input.setAttribute('aria-autocomplete', 'inline');
  if (ariaLabel) input.setAttribute('aria-label', ariaLabel);

  el.appendChild(mirror);
  el.appendChild(input);

  let ghost = '';

  function paintMirror() {
    typedEl.textContent = input.value;
    ghostEl.textContent = ghost;
  }

  function accept() {
    if (!ghost) return false;
    const completed = input.value + ghost;
    input.value = completed;
    ghost = '';
    paintMirror();
    input.setSelectionRange(completed.length, completed.length);
    if (typeof onAccept === 'function') onAccept(completed);
    if (typeof onInput === 'function') onInput(completed);
    return true;
  }

  const api = {
    el,
    input,
    get value() {
      return input.value;
    },
    set value(next) {
      input.value = next === null || next === undefined ? '' : String(next);
      ghost = '';
      paintMirror();
    },
    get ghost() {
      return ghost;
    },
    setGhost(next) {
      ghost = String(next || '');
      paintMirror();
    },
    setPlaceholder(next) {
      input.placeholder = next || '';
    },
    focus() {
      input.focus();
    },
    /* Escribe en la posición del cursor sin robarle el foco al
       documento: lo usa el teclado propio, que no debe levantar el
       teclado nativo del sistema. */
    insert(text) {
      const start = input.selectionStart === null ? input.value.length : input.selectionStart;
      const end = input.selectionEnd === null ? input.value.length : input.selectionEnd;
      const next = input.value.slice(0, start) + text + input.value.slice(end);
      input.value = next;
      const caret = start + text.length;
      input.setSelectionRange(caret, caret);
      ghost = '';
      paintMirror();
      if (typeof onInput === 'function') onInput(next);
    },
    /* Borra el carácter anterior al cursor, o la selección. */
    backspace() {
      const start = input.selectionStart === null ? input.value.length : input.selectionStart;
      const end = input.selectionEnd === null ? input.value.length : input.selectionEnd;
      let next;
      let caret;
      if (start !== end) {
        next = input.value.slice(0, start) + input.value.slice(end);
        caret = start;
      } else if (start > 0) {
        next = input.value.slice(0, start - 1) + input.value.slice(start);
        caret = start - 1;
      } else {
        return;
      }
      input.value = next;
      input.setSelectionRange(caret, caret);
      ghost = '';
      paintMirror();
      if (typeof onInput === 'function') onInput(next);
    },
  };

  input.addEventListener('input', () => {
    ghost = '';
    paintMirror();
    if (typeof onInput === 'function') onInput(input.value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (typeof onSubmit === 'function') onSubmit(input.value);
      return;
    }

    /* Tab acepta la compleción; si no hay ninguna, Tab hace lo suyo
       y sale del campo, que es lo que espera quien navega con
       teclado. */
    if (event.key === 'Tab' && ghost && !event.shiftKey) {
      if (accept()) event.preventDefault();
      return;
    }

    /* La flecha derecha solo acepta si el cursor está al final; en
       medio del texto sirve para moverse, como en cualquier campo. */
    if (event.key === 'ArrowRight' && ghost && input.selectionStart === input.value.length) {
      if (accept()) event.preventDefault();
    }
  });

  /* Tocar el texto gris lo acepta. */
  ghostEl.addEventListener('mousedown', (event) => {
    event.preventDefault();
    accept();
    input.focus();
  });

  paintMirror();
  return api;
}
