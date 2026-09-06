import './toast.css';
import { createChip } from './chip.js';

/*
  toast — confirmación efímera con ventana de deshacer de 4s.

  Tras guardar un gasto lleva además la fila de chips de marca de
  estado: un tap, opcional, se ignora esperando. Proyecta sombra
  porque de verdad flota (--shadow-toast).

    const t = createToast({
      message: 'Guardado · S/ 18.00',
      actionLabel: 'Deshacer',
      onAction: () => {},
      chips: ['normal', 'apuro', 'antojo'],
      onChip: (label) => {},
      duration: 4000,
      onDismiss: (reason) => {},   // 'timeout' | 'action' | 'chip' | 'manual'
    });
    t.el
    t.dismiss()
*/

export function createToast(options = {}) {
  const {
    message = '',
    actionLabel = '',
    onAction,
    chips = [],
    onChip,
    duration = 4000,
    onDismiss,
  } = options;

  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');

  const line = document.createElement('div');
  line.className = 'toast__line';

  const messageEl = document.createElement('span');
  messageEl.className = 'toast__message';
  messageEl.textContent = message;
  line.appendChild(messageEl);

  let timer = 0;
  let done = false;

  function finish(reason) {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    el.classList.add('toast--leaving');
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      el.remove();
      if (typeof onDismiss === 'function') onDismiss(reason);
    };
    el.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, 240);
  }

  if (actionLabel) {
    const actionEl = document.createElement('button');
    actionEl.type = 'button';
    actionEl.className = 'toast__action';
    actionEl.textContent = actionLabel;
    actionEl.addEventListener('click', () => {
      if (typeof onAction === 'function') onAction();
      finish('action');
    });
    line.appendChild(actionEl);
  }

  el.appendChild(line);

  if (chips.length > 0) {
    const chipsRow = document.createElement('div');
    chipsRow.className = 'toast__chips';
    const built = [];
    chips.forEach((label) => {
      const chip = createChip({
        label,
        onToggle: (selected) => {
          built.forEach((other) => {
            if (other !== chip) other.setSelected(false);
          });
          if (selected && typeof onChip === 'function') onChip(label);
          if (selected) finish('chip');
        },
      });
      built.push(chip);
      chipsRow.appendChild(chip.el);
    });
    el.appendChild(chipsRow);
  }

  if (duration > 0) {
    timer = setTimeout(() => finish('timeout'), duration);
  }

  return {
    el,
    dismiss() {
      finish('manual');
    },
  };
}
