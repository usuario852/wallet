/*
  parse — capa 2 del autocompletado: parseo de expresión, 0ms.

  Reconoce, en el mismo campo (sección 5):

    uber 18                  concepto + monto
    18 uber                  monto + concepto
    ayer almuerzo 28         fecha relativa
    almuerzo 18+25           aritmética
    netflix 34.90 bbva       cuenta explícita
    me pagaron 800 dolares   tipo + moneda

  El campo nunca bloquea: cualquier texto produce un resultado válido.
  Lo que no se reconoce se queda en el concepto, que es lo peor que
  puede pasar y no es grave.

  El orden de las pasadas importa. La cuenta se extrae antes que el
  monto para que "netflix 34.90 bbva" no confunda a bbva con el final
  de la expresión numérica.
*/

import { normalize } from './text.js';

/* Frases que declaran un ingreso. Se buscan como frase completa, no
   palabra suelta: "sueldo" solo no convierte un gasto en ingreso,
   porque "sueldo" también es el concepto de un gasto de nómina. */
const INCOME_PHRASES = [
  'me pagaron', 'me pago', 'me depositaron', 'me deposito',
  'me transfirieron', 'me llego', 'me devolvieron',
  'cobre', 'cobrado', 'recibi', 'ingreso',
];

/* Desplazamiento en días de cada palabra de fecha relativa. */
const RELATIVE_DAYS = new Map([
  ['hoy', 0],
  ['ayer', -1],
  ['anteayer', -2],
  ['antier', -2],
  ['mañana', 1],
]);

/* Palabras y símbolos de moneda. */
const CURRENCY_WORDS = new Map([
  ['soles', 'PEN'], ['sol', 'PEN'], ['pen', 'PEN'], ['s/', 'PEN'],
  ['dolares', 'USD'], ['dolar', 'USD'], ['usd', 'USD'], ['dls', 'USD'], ['$', 'USD'],
  ['euros', 'EUR'], ['euro', 'EUR'], ['eur', 'EUR'],
]);

/* Un número con hasta dos decimales, con punto o coma. */
const NUMBER = /^\d+(?:[.,]\d{1,2})?$/;

/* Una expresión aritmética completa en un solo token: 18+25-3 */
const EXPRESSION = /^\d+(?:[.,]\d{1,2})?(?:[+-]\d+(?:[.,]\d{1,2})?)+$/;

/* Símbolo de moneda pegado al número: s/18  $20  18soles */
const GLUED = /^(s\/|\$|€)?(\d+(?:[.,]\d{1,2})?)(soles|dolares|usd|pen|eur)?$/;

/* ------------------------------------------------------------------
   Dinero
   ------------------------------------------------------------------ */

/* "34.90" -> 3490. Se parte la cadena en vez de multiplicar por 100:
   con coma flotante, 34.90 * 100 no siempre es 3490. */
export function toMinor(text) {
  const clean = String(text).replace(',', '.');
  const [whole, fraction = ''] = clean.split('.');
  const units = Number(whole || '0');
  if (!Number.isFinite(units)) return null;
  const cents = Number((fraction + '00').slice(0, 2));
  return units * 100 + cents;
}

/* Resuelve una expresión de sumas y restas sobre unidades menores.
   Toda la aritmética es entera: 18+25 son 1800+2500, no 43.00. */
export function evaluateExpression(expression) {
  const clean = String(expression).replace(/\s+/g, '');
  if (!NUMBER.test(clean) && !EXPRESSION.test(clean)) return null;

  const parts = clean.split(/([+-])/);
  let total = toMinor(parts[0]);
  if (total === null) return null;

  for (let index = 1; index < parts.length; index += 2) {
    const operator = parts[index];
    const operand = toMinor(parts[index + 1]);
    if (operand === null) return null;
    total = operator === '-' ? total - operand : total + operand;
  }
  return total;
}

/* ------------------------------------------------------------------
   Parseo
   ------------------------------------------------------------------ */

/* Analiza lo escrito en el campo.

   options:
     accounts        para reconocer una cuenta nombrada
     now             fecha de referencia; por defecto, ahora
     enabledCurrencies  monedas que el usuario tiene activas

   Devuelve siempre un objeto; nunca lanza y nunca deja el concepto
   en null. */
export function parseEntry(input, options = {}) {
  const accounts = options.accounts || [];
  const now = options.now instanceof Date ? options.now : new Date();
  const enabled = options.enabledCurrencies || null;

  const original = String(input === null || input === undefined ? '' : input);
  const rawTokens = original.split(/\s+/).filter(Boolean);
  const tokens = rawTokens.map(normalize);
  const used = new Array(rawTokens.length).fill(false);

  const found = {
    type: null, date: null, currency: null, accountId: null,
    amountMinor: null, expression: null,
  };

  /* -------- 1. tipo: frase de ingreso -------- */
  for (const phrase of INCOME_PHRASES) {
    const size = phrase.split(' ').length;
    for (let start = 0; start + size <= tokens.length; start += 1) {
      if (used[start]) continue;
      const candidate = tokens.slice(start, start + size).join(' ');
      if (candidate !== phrase) continue;
      found.type = 'income';
      for (let offset = 0; offset < size; offset += 1) used[start + offset] = true;
      break;
    }
    if (found.type) break;
  }

  /* -------- 2. fecha relativa -------- */
  for (let index = 0; index < tokens.length; index += 1) {
    if (used[index]) continue;
    const shift = RELATIVE_DAYS.get(tokens[index]);
    if (shift === undefined) continue;
    found.date = shiftedDate(now, shift);
    used[index] = true;
    break;
  }

  /* -------- 3. cuenta de nombre compuesto --------
     Antes que la moneda, y solo con tramos de dos o tres palabras.

     El orden importa y es la única forma de resolver un choque real:
     "BBVA Dólares" es el nombre de una cuenta y "dólares" es una
     moneda. Un tramo de varias palabras que calza con el nombre de
     una cuenta no es una casualidad, así que gana. Una palabra
     suelta que además es una moneda, no: en "me pagaron 800 dólares"
     lo que se está diciendo es la moneda. */
  const accountIndex = buildAccountIndex(accounts);
  matchAccount(tokens, used, accountIndex, [3, 2], found);

  /* -------- 4. moneda escrita como palabra -------- */
  for (let index = 0; index < tokens.length; index += 1) {
    if (used[index]) continue;
    const currency = CURRENCY_WORDS.get(tokens[index]);
    if (!currency) continue;
    if (enabled && !enabled.includes(currency)) continue;
    found.currency = currency;
    used[index] = true;
    break;
  }

  /* -------- 5. cuenta de una sola palabra --------
     Si un tramo calza con dos cuentas a la vez no se consume:
     adivinar mal la cuenta es peor que no adivinarla. */
  if (!found.accountId) matchAccount(tokens, used, accountIndex, [1], found);

  /* -------- 6. monto --------
     Se toma el último tramo numérico que quede libre: cubre tanto
     "uber 18" como "18 uber". */
  const runs = numericRuns(tokens, used);
  if (runs.length) {
    const run = runs[runs.length - 1];
    const value = evaluateExpression(run.expression);
    if (value !== null) {
      found.amountMinor = value;
      found.expression = run.expression;
      if (run.currency && (!enabled || enabled.includes(run.currency))) {
        if (!found.currency) found.currency = run.currency;
      }
      for (let index = run.start; index <= run.end; index += 1) used[index] = true;
    }
  }

  /* -------- 7. lo que sobra es el concepto --------
     Se conserva el texto tal como lo escribió el usuario: "Almacén
     Sofía" no se guarda como "almacen sofia". */
  const concept = rawTokens.filter((_, index) => !used[index]).join(' ');

  return {
    concept,
    amountMinor: found.amountMinor,
    expression: found.expression,
    date: found.date,
    currency: found.currency,
    type: found.type,
    accountId: found.accountId,
    /* Qué se reconoció, para que la interfaz pueda explicarlo sin
       volver a adivinar. */
    recognized: {
      amount: found.amountMinor !== null,
      date: found.date !== null,
      currency: found.currency !== null,
      account: found.accountId !== null,
      type: found.type !== null,
    },
  };
}

/* ------------------------------------------------------------------
   Auxiliares
   ------------------------------------------------------------------ */

/* Busca una cuenta nombrada en tramos de los tamaños pedidos, del
   más largo al más corto. Marca lo consumido y anota el hallazgo. */
function matchAccount(tokens, used, accountIndex, sizes, found) {
  for (const size of sizes) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      let free = true;
      for (let offset = 0; offset < size; offset += 1) {
        if (used[start + offset]) { free = false; break; }
      }
      if (!free) continue;

      const candidate = tokens.slice(start, start + size).join(' ');
      const matches = accountIndex.get(candidate);
      if (!matches || matches.length !== 1) continue;

      found.accountId = matches[0].id;
      if (!found.currency) found.currency = matches[0].currency;
      for (let offset = 0; offset < size; offset += 1) used[start + offset] = true;
      return true;
    }
  }
  return false;
}

/* Tramos numéricos contiguos, incluida la aritmética escrita con
   espacios ("18 + 25") y el símbolo pegado ("s/18"). */
function numericRuns(tokens, used) {
  const runs = [];
  let index = 0;

  while (index < tokens.length) {
    if (used[index]) { index += 1; continue; }

    const head = GLUED.exec(tokens[index]);
    const isNumeric = head || EXPRESSION.test(tokens[index]);
    if (!isNumeric) { index += 1; continue; }

    const start = index;
    let expression = head ? head[2] : tokens[index];
    const currency = head && head[1]
      ? CURRENCY_WORDS.get(head[1])
      : (head && head[3] ? CURRENCY_WORDS.get(head[3]) : null);
    let end = index;

    /* Se encadenan operador y operando mientras sigan viniendo. */
    let cursor = index + 1;
    while (cursor + 1 < tokens.length) {
      const operator = tokens[cursor];
      const operand = tokens[cursor + 1];
      if (used[cursor] || (operator !== '+' && operator !== '-')) break;
      if (used[cursor + 1] || !NUMBER.test(operand)) break;
      expression += operator + operand;
      end = cursor + 1;
      cursor += 2;
    }

    runs.push({ start, end, expression, currency });
    index = end + 1;
  }

  return runs;
}

/* Nombre normalizado -> cuentas que responden a él. Se indexa el
   nombre completo y también cada palabra suelta, para que "bbva"
   encuentre "BBVA" sin que "dolares" arrastre a la otra. */
function buildAccountIndex(accounts) {
  const index = new Map();

  function add(key, account) {
    if (!key) return;
    const list = index.get(key) || [];
    if (!list.some((existing) => existing.id === account.id)) list.push(account);
    index.set(key, list);
  }

  for (const account of accounts) {
    if (account.archived) continue;
    const full = normalize(account.name);
    add(full, account);
    for (const word of full.split(/[\s/]+/)) {
      if (word.length >= 3) add(word, account);
    }
    if (account.institution) add(normalize(account.institution), account);
  }

  /* Un nombre completo que además calza con varias cuentas por
     palabra suelta se resuelve a favor del nombre completo. */
  for (const [key, list] of index) {
    if (list.length <= 1) continue;
    const exact = list.filter((account) => normalize(account.name) === key);
    if (exact.length === 1) index.set(key, exact);
  }

  return index;
}

/* Fecha ISO local con la hora actual, desplazada en días.
   Sin husos: se construye a partir de los componentes locales. */
function shiftedDate(now, days) {
  const moved = new Date(now.getTime());
  moved.setDate(moved.getDate() + days);
  const pad = (value) => String(value).padStart(2, '0');
  return moved.getFullYear()
    + '-' + pad(moved.getMonth() + 1)
    + '-' + pad(moved.getDate())
    + 'T' + pad(moved.getHours())
    + ':' + pad(moved.getMinutes());
}

/* Fecha ISO local de ahora mismo. La usa quien guarda sin fecha
   explícita. */
export function nowLocalISO(now = new Date()) {
  return shiftedDate(now, 0);
}
