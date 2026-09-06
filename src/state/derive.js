/*
  derive — saldos, totales y filtros.

  Los saldos jamás se almacenan en el estado: se derivan de
  accounts.openingMinor más el efecto de operations, y se cachean en
  memoria. El caché se invalida solo: va indexado por la identidad de
  los arreglos, y como el store congela y reemplaza el estado en cada
  mutación, tocar operations produce un arreglo nuevo y el caché falla.

  Toda la aritmética es entera, en unidades menores. En este archivo no
  hay ni una división ni un decimal.
*/

/* operations -> (accounts -> saldos). Dos niveles porque el saldo
   depende de las dos listas y de ninguna otra. Cambiar settings,
   upcoming o concepts no invalida nada. */
const balanceCache = new WeakMap();

/* Totales por moneda: dependen además de upcoming, así que van
   indexados por el estado entero. */
const totalsCache = new WeakMap();

/* ------------------------------------------------------------------
   Efecto de una operación sobre las cuentas
   ------------------------------------------------------------------ */

/* Qué le hace una operación a cada cuenta. Devuelve una lista porque
   transferencias y cambios de divisa tocan dos.

   expense      resta de su cuenta
   income       suma a su cuenta
   adjustment   suma con signo: un ajuste negativo corrige a la baja
   transfer     un solo importe, sale de una cuenta y entra en otra
   fx           dos importes distintos, cada uno en su moneda y cuenta

   Una operación anulada no produce ningún efecto. */
export function operationDeltas(operation) {
  if (!operation || operation.voided) return [];

  if (operation.type === 'transfer') {
    const amount = operation.amountMinor || 0;
    const deltas = [];
    if (operation.fromAccountId) {
      deltas.push({ accountId: operation.fromAccountId, currency: operation.currency, deltaMinor: -amount });
    }
    if (operation.toAccountId) {
      deltas.push({ accountId: operation.toAccountId, currency: operation.currency, deltaMinor: amount });
    }
    return deltas;
  }

  if (operation.type === 'fx') {
    const deltas = [];
    if (operation.fromAccountId) {
      deltas.push({
        accountId: operation.fromAccountId,
        currency: operation.fromCurrency,
        deltaMinor: -(operation.fromAmountMinor || 0),
      });
    }
    if (operation.toAccountId) {
      deltas.push({
        accountId: operation.toAccountId,
        currency: operation.toCurrency,
        deltaMinor: operation.toAmountMinor || 0,
      });
    }
    return deltas;
  }

  if (!operation.accountId) return [];
  const amount = operation.amountMinor || 0;
  const signed = operation.type === 'expense' ? -amount : amount;
  return [{ accountId: operation.accountId, currency: operation.currency, deltaMinor: signed }];
}

/* ------------------------------------------------------------------
   Saldos
   ------------------------------------------------------------------ */

/* Saldo de cada cuenta, por id. Cacheado. */
export function balancesByAccount(state) {
  let byAccounts = balanceCache.get(state.operations);
  if (!byAccounts) {
    byAccounts = new WeakMap();
    balanceCache.set(state.operations, byAccounts);
  }

  const cached = byAccounts.get(state.accounts);
  if (cached) return cached;

  const balances = new Map();
  for (const account of state.accounts) {
    balances.set(account.id, account.openingMinor || 0);
  }

  for (const operation of state.operations) {
    for (const delta of operationDeltas(operation)) {
      if (!balances.has(delta.accountId)) continue;
      balances.set(delta.accountId, balances.get(delta.accountId) + delta.deltaMinor);
    }
  }

  const frozen = Object.freeze(balances);
  byAccounts.set(state.accounts, frozen);
  return frozen;
}

/* Saldo de una cuenta. 0 si no existe. */
export function accountBalanceMinor(state, accountId) {
  const balance = balancesByAccount(state).get(accountId);
  return balance === undefined ? 0 : balance;
}

/* ------------------------------------------------------------------
   Comprometido y por cobrar
   ------------------------------------------------------------------ */

/* Lo que ya está comprometido y lo que está por cobrar, por moneda.
   Solo cuenta lo no archivado y lo que suma al flujo. */
export function pledgesByCurrency(state) {
  const pledges = new Map();

  for (const entry of state.upcoming) {
    if (entry.archived || entry.countAsFlow === false) continue;
    const bucket = pledges.get(entry.currency) || { pledgedMinor: 0, receivableMinor: 0 };
    if (entry.direction === 'in') bucket.receivableMinor += entry.amountMinor || 0;
    else bucket.pledgedMinor += entry.amountMinor || 0;
    pledges.set(entry.currency, bucket);
  }

  return pledges;
}

/* ------------------------------------------------------------------
   Totales por moneda
   ------------------------------------------------------------------ */

/* Un bloque por moneda:

     regularMinor      saldo de las cuentas normales
     reserveMinor      saldo de las cuentas de reserva
     totalMinor        regular + reserva
     pledgedMinor      comprometido, de upcoming saliente
     receivableMinor   por cobrar, de upcoming entrante
     availableMinor    regular menos comprometido

   availableMinor es el número del inicio: el que cambia decisiones.
   El reservado no entra en él, que para eso está apartado. */
export function totalsByCurrency(state) {
  const cached = totalsCache.get(state);
  if (cached) return cached;

  const balances = balancesByAccount(state);
  const totals = new Map();

  function bucketFor(currency) {
    let bucket = totals.get(currency);
    if (!bucket) {
      bucket = {
        currency,
        regularMinor: 0,
        reserveMinor: 0,
        totalMinor: 0,
        pledgedMinor: 0,
        receivableMinor: 0,
        availableMinor: 0,
      };
      totals.set(currency, bucket);
    }
    return bucket;
  }

  for (const currency of state.settings.enabledCurrencies) bucketFor(currency);

  for (const account of state.accounts) {
    if (account.archived) continue;
    const bucket = bucketFor(account.currency);
    const balance = balances.get(account.id) || 0;
    if (account.kind === 'reserve') bucket.reserveMinor += balance;
    else bucket.regularMinor += balance;
  }

  const pledges = pledgesByCurrency(state);
  for (const [currency, pledge] of pledges) {
    const bucket = bucketFor(currency);
    bucket.pledgedMinor = pledge.pledgedMinor;
    bucket.receivableMinor = pledge.receivableMinor;
  }

  for (const bucket of totals.values()) {
    bucket.totalMinor = bucket.regularMinor + bucket.reserveMinor;
    bucket.availableMinor = bucket.regularMinor - bucket.pledgedMinor;
    Object.freeze(bucket);
  }

  const frozen = Object.freeze(totals);
  totalsCache.set(state, frozen);
  return frozen;
}

/* Atajo para el saldo disponible de una moneda. */
export function availableMinor(state, currency) {
  const bucket = totalsByCurrency(state).get(currency);
  return bucket ? bucket.availableMinor : 0;
}

/* ------------------------------------------------------------------
   Filtros
   ------------------------------------------------------------------ */

/* Las fechas son ISO local ("2026-09-05T21:07"), así que basta con
   comparar los diez primeros caracteres como texto. Sin construir
   objetos Date no hay huso horario que se meta de por medio. */
export function operationDay(operation) {
  return String(operation.date || '').slice(0, 10);
}

/* ¿Toca esta operación la moneda dada? Un cambio de divisa cuenta por
   los dos lados. */
export function operationTouchesCurrency(operation, currency) {
  if (!currency) return true;
  if (operation.type === 'fx') {
    return operation.fromCurrency === currency || operation.toCurrency === currency;
  }
  return operation.currency === currency;
}

/* Operaciones de un periodo y una moneda.
   from y to son 'YYYY-MM-DD' inclusivos; cualquiera puede faltar.
   Las anuladas quedan fuera salvo que se pidan. */
export function operationsInPeriod(state, options = {}) {
  const { from = null, to = null, currency = null, includeVoided = false, types = null } = options;

  return state.operations.filter((operation) => {
    if (!includeVoided && operation.voided) return false;
    if (types && !types.includes(operation.type)) return false;
    if (!operationTouchesCurrency(operation, currency)) return false;

    const day = operationDay(operation);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
}

/* Suma con signo de un conjunto de operaciones para una moneda.
   Usa los mismos deltas que el saldo, así que un fx suma su lado de
   entrada y resta el de salida sin descuadrar. */
export function netMinor(operations, currency) {
  let total = 0;
  for (const operation of operations) {
    for (const delta of operationDeltas(operation)) {
      if (currency && delta.currency !== currency) continue;
      total += delta.deltaMinor;
    }
  }
  return total;
}

/* Gasto total del conjunto, en positivo. Solo type expense. */
export function spentMinor(operations, currency) {
  let total = 0;
  for (const operation of operations) {
    if (operation.voided || operation.type !== 'expense') continue;
    if (currency && operation.currency !== currency) continue;
    total += operation.amountMinor || 0;
  }
  return total;
}

/* Límites de un periodo alrededor de un día 'YYYY-MM-DD'.
   Devuelve { from, to } inclusivos, en texto, sin objetos Date. */
export function periodBounds(period, day) {
  const [year, month, date] = day.split('-').map(Number);

  if (period === 'month') {
    return { from: monthStart(year, month), to: monthEnd(year, month) };
  }
  if (period === 'year') {
    return { from: year + '-01-01', to: year + '-12-31' };
  }
  if (period === 'quarter') {
    const firstMonth = month - 2;
    const start = shiftMonth(year, firstMonth);
    return { from: monthStart(start.year, start.month), to: monthEnd(year, month) };
  }
  if (period === 'week') {
    /* Semana de lunes a domingo. Aquí sí hace falta calendario, así
       que se usa UTC a mediodía: sin husos, sin horario de verano. */
    const anchor = Date.UTC(year, month - 1, date, 12);
    const weekday = (new Date(anchor).getUTCDay() + 6) % 7;
    const from = new Date(anchor - weekday * 86400000);
    const to = new Date(anchor + (6 - weekday) * 86400000);
    return { from: isoDay(from), to: isoDay(to) };
  }
  return { from: day, to: day };
}

function monthStart(year, month) {
  return year + '-' + pad2(month) + '-01';
}

function monthEnd(year, month) {
  const next = shiftMonth(year, month + 1);
  const lastDay = new Date(Date.UTC(next.year, next.month - 1, 1) - 86400000);
  return isoDay(lastDay);
}

function shiftMonth(year, month) {
  const zero = month - 1;
  const carry = Math.floor(zero / 12);
  const normalized = ((zero % 12) + 12) % 12;
  return { year: year + carry, month: normalized + 1 };
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}
