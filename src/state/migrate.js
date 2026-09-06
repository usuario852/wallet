/*
  migrate — traslado desde wallet_data_v8.

  Tabla de la sección 6:

    accounts       -> directo
    operations     -> directo, se descarta el campo mood
    fixed          -> upcoming con recurrence 'monthly'
    debts          -> upcoming con installments
    moodCheckins   -> se descartan
    customProducts -> concepts con count inicial 3

  Dos reglas duras:

  1. Nunca sobrescribe. Si ya hay estado nuevo, no hace nada.
  2. Antes de tocar nada guarda el original intacto, tal cual estaba,
     bajo otra clave. Si la migración sale mal se puede rehacer.

  Nada se descarta en silencio: todo lo que no cabe en el modelo nuevo
  sale nombrado en el informe.
*/

import { createDefaultState } from './store.js';
import { STATE_KEY, resolveStorage, report as warn } from './persist.js';

export const LEGACY_KEY = 'wallet_data_v8';
export const LEGACY_BACKUP_KEY = 'wallet_data_v8__respaldo';

/* Campos de settings que la versión anterior traía y que v1 no tiene.
   Se nombran uno a uno para que el informe diga qué se fue. */
const DROPPED_SETTINGS = [
  'accent', 'includeMoodForAI', 'aiWebSearch', 'proactiveInsights',
  'weeklyReview', 'migratedFromV6', 'migratedFromV7', 'mood', 'notifications',
];

/* Claves de primer nivel que no están en la tabla y no existen en v1. */
const DROPPED_TOP_LEVEL = ['moodCheckins', 'lastMood', 'catalogOverrides', 'dismissedInsights'];

/* Campos de un cambio de divisa que v1 no guarda. */
const DROPPED_FX_FIELDS = ['directRate', 'displayRate', 'rateDirection', 'referenceDirectRate'];

/* ------------------------------------------------------------------
   Migración pura

   Sin almacenamiento, sin reloj salvo el que se le pase, sin ids
   nuevos: los ids se heredan del original. Dos llamadas con la misma
   entrada devuelven exactamente lo mismo.
   ------------------------------------------------------------------ */

export function migrateLegacy(legacy, options = {}) {
  const notes = [];
  const state = createDefaultState();

  function note(level, text) {
    notes.push({ level, text });
  }

  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) {
    note('warn', 'El origen no es un objeto de estado; no hay nada que migrar.');
    return { state, notes, counts: emptyCounts() };
  }

  const counts = emptyCounts();

  /* -------- settings -------- */
  const legacySettings = legacy.settings || {};
  state.settings = {
    activeCurrency: legacySettings.activeCurrency || 'PEN',
    enabledCurrencies: Array.isArray(legacySettings.enabledCurrencies) && legacySettings.enabledCurrencies.length
      ? [...legacySettings.enabledCurrencies]
      : ['PEN'],
    theme: ['system', 'light', 'dark'].includes(legacySettings.theme) ? legacySettings.theme : 'system',
    /* No existía en v8: la app era solo en español. */
    language: 'es',
    /* No existía en v8: el saldo siempre estaba visible. */
    balanceHidden: false,
    onboardingComplete: Boolean(legacySettings.onboardingComplete),
  };

  const droppedSettings = DROPPED_SETTINGS.filter((key) => key in legacySettings);
  if (droppedSettings.length) {
    note('warn', 'settings: se descartan ' + droppedSettings.length + ' ajustes que v1 no tiene ('
      + droppedSettings.join(', ') + '). Corresponden a funciones fuera de alcance: acento de color, '
      + 'check-ins de ánimo, insights proactivos, resumen semanal y notificaciones push.');
  }
  note('info', 'settings.language se fija en "es" y settings.balanceHidden en false: ninguno existía en v8.');

  /* -------- accounts: directo -------- */
  const legacyAccounts = asArray(legacy.accounts);
  counts.accounts.in = legacyAccounts.length;
  state.accounts = legacyAccounts.map((account) => migrateAccount(account));
  counts.accounts.out = state.accounts.length;

  const withGoal = state.accounts.filter((account) => 'goalMinor' in account).length;
  const reserves = state.accounts.filter((account) => account.kind === 'reserve').length;
  note('info', 'accounts: ' + counts.accounts.out + ' migradas sin pérdida ('
    + reserves + ' de reserva, ' + withGoal + ' con meta).');

  /* -------- operations: directo, sin mood -------- */
  const legacyOperations = asArray(legacy.operations);
  counts.operations.in = legacyOperations.length;
  state.operations = legacyOperations.map((operation) => migrateOperation(operation));
  counts.operations.out = state.operations.length;

  const withMood = legacyOperations.filter((operation) => operation && operation.mood).length;
  if (withMood) {
    note('warn', 'operations: ' + withMood + ' operaciones traían un objeto mood (valencia, energía, tensión). '
      + 'Se descarta, como manda la tabla. No es convertible a la marca de estado de v1, que es una palabra '
      + 'elegida en el momento del gasto, no tres números medidos aparte. Ninguna operación queda con state.');
  }

  const fxWithRates = legacyOperations.filter((operation) => (
    operation && operation.type === 'fx' && DROPPED_FX_FIELDS.some((field) => field in operation)
  )).length;
  if (fxWithRates) {
    note('warn', 'operations: ' + fxWithRates + ' cambios de divisa traían tasas guardadas ('
      + DROPPED_FX_FIELDS.join(', ') + ') que el modelo de la sección 6 no incluye. La tasa efectiva sigue '
      + 'siendo recuperable dividiendo toAmountMinor entre fromAmountMinor; referenceDirectRate, que era la '
      + 'tasa de mercado del día, no se puede reconstruir.');
  }

  const unknownTypes = [...new Set(legacyOperations
    .filter((operation) => operation && !['expense', 'income', 'transfer', 'fx', 'adjustment'].includes(operation.type))
    .map((operation) => String(operation.type)))];
  if (unknownTypes.length) {
    note('warn', 'operations: tipos desconocidos para el modelo de v1 (' + unknownTypes.join(', ')
      + '). Se conservan tal cual; derive los tratará como movimiento simple sobre accountId.');
  }

  const orphanAccounts = countOrphans(state.operations, state.accounts);
  if (orphanAccounts) {
    note('warn', 'operations: ' + orphanAccounts + ' operaciones apuntan a una cuenta que no existe. '
      + 'Se conservan, pero no suman a ningún saldo.');
  }

  /* -------- fixed -> upcoming mensual -------- */
  const legacyFixed = asArray(legacy.fixed);
  const legacyDebts = asArray(legacy.debts);
  counts.upcoming.in = legacyFixed.length + legacyDebts.length;

  let usedClock = 0;
  const fromFixed = legacyFixed.map((fixed) => {
    const migrated = migrateFixed(fixed, options.now);
    if (migrated.usedClock) usedClock += 1;
    return migrated.entry;
  });

  if (legacyFixed.length) {
    note('info', 'fixed -> upcoming: ' + fromFixed.length + ' con recurrence "monthly". '
      + 'v8 guardaba solo el día del mes; el vencimiento se calcula a partir de paidPeriod, que dice '
      + 'hasta qué mes está pagado, y el día se ajusta a los meses cortos.');
  }
  if (usedClock) {
    note('warn', 'fixed -> upcoming: ' + usedClock + ' entradas no traían paidPeriod, así que su vencimiento '
      + 'se calculó contra la fecha actual. Esas filas son las únicas que no se reproducen igual si la '
      + 'migración se rehace otro día.');
  }

  /* -------- debts -> upcoming con installments -------- */
  const fromDebts = legacyDebts.map((debt) => migrateDebt(debt));
  const debtNotes = collectDebtNotes(legacyDebts, fromDebts);
  for (const text of debtNotes) note('warn', text);

  if (legacyDebts.length) {
    const archived = fromDebts.filter((entry) => entry.archived).length;
    note('info', 'debts -> upcoming: ' + fromDebts.length + ' con installments {total, current}. '
      + 'Cada deuda produce una sola fila, la de su próxima cuota sin pagar, como en la pantalla Por venir. '
      + archived + ' quedan archivadas y por tanto no aparecen ni suman al comprometido.');
  }

  state.upcoming = [...fromFixed, ...fromDebts];
  counts.upcoming.out = state.upcoming.length;

  /* -------- customProducts -> concepts, count 3 -------- */
  const legacyProducts = asArray(legacy.customProducts);
  counts.concepts.in = legacyProducts.length;
  state.concepts = legacyProducts
    .map((product) => migrateConcept(product))
    .filter((concept) => concept !== null);
  counts.concepts.out = state.concepts.length;

  if (!legacyProducts.length) {
    note('warn', 'customProducts -> concepts: la lista venía vacía, así que concepts queda en 0. '
      + 'El autocompletado de la fase 3 arrancará con el catálogo semilla y aprenderá de operations; '
      + 'no hay nada que rescatar aquí.');
  } else if (counts.concepts.out < counts.concepts.in) {
    note('warn', 'customProducts -> concepts: ' + (counts.concepts.in - counts.concepts.out)
      + ' entradas sin texto reconocible, descartadas.');
  }

  /* -------- categories, budgets, rates -------- */
  state.categories = migrateCategories(legacy.categories);
  const categoryCount = state.categories.expense.length + state.categories.income.length;
  if (categoryCount) {
    note('info', 'categories: ' + categoryCount + ' categorías conservadas tal cual ('
      + state.categories.expense.length + ' de gasto, ' + state.categories.income.length + ' de ingreso). '
      + 'La sección 6 no detalla su forma, así que se preservan enteras, subcategorías incluidas, '
      + 'en vez de recortarlas.');
  }

  const budgetResult = migrateBudgets(legacy.budgets);
  state.budgets = budgetResult.budgets;
  if (budgetResult.droppedCategoryBudgets.length) {
    note('warn', 'budgets: se descartan los presupuestos por categoría de '
      + budgetResult.droppedCategoryBudgets.join(', ')
      + '. El modelo de v1 solo guarda monthlyMinor; el presupuesto por categoría queda para avanzado.');
  }

  state.rates = isPlainObject(legacy.rates) ? { ...legacy.rates } : {};
  const rateCount = Object.keys(state.rates).length;
  if (rateCount) note('info', 'rates: ' + rateCount + ' pares conservados tal cual.');

  /* -------- lo que se va -------- */
  for (const key of DROPPED_TOP_LEVEL) {
    if (!(key in legacy)) continue;
    const value = legacy[key];
    const size = Array.isArray(value) ? value.length : (isPlainObject(value) ? Object.keys(value).length : 1);
    note('warn', key + ': se descarta (' + size + (Array.isArray(value) ? ' elementos' : ' claves') + '). '
      + describeDropped(key));
  }
  if ('version' in legacy) {
    note('info', 'version: el original decía "' + legacy.version + '"; el estado nuevo nace en version 1.');
  }

  return { state, notes, counts };
}

function describeDropped(key) {
  if (key === 'moodCheckins') {
    return 'Los check-ins programados desaparecen del producto: no eran contemporáneos al gasto, '
      + 'que es justo lo que la marca de estado sí captura.';
  }
  if (key === 'lastMood') return 'Último check-in suelto, misma razón.';
  if (key === 'catalogOverrides') return 'El catálogo de productos deja de ser pantalla y pasa a concepts.';
  if (key === 'dismissedInsights') return 'Los insights proactivos vuelven en v2.';
  return 'No existe en el modelo de v1.';
}

/* ------------------------------------------------------------------
   Piezas
   ------------------------------------------------------------------ */

export function migrateAccount(account) {
  const migrated = {
    id: account.id,
    name: account.name || '',
    institution: account.institution || '',
    currency: account.currency || 'PEN',
    kind: account.kind === 'reserve' ? 'reserve' : 'regular',
    openingMinor: integer(account.openingMinor),
    archived: Boolean(account.archived),
  };
  if (account.goalMinor !== undefined && account.goalMinor !== null) {
    migrated.goalMinor = integer(account.goalMinor);
  }
  return migrated;
}

export function migrateOperation(operation) {
  const migrated = {
    id: operation.id,
    type: operation.type,
    date: operation.date || '',
    concept: operation.concept || '',
    category: operation.category || '',
    /* v8 no tenía anulación: borraba de verdad. Todo lo que sobrevive
       llega vivo. */
    voided: false,
  };

  if (operation.type === 'fx') {
    migrated.fromAccountId = operation.fromAccountId || null;
    migrated.toAccountId = operation.toAccountId || null;
    migrated.fromCurrency = operation.fromCurrency || 'PEN';
    migrated.toCurrency = operation.toCurrency || 'PEN';
    migrated.fromAmountMinor = integer(operation.fromAmountMinor);
    migrated.toAmountMinor = integer(operation.toAmountMinor);
  } else if (operation.type === 'transfer') {
    migrated.fromAccountId = operation.fromAccountId || null;
    migrated.toAccountId = operation.toAccountId || null;
    migrated.currency = operation.currency || 'PEN';
    migrated.amountMinor = integer(operation.amountMinor);
  } else {
    migrated.accountId = operation.accountId || null;
    migrated.currency = operation.currency || 'PEN';
    migrated.amountMinor = integer(operation.amountMinor);
  }

  if (operation.note) migrated.note = operation.note;
  /* operation.mood se queda fuera a propósito. */
  return migrated;
}

/* Un gasto fijo es dinero con fecha y nombre que se repite cada mes.
   v8 guardaba el día del mes y hasta qué periodo estaba pagado. */
export function migrateFixed(fixed, now) {
  const day = clamp(integer(fixed.day, 1), 1, 31);
  const period = parsePeriod(fixed.paidPeriod);
  let usedClock = false;
  let dueDate;

  if (period) {
    /* El periodo guardado ya está pagado: toca el siguiente. */
    const next = shiftMonth(period.year, period.month + 1);
    dueDate = isoDate(next.year, next.month, clampDayToMonth(next.year, next.month, day));
  } else {
    const reference = now instanceof Date ? now : new Date();
    usedClock = true;
    const year = reference.getFullYear();
    const month = reference.getMonth() + 1;
    const thisMonth = isoDate(year, month, clampDayToMonth(year, month, day));
    const today = isoDate(year, month, reference.getDate());
    if (thisMonth >= today) {
      dueDate = thisMonth;
    } else {
      const next = shiftMonth(year, month + 1);
      dueDate = isoDate(next.year, next.month, clampDayToMonth(next.year, next.month, day));
    }
  }

  return {
    usedClock,
    entry: {
      /* Se hereda el id de v8: la migración queda trazable y el
         resultado no depende de ningún generador aleatorio. */
      id: fixed.id,
      name: fixed.concept || '',
      direction: fixed.type === 'income' ? 'in' : 'out',
      amountMinor: integer(fixed.amountMinor),
      currency: fixed.currency || 'PEN',
      dueDate,
      recurrence: 'monthly',
      category: fixed.category || '',
      countAsFlow: true,
      archived: false,
    },
  };
}

/* Una deuda produce una sola fila: la de su próxima cuota sin pagar,
   que es como la pinta la pantalla Por venir ("cuota 3/12"). */
export function migrateDebt(debt) {
  const installments = asArray(debt.installments);
  const total = installments.length;

  let index = installments.findIndex((installment) => (
    integer(installment.paidMinor) < integer(installment.amountMinor)
  ));
  const allPaid = total > 0 && index === -1;
  if (index === -1) index = Math.max(0, total - 1);

  const current = installments[index] || null;
  const remaining = current
    ? Math.max(0, integer(current.amountMinor) - integer(current.paidMinor))
    : integer(debt.totalMinor);

  const entry = {
    id: debt.id,
    name: debt.name || '',
    direction: debt.direction === 'receivable' ? 'in' : 'out',
    amountMinor: remaining,
    currency: debt.currency || 'PEN',
    dueDate: current ? (current.dueDate || null) : null,
    recurrence: null,
    category: debt.category || '',
    countAsFlow: debt.countAsFlow === undefined ? true : Boolean(debt.countAsFlow),
    archived: Boolean(debt.archived) || allPaid,
  };

  if (total > 0) {
    entry.installments = { total, current: index + 1 };
  }

  return entry;
}

/* Detalles de las deudas que no caben en el modelo nuevo. */
function collectDebtNotes(legacyDebts, migrated) {
  const notes = [];

  const withNotes = legacyDebts.filter((debt) => debt && debt.notes).length;
  if (withNotes) {
    notes.push('debts: ' + withNotes + ' deudas traían notas. upcoming no tiene campo de nota en la '
      + 'sección 6, así que ese texto se pierde.');
  }

  const withCreatedAt = legacyDebts.filter((debt) => debt && debt.createdAt).length;
  if (withCreatedAt) {
    notes.push('debts: se descarta createdAt de ' + withCreatedAt + ' deudas; el modelo de v1 solo '
      + 'guarda dueDate.');
  }

  const withPayments = legacyDebts.filter((debt) => (
    asArray(debt && debt.installments).some((installment) => asArray(installment.payments).length)
  )).length;
  if (withPayments) {
    notes.push('debts: ' + withPayments + ' deudas tenían pagos parciales anotados dentro de sus cuotas. '
      + 'El importe pendiente sí se respeta (amountMinor es lo que falta), pero el historial de esos '
      + 'pagos no tiene sitio en v1 y no se traslada.');
  }

  const noInstallments = legacyDebts.filter((debt) => !asArray(debt && debt.installments).length).length;
  if (noInstallments) {
    notes.push('debts: ' + noInstallments + ' deudas sin cuotas. Pasan a upcoming con dueDate null '
      + '("Sin fecha") y sin installments.');
  }

  legacyDebts.forEach((debt, position) => {
    const installments = asArray(debt && debt.installments);
    if (!installments.length) return;
    const sum = installments.reduce((acc, installment) => acc + integer(installment.amountMinor), 0);
    if (integer(debt.totalMinor) !== sum) {
      notes.push('debts: "' + (debt.name || migrated[position].id) + '" tenía totalMinor '
        + integer(debt.totalMinor) + ' pero sus cuotas suman ' + sum + '. Se respeta la cuota, no el total.');
    }
  });

  return notes;
}

/* customProducts era el catálogo visible. Ahora es memoria invisible.
   Entra con count 3: bastante para adelantar al catálogo semilla,
   poco para resistir dos o tres registros propios. */
export function migrateConcept(product) {
  const text = typeof product === 'string'
    ? product.trim()
    : String((product && (product.text || product.name || product.concept)) || '').trim();
  if (!text) return null;

  const source = isPlainObject(product) ? product : {};
  return {
    text,
    category: source.category || '',
    currency: source.currency || 'PEN',
    count: 3,
    lastUsed: source.lastUsed || '',
    lastAmountMinor: integer(source.lastAmountMinor !== undefined ? source.lastAmountMinor : source.amountMinor),
    hourHistogram: new Array(24).fill(0),
  };
}

export function migrateCategories(categories) {
  if (!isPlainObject(categories)) return { expense: [], income: [] };
  return {
    expense: asArray(categories.expense).map((category) => ({ ...category })),
    income: asArray(categories.income).map((category) => ({ ...category })),
  };
}

export function migrateBudgets(budgets) {
  const result = { budgets: {}, droppedCategoryBudgets: [] };
  if (!isPlainObject(budgets)) return result;

  for (const [currency, budget] of Object.entries(budgets)) {
    if (!isPlainObject(budget)) continue;
    result.budgets[currency] = { monthlyMinor: integer(budget.monthlyMinor) };
    if (isPlainObject(budget.categories) && Object.keys(budget.categories).length) {
      result.droppedCategoryBudgets.push(currency);
    }
  }
  return result;
}

/* ------------------------------------------------------------------
   Orquestación

   Lo único que toca el almacenamiento.
   ------------------------------------------------------------------ */

/* Migra si y solo si hace falta.

   Devuelve { migrated, reason, state, notes, counts, backupKey }.
   migrated es false cuando ya había estado nuevo o cuando no había
   nada anterior que traer. */
export function runMigration(options = {}) {
  const storage = options.storage === undefined ? resolveStorage() : options.storage;
  const empty = { migrated: false, state: null, notes: [], counts: emptyCounts(), backupKey: null };

  if (!storage) {
    return { ...empty, reason: 'sin-almacenamiento' };
  }

  /* Regla 1: nunca sobrescribe. */
  const existing = safeGet(storage, STATE_KEY);
  if (existing !== null && existing !== '') {
    return { ...empty, reason: 'ya-existe-estado-nuevo' };
  }

  const rawLegacy = safeGet(storage, LEGACY_KEY);
  if (rawLegacy === null || rawLegacy === '') {
    return { ...empty, reason: 'sin-datos-anteriores' };
  }

  let legacy = null;
  try {
    legacy = JSON.parse(rawLegacy);
  } catch (error) {
    warn('Los datos de ' + LEGACY_KEY + ' no se pudieron leer; no se migra nada y quedan intactos.', error);
    return { ...empty, reason: 'origen-ilegible' };
  }

  /* Regla 2: copia intacta antes de tocar nada. Se guarda el texto
     original, no una reserialización, para que sea idéntico byte a
     byte. Si ya hay un respaldo, se respeta el primero. */
  let backupKey = LEGACY_BACKUP_KEY;
  if (safeGet(storage, LEGACY_BACKUP_KEY) !== null) {
    backupKey = null;
  } else {
    try {
      storage.setItem(LEGACY_BACKUP_KEY, rawLegacy);
    } catch (error) {
      warn('No se pudo guardar el respaldo del estado anterior; se cancela la migración.', error);
      return { ...empty, reason: 'respaldo-fallido' };
    }
  }

  const result = migrateLegacy(legacy, { now: options.now });

  try {
    storage.setItem(STATE_KEY, JSON.stringify(result.state));
  } catch (error) {
    warn('No se pudo guardar el estado migrado.', error);
    return { ...empty, reason: 'escritura-fallida', notes: result.notes, counts: result.counts };
  }

  return {
    migrated: true,
    reason: 'migrado',
    state: result.state,
    notes: result.notes,
    counts: result.counts,
    backupKey,
  };
}

/* ------------------------------------------------------------------
   Utilidades locales
   ------------------------------------------------------------------ */

function emptyCounts() {
  return {
    accounts: { in: 0, out: 0 },
    operations: { in: 0, out: 0 },
    upcoming: { in: 0, out: 0 },
    concepts: { in: 0, out: 0 },
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function countOrphans(operations, accounts) {
  const ids = new Set(accounts.map((account) => account.id));
  let orphans = 0;
  for (const operation of operations) {
    const referenced = [operation.accountId, operation.fromAccountId, operation.toAccountId].filter(Boolean);
    if (referenced.length && referenced.some((id) => !ids.has(id))) orphans += 1;
  }
  return orphans;
}

function parsePeriod(period) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(period || ''));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

function shiftMonth(year, month) {
  const zero = month - 1;
  const carry = Math.floor(zero / 12);
  const normalized = ((zero % 12) + 12) % 12;
  return { year: year + carry, month: normalized + 1 };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDayToMonth(year, month, day) {
  return Math.min(day, daysInMonth(year, month));
}

function isoDate(year, month, day) {
  return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch (error) {
    warn('No se pudo leer la clave ' + key + '.', error);
    return null;
  }
}
