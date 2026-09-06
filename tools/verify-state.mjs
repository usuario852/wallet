/*
  Verificación de la capa de estado. Sin dependencias: se corre con

    npm run verify

  Vive fuera de src/ a propósito, para que no entre en el bundle.
*/

import {
  createStore, createDefaultState,
  addAccount, addOperation, voidOperation, addUpcoming, updateSettings,
} from '../src/state/store.js';

import {
  accountBalanceMinor, balancesByAccount, totalsByCurrency,
  operationsInPeriod, spentMinor, netMinor, periodBounds,
} from '../src/state/derive.js';

import {
  loadState, saveState, attachPersistence, createMemoryStorage,
  STATE_KEY, CORRUPT_KEY_PREFIX,
} from '../src/state/persist.js';

import { migrateLegacy, runMigration, LEGACY_KEY, LEGACY_BACKUP_KEY } from '../src/state/migrate.js';
import { exportState, exportFilename, parseImport, applyImport } from '../src/state/transfer.js';

/* ------------------------------------------------------------------
   Arnés mínimo
   ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------
   Escenario común

   Una cuenta con de todo: gastos, ingresos, ajustes en los dos
   sentidos, una transferencia, un cambio de divisa y una operación
   anulada que no debe contar.
   ------------------------------------------------------------------ */

function buildScenario() {
  const store = createStore();

  updateSettings(store, { activeCurrency: 'PEN', enabledCurrencies: ['PEN', 'USD'] });

  const bbva = addAccount(store, { id: 'acc_bbva', name: 'BBVA', currency: 'PEN', openingMinor: 10000 });
  const efectivo = addAccount(store, { id: 'acc_efectivo', name: 'Efectivo', currency: 'PEN', openingMinor: 0 });
  const dolares = addAccount(store, { id: 'acc_usd', name: 'BBVA Dólares', currency: 'USD', openingMinor: 0 });
  const ahorro = addAccount(store, {
    id: 'acc_ahorro', name: 'Ahorro', currency: 'PEN', kind: 'reserve',
    openingMinor: 50000, goalMinor: 200000,
  });

  addOperation(store, {
    id: 'op_almuerzo', type: 'expense', date: '2026-03-12T13:20',
    accountId: bbva.id, currency: 'PEN', amountMinor: 1800,
    concept: 'Almuerzo', category: 'Alimentación',
  });

  addOperation(store, {
    id: 'op_sueldo', type: 'income', date: '2026-03-01T09:00',
    accountId: bbva.id, currency: 'PEN', amountMinor: 250000,
    concept: 'Sueldo', category: 'Sueldo',
  });

  /* Ajuste con signo: uno a la baja y otro al alza. */
  addOperation(store, {
    id: 'op_ajuste_menos', type: 'adjustment', date: '2026-03-05T08:00',
    accountId: bbva.id, currency: 'PEN', amountMinor: -500, concept: 'Cuadre de caja',
  });
  addOperation(store, {
    id: 'op_ajuste_mas', type: 'adjustment', date: '2026-03-06T08:00',
    accountId: bbva.id, currency: 'PEN', amountMinor: 300, concept: 'Cuadre de caja',
  });

  addOperation(store, {
    id: 'op_transfer', type: 'transfer', date: '2026-03-10T18:00',
    fromAccountId: bbva.id, toAccountId: efectivo.id,
    currency: 'PEN', amountMinor: 20000, concept: 'Retiro',
  });

  /* Cambio de divisa: salen 33 600 en soles y entran 10 000 en
     dólares. Dos importes distintos, cada uno en su cuenta. */
  addOperation(store, {
    id: 'op_fx', type: 'fx', date: '2026-03-11T12:00',
    fromAccountId: bbva.id, toAccountId: dolares.id,
    fromCurrency: 'PEN', toCurrency: 'USD',
    fromAmountMinor: 33600, toAmountMinor: 10000,
    concept: 'Cambio de divisa',
  });

  addOperation(store, {
    id: 'op_anulada', type: 'expense', date: '2026-03-12T20:00',
    accountId: bbva.id, currency: 'PEN', amountMinor: 9999,
    concept: 'Compra devuelta', category: 'Compras',
  });
  voidOperation(store, 'op_anulada');

  /* Por venir: comprometido y por cobrar. */
  addUpcoming(store, {
    id: 'up_netflix', name: 'Netflix', direction: 'out',
    amountMinor: 3490, currency: 'PEN', dueDate: '2026-03-15',
    recurrence: 'monthly', category: 'Servicios',
  });
  addUpcoming(store, {
    id: 'up_laptop', name: 'Préstamo laptop', direction: 'out',
    amountMinor: 85510, currency: 'PEN', dueDate: '2026-03-20',
    installments: { total: 12, current: 3 }, category: 'Finanzas',
  });
  addUpcoming(store, {
    id: 'up_carlos', name: 'Carlos', direction: 'in',
    amountMinor: 150000, currency: 'PEN', dueDate: null, category: 'Reembolso',
  });
  addUpcoming(store, {
    id: 'up_archivada', name: 'Suscripción vieja', direction: 'out',
    amountMinor: 999999, currency: 'PEN', dueDate: '2026-01-01', archived: true,
  });

  return { store, bbva, efectivo, dolares, ahorro };
}

/* ------------------------------------------------------------------
   1. Saldo de una cuenta con de todo
   ------------------------------------------------------------------ */

function testAccountBalance() {
  group('1 · Saldo de una cuenta con gastos, ingresos, ajustes, transferencias y una anulada');

  const { store } = buildScenario();
  const state = store.getState();

  /*  10 000 apertura
      −  1 800 gasto
      +250 000 ingreso
      −    500 ajuste a la baja
      +    300 ajuste al alza
      − 20 000 transferencia saliente
      − 33 600 cambio de divisa saliente
      =204 400                          (la anulada de 9 999 no cuenta) */
  check('saldo de BBVA', accountBalanceMinor(state, 'acc_bbva'), 204400);
  check('la operación anulada no resta', accountBalanceMinor(state, 'acc_bbva') + 0, 204400);
  check('cuenta de reserva intacta', accountBalanceMinor(state, 'acc_ahorro'), 50000);
  check('cuenta inexistente da 0', accountBalanceMinor(state, 'acc_fantasma'), 0);

  const withVoided = operationsInPeriod(state, { includeVoided: true }).length;
  const withoutVoided = operationsInPeriod(state, {}).length;
  check('la anulada sigue guardada pero se filtra', [withVoided, withoutVoided], [7, 6]);

  check('gasto del periodo en PEN', spentMinor(operationsInPeriod(state, {
    from: '2026-03-01', to: '2026-03-31', currency: 'PEN',
  }), 'PEN'), 1800);

  const bounds = periodBounds('month', '2026-03-12');
  check('límites del mes', bounds, { from: '2026-03-01', to: '2026-03-31' });
  check('límites de la semana', periodBounds('week', '2026-03-12'), { from: '2026-03-09', to: '2026-03-15' });

  /* Todo entero, sin excepción. */
  const balances = [...balancesByAccount(state).values()];
  checkTrue('todos los saldos son enteros', balances.every((value) => Number.isInteger(value)));
}

/* ------------------------------------------------------------------
   2. Una transferencia toca dos cuentas con signos opuestos
   ------------------------------------------------------------------ */

function testTransfer() {
  group('2 · Una transferencia afecta a dos cuentas con signos opuestos');

  const store = createStore();
  const origen = addAccount(store, { id: 'acc_a', name: 'A', currency: 'PEN', openingMinor: 100000 });
  const destino = addAccount(store, { id: 'acc_b', name: 'B', currency: 'PEN', openingMinor: 100000 });

  addOperation(store, {
    id: 'op_t', type: 'transfer', date: '2026-03-10T12:00',
    fromAccountId: origen.id, toAccountId: destino.id,
    currency: 'PEN', amountMinor: 25000,
  });

  const state = store.getState();
  const saleDe = accountBalanceMinor(state, 'acc_a');
  const entraEn = accountBalanceMinor(state, 'acc_b');

  check('origen baja 25 000', saleDe, 75000);
  check('destino sube 25 000', entraEn, 125000);
  check('los signos son opuestos', (saleDe - 100000) + (entraEn - 100000), 0);
  check('la transferencia no crea ni destruye dinero', netMinor(state.operations, 'PEN'), 0);
}

/* ------------------------------------------------------------------
   3. Cambio de divisa con dos importes distintos
   ------------------------------------------------------------------ */

function testForeignExchange() {
  group('3 · Un cambio de divisa usa fromAmountMinor y toAmountMinor distintos');

  const { store } = buildScenario();
  const state = store.getState();
  const fx = state.operations.find((operation) => operation.id === 'op_fx');

  check('los dos importes son distintos', fx.fromAmountMinor !== fx.toAmountMinor, true);
  check('importe de salida', fx.fromAmountMinor, 33600);
  check('importe de entrada', fx.toAmountMinor, 10000);
  check('monedas distintas', [fx.fromCurrency, fx.toCurrency], ['PEN', 'USD']);
  check('el fx no deja amountMinor suelto', 'amountMinor' in fx, false);

  /* Cada importe cae en su cuenta y en su moneda. Nadie convierte
     nada: el saldo en dólares sube 10 000 y punto. */
  check('la cuenta en soles pierde 33 600', accountBalanceMinor(state, 'acc_bbva'), 204400);
  check('la cuenta en dólares gana 10 000', accountBalanceMinor(state, 'acc_usd'), 10000);

  const soles = totalsByCurrency(state).get('PEN');
  const dolares = totalsByCurrency(state).get('USD');
  check('el fx no mezcla monedas en los totales', dolares.regularMinor, 10000);
  checkTrue('los soles no heredan el importe en dólares', soles.regularMinor !== 10000);
}

/* ------------------------------------------------------------------
   4. Totales por moneda: disponible y reservado separados
   ------------------------------------------------------------------ */

function testTotals() {
  group('4 · Los totales por moneda separan disponible y reservado');

  const { store } = buildScenario();
  const totals = totalsByCurrency(store.getState());
  const soles = totals.get('PEN');
  const dolares = totals.get('USD');

  /* Normales: BBVA 204 400 + Efectivo 20 000 = 224 400
     Reserva:  Ahorro 50 000
     Comprometido: 3 490 + 85 510 = 89 000 (la archivada no cuenta)
     Por cobrar:   150 000
     Disponible:   224 400 − 89 000 = 135 400 */
  check('saldo de cuentas normales', soles.regularMinor, 224400);
  check('saldo reservado', soles.reserveMinor, 50000);
  check('total = normal + reserva', soles.totalMinor, 274400);
  check('comprometido', soles.pledgedMinor, 89000);
  check('por cobrar', soles.receivableMinor, 150000);
  check('disponible = normal − comprometido', soles.availableMinor, 135400);
  checkTrue('el reservado no entra en el disponible', soles.availableMinor !== soles.totalMinor - soles.pledgedMinor);

  check('una upcoming archivada no compromete nada', soles.pledgedMinor < 999999, true);
  check('la moneda sin compromisos también aparece', dolares.availableMinor, 10000);

  /* El caché se invalida al mutar operations, y los saldos no se
     guardan en el estado. */
  const before = totalsByCurrency(store.getState()).get('PEN').regularMinor;
  addOperation(store, {
    id: 'op_nueva', type: 'expense', date: '2026-03-13T10:00',
    accountId: 'acc_bbva', currency: 'PEN', amountMinor: 400,
  });
  const after = totalsByCurrency(store.getState()).get('PEN').regularMinor;
  check('el caché se invalida al mutar operations', [before, after], [224400, 224000]);

  /* Los saldos jamás se almacenan: una cuenta guarda su apertura y
     nada más. El saldo solo existe derivado. */
  const state = store.getState();
  check('claves de una cuenta normal',
    Object.keys(state.accounts[0]).sort(),
    ['archived', 'currency', 'id', 'institution', 'kind', 'name', 'openingMinor']);
  check('claves de una cuenta de reserva',
    Object.keys(state.accounts[3]).sort(),
    ['archived', 'currency', 'goalMinor', 'id', 'institution', 'kind', 'name', 'openingMinor']);

  const accountKeys = new Set(state.accounts.flatMap((account) => Object.keys(account)));
  checkTrue('ninguna cuenta lleva un campo de saldo',
    !['balance', 'balanceMinor', 'currentMinor', 'saldo'].some((key) => accountKeys.has(key)));

  /* Y el saldo se reconstruye igual desde el estado serializado, que
     es la prueba de que no venía guardado. */
  const rehydrated = JSON.parse(JSON.stringify(state));
  const recomputed = createStore(rehydrated);
  check('el saldo se reconstruye desde cero',
    accountBalanceMinor(recomputed.getState(), 'acc_bbva'),
    accountBalanceMinor(state, 'acc_bbva'));

  /* El estado es inmutable hacia afuera. */
  let threw = false;
  try {
    store.getState().operations.push({ id: 'colado' });
  } catch (error) {
    threw = true;
  }
  checkTrue('no se puede mutar operations desde fuera', threw);
}

/* ------------------------------------------------------------------
   5. Migrar dos veces es igual que migrar una
   ------------------------------------------------------------------ */

function legacyFixture() {
  return {
    version: '8.4',
    settings: {
      activeCurrency: 'PEN', enabledCurrencies: ['PEN', 'USD'], theme: 'light',
      accent: 'warm', onboardingComplete: true, notifications: { enabled: false },
    },
    accounts: [
      { id: 'acc_1', name: 'BBVA', institution: '', currency: 'PEN', kind: 'regular', openingMinor: 0, archived: false },
    ],
    operations: [
      {
        id: 'op_1', date: '2026-09-05T21:07', type: 'expense', accountId: 'acc_1',
        currency: 'PEN', amountMinor: 1800, category: 'Alimentacion', concept: 'Almuerzo',
        note: '', mood: { valence: 48, energy: 65, tension: 53 },
      },
    ],
    budgets: { PEN: { monthlyMinor: 120000, categories: { Alimentacion: 50000 } } },
    fixed: [
      {
        id: 'fixed_1', type: 'expense', concept: 'Yape Crédito', amountMinor: 12000,
        currency: 'PEN', day: 31, category: 'Finanzas', paidPeriod: '2026-01',
      },
    ],
    debts: [
      {
        id: 'debt_1', direction: 'payable', name: 'Préstamo laptop', currency: 'PEN',
        totalMinor: 300000, category: 'Finanzas', countAsFlow: true, notes: 'del trabajo',
        createdAt: '2026-01-02T10:00', archived: false,
        installments: [
          { id: 'i1', dueDate: '2026-01-20', amountMinor: 100000, paidMinor: 100000, payments: [{ amountMinor: 100000 }] },
          { id: 'i2', dueDate: '2026-02-20', amountMinor: 100000, paidMinor: 25000, payments: [{ amountMinor: 25000 }] },
          { id: 'i3', dueDate: '2026-03-20', amountMinor: 100000, paidMinor: 0, payments: [] },
        ],
      },
    ],
    moodCheckins: [{ id: 'mood_1', valence: 58 }],
    lastMood: { id: 'mood_2' },
    categories: { expense: [{ id: 'cat_1', name: 'Alimentacion', subcategories: ['Cafe'] }], income: [] },
    customProducts: [{ name: 'Chifa del mercado', category: 'Alimentacion', lastAmountMinor: 2200 }],
    rates: { USD_PEN: { rate: 3.3576, date: '2026-09-04' } },
    catalogOverrides: {},
    dismissedInsights: [],
  };
}

function testMigrationIdempotence() {
  group('5 · Migrar dos veces produce el mismo resultado que migrar una');

  const legacy = legacyFixture();
  const now = new Date('2026-03-01T12:00:00Z');

  const first = migrateLegacy(legacy, { now });
  const second = migrateLegacy(legacy, { now });
  check('la función pura es determinista', JSON.stringify(first.state), JSON.stringify(second.state));
  check('el informe también', JSON.stringify(first.notes), JSON.stringify(second.notes));

  /* El original no se toca. */
  check('la entrada no se muta', JSON.stringify(legacy), JSON.stringify(legacyFixture()));

  /* Y ahora sobre almacenamiento: la segunda pasada no hace nada. */
  const storage = createMemoryStorage({ [LEGACY_KEY]: JSON.stringify(legacy) });

  const run1 = runMigration({ storage, now });
  const after1 = storage.getItem(STATE_KEY);
  const run2 = runMigration({ storage, now });
  const after2 = storage.getItem(STATE_KEY);

  check('la primera pasada migra', run1.migrated, true);
  check('la segunda no', [run2.migrated, run2.reason], [false, 'ya-existe-estado-nuevo']);
  check('el estado guardado no cambia', after1, after2);

  /* Respaldo intacto, idéntico al original byte a byte. */
  check('se guardó el respaldo', storage.getItem(LEGACY_BACKUP_KEY), JSON.stringify(legacy));
  check('el original sigue en su sitio', storage.getItem(LEGACY_KEY), JSON.stringify(legacy));

  /* Y el contenido, campo a campo. */
  const state = run1.state;
  check('cuentas migradas', state.accounts.length, 1);
  check('mood fuera de la operación', 'mood' in state.operations[0], false);
  check('la operación no gana state', 'state' in state.operations[0], false);
  check('fixed pasa a upcoming mensual', [state.upcoming[0].recurrence, state.upcoming[0].direction], ['monthly', 'out']);
  check('el día 31 se ajusta a febrero', state.upcoming[0].dueDate, '2026-02-28');
  check('debt pasa a upcoming con installments', state.upcoming[1].installments, { total: 3, current: 2 });
  check('la cuota parcial cobra lo que falta', state.upcoming[1].amountMinor, 75000);
  check('la deuda por pagar sale', state.upcoming[1].direction, 'out');
  check('customProducts entra con count 3', [state.concepts.length, state.concepts[0].count], [1, 3]);
  check('el histograma de horas nace con 24 ceros', state.concepts[0].hourHistogram.length, 24);
  check('presupuesto global sí, por categoría no', state.budgets.PEN, { monthlyMinor: 120000 });
  check('theme se respeta', state.settings.theme, 'light');
  check('language nace en es', state.settings.language, 'es');
  check('moodCheckins no llega', 'moodCheckins' in state, false);
  checkTrue('el informe nombra lo descartado', run1.notes.some((entry) => entry.text.includes('mood')));
}

/* ------------------------------------------------------------------
   6. Un JSON corrupto no rompe el arranque
   ------------------------------------------------------------------ */

function testCorruptJson() {
  group('6 · Un JSON corrupto no rompe el arranque');

  const cases = [
    ['truncado', '{"version":1,"accounts":[{"id":'],
    ['texto suelto', 'no soy json'],
    ['vacío pero presente', '   '],
    ['un arreglo, no un objeto', '[1,2,3]'],
    ['null literal', 'null'],
  ];

  for (const [label, payload] of cases) {
    const storage = createMemoryStorage({ [STATE_KEY]: payload });
    let result = null;
    let threw = false;
    try {
      result = loadState(storage);
    } catch (error) {
      threw = true;
    }
    checkTrue('no lanza con ' + label, !threw);
    checkTrue('arranca con estado por defecto con ' + label,
      result && result.state && Array.isArray(result.state.operations) && result.state.operations.length === 0);
    checkTrue('queda registro con ' + label, result && result.status === 'corrupt');

    const quarantined = [...Array(storage.length)].map((_, index) => storage.key(index))
      .filter((key) => key && key.startsWith(CORRUPT_KEY_PREFIX));
    checkTrue('el texto ilegible se aparta con ' + label, quarantined.length === 1);
  }

  /* Sin nada guardado no es corrupción, es un arranque limpio. */
  const empty = loadState(createMemoryStorage());
  check('sin datos previos el estado está vacío', [empty.status, empty.state.operations.length], ['empty', 0]);

  /* Y una migración con origen ilegible tampoco rompe ni borra. */
  const storage = createMemoryStorage({ [LEGACY_KEY]: '{roto' });
  const run = runMigration({ storage });
  check('origen ilegible no migra', [run.migrated, run.reason], [false, 'origen-ilegible']);
  check('y deja el original intacto', storage.getItem(LEGACY_KEY), '{roto');

  /* Ida y vuelta de un estado sano. */
  const { store } = buildScenario();
  const disk = createMemoryStorage();
  saveState(store.getState(), disk);
  const reloaded = loadState(disk);
  check('ida y vuelta sin pérdida', reloaded.status, 'ok');
  check('los saldos se recalculan igual tras recargar',
    accountBalanceMinor(reloaded.state, 'acc_bbva'), 204400);
}

/* ------------------------------------------------------------------
   7. La escritura agrupa ráfagas
   ------------------------------------------------------------------ */

async function testDebounce() {
  group('7 · La escritura en disco agrupa las ráfagas');

  const storage = createMemoryStorage();
  const store = createStore();
  const persistence = attachPersistence(store, { storage, delay: 20 });

  let writes = 0;
  const originalSetItem = storage.setItem;
  storage.setItem = (key, value) => { writes += 1; originalSetItem(key, value); };

  addAccount(store, { id: 'acc_x', name: 'X', currency: 'PEN' });
  for (let index = 0; index < 10; index += 1) {
    addOperation(store, {
      id: 'op_' + index, type: 'expense', date: '2026-03-12T10:00',
      accountId: 'acc_x', currency: 'PEN', amountMinor: 100,
    });
  }

  check('nada escrito todavía', writes, 0);
  await new Promise((resolve) => setTimeout(resolve, 60));
  check('once mutaciones, una sola escritura', writes, 1);

  const saved = JSON.parse(storage.getItem(STATE_KEY));
  check('lo escrito es el último estado', saved.operations.length, 10);

  addOperation(store, {
    id: 'op_flush', type: 'expense', date: '2026-03-12T11:00',
    accountId: 'acc_x', currency: 'PEN', amountMinor: 100,
  });
  persistence.flush();
  check('flush escribe al momento', writes, 2);

  persistence.detach();
  addOperation(store, {
    id: 'op_suelta', type: 'expense', date: '2026-03-12T12:00',
    accountId: 'acc_x', currency: 'PEN', amountMinor: 100,
  });
  await new Promise((resolve) => setTimeout(resolve, 60));
  check('tras detach ya no escribe', writes, 2);
}

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   8. Llevarse los datos a otro navegador
   ------------------------------------------------------------------ */

function testExportImport() {
  group('8 · Exportar e importar entre navegadores');

  /* Un navegador con datos. */
  const origen = buildScenario().store;
  const texto = exportState(origen.getState());

  check('el nombre del archivo lleva la fecha',
    exportFilename(new Date('2026-09-06T10:00:00')), 'wallet-2026-09-06.json');

  /* Otro navegador, vacío. */
  const destino = createStore();
  check('el destino arranca vacío', destino.getState().operations.length, 0);

  const leido = parseImport(texto);
  check('el archivo se reconoce', [leido.ok, leido.reason], [true, 'listo']);
  check('y dice qué trae antes de tocar nada',
    [leido.summary.accounts, leido.summary.operations, leido.summary.upcoming], [4, 7, 4]);

  const disco = createMemoryStorage();
  saveState(destino.getState(), disco);
  const aplicado = applyImport(destino, leido.state, { storage: disco, now: new Date('2026-09-06T10:00:00') });
  check('se importa', aplicado.ok, true);

  /* Lo que importa: los saldos derivados salen iguales en los dos. */
  check('el saldo se reconstruye igual en el otro navegador',
    accountBalanceMinor(destino.getState(), 'acc_bbva'),
    accountBalanceMinor(origen.getState(), 'acc_bbva'));
  check('y los totales por moneda también',
    JSON.stringify([...totalsByCurrency(destino.getState())]),
    JSON.stringify([...totalsByCurrency(origen.getState())]));
  check('la operación anulada llega anulada',
    destino.getState().operations.find((op) => op.id === 'op_anulada').voided, true);
  check('el fx conserva sus dos importes',
    [destino.getState().operations.find((op) => op.id === 'op_fx').fromAmountMinor,
      destino.getState().operations.find((op) => op.id === 'op_fx').toAmountMinor],
    [33600, 10000]);

  /* Ida y vuelta sin pérdida. */
  check('exportar lo importado da el mismo texto', exportState(destino.getState()), texto);

  /* Antes de reemplazar se guarda una copia de lo que había. */
  checkTrue('se guardó una copia de lo anterior', Boolean(aplicado.backupKey));
  checkTrue('la copia está en el almacenamiento',
    disco.getItem(aplicado.backupKey) !== null);

  /* Nada que no sea un estado de Wallet puede reemplazar los datos. */
  const basura = [
    ['texto suelto', 'hola'],
    ['json que no es objeto', '[1,2,3]'],
    ['objeto sin cuentas', '{"operations":[]}'],
    ['objeto sin movimientos', '{"accounts":[]}'],
    ['null', 'null'],
    ['vacío', '   '],
  ];
  for (const [etiqueta, payload] of basura) {
    const resultado = parseImport(payload);
    checkTrue('se rechaza: ' + etiqueta, !resultado.ok && resultado.state === null);
  }
  check('un texto vacío se distingue de uno inválido', parseImport('').reason, 'vacio');
  check('y un JSON roto también', parseImport('{roto').reason, 'no-es-json');

  /* Un estado con claves de menos se completa, no se rechaza: pudo
     salir de una versión anterior de v1. */
  const parcial = parseImport('{"accounts":[],"operations":[]}');
  check('un estado incompleto se completa', parcial.ok, true);
  check('con la forma por defecto',
    [parcial.state.settings.activeCurrency, Array.isArray(parcial.state.upcoming)], ['PEN', true]);

  /* Importar dos veces deja lo mismo. */
  const otra = applyImport(destino, parseImport(texto).state, { storage: disco });
  check('importar dos veces da el mismo estado', exportState(destino.getState()), texto);
  checkTrue('y guarda otra copia', otra.backupKey !== aplicado.backupKey);
}

async function main() {
  console.log('Verificación de la capa de estado · fase 2');

  testAccountBalance();
  testTransfer();
  testForeignExchange();
  testTotals();
  testMigrationIdempotence();
  testCorruptJson();
  await testDebounce();
  testExportImport();

  console.log('\n' + '═'.repeat(46));
  console.log(passed + ' comprobaciones pasan, ' + failed + ' fallan');
  if (failed) {
    console.log('\nFallos:');
    for (const label of failures) console.log('  · ' + label);
    process.exitCode = 1;
  }
}

main();
