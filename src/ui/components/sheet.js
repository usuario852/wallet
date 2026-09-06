import './sheet.css';
import { ico } from './ico.js';

/*
  sheet — hoja inferior. El contenedor de Registrar, Cuenta,
  Por venir y Confirmar.

  Sube con resorte (rigidez 300, amortiguación 30, aquí como curva
  de salida). Radio 24px arriba, 0 abajo. Proyecta sombra porque
  de verdad flota (--shadow-sheet). Se cierra con el fondo, con la
  X o con Escape.

    const s = createSheet({ title: 'Registrar', onClose: () => {} });
    s.body.append(...)     // contenido
    s.open()               // monta y anima la entrada
    s.close()              // anima la salida y desmonta
    s.el                   // el overlay

  Por defecto se monta en document.body; se puede pasar otro
  contenedor con la opción container.
*/

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export function createSheet(options = {}) {
  const { title = '', onClose, container = document.body } = options;

  const el = document.createElement('div');
  el.className = 'sheet-overlay';

  const panel = document.createElement('div');
  panel.className = 'sheet';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');

  const header = document.createElement('div');
  header.className = 'sheet__header';

  const titleEl = document.createElement('h2');
  titleEl.className = 'sheet__title';
  titleEl.id = `sheet-title-${Math.random().toString(36).slice(2, 8)}`;
  titleEl.textContent = title;
  panel.setAttribute('aria-labelledby', titleEl.id);
  header.appendChild(titleEl);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'sheet__close';
  closeBtn.setAttribute('aria-label', 'Cerrar');
  closeBtn.appendChild(ico('cerrar'));
  header.appendChild(closeBtn);

  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'sheet__body';
  panel.appendChild(body);

  el.appendChild(panel);

  let mounted = false;
  let lastFocus = null;

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      api.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = panel.querySelectorAll(FOCUSABLE);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const api = {
    el,
    body,
    open() {
      if (mounted) return;
      mounted = true;
      lastFocus = document.activeElement;
      container.appendChild(el);
      requestAnimationFrame(() => el.classList.add('sheet-overlay--open'));
      document.addEventListener('keydown', onKeydown);
      const target = panel.querySelector(FOCUSABLE) || closeBtn;
      target.focus();
    },
    close() {
      if (!mounted) return;
      mounted = false;
      document.removeEventListener('keydown', onKeydown);
      el.classList.remove('sheet-overlay--open');
      let removed = false;
      const remove = () => {
        if (removed) return;
        removed = true;
        el.remove();
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        if (typeof onClose === 'function') onClose();
      };
      panel.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, 360);
    },
  };

  closeBtn.addEventListener('click', api.close);
  el.addEventListener('click', (event) => {
    if (event.target === el) api.close();
  });

  return api;
}
