// Paridad con la v21: mismos datos, mismos números.
import { describe, it, expect } from 'vitest';
import * as C from '../src/domain/core';
import fs from 'node:fs';

const QA = process.env.QA_DIR || '';
const seedPath = QA + '/seed.json', oldPath = QA + '/old.json';
const has = QA && fs.existsSync(seedPath) && fs.existsSync(oldPath);

describe.skipIf(!has)('paridad con la app anterior', () => {
  // El cuerpo se evalúa aunque el bloque se salte: sin QA_DIR no se lee nada.
  const s = has ? C.repairState(JSON.parse(fs.readFileSync(seedPath, 'utf8'))) : null;
  const old = has ? JSON.parse(fs.readFileSync(oldPath, 'utf8')) : null;
  it('totales por moneda', () => {
    expect(C.currencyTotals(s, 'PEN')).toEqual(old.totalsPEN);
    expect(C.currencyTotals(s, 'USD')).toEqual(old.totalsUSD);
  });
  it('saldo de cada cuenta', () => {
    for (const a of s.accounts) expect([a.id, C.balanceOf(s, a)]).toEqual([a.id, old.balances[a.id]]);
  });
  it('gasto e ingreso del mes', () => {
    expect(C.sumMinor(C.spendingOps(s, 'PEN', C.currentPeriod()))).toBe(old.spendMonth);
    expect(C.sumMinor(C.incomeOps(s, 'PEN', C.currentPeriod()))).toBe(old.incomeMonth);
  });
  it('pendientes y deudas', () => {
    expect(C.upcomingItems(s, 'PEN', 20).map((u) => [u.type, u.label, u.date, u.amountMinor, u.status])).toEqual(old.upcoming);
    expect(C.debtTotals(s, 'PEN')).toEqual(old.debtTotals);
  });
  it('sugerencias del registro', () => {
    expect(C.catalogSuggestions(s, 'PEN', 'expense', '').slice(0, 6).map((x: any) => x.concept)).toEqual(old.sugg);
    expect(C.catalogSuggestions(s, 'PEN', 'expense', 'caf').slice(0, 6).map((x: any) => x.concept)).toEqual(old.suggQ);
  });
  it('conserva los campos que no usa', () => {
    for (const k of old.keys) expect(Object.keys(s)).toContain(k);
    expect(s.aiRules).toBeDefined(); expect(s.newsTaste).toBeDefined(); expect(s.settings.palette).toBe('noche');
  });
});

describe('carga y guardado', () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => (m.has(k) ? m.get(k)! : null), setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as any; };
  it('datos ilegibles: cuarentena y no escribe encima', () => {
    const st = mem(); st.setItem(C.STORAGE_KEY, '{roto');
    const r = C.loadState(st);
    expect(r.health.mode).toBe('recovery_required');
    expect(st.getItem(C.QUARANTINE_KEY)).toBe('{roto');
    const w = C.saveState(st, r.state, r.health);
    expect(w.ok).toBe(false);
    expect(st.getItem(C.STORAGE_KEY)).toBe('{roto');
  });
  it('migra datos v7 y v6', () => {
    const st = mem(); st.setItem(C.LEGACY_KEY, JSON.stringify({ carteras: [{ id: 'c1', nombre: 'Caja', saldo: 100 }], transacciones: [{ id: 't1', tipo: 'gasto', monto: 20, carteraId: 'c1', categoria: 'Ocio', concepto: 'Cine', fecha: '2025-01-02T10:00:00Z' }] }));
    const r = C.loadState(st);
    expect(r.state.accounts[0].name).toBe('Caja');
    expect(C.balanceOf(r.state, r.state.accounts[0])).toBe(10000);
  });
  it('valida operaciones como la v21', () => {
    const s = C.defaultState(); s.accounts.push({ id: 'a', name: 'A', currency: 'PEN', kind: 'regular', openingMinor: 0 }, { id: 'b', name: 'B', currency: 'USD', kind: 'regular', openingMinor: 0 });
    expect(C.validateOperation(s, { type: 'expense', accountId: 'a', currency: 'USD', amountMinor: 100 })).toMatch(/no puede ir/);
    expect(C.validateOperation(s, { type: 'transfer', fromAccountId: 'a', toAccountId: 'b', amountMinor: 100 })).toMatch(/misma moneda/);
    expect(C.validateOperation(s, { type: 'expense', accountId: 'a', currency: 'PEN', amountMinor: 0 })).toMatch(/mayor que cero/);
    expect(C.validateOperation(s, { type: 'expense', accountId: 'a', currency: 'PEN', amountMinor: 1500 })).toBeNull();
  });
  it('formato de dinero del usuario', () => {
    expect(C.money(123456789, 'PEN')).toBe('S/ 1,234,567.89');
    expect(C.money(-500, 'USD', { sign: true })).toBe('−US$ 5.00');
  });
});
