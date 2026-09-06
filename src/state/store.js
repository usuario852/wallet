/*
  store — estado en memoria con suscripción.

  Una sola fuente de verdad. El objeto de estado es inmutable hacia
  afuera: cada contenedor se congela al confirmar, así que nadie puede
  hacer state.operations.push(...) por accidente. Toda mutación pasa
  por una función nombrada de este archivo, que construye el siguiente
  estado y lo confirma.

  Los saldos no viven aquí. Se derivan en derive.js.
*/

/* Forma del estado. Sección 6 del documento base, tal cual. */
export function createDefaultState() {
  return {
    version: 1,
    settings: {
      activeCurrency: 'PEN',
      enabledCurrencies: ['PEN'],
      theme: 'system',
      language: 'es',
      balanceHidden: false,
      onboardingComplete: false,
    },
    accounts: [],
    operations: [],
    upcoming: [],
    concepts: [],
    categories: { expense: [], income: [] },
    budgets: {},
    rates: {},
  };
}

/* Congela el estado y sus contenedores de primer nivel. Es barato
   —una decena de llamadas— y ataja el error real: mutar en sitio una
   lista compartida. Los elementos no se congelan; las mutaciones de
   abajo siempre construyen objetos nuevos. */
export function freezeState(state) {
  Object.freeze(state.settings);
  Object.freeze(state.accounts);
  Object.freeze(state.operations);
  Object.freeze(state.upcoming);
  Object.freeze(state.concepts);
  Object.freeze(state.categories.expense);
  Object.freeze(state.categories.income);
  Object.freeze(state.categories);
  Object.freeze(state.budgets);
  Object.freeze(state.rates);
  return Object.freeze(state);
}

/* Identificador con prefijo por tipo, como en los datos anteriores. */
export function createId(prefix) {
  const unique = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  return prefix + '_' + unique;
}

/* Crea un contenedor de estado. La app usa el singleton de abajo;
   las pruebas crean los suyos. */
export function createStore(initialState) {
  let state = freezeState(initialState || createDefaultState());
  const listeners = new Set();
  let notifying = false;

  function getState() {
    return state;
  }

  /* Devuelve la función que cancela la suscripción. */
  function subscribe(listener) {
    listeners.add(listener);
    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  /* Punto único de escritura. Todas las mutaciones terminan aquí. */
  function commit(reason, next) {
    if (notifying) {
      throw new Error('Mutación reentrante durante "' + reason + '": un suscriptor no puede mutar el estado.');
    }
    state = freezeState(next);
    notifying = true;
    try {
      for (const listener of [...listeners]) listener(state, reason);
    } finally {
      notifying = false;
    }
    return state;
  }

  return { getState, subscribe, commit };
}

/* El estado de la app. */
export const store = createStore();

/* ------------------------------------------------------------------
   Mutaciones

   Cada una recibe el store como primer argumento, construye el
   siguiente estado sin tocar el anterior y lo confirma.
   ------------------------------------------------------------------ */

/* Reemplaza el estado entero. La usan la carga desde disco y la
   migración; nada más debería llamarla. */
export function replaceState(target, nextState) {
  return target.commit('replace', { ...createDefaultState(), ...nextState });
}

export function updateSettings(target, patch) {
  const state = target.getState();
  return target.commit('settings', {
    ...state,
    settings: { ...state.settings, ...patch },
  });
}

export function addAccount(target, draft) {
  const state = target.getState();
  const account = {
    id: draft.id || createId('acc'),
    name: draft.name || '',
    institution: draft.institution || '',
    currency: draft.currency || state.settings.activeCurrency,
    kind: draft.kind === 'reserve' ? 'reserve' : 'regular',
    openingMinor: toInteger(draft.openingMinor),
    archived: Boolean(draft.archived),
  };
  if (draft.goalMinor !== undefined && draft.goalMinor !== null) {
    account.goalMinor = toInteger(draft.goalMinor);
  }
  target.commit('accounts', { ...state, accounts: [...state.accounts, account] });
  return account;
}

export function updateAccount(target, id, patch) {
  const state = target.getState();
  return target.commit('accounts', {
    ...state,
    accounts: state.accounts.map((account) => (
      account.id === id ? { ...account, ...patch, id: account.id } : account
    )),
  });
}

export function archiveAccount(target, id) {
  return updateAccount(target, id, { archived: true });
}

export function addOperation(target, draft) {
  const state = target.getState();
  const operation = normalizeOperation(draft, state.settings.activeCurrency);
  target.commit('operations', { ...state, operations: [...state.operations, operation] });
  return operation;
}

export function updateOperation(target, id, patch) {
  const state = target.getState();
  return target.commit('operations', {
    ...state,
    operations: state.operations.map((operation) => (
      operation.id === id ? { ...operation, ...patch, id: operation.id } : operation
    )),
  });
}

/* Anular, no borrar: la fila desaparece de los saldos pero el registro
   sigue ahí para la ventana de deshacer y para el histórico. */
export function voidOperation(target, id) {
  return updateOperation(target, id, { voided: true });
}

export function restoreOperation(target, id) {
  return updateOperation(target, id, { voided: false });
}

export function removeOperation(target, id) {
  const state = target.getState();
  return target.commit('operations', {
    ...state,
    operations: state.operations.filter((operation) => operation.id !== id),
  });
}

export function addUpcoming(target, draft) {
  const state = target.getState();
  const entry = normalizeUpcoming(draft, state.settings.activeCurrency);
  target.commit('upcoming', { ...state, upcoming: [...state.upcoming, entry] });
  return entry;
}

export function updateUpcoming(target, id, patch) {
  const state = target.getState();
  return target.commit('upcoming', {
    ...state,
    upcoming: state.upcoming.map((entry) => (
      entry.id === id ? { ...entry, ...patch, id: entry.id } : entry
    )),
  });
}

export function removeUpcoming(target, id) {
  const state = target.getState();
  return target.commit('upcoming', {
    ...state,
    upcoming: state.upcoming.filter((entry) => entry.id !== id),
  });
}

/* Memoria invisible del autocompletado. Un concepto por texto. */
export function upsertConcept(target, draft) {
  const state = target.getState();
  const text = String(draft.text || '').trim();
  if (!text) return null;

  const index = state.concepts.findIndex((concept) => concept.text === text);
  const previous = index === -1 ? null : state.concepts[index];

  const concept = {
    text,
    category: draft.category || (previous && previous.category) || '',
    currency: draft.currency || (previous && previous.currency) || state.settings.activeCurrency,
    count: previous ? previous.count + 1 : toInteger(draft.count, 1),
    lastUsed: draft.lastUsed || (previous && previous.lastUsed) || '',
    lastAmountMinor: draft.lastAmountMinor === undefined
      ? (previous ? previous.lastAmountMinor : 0)
      : toInteger(draft.lastAmountMinor),
    hourHistogram: previous ? [...previous.hourHistogram] : new Array(24).fill(0),
  };

  const hour = Number(draft.hour);
  if (Number.isInteger(hour) && hour >= 0 && hour < 24) concept.hourHistogram[hour] += 1;

  const concepts = index === -1
    ? [...state.concepts, concept]
    : state.concepts.map((item, position) => (position === index ? concept : item));

  target.commit('concepts', { ...state, concepts });
  return concept;
}

export function setBudget(target, currency, monthlyMinor) {
  const state = target.getState();
  return target.commit('budgets', {
    ...state,
    budgets: { ...state.budgets, [currency]: { monthlyMinor: toInteger(monthlyMinor) } },
  });
}

export function setRate(target, pair, rate) {
  const state = target.getState();
  return target.commit('rates', { ...state, rates: { ...state.rates, [pair]: rate } });
}

/* ------------------------------------------------------------------
   Normalización

   Todo el dinero entra como entero en unidades menores. Aquí es donde
   se corta cualquier decimal que venga de fuera.
   ------------------------------------------------------------------ */

/* Entero, o el valor por defecto si no hay número. Se redondea en vez
   de truncar: un 1799.9999 que venga de una multiplicación flotante
   debe quedar en 1800, no en 1799. */
export function toInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

export function normalizeOperation(draft, fallbackCurrency) {
  const type = draft.type || 'expense';
  const operation = {
    id: draft.id || createId('op'),
    type,
    date: draft.date || '',
    concept: draft.concept || '',
    category: draft.category || '',
    voided: Boolean(draft.voided),
  };

  if (type === 'fx') {
    /* El cambio de divisa mueve dos importes distintos, uno por
       cuenta. No existe un amountMinor único que valga para los dos. */
    operation.fromAccountId = draft.fromAccountId || null;
    operation.toAccountId = draft.toAccountId || null;
    operation.fromCurrency = draft.fromCurrency || fallbackCurrency;
    operation.toCurrency = draft.toCurrency || fallbackCurrency;
    operation.fromAmountMinor = toInteger(draft.fromAmountMinor);
    operation.toAmountMinor = toInteger(draft.toAmountMinor);
  } else if (type === 'transfer') {
    operation.fromAccountId = draft.fromAccountId || null;
    operation.toAccountId = draft.toAccountId || null;
    operation.currency = draft.currency || fallbackCurrency;
    operation.amountMinor = toInteger(draft.amountMinor);
  } else {
    operation.accountId = draft.accountId || null;
    operation.currency = draft.currency || fallbackCurrency;
    operation.amountMinor = toInteger(draft.amountMinor);
  }

  if (draft.state) operation.state = draft.state;
  if (draft.note) operation.note = draft.note;
  return operation;
}

export function normalizeUpcoming(draft, fallbackCurrency) {
  const entry = {
    id: draft.id || createId('up'),
    name: draft.name || '',
    direction: draft.direction === 'in' ? 'in' : 'out',
    amountMinor: toInteger(draft.amountMinor),
    currency: draft.currency || fallbackCurrency,
    dueDate: draft.dueDate || null,
    recurrence: draft.recurrence || null,
    category: draft.category || '',
    countAsFlow: draft.countAsFlow === undefined ? true : Boolean(draft.countAsFlow),
    archived: Boolean(draft.archived),
  };
  if (draft.installments) {
    entry.installments = {
      total: toInteger(draft.installments.total, 1),
      current: toInteger(draft.installments.current, 1),
    };
  }
  return entry;
}
