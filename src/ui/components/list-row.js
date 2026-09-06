import './list-row.css';
import { ico } from './ico.js';

/*
  list-row — una fila de lista: glifo, concepto, metadato y monto.

  El glifo no es opcional: sostiene la alineación de la columna de
  conceptos. Si no se pasa uno, la fila usa el de cuenta.

  El monto llega ya formateado por el código de la app; este
  componente nunca calcula. positive y negative solo tiñen el texto
  del monto, nunca el fondo de la fila. Si se pasa onClick la fila
  entera es un botón (el camino de 2 taps en Registrar).

    createListRow({
      icon: 'alimentacion',
      title: 'Almuerzo',
      subtitle: 'Alimentación · BBVA',
      amount: '− S/ 18.00',
      amountKind: 'negative',
      onClick: () => {},
    })
*/

/* Toda fila lleva glifo: sin él, los conceptos no alinean con los
   de arriba y la lista se lee rota. Cuando no hay categoría que
   mostrar, el glifo neutro es el de cuenta. */
const FALLBACK_ICON = 'cuenta';

const AMOUNT_KINDS = new Set(['positive', 'negative', 'pledge', 'neutral', 'muted']);

export function createListRow(options = {}) {
  const {
    icon = FALLBACK_ICON,
    title = '',
    subtitle = '',
    amount = '',
    amountKind = 'neutral',
    onClick,
  } = options;

  const interactive = typeof onClick === 'function';
  const el = document.createElement(interactive ? 'button' : 'div');
  el.className = 'list-row';
  if (interactive) {
    el.type = 'button';
    el.addEventListener('click', onClick);
  }

  const iconWrap = document.createElement('span');
  iconWrap.className = 'list-row__icon';
  iconWrap.appendChild(ico(icon || FALLBACK_ICON));
  el.appendChild(iconWrap);

  const body = document.createElement('span');
  body.className = 'list-row__body';

  const titleEl = document.createElement('span');
  titleEl.className = 'list-row__title';
  titleEl.textContent = title;
  body.appendChild(titleEl);

  if (subtitle) {
    const subtitleEl = document.createElement('span');
    subtitleEl.className = 'list-row__subtitle';
    subtitleEl.textContent = subtitle;
    body.appendChild(subtitleEl);
  }

  el.appendChild(body);

  if (amount) {
    const kind = AMOUNT_KINDS.has(amountKind) ? amountKind : 'neutral';
    const amountEl = document.createElement('span');
    amountEl.className = 'list-row__amount money';
    if (kind !== 'neutral') amountEl.classList.add(`list-row__amount--${kind}`);
    amountEl.textContent = amount;
    el.appendChild(amountEl);
  }

  return el;
}
