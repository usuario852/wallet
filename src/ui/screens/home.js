import './home.css';

import { createListRow } from '../components/list-row.js';
import { ico } from '../components/ico.js';
import { money, operationAmount } from '../format.js';
import { iconForCategory } from '../../logic/seed.js';
import { nowLocalISO } from '../../logic/parse.js';
import { totalsByCurrency, operationsInPeriod } from '../../state/derive.js';
import { updateSettings } from '../../state/store.js';
import { t } from '../../copy.js';

/*
  home — Inicio.

  El número grande es el saldo total: la suma de las cuentas
  regulares de la moneda activa. Las de reserva no entran.

  Debajo, en ámbar, lo que ya tiene dueño: disponible, comprometido
  y por cobrar. La reserva va en la misma línea pero en --ink-soft,
  porque no es un compromiso sino información.

  Ningún número negativo se muestra en 44px.
*/

/* Máximo de movimientos del día en el inicio. */
export const TODAY_LIMIT = 3;

export function renderHome(options = {}) {
  const { store, language = 'es', onRegister, onSettings, now = () => new Date() } = options;
  const state = store.getState();
  const currency = state.settings.activeCurrency;
  const totals = totalsByCurrency(state).get(currency) || emptyTotals(currency);

  const el = document.createElement('section');
  el.className = 'home';

  el.appendChild(renderHeader(store, state, language, onSettings));
  el.appendChild(renderBalance(store, state, totals, language));
  el.appendChild(renderToday(state, language, now));
  el.appendChild(renderRegister(language, onRegister));

  return el;
}

/* ------------------------------------------------------------------
   Cabecera: monedas activas y ajustes
   ------------------------------------------------------------------ */

function renderHeader(store, state, language, onSettings) {
  const header = document.createElement('header');
  header.className = 'home__header';

  const currencies = document.createElement('div');
  currencies.className = 'home__currencies';
  currencies.setAttribute('role', 'radiogroup');
  currencies.setAttribute('aria-label', 'Moneda activa');

  for (const code of state.settings.enabledCurrencies) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'home__currency';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', code === state.settings.activeCurrency ? 'true' : 'false');
    button.textContent = code;
    button.addEventListener('click', () => updateSettings(store, { activeCurrency: code }));
    currencies.appendChild(button);
  }
  header.appendChild(currencies);

  /* Ajustes existe pero está a medias: por ahora solo lleva importar
     y exportar, que es lo único que no puede esperar a la fase 7. El
     estado vive en cada navegador, y sin esto los datos se quedan
     encerrados en el que los creó. */
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'home__settings';
  settings.setAttribute('aria-label', t(language, 'settings'));
  settings.appendChild(ico('ajustes'));
  settings.addEventListener('click', () => {
    if (typeof onSettings === 'function') onSettings();
  });
  header.appendChild(settings);

  return header;
}

/* ------------------------------------------------------------------
   Saldo
   ------------------------------------------------------------------ */

function renderBalance(store, state, totals, language) {
  const block = document.createElement('div');
  block.className = 'home__balance-block';

  const hidden = Boolean(state.settings.balanceHidden);
  const negative = totals.totalMinor < 0;

  const amount = document.createElement('button');
  amount.type = 'button';
  amount.className = 'home__balance money';
  /* Ningún número negativo se muestra en 44px: cuando el saldo baja
     de cero, el mismo dato baja a tamaño de título. La jerarquía
     tipográfica no amplifica malas noticias. */
  if (negative) amount.classList.add('home__balance--reduced');
  if (hidden) amount.classList.add('home__balance--hidden');
  amount.textContent = money(totals.totalMinor, state.settings.activeCurrency, { sign: 'auto' });
  amount.setAttribute('aria-label', t(language, hidden ? 'showBalance' : 'hideBalance'));

  /* El momento firmado. Solo hay uno en toda la app. */
  amount.addEventListener('click', () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
    updateSettings(store, { balanceHidden: !hidden });
  });
  block.appendChild(amount);

  const label = document.createElement('p');
  label.className = 'home__balance-label';
  label.textContent = t(language, 'balanceLabel');
  block.appendChild(label);

  const secondary = document.createElement('dl');
  secondary.className = 'home__secondary';

  /* El disponible solo va en ámbar cuando está bajo cero. En
     positivo no hay nada que señalar: es información, y va en gris
     suave como la reserva. */
  addFigure(secondary, t(language, 'available'),
    money(totals.availableMinor, null, { cents: 'auto', sign: 'auto' }),
    totals.availableMinor < 0 ? 'pledge' : 'soft');

  /* Comprometido y por cobrar sí describen dinero con dueño, así que
     van siempre en ámbar. Se dibujan siempre que existan, en
     cualquier ancho: no hay ninguna que se esconda por falta de
     sitio, la línea envuelve. */
  if (totals.pledgedMinor) {
    addFigure(secondary, t(language, 'pledged'),
      money(totals.pledgedMinor, null, { cents: 'auto', sign: 'expense' }), 'pledge');
  }
  if (totals.receivableMinor) {
    addFigure(secondary, t(language, 'receivable'),
      money(totals.receivableMinor, null, { cents: 'auto', sign: 'income' }), 'pledge');
  }
  /* La reserva no es un compromiso: nadie la reclama y no reduce el
     disponible. Va en gris suave. */
  if (totals.reserveMinor) {
    addFigure(secondary, t(language, 'reserved'),
      money(totals.reserveMinor, null, { cents: 'auto' }), 'soft');
  }

  block.appendChild(secondary);
  return block;
}

function addFigure(list, label, value, tone) {
  const row = document.createElement('div');
  row.className = 'home__figure home__figure--' + tone;

  const valueEl = document.createElement('dd');
  valueEl.className = 'home__figure-value money';
  valueEl.textContent = value;

  const labelEl = document.createElement('dt');
  labelEl.className = 'home__figure-label';
  labelEl.textContent = label;

  row.appendChild(valueEl);
  row.appendChild(labelEl);
  list.appendChild(row);
}

/* ------------------------------------------------------------------
   Hoy
   ------------------------------------------------------------------ */

function renderToday(state, language, now) {
  const block = document.createElement('div');
  block.className = 'home__today';

  const heading = document.createElement('h2');
  heading.className = 'home__section-title';
  heading.textContent = t(language, 'today');
  block.appendChild(heading);

  const today = nowLocalISO(now()).slice(0, 10);
  const operations = operationsInPeriod(state, { from: today, to: today })
    .slice()
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, TODAY_LIMIT);

  if (operations.length === 0) {
    const message = document.createElement('p');
    message.className = 'home__empty';
    /* Dos vacíos distintos: no hay nada hoy, o no hay nada nunca.
       El segundo es una invitación; el primero, un dato. */
    const everRecorded = state.operations.some((operation) => !operation.voided);
    message.textContent = t(language, everRecorded ? 'emptyToday' : 'emptyEver');
    block.appendChild(message);
    return block;
  }

  const accounts = new Map(state.accounts.map((account) => [account.id, account]));
  const list = document.createElement('div');
  list.className = 'home__list';

  for (const operation of operations) {
    /* Una transferencia y un cambio de divisa no tienen accountId:
       tienen origen y destino. Se nombra el origen, que es de donde
       sale el dinero. */
    const account = accounts.get(operation.accountId || operation.fromAccountId);
    const meta = [operation.category, account ? account.name : '', operation.state]
      .filter(Boolean).join(' · ');

    /* El monto lo decide operationAmount, que conoce los cinco tipos.
       Aquí no se vuelve a suponer que toda operación tiene
       amountMinor. */
    const amount = operationAmount(operation);

    list.appendChild(createListRow({
      icon: iconForCategory(operation.category),
      title: operation.concept,
      subtitle: meta,
      amount: amount.text,
      amountKind: amount.kind,
    }));
  }
  block.appendChild(list);

  /* Ver todo lleva a Movimientos, que llega en la fase 4. */
  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'home__see-all is-pending';
  seeAll.setAttribute('aria-disabled', 'true');
  seeAll.textContent = t(language, 'seeAll');
  block.appendChild(seeAll);

  return block;
}

/* ------------------------------------------------------------------
   Registrar
   ------------------------------------------------------------------ */

function renderRegister(language, onRegister) {
  const holder = document.createElement('div');
  holder.className = 'home__register';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'home__register-button';
  button.textContent = t(language, 'register');
  button.addEventListener('click', () => {
    if (typeof onRegister === 'function') onRegister();
  });

  holder.appendChild(button);
  return holder;
}

function emptyTotals(currency) {
  return {
    currency,
    regularMinor: 0, reserveMinor: 0, totalMinor: 0,
    pledgedMinor: 0, receivableMinor: 0, availableMinor: 0,
  };
}
