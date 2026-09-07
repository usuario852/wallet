import './register.css';

import { createSheet } from '../components/sheet.js';
import { createSegmented } from '../components/segmented.js';
import { createKeypad } from '../components/keypad.js';
import { createListRow } from '../components/list-row.js';
import { createGhostField } from '../components/ghost-field.js';
import { ico } from '../components/ico.js';

import { parseEntry } from '../../logic/parse.js';
import { suggest, ghostCompletion, recordUsage } from '../../logic/predict.js';
import { resolveDraft } from '../../logic/entry.js';
import { iconForCategory } from '../../logic/seed.js';

import { createChip } from '../components/chip.js';

import { addOperation, removeOperation } from '../../state/store.js';
import { money, operationAmount } from '../format.js';
import { showToast } from '../toast-host.js';
import { markInsight } from '../../logic/mark.js';
import { t, stateLabels, markPhrase, STATE_PRIMARY } from '../../copy.js';

/*
  register — la hoja de Registrar, en tres pasos.

  La regla que ordena la pantalla entera: nunca hay dos teclados a la
  vez. Un campo de texto y un teclado numérico propio no caben juntos
  en un móvil, porque al enfocar el campo sube el del sistema y tapa
  al otro y a Guardar. No es un problema de altura: los dos compiten
  por la mitad inferior, que es la única que importa.

    Paso 1 · Elegir   ningún teclado
    Paso 2 · Monto    solo el numérico propio
    Paso 3 · Buscar   solo el del sistema

  La lógica no cambia: predict, parse y entry son los mismos, y por
  ahí siguen pasando el aprendizaje de correcciones, la validación
  del monto y la marca de estado.
*/

/* Sección 5: debounce de 120ms sobre el índice local. */
export const SUGGEST_DEBOUNCE_MS = 120;

/* Cuántas sugerencias caben en el paso 1. Las que no quepan se
   recortan midiendo, igual que antes. */
export const CHOOSE_LIMIT = 8;

/* Deslizamiento entre pasos. */
export const STEP_MS = 180;

export function openRegisterSheet(options = {}) {
  const { store, language = 'es', now = () => new Date() } = options;

  const sheet = createSheet({ title: t(language, 'register'), compact: true });

  let type = 'expense';
  let step = 'choose';
  let chosen = null;      /* la sugerencia elegida, si viene del paso 1 o 3 */
  let conceptText = '';   /* el concepto en crudo cuando se escribió a mano */
  let timer = 0;

  /* La ventana recorta; el carril se desliza dentro. Van separados
     para que el recorte caiga en el borde real de la hoja y no en su
     padding, donde asomaría el paso vecino. */
  const viewport = document.createElement('div');
  viewport.className = 'register';

  const track = document.createElement('div');
  track.className = 'register__track';
  viewport.appendChild(track);

  const chooseStep = document.createElement('div');
  chooseStep.className = 'register__step register__step--choose';

  const amountStep = document.createElement('div');
  amountStep.className = 'register__step register__step--amount';

  const searchStep = document.createElement('div');
  searchStep.className = 'register__step register__step--search';

  track.appendChild(chooseStep);
  track.appendChild(amountStep);
  track.appendChild(searchStep);
  sheet.body.appendChild(viewport);

  /* ------------------------------------------------------------------
     Paso 1 · Elegir. Ningún teclado.
     ------------------------------------------------------------------ */

  const kind = createSegmented({
    options: [
      { value: 'expense', label: t(language, 'expense') },
      { value: 'income', label: t(language, 'income') },
    ],
    value: type,
    onChange: (next) => {
      type = next;
      paintChoices();
    },
  });

  /* No es un campo: es un botón. No tiene foco de texto, no recibe
     escritura y no levanta ningún teclado. Lleva al paso 3. */
  const searchRow = document.createElement('button');
  searchRow.type = 'button';
  searchRow.className = 'register__search-row';
  searchRow.appendChild(ico('buscar'));
  const searchLabel = document.createElement('span');
  searchLabel.textContent = t(language, 'searchOrType');
  searchRow.appendChild(searchLabel);
  searchRow.addEventListener('click', () => goTo('search'));

  const choices = document.createElement('div');
  choices.className = 'register__choices';
  choices.setAttribute('role', 'list');

  const choicesEmpty = document.createElement('p');
  choicesEmpty.className = 'register__empty';
  choicesEmpty.textContent = t(language, 'emptySuggestions');

  chooseStep.appendChild(kind.el);
  chooseStep.appendChild(searchRow);
  chooseStep.appendChild(wrap('register__flex', [choices, choicesEmpty]));

  /* ------------------------------------------------------------------
     Paso 2 · Monto. Solo el teclado propio.
     ------------------------------------------------------------------ */

  const amountBack = document.createElement('button');
  amountBack.type = 'button';
  amountBack.className = 'register__back';
  amountBack.setAttribute('aria-label', t(language, 'back'));
  amountBack.appendChild(ico('volver'));
  amountBack.addEventListener('click', () => goTo('choose'));

  const amountTitle = document.createElement('p');
  amountTitle.className = 'register__concept';

  const amountMeta = document.createElement('p');
  amountMeta.className = 'register__concept-meta';

  const amountHeader = wrap('register__header', [
    amountBack,
    wrap('register__header-text', [amountTitle, amountMeta]),
  ]);

  const amountValue = document.createElement('p');
  amountValue.className = 'register__amount money';
  amountValue.setAttribute('role', 'status');

  const amountHint = document.createElement('p');
  amountHint.className = 'register__hint';
  amountHint.setAttribute('role', 'status');

  /* El teclado propio escribe aquí y en ningún campo de texto, así
     que el teclado del sistema no tiene por qué aparecer. */
  const keypad = createKeypad({
    onKey: (key) => {
      clearHint();
      if (key === 'back') pressBackspace();
      else pressDigit(key);
      paintAmount();
    },
  });

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'register__save';
  saveButton.textContent = t(language, 'save');
  saveButton.addEventListener('click', () => commitFromAmount());

  /* -------- marca de estado --------
     Aquí y no en el toast. En el toast competía con Deshacer por los
     mismos cuatro segundos y llegaba cuando la atención ya se había
     ido. Aquí el usuario está mirando la pantalla, no hay otra
     decisión pendiente, y no cuesta ningún tap: es opcional y no
     bloquea Guardar. */
  const marks = createMarkRow(language, (label) => { mark = label; });

  amountStep.appendChild(amountHeader);
  amountStep.appendChild(wrap('register__amount-box', [amountValue, amountHint]));
  amountStep.appendChild(marks.el);
  amountStep.appendChild(keypad.el);
  amountStep.appendChild(saveButton);

  /* La marca elegida, o null. Se reinicia con cada concepto. */
  let mark = null;

  /* Lo tecleado, como texto: admite el punto decimal a medio escribir
     y la aritmética que resuelve parse al guardar. */
  let typed = '';
  /* El valor recordado llega seleccionado: el primer dígito lo
     reemplaza entero en vez de añadirse. */
  let selected = false;

  function pressDigit(key) {
    if (selected) {
      typed = '';
      selected = false;
    }
    if (key === '.' && typed.includes('.')) return;
    if (key === '.' && !typed) { typed = '0.'; return; }
    typed += key;
  }

  function pressBackspace() {
    if (selected) {
      typed = '';
      selected = false;
      return;
    }
    typed = typed.slice(0, -1);
  }

  function paintAmount() {
    const currency = chosen && chosen.currency
      ? chosen.currency
      : store.getState().settings.activeCurrency;
    const text = typed || '0';
    amountValue.textContent = symbolFor(currency) + ' ' + text;
    amountValue.classList.toggle('register__amount--selected', selected && Boolean(typed));
  }

  /* ------------------------------------------------------------------
     Paso 3 · Buscar. Solo el teclado del sistema.
     ------------------------------------------------------------------ */

  const searchBack = document.createElement('button');
  searchBack.type = 'button';
  searchBack.className = 'register__back';
  searchBack.setAttribute('aria-label', t(language, 'back'));
  searchBack.appendChild(ico('volver'));
  searchBack.addEventListener('click', () => goTo('choose'));

  const field = createGhostField({
    placeholder: placeholderFor(language, type),
    ariaLabel: t(language, 'searchOrType'),
    onInput: () => scheduleSearch(),
    onSubmit: () => chooseTyped(),
  });

  const results = document.createElement('div');
  results.className = 'register__choices';
  results.setAttribute('role', 'list');

  const resultsEmpty = document.createElement('p');
  resultsEmpty.className = 'register__empty';
  resultsEmpty.textContent = t(language, 'emptySuggestions');

  searchStep.appendChild(wrap('register__header', [searchBack, field.el]));
  searchStep.appendChild(wrap('register__flex', [results, resultsEmpty]));

  /* ------------------------------------------------------------------
     Sugerencias
     ------------------------------------------------------------------ */

  function paintChoices() {
    const state = store.getState();
    const list = suggest(state, '', { now: now(), limit: CHOOSE_LIMIT });
    fillRows(choices, choicesEmpty, list, state, null, (suggestion) => {
      chosen = suggestion;
      conceptText = suggestion.text;
      startAmount(suggestion);
      goTo('amount');
    });
    trim(choices);
  }

  function scheduleSearch() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(paintSearch, SUGGEST_DEBOUNCE_MS);
  }

  function paintSearch() {
    if (timer) { clearTimeout(timer); timer = 0; }

    const state = store.getState();
    const reference = now();
    const raw = field.value;
    const parsed = parseEntry(raw, {
      accounts: state.accounts,
      now: reference,
      enabledCurrencies: state.settings.enabledCurrencies,
    });

    const onlyConcept = !parsed.recognized.amount
      && !parsed.recognized.date
      && !parsed.recognized.account
      && !parsed.recognized.type;
    field.setGhost(onlyConcept ? ghostCompletion(state, raw, { now: reference }) : '');

    const list = suggest(state, parsed.concept, { now: reference, limit: CHOOSE_LIMIT });
    fillRows(results, resultsEmpty, list, state, parsed, (suggestion) => {
      chooseFromSearch(suggestion, parsed);
    });
    trim(results);
  }

  function fillRows(container, emptyNode, list, state, parsed, onPick) {
    container.replaceChildren();
    for (const suggestion of list) {
      const amountMinor = parsed && parsed.amountMinor !== null
        ? parsed.amountMinor
        : suggestion.amountMinor;
      const currency = (parsed && parsed.currency)
        || suggestion.currency
        || state.settings.activeCurrency;

      const row = createListRow({
        icon: iconForCategory(suggestion.category),
        title: suggestion.text,
        subtitle: [suggestion.category, suggestion.accountName].filter(Boolean).join(' · '),
        /* Sin monto recordado, un guion en gris suave: la columna no
           se deja vacía y no se finge una cifra. */
        amount: amountMinor ? money(amountMinor, currency) : t(language, 'noAmount'),
        amountKind: amountMinor ? 'neutral' : 'muted',
        onClick: () => onPick(suggestion),
      });
      row.setAttribute('role', 'listitem');
      container.appendChild(row);
      /* Un cuadro con el estado inicial pintado antes de pasar al
         final; si no, la transición no arranca. */
      requestAnimationFrame(() => row.classList.add('list-row--in'));
    }
    emptyNode.hidden = list.length > 0;
    container.hidden = list.length === 0;
  }

  /* Quita las filas que no caben. Nada de lo que tiene que verse
     siempre encoge; la lista es lo único que cede. */
  function trim(container) {
    if (!container.isConnected) return;
    const available = container.clientHeight;
    if (!available) return;
    while (container.children.length > 1 && container.scrollHeight > available) {
      container.removeChild(container.lastElementChild);
    }
  }

  /* ------------------------------------------------------------------
     Elegir y guardar
     ------------------------------------------------------------------ */

  /* Desde el paso 3: si lo escrito ya trae monto, se guarda directo y
     el paso 2 se salta. Si no, se pasa al paso 2. */
  function chooseFromSearch(suggestion, parsed) {
    chosen = suggestion;
    conceptText = suggestion ? suggestion.text : parsed.concept;

    if (parsed && parsed.amountMinor) {
      commit({ raw: field.value, suggestion });
      return;
    }
    startAmount(suggestion);
    goTo('amount');
  }

  /* Enter en el campo, sin tocar ninguna fila. */
  function chooseTyped() {
    const state = store.getState();
    const parsed = parseEntry(field.value, {
      accounts: state.accounts,
      now: now(),
      enabledCurrencies: state.settings.enabledCurrencies,
    });
    if (!parsed.concept && !parsed.amountMinor) return;

    chosen = null;
    conceptText = parsed.concept;

    if (parsed.amountMinor) {
      commit({ raw: field.value, suggestion: null });
      return;
    }
    startAmount(null);
    goTo('amount');
  }

  /* Prepara el paso 2 con lo que se sepa del concepto. */
  function startAmount(suggestion) {
    const state = store.getState();
    const currency = (suggestion && suggestion.currency) || state.settings.activeCurrency;

    amountTitle.textContent = conceptText || t(language, type === 'income' ? 'income' : 'expense');
    amountMeta.textContent = suggestion
      ? [suggestion.category, suggestion.accountName].filter(Boolean).join(' · ')
      : '';
    amountMeta.hidden = !amountMeta.textContent;

    /* El valor recordado, ya puesto y seleccionado. */
    const remembered = suggestion && suggestion.amountMinor ? suggestion.amountMinor : 0;
    typed = remembered ? minorToText(remembered) : '';
    selected = Boolean(remembered);

    /* Cada gasto empieza sin marca: arrastrar la del anterior sería
       inventarse un dato. Y la pregunta es por qué gastaste, así que
       en un ingreso no se hace. */
    mark = null;
    marks.reset();
    marks.el.hidden = type !== 'expense';

    clearHint();
    paintAmount();
    void currency;
  }

  function commitFromAmount() {
    /* El texto crudo que entiende parse: concepto y monto juntos, que
       es lo que espera resolveDraft. Así el paso 2 y el paso 3 acaban
       en la misma función y no hay dos formas de guardar. */
    const raw = [conceptText, typed].filter(Boolean).join(' ');
    commit({ raw, suggestion: chosen });
  }

  function commit(input) {
    const state = store.getState();
    const reference = now();

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

    /* Un movimiento de 0.00 no cambia ningún saldo. Sigue siendo
       obligatorio, y se señala con el acento, nunca con rojo. */
    if (!draft.amountMinor) {
      markMissingAmount();
      return;
    }

    let operation = null;
    try {
      /* La marca entra con la operación, en una sola escritura. */
      operation = addOperation(store, mark ? { ...draft, state: mark } : draft);
    } catch (error) {
      showToast({ message: t(language, 'saveFailed'), duration: 4000 });
      return;
    }

    sheet.close();
    confirmSaved(store, operation, language);
  }

  function markMissingAmount() {
    if (step !== 'amount') {
      startAmount(chosen);
      goTo('amount');
    }
    amountValue.classList.add('register__amount--missing');
    amountHint.textContent = t(language, 'amountMissing');
  }

  function clearHint() {
    amountValue.classList.remove('register__amount--missing');
    amountHint.textContent = '';
  }

  /* ------------------------------------------------------------------
     Movimiento entre pasos

     Deslizamiento horizontal de 180ms. El paso 2 entra desde la
     derecha y volver lo saca por la derecha.
     ------------------------------------------------------------------ */

  function goTo(next) {
    if (step === next) return;
    step = next;
    track.dataset.step = next;

    /* El foco es lo que decide qué teclado sube. Al salir del paso 3
       se suelta el campo para que el del sistema baje antes de que
       aparezca el numérico. */
    if (next === 'search') {
      /* Tras el deslizamiento, no durante: enfocar a mitad de
         animación hace que iOS salte. */
      setTimeout(() => field.focus(), STEP_MS);
      scheduleSearch();
    } else {
      field.input.blur();
    }

    if (next === 'choose') paintChoices();
    if (next === 'amount') setTimeout(() => trim(choices), STEP_MS);
  }

  track.dataset.step = 'choose';
  sheet.open();
  paintChoices();
  return sheet;
}

/* ------------------------------------------------------------------
   Confirmación
   ------------------------------------------------------------------ */

export function confirmSaved(store, operation, language) {
  const amount = operationAmount(operation).text;

  /* Si el gasto llegó marcado, el toast devuelve algo. Sale de contar
     lo que ya está guardado, y aparece desde la primera marca. */
  const detail = markPhrase(language, markInsight(store.getState(), operation));

  showToast({
    message: t(language, 'saved', amount),
    detail,
    actionLabel: t(language, 'undo'),
    onAction: () => {
      removeOperation(store, operation.id);
      showToast({ message: t(language, 'undone'), duration: 2400 });
    },
    onDismiss: (reason) => {
      /* Solo se aprende de lo que sobrevive a la ventana de deshacer. */
      if (reason !== 'action') recordUsage(store, operation);
    },
  });
}

/* ------------------------------------------------------------------
   Auxiliares
   ------------------------------------------------------------------ */

function placeholderFor(language, type) {
  return t(language, type === 'income' ? 'conceptPlaceholderIncome' : 'conceptPlaceholder');
}

/* 1800 -> "18.00", y 1800 redondo -> "18". Lo que se pinta en el paso
   2 es lo mismo que se teclearía, para que borrar y reescribir
   funcione sin sorpresas. */
function minorToText(minor) {
  const units = Math.floor(Math.abs(minor) / 100);
  const cents = Math.abs(minor) % 100;
  return cents ? units + '.' + String(cents).padStart(2, '0') : String(units);
}

function symbolFor(currency) {
  return money(0, currency).replace(/[\d.,\s]/g, '');
}

function wrap(className, children) {
  const el = document.createElement('div');
  el.className = className;
  for (const child of children) el.appendChild(child);
  return el;
}

/* La fila de la marca de estado.

   Tres de entrada —normal, antojo, social— y un cuarto elemento que
   despliega las otras cuatro. Siete a la vez son una lista para leer;
   tres son una elección para tocar.

   Selección única y reversible: tocar la elegida la suelta. Marcar es
   opcional y nunca bloquea Guardar. */
function createMarkRow(language, onChange) {
  const el = document.createElement('div');
  el.className = 'register__marks';
  el.setAttribute('role', 'radiogroup');
  el.setAttribute('aria-label', t(language, 'stateQuestion'));

  const labels = stateLabels(language);
  const primary = language === 'en'
    ? ['normal', 'craving', 'social']
    : STATE_PRIMARY;
  const rest = labels.filter((label) => !primary.includes(label));

  const chips = [];
  let expanded = false;
  let current = null;

  function select(label, on) {
    current = on ? label : null;
    for (const chip of chips) {
      if (chip.label !== label) chip.api.setSelected(false);
    }
    if (typeof onChange === 'function') onChange(current);
  }

  function add(label, hidden) {
    const api = createChip({
      label,
      onToggle: (on) => select(label, on),
    });
    api.el.hidden = hidden;
    chips.push({ label, api });
    el.appendChild(api.el);
    return api;
  }

  for (const label of primary) add(label, false);
  for (const label of rest) add(label, true);

  /* "más" no es una marca: es la puerta a las otras cuatro. Se va
     cuando ya no hace falta, en vez de quedarse ocupando sitio. */
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'chip register__marks-more';
  more.textContent = t(language, 'stateMore');
  more.addEventListener('click', () => {
    expanded = true;
    for (const chip of chips) chip.api.el.hidden = false;
    more.hidden = true;
  });
  el.appendChild(more);

  return {
    el,
    get value() {
      return current;
    },
    reset() {
      current = null;
      for (const chip of chips) chip.api.setSelected(false);
      if (expanded) return;
      for (const chip of chips) chip.api.el.hidden = !primary.includes(chip.label);
      more.hidden = false;
    },
  };
}
