/*
  Corre la migración contra un respaldo real y cuenta lo que entra y
  lo que sale.

    npm run migrate:backup                     usa wallet_backup_2026-09-06.json
    npm run migrate:backup -- otro-archivo.json

  No toca el navegador: monta el respaldo en un almacenamiento en
  memoria y deja el resultado en tools/salida-migracion.json.
*/

import { readFileSync, writeFileSync } from 'node:fs';
import { createMemoryStorage, STATE_KEY } from '../src/state/persist.js';
import { runMigration, LEGACY_KEY, LEGACY_BACKUP_KEY } from '../src/state/migrate.js';
import { totalsByCurrency, accountBalanceMinor } from '../src/state/derive.js';
import { createStore } from '../src/state/store.js';

const file = process.argv[2] || 'wallet_backup_2026-09-06.json';
const raw = readFileSync(file, 'utf8');
const legacy = JSON.parse(raw);

console.log('Migración de ' + file);
console.log('='.repeat(60));

const storage = createMemoryStorage({ [LEGACY_KEY]: raw });
const result = runMigration({ storage });

if (!result.migrated) {
  console.log('No se migró nada. Motivo: ' + result.reason);
  process.exit(1);
}

const state = result.state;

/* ---------------- recuento ---------------- */

const rows = [
  ['accounts', legacy.accounts?.length ?? 0, state.accounts.length, 'directo'],
  ['operations', legacy.operations?.length ?? 0, state.operations.length, 'directo, sin mood'],
  ['fixed', legacy.fixed?.length ?? 0, state.upcoming.filter((u) => u.recurrence === 'monthly').length, '-> upcoming mensual'],
  ['debts', legacy.debts?.length ?? 0, state.upcoming.filter((u) => u.installments).length, '-> upcoming con cuotas'],
  ['upcoming (total)', (legacy.fixed?.length ?? 0) + (legacy.debts?.length ?? 0), state.upcoming.length, 'fixed + debts'],
  ['customProducts', legacy.customProducts?.length ?? 0, state.concepts.length, '-> concepts, count 3'],
  ['moodCheckins', legacy.moodCheckins?.length ?? 0, 0, 'se descarta'],
  ['categories', countCategories(legacy.categories), countCategories(state.categories), 'conservadas'],
];

console.log('\nRecuento');
console.log('-'.repeat(60));
console.log(pad('origen', 18) + pad('antes', 8) + pad('después', 9) + 'mapeo');
for (const [name, before, after, mapping] of rows) {
  const flag = expectedLoss(name, before, after) ? '  ' : ' !';
  console.log(pad(name, 18) + pad(String(before), 8) + pad(String(after), 9) + mapping + flag);
}

/* ---------------- saldos derivados ---------------- */

const store = createStore(state);
console.log('\nSaldos derivados tras migrar');
console.log('-'.repeat(60));
for (const account of state.accounts) {
  const balance = accountBalanceMinor(store.getState(), account.id);
  console.log('  ' + pad(account.name, 20) + pad(account.currency, 5) + formatMinor(balance).padStart(14));
}

console.log('\nTotales por moneda');
console.log('-'.repeat(60));
for (const [currency, bucket] of totalsByCurrency(store.getState())) {
  console.log('  ' + currency
    + '  normal ' + formatMinor(bucket.regularMinor).padStart(12)
    + '  reserva ' + formatMinor(bucket.reserveMinor).padStart(10)
    + '  comprometido ' + formatMinor(bucket.pledgedMinor).padStart(10)
    + '  por cobrar ' + formatMinor(bucket.receivableMinor).padStart(10)
    + '  disponible ' + formatMinor(bucket.availableMinor).padStart(12));
}

/* ---------------- por venir ---------------- */

console.log('\nPor venir resultante');
console.log('-'.repeat(60));
for (const entry of state.upcoming) {
  const cuota = entry.installments ? ' cuota ' + entry.installments.current + '/' + entry.installments.total : '';
  const repite = entry.recurrence ? ' · ' + entry.recurrence : '';
  console.log('  ' + (entry.direction === 'in' ? '+' : '−') + ' '
    + pad(entry.name, 18)
    + formatMinor(entry.amountMinor).padStart(11) + ' ' + entry.currency
    + '  ' + pad(entry.dueDate || 'sin fecha', 12)
    + (entry.archived ? ' [archivada]' : '') + cuota + repite);
}

/* ---------------- informe ---------------- */

console.log('\nQué no mapea uno a uno');
console.log('-'.repeat(60));
for (const note of result.notes) {
  console.log((note.level === 'warn' ? '  ! ' : '  · ') + wrap(note.text, 74, '    '));
}

console.log('\nRespaldo');
console.log('-'.repeat(60));
const backup = storage.getItem(LEGACY_BACKUP_KEY);
console.log('  clave: ' + LEGACY_BACKUP_KEY);
console.log('  idéntico al original byte a byte: ' + (backup === raw));
console.log('  el original sigue en ' + LEGACY_KEY + ': ' + (storage.getItem(LEGACY_KEY) === raw));

const output = 'tools/salida-migracion.json';
writeFileSync(output, storage.getItem(STATE_KEY));
console.log('\nEstado migrado escrito en ' + output);

/* ---------------- utilidades ---------------- */

function countCategories(categories) {
  if (!categories) return 0;
  return (categories.expense?.length ?? 0) + (categories.income?.length ?? 0);
}

/* Marca con ! toda fila donde el recuento cambie sin que la tabla de
   la sección 6 lo prevea. */
function expectedLoss(name, before, after) {
  if (name === 'moodCheckins') return true;
  return before === after;
}

function pad(text, width) {
  return String(text).padEnd(width);
}

function formatMinor(minor) {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const units = Math.floor(abs / 100);
  const cents = abs % 100;
  return sign + units.toLocaleString('es-PE') + ',' + String(cents).padStart(2, '0');
}

function wrap(text, width, indent) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(line.trim());
      line = word;
    } else {
      line += ' ' + word;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.join('\n' + indent);
}
