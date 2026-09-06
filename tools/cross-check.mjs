/*
  Contraste independiente: recalcula los saldos leyendo el respaldo
  crudo, sin pasar por derive.js, y los compara con lo que derive
  produce tras migrar. Si los dos caminos no coinciden, uno miente.
*/

import { readFileSync } from 'node:fs';
import { createMemoryStorage } from '../src/state/persist.js';
import { runMigration, LEGACY_KEY } from '../src/state/migrate.js';
import { accountBalanceMinor } from '../src/state/derive.js';
import { createStore } from '../src/state/store.js';

const file = process.argv[2] || 'wallet_backup_2026-09-06.json';
const raw = readFileSync(file, 'utf8');
const legacy = JSON.parse(raw);

/* Camino A: a mano, sobre el JSON original. */
const manual = new Map(legacy.accounts.map((account) => [account.id, account.openingMinor || 0]));
const seen = { expense: 0, income: 0, fx: 0, transfer: 0, adjustment: 0, otro: 0 };

for (const op of legacy.operations) {
  if (op.type === 'expense') {
    seen.expense += 1;
    manual.set(op.accountId, manual.get(op.accountId) - op.amountMinor);
  } else if (op.type === 'income') {
    seen.income += 1;
    manual.set(op.accountId, manual.get(op.accountId) + op.amountMinor);
  } else if (op.type === 'adjustment') {
    seen.adjustment += 1;
    manual.set(op.accountId, manual.get(op.accountId) + op.amountMinor);
  } else if (op.type === 'transfer') {
    seen.transfer += 1;
    manual.set(op.fromAccountId, manual.get(op.fromAccountId) - op.amountMinor);
    manual.set(op.toAccountId, manual.get(op.toAccountId) + op.amountMinor);
  } else if (op.type === 'fx') {
    seen.fx += 1;
    manual.set(op.fromAccountId, manual.get(op.fromAccountId) - op.fromAmountMinor);
    manual.set(op.toAccountId, manual.get(op.toAccountId) + op.toAmountMinor);
  } else {
    seen.otro += 1;
  }
}

/* Camino B: migrar y derivar. */
const storage = createMemoryStorage({ [LEGACY_KEY]: raw });
const migrated = runMigration({ storage });
const store = createStore(migrated.state);

console.log('Contraste de saldos · ' + file);
console.log('='.repeat(58));
console.log('operaciones por tipo:', JSON.stringify(seen));
console.log('');

let mismatches = 0;
for (const account of legacy.accounts) {
  const a = manual.get(account.id);
  const b = accountBalanceMinor(store.getState(), account.id);
  const ok = a === b;
  if (!ok) mismatches += 1;
  console.log((ok ? '  ok    ' : '  FALLA ')
    + account.name.padEnd(18)
    + 'a mano ' + String(a).padStart(9)
    + '   derive ' + String(b).padStart(9));
}

/* Ninguna operación puede quedarse sin efecto por apuntar a una
   cuenta que no existe. */
const ids = new Set(legacy.accounts.map((account) => account.id));
const orphans = legacy.operations.filter((op) => (
  [op.accountId, op.fromAccountId, op.toAccountId].filter(Boolean).some((id) => !ids.has(id))
));

console.log('');
console.log('operaciones huérfanas: ' + orphans.length);
console.log('enteros en todos los importes: ' + legacy.operations.every((op) => (
  [op.amountMinor, op.fromAmountMinor, op.toAmountMinor]
    .filter((value) => value !== undefined)
    .every((value) => Number.isInteger(value))
)));
console.log('');
console.log(mismatches === 0 ? 'Los dos caminos coinciden.' : mismatches + ' saldos no coinciden.');
if (mismatches) process.exitCode = 1;
