import './toast.css';

/*
  toast — confirmación efímera con ventana de deshacer de 4s.

  Proyecta sombra porque de verdad flota (--shadow-toast).

    const t = createToast({
      message: 'Guardado · − S/ 18.00',
      detail: 'Es tu 3er antojo esta semana',
      actionLabel: 'Deshacer',
      onAction: () => {},
      duration: 4000,
      onDismiss: (reason) => {},   // 'timeout' | 'action' | 'manual'
    });
    t.el
    t.dismiss()

  El toast pide una sola cosa: deshacer. Llevó una fila de chips para
  la marca de estado y no funcionaba —competía con Deshacer por los
  mismos cuatro segundos, y para entonces la atención ya se había
  ido—. La marca se pide ahora antes de guardar, en el paso 2 de
  Registrar. Lo que sí aparece aquí es lo que esa marca devuelve.
*/

export function createToast(options = {}) {
  const {
    message = '',
    detail = '',
    actionLabel = '',
    onAction,
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
      /* Se cierra antes de ejecutar la acción, no después. Si la
         acción abre otro toast —deshacer lo hace: dice "Listo,
         revertido"— ese toast cierra al anterior, y si el anterior
         siguiera abierto se cerraría con el motivo equivocado. Quien
         escuche onDismiss tiene que enterarse de que hubo acción. */
      finish('action');
      if (typeof onAction === 'function') onAction();
    });
    line.appendChild(actionEl);
  }

  el.appendChild(line);

  /* Lo que la marca devuelve. Una línea, debajo, en gris suave: es un
     dato, no una felicitación. */
  if (detail) {
    const detailEl = document.createElement('p');
    detailEl.className = 'toast__detail';
    detailEl.textContent = detail;
    el.appendChild(detailEl);
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
