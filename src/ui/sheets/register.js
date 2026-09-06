import './register.css';

import { createSheet } from '../components/sheet.js';
import { createSegmented } from '../components/segmented.js';
import { createKeypad } from '../components/keypad.js';
import { createListRow } from '../components/list-row.js';
import { createGhostField } from '../components/ghost-field.js';

import { parseEntry } from '../../logic/parse.js';
import { suggest, ghostCompletion, recordUsage } from '../../logic/predict.js';
import { resolveDraft } from '../../logic/entry.js';
import { iconForCategory } from '../../logic/seed.js';

import { addOperation, removeOperation, updateOperation } from '../../state/store.js';
import { money } from '../format.js';
import { showToast } from '../toast-host.js';
import { t, stateLabels } from '../../copy.js';

/*
  register — la hoja de Registrar. La pantalla que decide si el
  producto funciona.

  Un solo campo. El teclado propio escribe en él, y lo que se escriba
  lo interpreta la capa 2; lo que se sugiere debajo lo ordena la capa
  1. Tocar una sugerencia guarda directamente: ese es el camino de
  dos taps.

  El campo nunca bloquea. Cualquier texto más Guardar produce un
  movimiento válido: cuenta, fecha y categoría se rellenan solas y
  son editables después.
*/

/* Sección 5: debounce de 120ms sobre el índice local. */
export const SUGGEST_DEBOUNCE_MS = 120;

/* Abre la hoja. Devuelve la api de la hoja por si hay que cerrarla
   desde fuera. */
export function openRegisterSheet(options = {}) {
  const { store, language = 'es', now = () => new Date() } = options;

  const sheet = createSheet({ title: t(language, 'register') });
  let type = 'expense';
  let timer = 0;

  /* -------- tipo -------- */
  const kind = createSegmented({
    options: [
      { value: 'expense', label: t(language, 'expense') },
      { value: 'income', label: t(language, 'income') },
    ],
    value: type,
    onChange: (next) => {
      type = next;
      field.setPlaceholder(placeholderFor(language, type));
      refresh();
    },
  });

  /* -------- campo con texto fantasma -------- */
  const field = createGhostField({
    placeholder: placeholderFor(language, type),
    ariaLabel: t(language, 'register'),
    onInput: () => scheduleRefresh(),
    onSubmit: () => commit({ raw: field.value }),
  });

  /* -------- sugerencias -------- */
  const list = document.createElement('div');
  list.className = 'register__suggestions';
  list.setAttribute('role', 'list');

  const empty = document.createElement('p');
  empty.className = 'register__empty';
  empty.textContent = t(language, 'emptySuggestions');

  /* -------- teclado propio --------
     No levanta el teclado nativo: escribe en el campo sin darle el
     foco, que es justo lo que permite tener Guardar junto al pulgar. */
  const keypad = createKeypad({
    onKey: (key) => {
      if (key === 'back') field.backspace();
      else field.insert(separatorBefore(field.value, key) + key);
      scheduleRefresh();
    },
  });

  /* -------- guardar -------- */
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'register__save';
  saveButton.textContent = t(language, 'save');
  saveButton.addEventListener('click', () => commit({ raw: field.value }));

  sheet.body.appendChild(wrap('register', [
    kind.el,
    field.el,
    list,
    empty,
    keypad.el,
    saveButton,
  ]));

  /* ------------------------------------------------------------------
     Ciclo de sugerencias
     ------------------------------------------------------------------ */

  function scheduleRefresh() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(refresh, SUGGEST_DEBOUNCE_MS);
  }

  function refresh() {
    if (timer) { clearTimeout(timer); timer = 0; }

    const state = store.getState();
    const reference = now();
    const raw = field.value;
    const parsed = parseEntry(raw, {
      accounts: state.accounts,
      now: reference,
      enabledCurrencies: state.settings.enabledCurrencies,
    });

    /* Se busca por el concepto ya limpio de monto, fecha y cuenta:
       escribir "uber 18" tiene que seguir encontrando uber. */
    const query = parsed.concept;
    const results = suggest(state, query, { now: reference });

    /* El fantasma solo completa cuando lo escrito es únicamente el
       concepto. En "uber 18" la compleción sobraría: el monto ya
       está escrito y alargar el texto sería estorbar. */
    const onlyConcept = !parsed.recognized.amount
      && !parsed.recognized.date
      && !parsed.recognized.account
      && !parsed.recognized.type;
    field.setGhost(onlyConcept ? ghostCompletion(state, raw, { now: reference }) : '');

    list.replaceChildren();
    for (const suggestion of results) {
      list.appendChild(suggestionRow(state, suggestion, parsed, language, reference));
    }

    empty.hidden = results.length > 0;
    list.hidden = results.length === 0;
  }

  function suggestionRow(state, suggestion, parsed, lang, reference) {
    /* Lo que se escribió manda sobre lo que se recuerda: si el campo
       dice 25, la fila ofrece 25 aunque la última vez fueran 18. */
    const amountMinor = parsed.amountMinor !== null ? parsed.amountMinor : suggestion.amountMinor;
    const currency = parsed.currency || suggestion.currency || state.settings.activeCurrency;

    const meta = [suggestion.category, suggestion.accountName].filter(Boolean).join(' · ');

    const row = createListRow({
      icon: iconForCategory(suggestion.category),
      title: suggestion.text,
      subtitle: meta,
      amount: amountMinor ? money(amountMinor, currency) : '',
      amountKind: 'neutral',
      onClick: () => commit({ raw: field.value, suggestion, reference }),
    });
    row.setAttribute('role', 'listitem');
    return row;
  }

  /* ------------------------------------------------------------------
     Guardar
     ------------------------------------------------------------------ */

  function commit(input) {
    const state = store.getState();
    const reference = input.reference || now();

    const draft = resolveDraft(state, {
      raw: input.raw,
      chosenType: type,
      suggestion: input.suggestion || null,
      now: reference,
      language,
    });

    if (!draft.accountId) {
      showToast({ message: t(language, 'noAccount'), duration: 4000 });
      return;
    }

    let operation = null;
    try {
      operation = addOperation(store, draft);
    } catch (error) {
      showToast({ message: t(language, 'saveFailed'), duration: 4000 });
      return;
    }

    sheet.close();
    confirmSaved(store, operation, language);
  }

  refresh();
  sheet.open();
  return sheet;
}

/* ------------------------------------------------------------------
   Confirmación

   El toast lleva la ventana de deshacer y, tras un gasto, la marca
   de estado. Se define aparte porque también la usará la fase 4 al
   confirmar algo de Por venir.
   ------------------------------------------------------------------ */

export function confirmSaved(store, operation, language) {
  const amount = money(operation.amountMinor, operation.currency);

  showToast({
    message: t(language, 'saved', amount),
    actionLabel: t(language, 'undo'),
    /* Un ingreso no lleva marca de estado: la pregunta es por qué
       gastaste, no por qué cobraste. */
    chips: operation.type === 'expense' ? stateLabels(language) : [],
    onChip: (label) => updateOperation(store, operation.id, { state: label }),
    onAction: () => {
      removeOperation(store, operation.id);
      showToast({ message: t(language, 'undone'), duration: 2400 });
    },
    onDismiss: (reason) => {
      /* Solo se aprende de lo que sobrevive a la ventana de deshacer.
         Un movimiento revertido no debe enseñarle nada al índice. */
      if (reason !== 'action') recordUsage(store, operation);
    },
  });
}

/* ------------------------------------------------------------------
   Auxiliares de la hoja
   ------------------------------------------------------------------ */

function placeholderFor(language, type) {
  return t(language, type === 'income' ? 'conceptPlaceholderIncome' : 'conceptPlaceholder');
}

/* El teclado escribe pegado al texto salvo que haga falta separar:
   "uber" más 1 tiene que dar "uber 1", no "uber1". */
function separatorBefore(value, key) {
  if (!value) return '';
  const last = value.slice(-1);
  if (last === ' ') return '';
  if (key === '.' ) return '';
  if (/[\d.+-]/.test(last)) return '';
  return ' ';
}

function wrap(className, children) {
  const el = document.createElement('div');
  el.className = className;
  for (const child of children) el.appendChild(child);
  return el;
}
