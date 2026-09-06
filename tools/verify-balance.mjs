/*
  Prueba del saldo tras fijar aperturas.

    npm run verify:balance

  Nace de un informe concreto: tras fijar las aperturas el saldo era
  +1,775.50, se registraron tres gastos que suman 23.00 y el saldo
  pasó a -236.00 en vez de 1,752.50.

  Tiene dos partes:

    A. La reproducción literal del caso, con los datos reales del
       respaldo y una apertura negativa de por medio.
    B. Un diferencial aleatorio: mil estados generados al azar
       —aperturas negativas, varias monedas, cuentas de reserva,
       transferencias, cambios de divisa, ajustes con signo y
       operaciones anuladas— comparando derive.js contra una suma
       independiente escrita aquí.

  Si el diferencial pasa, la derivación no es el origen y hay que
  buscar en el estado guardado o en lo que se guardó al registrar.
*/

import { readFileSync, existsSync } from 'node:fs';
import { createMemoryStorage, saveState, loadState } from '../src/state/persist.js';
import { runMigration, LEGACY_KEY } from '../src/state/migrate.js';
import { accountBalanceMinor, totalsByCurrency } from '../src/state/derive.js';
import { createStore, addAccount, addOperation, voidOperation, addUpcoming } from '../src/state/store.js';
import { resolveDraft } from '../src/logic/entry.js';

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

/* ------------------------------------------------------------------
   Oráculo independiente

   Escrito aparte de derive.js a propósito: si los dos coinciden en
   mil estados al azar, no es porque compartan el mismo error.
   ------------------------------------------------------------------ */

export function saldosIndependientes(state) {
  const saldos = new Map();
  for (const cuenta of state.accounts) saldos.set(cuenta.id, cuenta.openingMinor || 0);

  const mover = (id, cantidad) => {
    if (!saldos.has(id)) return;
    saldos.set(id, saldos.get(id) + cantidad);
  };

  for (const op of state.operations) {
    if (op.voided) continue;
    switch (op.type) {
      case 'expense':
        mover(op.accountId, -(op.amountMinor || 0));
        break;
      case 'income':
      case 'adjustment':
        mover(op.accountId, op.amountMinor || 0);
        break;
      case 'transfer':
        mover(op.fromAccountId, -(op.amountMinor || 0));
        mover(op.toAccountId, op.amountMinor || 0);
        break;
      case 'fx':
        mover(op.fromAccountId, -(op.fromAmountMinor || 0));
        mover(op.toAccountId, op.toAmountMinor || 0);
        break;
      default:
        mover(op.accountId, op.amountMinor || 0);
    }
  }
  return saldos;
}

export function totalesIndependientes(state) {
  const saldos = saldosIndependientes(state);
  const totales = new Map();

  const bucket = (moneda) => {
    if (!totales.has(moneda)) {
      totales.set(moneda, { regular: 0, reserva: 0, comprometido: 0, porCobrar: 0 });
    }
    return totales.get(moneda);
  };

  for (const moneda of state.settings.enabledCurrencies) bucket(moneda);

  for (const cuenta of state.accounts) {
    if (cuenta.archived) continue;
    const b = bucket(cuenta.currency);
    if (cuenta.kind === 'reserve') b.reserva += saldos.get(cuenta.id);
    else b.regular += saldos.get(cuenta.id);
  }

  for (const entrada of state.upcoming) {
    if (entrada.archived || entrada.countAsFlow === false) continue;
    const b = bucket(entrada.currency);
    if (entrada.direction === 'in') b.porCobrar += entrada.amountMinor || 0;
    else b.comprometido += entrada.amountMinor || 0;
  }

  const salida = new Map();
  for (const [moneda, b] of totales) {
    salida.set(moneda, {
      totalMinor: b.regular + b.reserva,
      regularMinor: b.regular,
      reserveMinor: b.reserva,
      pledgedMinor: b.comprometido,
      receivableMinor: b.porCobrar,
      availableMinor: b.regular - b.comprometido,
    });
  }
  return salida;
}

/* ------------------------------------------------------------------
   A. El caso informado, con los datos reales
   ------------------------------------------------------------------ */

const RESPALDO = 'wallet_backup_2026-09-06.json';

function testCasoInformado() {
  group('A · El caso informado: fijar aperturas y registrar tres gastos');

  if (!existsSync(RESPALDO)) {
    console.log('  (omitido: no está ' + RESPALDO + ')');
    return;
  }

  const raw = readFileSync(RESPALDO, 'utf8');
  const base = runMigration({ storage: createMemoryStorage({ [LEGACY_KEY]: raw }) }).state;

  /* La fórmula del snippet de tools/consola.md. */
  const movimientos = new Map(base.accounts.map((c) => [c.id, 0]));
  for (const [id, saldo] of saldosIndependientes({ ...base, accounts: base.accounts.map((c) => ({ ...c, openingMinor: 0 })) })) {
    movimientos.set(id, saldo);
  }

  /* Saldos reales que dan un total PEN de 1 775.50 y dejan la cuenta
     en dólares con apertura negativa (saldo real 0, movimientos
     +165.05). La apertura negativa es parte del caso. */
  const objetivos = { 'Efectivo': 20000, 'BBVA': 150050, 'BCP / Yape': 7500, 'BBVA Dólares': 0 };
  const conAperturas = {
    ...base,
    accounts: base.accounts.map((c) => (
      objetivos[c.name] === undefined ? c
        : { ...c, openingMinor: objetivos[c.name] - movimientos.get(c.id) }
    )),
  };

  const negativas = conAperturas.accounts.filter((c) => c.openingMinor < 0);
  check('hay al menos una apertura negativa', negativas.length > 0, true);
  check('la apertura de la cuenta en dólares es negativa',
    conAperturas.accounts.find((c) => c.name === 'BBVA Dólares').openingMinor, -16505);

  const store = createStore(conAperturas);
  check('el saldo de partida es 1 775.50',
    totalsByCurrency(store.getState()).get('PEN').totalMinor, 177550);

  /* Tres gastos por el mismo camino que usa la hoja de Registrar. */
  const now = new Date('2026-09-06T13:00:00');
  let sumaGastos = 0;
  for (const texto of ['pan 8', 'cafe 7.50', 'combi 7.50']) {
    const draft = resolveDraft(store.getState(), { raw: texto, chosenType: 'expense', now });
    sumaGastos += draft.amountMinor;
    addOperation(store, draft);
  }

  check('los tres gastos suman 23.00', sumaGastos, 2300);
  check('el saldo baja exactamente 23.00',
    totalsByCurrency(store.getState()).get('PEN').totalMinor, 175250);
  check('y no es -236.00',
    totalsByCurrency(store.getState()).get('PEN').totalMinor !== -23600, true);

  /* La apertura negativa no se pierde ni cambia de signo al guardar. */
  const disco = createMemoryStorage();
  saveState(store.getState(), disco);
  const recargado = createStore(loadState(disco).state);
  check('la apertura negativa sobrevive a guardar y recargar',
    recargado.getState().accounts.find((c) => c.name === 'BBVA Dólares').openingMinor, -16505);
  check('y el saldo tras recargar es el mismo',
    totalsByCurrency(recargado.getState()).get('PEN').totalMinor, 175250);

  /* La cuenta con apertura negativa queda en su saldo real. */
  check('la cuenta en dólares queda en 0',
    accountBalanceMinor(store.getState(), conAperturas.accounts.find((c) => c.name === 'BBVA Dólares').id), 0);
}

/* ------------------------------------------------------------------
   B. Diferencial aleatorio
   ------------------------------------------------------------------ */

/* Generador reproducible: el mismo fallo se puede volver a mirar. */
function crearAzar(semilla) {
  let estado = semilla;
  return function azar() {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

function estadoAleatorio(azar, indice) {
  const monedas = ['PEN', 'USD', 'EUR'];
  const store = createStore();
  const habilitadas = monedas.slice(0, 1 + Math.floor(azar() * 3));

  const cuentas = [];
  const cantidad = 1 + Math.floor(azar() * 5);
  for (let i = 0; i < cantidad; i += 1) {
    cuentas.push(addAccount(store, {
      id: 'acc_' + indice + '_' + i,
      name: 'Cuenta ' + i,
      currency: habilitadas[Math.floor(azar() * habilitadas.length)],
      kind: azar() < 0.25 ? 'reserve' : 'regular',
      /* Aperturas negativas a propósito: es lo que produce el
         snippet cuando el saldo real es menor que los movimientos. */
      openingMinor: Math.round((azar() * 400000) - 200000),
      archived: azar() < 0.15,
    }));
  }

  const tipos = ['expense', 'income', 'adjustment', 'transfer', 'fx'];
  const operaciones = 1 + Math.floor(azar() * 40);
  for (let i = 0; i < operaciones; i += 1) {
    const tipo = tipos[Math.floor(azar() * tipos.length)];
    const origen = cuentas[Math.floor(azar() * cuentas.length)];
    const destino = cuentas[Math.floor(azar() * cuentas.length)];
    const importe = Math.round(azar() * 500000) - 100000;

    const borrador = { id: 'op_' + indice + '_' + i, type: tipo, date: '2026-03-12T10:00', concept: 'x' };
    if (tipo === 'fx') {
      Object.assign(borrador, {
        fromAccountId: origen.id, toAccountId: destino.id,
        fromCurrency: origen.currency, toCurrency: destino.currency,
        fromAmountMinor: Math.abs(importe), toAmountMinor: Math.round(Math.abs(importe) * 3.36),
      });
    } else if (tipo === 'transfer') {
      Object.assign(borrador, {
        fromAccountId: origen.id, toAccountId: destino.id,
        currency: origen.currency, amountMinor: Math.abs(importe),
      });
    } else {
      Object.assign(borrador, {
        accountId: origen.id, currency: origen.currency,
        amountMinor: tipo === 'adjustment' ? importe : Math.abs(importe),
      });
    }

    const creada = addOperation(store, borrador);
    if (azar() < 0.2) voidOperation(store, creada.id);
  }

  const pendientes = Math.floor(azar() * 5);
  for (let i = 0; i < pendientes; i += 1) {
    addUpcoming(store, {
      id: 'up_' + indice + '_' + i,
      name: 'Pendiente ' + i,
      direction: azar() < 0.5 ? 'in' : 'out',
      amountMinor: Math.round(azar() * 200000),
      currency: habilitadas[Math.floor(azar() * habilitadas.length)],
      countAsFlow: azar() > 0.2,
      archived: azar() < 0.3,
    });
  }

  return store;
}

function testDiferencial() {
  group('B · Diferencial aleatorio contra una suma independiente');

  const azar = crearAzar(20260906);
  const rondas = 1000;
  let discrepancias = 0;
  let primera = null;
  let conAperturaNegativa = 0;

  for (let indice = 0; indice < rondas; indice += 1) {
    const store = estadoAleatorio(azar, indice);
    const state = store.getState();
    if (state.accounts.some((c) => c.openingMinor < 0)) conAperturaNegativa += 1;

    const esperados = saldosIndependientes(state);
    for (const cuenta of state.accounts) {
      const derivado = accountBalanceMinor(state, cuenta.id);
      if (derivado !== esperados.get(cuenta.id)) {
        discrepancias += 1;
        if (!primera) primera = { indice, cuenta: cuenta.id, derivado, esperado: esperados.get(cuenta.id) };
      }
    }

    const totalesEsperados = totalesIndependientes(state);
    const totalesDerivados = totalsByCurrency(state);
    for (const [moneda, esperado] of totalesEsperados) {
      const derivado = totalesDerivados.get(moneda);
      for (const campo of ['totalMinor', 'regularMinor', 'reserveMinor', 'pledgedMinor', 'receivableMinor', 'availableMinor']) {
        if (!derivado || derivado[campo] !== esperado[campo]) {
          discrepancias += 1;
          if (!primera) primera = { indice, moneda, campo, derivado: derivado && derivado[campo], esperado: esperado[campo] };
        }
      }
    }
  }

  console.log('        ' + rondas + ' estados, ' + conAperturaNegativa + ' con alguna apertura negativa');
  check('ninguna discrepancia entre derive.js y la suma independiente', discrepancias, 0);
  if (primera) console.log('        primera discrepancia: ' + JSON.stringify(primera));
}

/* ------------------------------------------------------------------
   C. El caché no puede devolver un saldo viejo
   ------------------------------------------------------------------ */

function testCache() {
  group('C · El caché se invalida al cambiar operaciones o aperturas');

  const store = createStore();
  const cuenta = addAccount(store, { id: 'acc_c', name: 'C', currency: 'PEN', openingMinor: -50000 });

  check('apertura negativa sin movimientos', accountBalanceMinor(store.getState(), cuenta.id), -50000);

  addOperation(store, {
    id: 'op_c1', type: 'income', date: '2026-03-12T10:00',
    accountId: cuenta.id, currency: 'PEN', amountMinor: 80000,
  });
  check('tras un ingreso', accountBalanceMinor(store.getState(), cuenta.id), 30000);

  addOperation(store, {
    id: 'op_c2', type: 'expense', date: '2026-03-12T11:00',
    accountId: cuenta.id, currency: 'PEN', amountMinor: 2300,
  });
  check('tras un gasto', accountBalanceMinor(store.getState(), cuenta.id), 27700);

  /* Cambiar solo la apertura, sin tocar operaciones, también tiene
     que invalidar. */
  const state = store.getState();
  const otro = createStore({
    ...state,
    accounts: state.accounts.map((c) => ({ ...c, openingMinor: 0 })),
  });
  check('cambiar la apertura recalcula', accountBalanceMinor(otro.getState(), cuenta.id), 77700);
  check('y el estado original no cambia', accountBalanceMinor(store.getState(), cuenta.id), 27700);
}

/* ------------------------------------------------------------------ */

console.log('Verificación del saldo · aperturas y derivación');

testCasoInformado();
testDiferencial();
testCache();

console.log('\n' + '═'.repeat(46));
console.log(passed + ' comprobaciones pasan, ' + failed + ' fallan');
if (failed) {
  console.log('\nFallos:');
  for (const label of failures) console.log('  · ' + label);
  process.exitCode = 1;
}
