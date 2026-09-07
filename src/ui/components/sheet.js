import './sheet.css';
import { ico } from './ico.js';
import { attachSheetDrag } from '../drag-sheet.js';

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
  const { title = '', onClose, container = document.body, compact = false } = options;

  const el = document.createElement('div');
  el.className = 'sheet-overlay';

  const panel = document.createElement('div');
  /* compact: cabecera mínima y sin scroll propio en el cuerpo. La
     usa Registrar, donde el teclado y Guardar tienen que estar
     siempre a la vista y es el contenido el que decide qué encoge. */
  panel.className = compact ? 'sheet sheet--compact' : 'sheet';
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

  /* Se declara antes que api porque open y close lo usan. */
  let drag = null;

  const api = {
    el,
    body,
    open() {
      if (mounted) return;
      mounted = true;
      lastFocus = document.activeElement;
      container.appendChild(el);

      /* Abajo del todo antes del primer cuadro, y desde ahí sube con
         el resorte. Es la misma física con la que vuelve cuando se
         suelta a medias, así que agarrarla mientras sube la engancha
         donde esté en vez de esperar a que termine. */
      drag.placeOffscreen();
      drag.animateTo(0);

      /* El velo sí espera un cuadro: es una transición de opacidad y
         necesita que el estado inicial se haya pintado. La hoja no
         depende de ese cuadro —arranca ya— porque si los cuadros se
         retrasan, una opacidad tardía se ve mal y una hoja que nunca
         sube es una app rota. */
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

      /* Sale por donde entró, con el mismo resorte. */
      drag.animateTo(drag.height(), { onRest: remove });
      /* Red de seguridad: si el resorte no llegara a descansar —una
         pestaña en segundo plano no ejecuta cuadros— la hoja se
         quita igual. */
      setTimeout(remove, 900);
    },
  };

  closeBtn.addEventListener('click', api.close);
  el.addEventListener('click', (event) => {
    if (event.target === el) api.close();
  });

  /* Arrastrar hacia abajo para cerrar. El gesto vive aparte, en
     drag-sheet.js, porque no es cosa de esta hoja sino de cualquiera.

     canDrag decide si el gesto empieza. Se deja pasar cuando el dedo
     cae sobre algo desplazable que todavía tiene recorrido hacia
     arriba: ahí el gesto es scroll, no cierre. */
  drag = attachSheetDrag({
    panel,
    onClose: () => {
      /* El gesto ya la dejó fuera de pantalla: se desmonta sin volver
         a animar la salida. */
      api.close();
    },
    canDrag: (event) => {
      let node = event.target;
      while (node && node !== panel) {
        if (node.scrollHeight - node.clientHeight > 1 && node.scrollTop > 0) return false;
        node = node.parentElement;
      }
      return true;
    },
  });

  api.destroy = () => {
    drag.destroy();
    document.removeEventListener('keydown', onKeydown);
    el.remove();
  };

  return api;
}
