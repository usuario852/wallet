/*
  Verificación de la lógica de la fase 3: parseo, predicción y
  resolución del borrador. Sin DOM y sin dependencias.

    npm run verify:predict
*/

import { createStore, addAccount, addOperation, upsertConcept, voidOperation } from '../src/state/store.js';
import { markInsight, markCoverage } from '../src/logic/mark.js';
import { parseEntry, evaluateExpression, toMinor, nowLocalISO } from '../src/logic/parse.js';
import {
  suggest, scoreConcept, ghostCompletion, recordUsage,
  frequencyFactor, recencyFactor, hourFactor, mergedConcepts, MAX_SUGGESTIONS,
} from '../src/logic/predict.js';
import { resolveDraft, resolveAccount, categoryFor } from '../src/logic/entry.js';
import { SEED_CONCEPTS, iconForCategory } from '../src/logic/seed.js';
import { normalize, prefixQuality } from '../src/logic/text.js';
import { money, operationAmount, operationCurrency } from '../src/ui/format.js';
import { markPhrase, ordinal } from '../src/copy.js';

let passed = 0;
let failed = 0;
const failures = [];

function group(title) {
  console.log('\n' + title);
  console.log('─'.repeat(title.length));
}

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log('  ok    ' + label);
  } else {
    failed += 1;
    failures.push(label);
    console.log('  FALLA ' + label);
    console.log('        esperado: ' + JSON.stringify(expected));
    console.log('        obtenido: ' + JSON.stringify(actual));
  }
}

function checkTrue(label, value) {
  check(label, Boolean(value), true);
}

const NOW = new Date('2026-03-12T13:20:00');

function buildStore() {
  const store = createStore();
  addAccount(store, { id: 'acc_bbva', name: 'BBVA', currency: 'PEN', openingMinor: 100000 });
  addAccount(store, { id: 'acc_usd', name: 'BBVA Dólares', currency: 'USD', openingMinor: 0 });
  addAccount(store, { id: 'acc_yape', name: 'BCP / Yape', currency: 'PEN', openingMinor: 0 });
  return store;
}

/* ------------------------------------------------------------------
   1. Capa 2 · los seis patrones de la sección 5
   ------------------------------------------------------------------ */

function testParsePatterns() {
  group('1 · Capa 2: los seis patrones documentados');

  const store = buildStore();
  const accounts = store.getState().accounts;
  const options = { accounts, now: NOW, enabledCurrencies: ['PEN', 'USD'] };
  const p = (text) => parseEntry(text, options);

  const uber = p('uber 18');
  check('uber 18 · concepto + monto', [uber.concept, uber.amountMinor], ['uber', 1800]);

  const reversed = p('18 uber');
  check('18 uber · monto + concepto', [reversed.concept, reversed.amountMinor], ['uber', 1800]);

  const yesterday = p('ayer almuerzo 28');
  check('ayer almuerzo 28 · fecha relativa',
    [yesterday.concept, yesterday.amountMinor, yesterday.date.slice(0, 10)],
    ['almuerzo', 2800, '2026-03-11']);

  const arithmetic = p('almuerzo 18+25');
  check('almuerzo 18+25 · aritmética', [arithmetic.concept, arithmetic.amountMinor], ['almuerzo', 4300]);

  const account = p('netflix 34.90 bbva');
  check('netflix 34.90 bbva · cuenta explícita',
    [account.concept, account.amountMinor, account.accountId],
    ['netflix', 3490, 'acc_bbva']);

  const income = p('me pagaron 800 dolares');
  check('me pagaron 800 dolares · tipo + moneda',
    [income.type, income.amountMinor, income.currency],
    ['income', 80000, 'USD']);

  /* La aritmética es entera de principio a fin. */
  check('34.90 son 3490 y no 3489,99...', toMinor('34.90'), 3490);
  check('0.1 + 0.2 en unidades menores', evaluateExpression('0.1+0.2'), 30);
  check('resta', evaluateExpression('50-12.50'), 3750);
  check('coma decimal', toMinor('12,5'), 1250);
  checkTrue('todo importe parseado es entero',
    [ '18', '18.5', '18+25', '0.1+0.2', '100-1.01' ].every((expression) => (
      Number.isInteger(evaluateExpression(expression))
    )));

  /* El campo nunca bloquea. */
  const messy = p('esto no tiene ningún monto');
  check('texto suelto sigue siendo válido',
    [messy.concept, messy.amountMinor], ['esto no tiene ningún monto', null]);
  check('campo vacío no lanza', p('').concept, '');

  /* Ambigüedad de cuenta: bbva calza exacto con BBVA, no con las dos. */
  check('bbva no se confunde con BBVA Dólares', p('cafe 10 bbva').accountId, 'acc_bbva');
  check('el nombre largo gana', p('cafe 10 bbva dolares').accountId, 'acc_usd');
  check('yape encuentra BCP / Yape', p('cafe 10 yape').accountId, 'acc_yape');

  /* Se conserva la forma en que el usuario escribió el concepto. */
  check('el concepto conserva mayúsculas y tildes',
    p('Almacén Sofía 12.50').concept, 'Almacén Sofía');
}

/* ------------------------------------------------------------------
   2. Capa 1 · el puntaje
   ------------------------------------------------------------------ */

function testScoring() {
  group('2 · Capa 1: frecuencia × recencia × hora × prefijo');

  check('calidad de prefijo, exacto', prefixQuality('almuerzo', 'almuerzo'), 3);
  check('calidad de prefijo, inicio', prefixQuality('alm', 'almuerzo'), 2);
  check('calidad de prefijo, inicio de otra palabra', prefixQuality('sofia', 'Almacén Sofía'), 2);
  check('calidad de prefijo, subcadena', prefixQuality('mac', 'Almacén'), 1);
  check('calidad de prefijo, sin calce', prefixQuality('zzz', 'almuerzo'), 0);
  check('consulta vacía calza con todo', prefixQuality('', 'almuerzo'), 1);

  /* Frecuencia log-escalada: de 1 a 3 registros pesa más que de 40 a 42. */
  const salto1a3 = frequencyFactor(3) - frequencyFactor(1);
  const salto40a42 = frequencyFactor(42) - frequencyFactor(40);
  checkTrue('la frecuencia es log-escalada', salto1a3 > salto40a42 * 5);

  /* Recencia: vida media de 30 días. */
  const hoy = recencyFactor('2026-03-12T13:00', NOW);
  const hace30 = recencyFactor('2026-02-10T13:00', NOW);
  const hace90 = recencyFactor('2025-12-12T13:00', NOW);
  checkTrue('lo de hoy vale 1', Math.abs(hoy - 1) < 0.01);
  checkTrue('lo de hace 30 días vale la mitad', Math.abs(hace30 - 0.5) < 0.03);
  checkTrue('lo de hace 90 días vale un octavo', Math.abs(hace90 - 0.125) < 0.02);
  check('sin fecha de uso, recencia de suelo', recencyFactor('', NOW) > 0, true);

  /* Hora típica: 1.6 dentro de ±2h. */
  const almuerzo = new Array(24).fill(0);
  almuerzo[13] = 10;
  check('a la hora típica', hourFactor(almuerzo, NOW), 1.6);
  check('a dos horas', hourFactor(almuerzo, new Date('2026-03-12T15:00')), 1.6);
  check('a tres horas', hourFactor(almuerzo, new Date('2026-03-12T16:00')), 1);
  check('sin histograma no penaliza', hourFactor(null, NOW), 1);

  const medianoche = new Array(24).fill(0);
  medianoche[0] = 5;
  check('la distancia horaria es circular',
    hourFactor(medianoche, new Date('2026-03-12T23:00')), 1.6);
}

/* ------------------------------------------------------------------
   3. Sugerencias
   ------------------------------------------------------------------ */

function testSuggestions() {
  group('3 · Sugerencias: catálogo semilla y aprendizaje');

  const store = buildStore();

  /* Un usuario nuevo no arranca con la lista vacía. */
  const fresh = suggest(store.getState(), 'alm', { now: NOW });
  checkTrue('el catálogo semilla responde desde el primer día', fresh.length > 0);
  check('almuerzo sale del catálogo', fresh[0].text, 'almuerzo');
  check('y trae su categoría', fresh[0].category, 'Alimentación');
  checkTrue('marcado como semilla', fresh[0].seed);

  check('nunca más de cinco', suggest(store.getState(), '', { now: NOW }).length, MAX_SUGGESTIONS);

  /* El concepto propio desplaza al del catálogo tras dos o tres usos. */
  const propio = { text: 'almuerzo', category: 'Comida del trabajo', currency: 'PEN' };
  upsertConcept(store, { ...propio, lastUsed: '2026-03-11T13:00', lastAmountMinor: 1800, hour: 13 });
  const trasUno = suggest(store.getState(), 'alm', { now: NOW })[0];
  check('con un registro ya manda el propio', [trasUno.text, trasUno.seed], ['almuerzo', false]);
  check('y trae la categoría del usuario', trasUno.category, 'Comida del trabajo');

  /* No se duplica: el catálogo solo rellena huecos. */
  const veces = suggest(store.getState(), 'almuerzo', { now: NOW })
    .filter((item) => normalize(item.text) === 'almuerzo').length;
  check('el propio no convive con el semilla', veces, 1);

  /* Un concepto propio con tres usos recientes supera a cualquier
     semilla, aunque el semilla calce mejor por prefijo. */
  for (let index = 0; index < 3; index += 1) {
    upsertConcept(store, { text: 'chifa de la esquina', category: 'Alimentación', lastUsed: '2026-03-12T13:00', hour: 13 });
  }
  const propioScore = scoreConcept(
    store.getState().concepts.find((c) => c.text === 'chifa de la esquina'), 'chifa', NOW);
  const semillaScore = scoreConcept(
    SEED_CONCEPTS.find((c) => c.text === 'chifa'), 'chifa', NOW);
  checkTrue('tres usos propios superan al catálogo', propioScore > semillaScore);

  /* Con la consulta vacía manda frecuencia y recencia: es lo que
     hace posible el camino de dos taps. */
  const vacia = suggest(store.getState(), '', { now: NOW });
  check('sin escribir nada, primero lo más usado y reciente', vacia[0].text, 'chifa de la esquina');

  /* La cuenta sale del historial, no del modelo de datos. */
  addOperation(store, {
    id: 'op_1', type: 'expense', date: '2026-03-11T13:10',
    accountId: 'acc_yape', currency: 'PEN', amountMinor: 1800,
    concept: 'almuerzo', category: 'Comida del trabajo',
  });
  const conCuenta = suggest(store.getState(), 'almuerzo', { now: NOW })[0];
  check('la sugerencia recuerda la última cuenta', conCuenta.accountName, 'BCP / Yape');
}

/* ------------------------------------------------------------------
   4. Texto fantasma
   ------------------------------------------------------------------ */

function testGhost() {
  group('4 · Texto fantasma');

  const store = buildStore();
  check('alm completa a almuerzo', ghostCompletion(store.getState(), 'alm', { now: NOW }), 'uerzo');
  check('conserva lo escrito y solo añade el resto',
    'alm' + ghostCompletion(store.getState(), 'alm', { now: NOW }), 'almuerzo');
  check('sin nada escrito no hay fantasma', ghostCompletion(store.getState(), '', { now: NOW }), '');
  check('una palabra completa no se alarga sola',
    ghostCompletion(store.getState(), 'almuerzo', { now: NOW }), '');
  check('no completa desde el medio de la palabra',
    ghostCompletion(store.getState(), 'muerzo', { now: NOW }), '');
  check('sin candidato no inventa', ghostCompletion(store.getState(), 'zzz', { now: NOW }), '');
}

/* ------------------------------------------------------------------
   5. Los dos caminos de guardado producen lo mismo
   ------------------------------------------------------------------ */

function testDraft() {
  group('5 · Guardar escribiendo y tocar una sugerencia');

  const store = buildStore();
  upsertConcept(store, {
    text: 'almuerzo', category: 'Alimentación', currency: 'PEN',
    lastUsed: '2026-03-11T13:00', lastAmountMinor: 1800, hour: 13,
  });
  const state = store.getState();

  const escrito = resolveDraft(state, { raw: 'almuerzo 18', chosenType: 'expense', now: NOW });
  const sugerencia = suggest(state, 'almuerzo', { now: NOW })[0];
  const tocado = resolveDraft(state, { raw: '', chosenType: 'expense', suggestion: sugerencia, now: NOW });

  check('escribir produce el movimiento esperado',
    [escrito.concept, escrito.amountMinor, escrito.category, escrito.type, escrito.currency],
    ['almuerzo', 1800, 'Alimentación', 'expense', 'PEN']);
  check('tocar la sugerencia produce lo mismo',
    [tocado.concept, tocado.amountMinor, tocado.category, tocado.type, tocado.currency],
    ['almuerzo', 1800, 'Alimentación', 'expense', 'PEN']);

  /* Lo escrito manda sobre lo recordado. */
  const corregido = resolveDraft(state, { raw: '25', chosenType: 'expense', suggestion: sugerencia, now: NOW });
  check('el monto escrito gana al recordado', corregido.amountMinor, 2500);

  /* El tipo escrito gana al segmento. */
  const ingreso = resolveDraft(state, { raw: 'me pagaron 800', chosenType: 'expense', now: NOW });
  check('me pagaron convierte el gasto en ingreso', ingreso.type, 'income');

  /* Nada es obligatorio. */
  const minimo = resolveDraft(state, { raw: 'cualquier cosa', chosenType: 'expense', now: NOW });
  check('sin monto se guarda 0', minimo.amountMinor, 0);
  checkTrue('siempre hay fecha', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(minimo.date));
  checkTrue('siempre hay cuenta', Boolean(minimo.accountId));
  const sinTexto = resolveDraft(state, { raw: 'me pagaron 800', chosenType: 'expense', now: NOW, language: 'es' });
  check('sin concepto se usa el nombre del tipo', sinTexto.concept, 'Ingreso');

  /* La moneda decide la cuenta: nunca soles en una cuenta en dólares. */
  const enDolares = resolveDraft(state, { raw: 'curso 40 dolares', chosenType: 'expense', now: NOW });
  check('el monto en dólares cae en la cuenta en dólares',
    [enDolares.currency, enDolares.accountId], ['USD', 'acc_usd']);

  check('una cuenta preferida de otra moneda se descarta',
    resolveAccount(state, { preferred: 'acc_usd', currency: 'PEN' }), 'acc_bbva');
  check('sin cuentas no se inventa ninguna',
    resolveAccount(createStore().getState(), { currency: 'PEN' }), null);

  check('la categoría de un concepto conocido', categoryFor(state, 'almuerzo'), 'Alimentación');
  check('la de uno del catálogo', categoryFor(state, 'netflix'), 'Servicios');
  check('la de uno nuevo, vacía', categoryFor(state, 'algo que nadie escribió'), '');
}

/* ------------------------------------------------------------------
   6. Aprendizaje y formato
   ------------------------------------------------------------------ */

function testLearningAndFormat() {
  group('6 · Aprendizaje y formato del dinero');

  const store = buildStore();
  const operation = addOperation(store, {
    id: 'op_a', type: 'expense', date: '2026-03-12T13:20',
    accountId: 'acc_bbva', currency: 'PEN', amountMinor: 1800,
    concept: 'Almuerzo', category: 'Alimentación',
  });
  recordUsage(store, operation);

  const learned = store.getState().concepts[0];
  check('el concepto se aprende', [learned.text, learned.count, learned.category],
    ['Almuerzo', 1, 'Alimentación']);
  check('con la hora del gasto', learned.hourHistogram[13], 1);
  check('y el último monto', learned.lastAmountMinor, 1800);

  /* La corrección de categoría gana peso permanente. */
  const corrected = addOperation(store, {
    id: 'op_b', type: 'expense', date: '2026-03-12T13:40',
    accountId: 'acc_bbva', currency: 'PEN', amountMinor: 2000,
    concept: 'Almuerzo', category: 'Ocio',
  });
  recordUsage(store, corrected);
  const after = store.getState().concepts[0];
  check('la categoría corregida se queda', after.category, 'Ocio');
  check('y el conteo sube', after.count, 2);
  check('sin duplicar el concepto', store.getState().concepts.length, 1);

  /* El mismo concepto escrito de otra forma no crea otra entrada.
     "Audífonos", "audifonos" y la forma descompuesta que mandan
     algunos teclados de iOS son el mismo concepto. */
  const otro = buildStore();
  const grafias = [
    'audífonos',
    'Audifonos',
    'AUDÍFONOS',
    'audífonos',  /* i + tilde combinante, como escribe iOS */
    ' audífonos ',
  ];
  grafias.forEach((texto, index) => {
    recordUsage(otro, {
      type: 'expense', concept: texto, category: 'Compras', currency: 'PEN',
      amountMinor: 3500, date: '2026-03-12T1' + index + ':00',
    });
  });
  check('cinco grafías, un solo concepto', otro.getState().concepts.length, 1);
  check('y el conteo las suma todas', otro.getState().concepts[0].count, 5);
  check('conserva la primera grafía escrita', otro.getState().concepts[0].text, 'audífonos');
  check('y sugiere una sola vez',
    suggest(otro.getState(), 'audi', { now: NOW }).filter((s) => normalize(s.text) === 'audifonos').length, 1);

  /* Un movimiento sin monto no debe llegar a guardarse: la hoja lo
     corta antes. Aquí se comprueba el dato con el que decide. */
  const sinMonto = resolveDraft(otro.getState(), { raw: 'audífonos', chosenType: 'expense', now: NOW });
  check('sin monto escrito ni recordado, el borrador vale 0', sinMonto.amountMinor, 0);
  const conMonto = resolveDraft(otro.getState(), { raw: 'audífonos 35', chosenType: 'expense', now: NOW });
  check('con monto escrito, no', conMonto.amountMinor, 3500);

  /* Formato del dinero. */
  check('con símbolo y dos decimales', money(1800, 'PEN'), 'S/ 18.00');
  check('signo de gasto', money(1800, 'PEN', { sign: 'expense' }), '− S/ 18.00');
  check('signo de ingreso', money(350000, 'PEN', { sign: 'income' }), '+ S/ 3,500.00');
  check('sin decimales cuando es redondo', money(89000, null, { cents: 'auto' }), '890');
  check('con decimales cuando los tiene', money(89050, null, { cents: 'auto' }), '890.50');
  check('negativo automático', money(-37405, null, { cents: 'auto', sign: 'auto' }), '− 374.05');
  check('dólares', money(2400, 'USD'), '$ 24.00');

  /* El monto de una operación, sea del tipo que sea. Ninguna pantalla
     puede volver a suponer que toda operación tiene amountMinor. */
  const fx = {
    type: 'fx', fromCurrency: 'USD', toCurrency: 'PEN',
    fromAmountMinor: 15000, toAmountMinor: 50400,
  };
  check('un fx muestra el importe que sale, en su moneda',
    operationAmount(fx), { text: '$ 150.00', kind: 'neutral' });
  check('y no lo pinta como un gasto de 0.00',
    operationAmount(fx).text !== '− S/ 0.00', true);
  check('una transferencia no lleva signo',
    operationAmount({ type: 'transfer', currency: 'PEN', amountMinor: 20000 }),
    { text: 'S/ 200.00', kind: 'neutral' });
  check('un gasto sí',
    operationAmount({ type: 'expense', currency: 'PEN', amountMinor: 1800 }),
    { text: '− S/ 18.00', kind: 'negative' });
  check('un ingreso también',
    operationAmount({ type: 'income', currency: 'PEN', amountMinor: 350000 }),
    { text: '+ S/ 3,500.00', kind: 'positive' });
  check('un ajuste a la baja lleva su signo y no juzga',
    operationAmount({ type: 'adjustment', currency: 'PEN', amountMinor: -500 }),
    { text: '− S/ 5.00', kind: 'neutral' });
  check('un fx sin importes muestra guion',
    operationAmount({ type: 'fx' }), { text: '—', kind: 'muted' });
  check('la moneda de un fx es la de salida', operationCurrency(fx), 'USD');

  /* Ninguna operación sin amountMinor produce NaN ni undefined. */
  const tipos = ['expense', 'income', 'transfer', 'fx', 'adjustment', 'raro'];
  checkTrue('ningún tipo produce NaN ni undefined',
    tipos.every((tipo) => {
      const texto = operationAmount({ type: tipo }).text;
      return typeof texto === 'string' && !texto.includes('NaN') && !texto.includes('undefined');
    }));

  /* Y el aprendizaje no se traga los tipos que no son concepto. */
  const aprendizaje = buildStore();
  recordUsage(aprendizaje, {
    type: 'fx', date: '2026-03-12T13:00', concept: 'Cambio de divisa',
    fromAmountMinor: 15000, toAmountMinor: 50400,
  });
  check('un fx no entra en el índice de conceptos', aprendizaje.getState().concepts.length, 0);

  /* Toda fila lleva glifo. */
  check('categoría conocida', iconForCategory('Alimentación'), 'alimentacion');
  check('categoría sin tilde de los datos migrados', iconForCategory('Alimentacion'), 'alimentacion');
  check('categoría heredada de v8', iconForCategory('Vivienda'), 'hogar');
  check('categoría desconocida cae en el neutro', iconForCategory('Lo que sea'), 'cuenta');
  check('sin categoría también', iconForCategory(''), 'cuenta');
}

/* ------------------------------------------------------------------
   7. Lo que devuelve marcar
   ------------------------------------------------------------------ */

function testMark() {
  group('7 · La marca de estado devuelve algo desde la primera vez');

  const store = buildStore();
  let n = 0;
  const gastar = (marca, dia) => {
    n += 1;
    const operation = addOperation(store, {
      id: 'op_m' + n, type: 'expense', date: dia + 'T13:00',
      accountId: 'acc_bbva', currency: 'PEN', amountMinor: 1000 + n,
      concept: 'gasto ' + n, category: 'Ocio',
      state: marca,
    });
    return markInsight(store.getState(), operation);
  };

  /* Semana del 9 al 15 de marzo de 2026 (lunes a domingo). */
  const primero = gastar('antojo', '2026-03-10');
  check('el primero de todos', primero, { key: 'firstEver', mark: 'antojo', count: 1 });
  check('y su frase', markPhrase('es', primero), 'El primero que marcas así');

  const segundo = gastar('antojo', '2026-03-11');
  check('el segundo de la semana', [segundo.key, segundo.count], ['nthThisWeek', 2]);
  check('y su frase', markPhrase('es', segundo), 'Es tu 2do antojo esta semana');

  const tercero = gastar('antojo', '2026-03-12');
  check('el tercero', markPhrase('es', tercero), 'Es tu 3er antojo esta semana');

  /* Otra marca empieza de cero: es la primera de su clase. */
  const social = gastar('social', '2026-03-12');
  check('otra marca vuelve a empezar', markPhrase('es', social), 'El primero que marcas así');
  const social2 = gastar('social', '2026-03-13');
  check('y la gramática se adapta a la etiqueta',
    markPhrase('es', social2), 'Es tu 2do gasto social esta semana');

  /* Semana siguiente: ya no es el primero de todos, pero sí el
     primero de la semana. */
  const otraSemana = gastar('antojo', '2026-03-17');
  check('primero de la semana nueva',
    markPhrase('es', otraSemana), 'Tu primer antojo de esta semana');

  /* Un gasto sin marca no devuelve nada: no hay nada que decir. */
  const sinMarca = addOperation(store, {
    id: 'op_sin', type: 'expense', date: '2026-03-17T14:00',
    accountId: 'acc_bbva', currency: 'PEN', amountMinor: 500, concept: 'x',
  });
  check('sin marca no hay respuesta', markInsight(store.getState(), sinMarca), null);
  check('ni frase', markPhrase('es', null), '');

  /* Una operación anulada deja de contar. */
  const antesDeAnular = markInsight(store.getState(), store.getState().operations.find((o) => o.id === 'op_m3'));
  voidOperation(store, 'op_m1');
  voidOperation(store, 'op_m2');
  const despues = markInsight(store.getState(), store.getState().operations.find((o) => o.id === 'op_m3'));
  check('antes de anular era el tercero', antesDeAnular.count, 3);
  /* Queda op_m6, de otra semana, así que no es el primero de todos
     pero sí el único de la suya. */
  check('anular las anteriores lo saca del recuento', despues.key, 'firstThisWeek');

  /* Los ordinales altos no se inventan. */
  check('ordinal 9', ordinal(9, 'es'), '9no');
  check('ordinal 12', ordinal(12, 'es'), '12.º');
  check('ordinal en inglés', ordinal(3, 'en'), '3rd');

  /* Y la cobertura, que es lo que decide si la función se queda. */
  const cobertura = markCoverage(store.getState());
  /* Siete gastos menos los dos anulados: cinco, cuatro con marca. */
  check('cuenta gastos y marcados, sin los anulados',
    [cobertura.expenses, cobertura.marked], [5, 4]);
  checkTrue('la proporción está por encima de un tercio', cobertura.ratio > 1 / 3);
  check('sin gastos no hay proporción', markCoverage(createStore().getState()).ratio, null);
}

/* ------------------------------------------------------------------
   8. Presupuesto de tiempo
   ------------------------------------------------------------------ */

function testSpeed() {
  group('7 · Las sugerencias aparecen en menos de 150ms');

  const store = buildStore();
  /* Mil movimientos y doscientos conceptos: más de lo que tendrá un
     usuario real en un año. */
  for (let index = 0; index < 200; index += 1) {
    upsertConcept(store, {
      text: 'concepto ' + index,
      category: 'Alimentación',
      lastUsed: '2026-03-' + String((index % 28) + 1).padStart(2, '0') + 'T13:00',
      lastAmountMinor: 1000 + index,
      hour: index % 24,
    });
  }
  for (let index = 0; index < 1000; index += 1) {
    addOperation(store, {
      id: 'op_speed_' + index, type: 'expense', date: '2026-03-12T10:00',
      accountId: 'acc_bbva', currency: 'PEN', amountMinor: 100,
      concept: 'concepto ' + (index % 200), category: 'Alimentación',
    });
  }

  const state = store.getState();
  const queries = ['', 'a', 'co', 'con', 'concepto 1', 'zzz'];
  const start = performance.now();
  const rounds = 200;
  for (let round = 0; round < rounds; round += 1) {
    suggest(state, queries[round % queries.length], { now: NOW });
  }
  const perQuery = (performance.now() - start) / rounds;

  console.log('        ' + perQuery.toFixed(3) + ' ms por consulta con 200 conceptos y 1000 operaciones');
  checkTrue('una consulta cuesta mucho menos que el debounce de 120ms', perQuery < 20);
  checkTrue('el presupuesto total de 150ms se cumple con holgura', perQuery + 120 < 150);
}

/* ------------------------------------------------------------------ */

console.log('Verificación de la lógica de registro · fase 3');

testParsePatterns();
testScoring();
testSuggestions();
testGhost();
testDraft();
testLearningAndFormat();
testMark();
testSpeed();

console.log('\n' + '═'.repeat(46));
console.log(passed + ' comprobaciones pasan, ' + failed + ' fallan');
if (failed) {
  console.log('\nFallos:');
  for (const label of failures) console.log('  · ' + label);
  process.exitCode = 1;
}
