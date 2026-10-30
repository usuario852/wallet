/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from './core';

// Cálculos de pantalla. Todos derivan de las funciones de core (v21).

export function daysInMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

// «Por día» (v21, homeBrief + v16): lo que queda del presupuesto, o lo
// disponible si no hay presupuesto, repartido entre los días que faltan
// (incluido hoy). Si ya te pasaste, se dice cuánto.
export function perDay(s: C.State, cur: string, accountId?: string | null) {
  const now = new Date();
  const remainingDays = Math.max(1, daysInMonth(now) - now.getDate() + 1);
  const budget = C.budgetFor(s, cur).monthlyMinor || 0;
  const spent = C.sumMinor(C.spendingOps(s, cur, C.currentPeriod()));
  if (accountId) {
    const a = C.accountById(s, accountId);
    return { kind: 'pace', minor: Math.round(Math.max(0, C.balanceOf(s, a)) / remainingDays), note: 'con su saldo, hasta fin de mes' };
  }
  if (budget && spent > budget) {
    const left = Math.max(0, daysInMonth(now) - now.getDate());
    return { kind: 'over', minor: spent - budget, note: left ? 'sobre tu límite, quedan ' + left + (left === 1 ? ' día' : ' días') : 'sobre tu límite del mes' };
  }
  const totals = C.currencyTotals(s, cur);
  const pool = budget ? Math.max(0, budget - spent) : Math.max(0, totals.available);
  return { kind: 'pace', minor: Math.round(pool / remainingDays), note: budget ? 'para tu límite, hasta fin de mes' : 'con lo disponible, hasta fin de mes' };
}

export function todaySpent(s: C.State, cur: string, accountId?: string | null) {
  return C.sumMinor(C.operationsForCurrency(s, cur).filter((o: any) => o.type === 'expense' && !o.excludedFromSpending && !o.voided && C.sameDay(o.date, C.todayLocal()) && (!accountId || o.accountId === accountId)));
}

// «Por salir»: pagos y ahorros programados de este mes que aún no se hicieron.
export function outThisMonth(s: C.State, cur: string, filter?: (u: C.Upcoming) => boolean) {
  const per = C.currentPeriod();
  const items = C.upcomingItems(s, cur, 200).filter((u) => u.direction === 'payable' && (u.status === 'overdue' || C.periodOf(u.date) === per) && (!filter || filter(u)));
  return { minor: items.reduce((n, u) => n + u.amountMinor, 0), count: items.length, late: items.filter((u) => u.status === 'overdue').length };
}

export function accountsForHome(s: C.State, cur: string) {
  return C.accountsByCurrency(s, cur).filter((a: any) => !a.archived);
}

// Gasto acumulado día a día del mes, y el del mes anterior.
export function cumulative(s: C.State, cur: string, period: string) {
  const [y, m] = period.split('-').map(Number);
  const n = new Date(y, m, 0).getDate();
  const daily = new Array(n).fill(0);
  C.spendingOps(s, cur, period).forEach((o: any) => { const d = C.dateFromLocalIso(o.date).getDate(); daily[d - 1] += Math.abs(o.amountMinor); });
  const cum: number[] = []; daily.reduce((acc, v, i) => (cum[i] = acc + v), 0);
  return { daily, cum, n };
}
export function prevPeriod(period: string, k = 1) {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 - k, 1, 12);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export function categoryTotals(list: any[]) {
  const by: Record<string, { v: number; c: number }> = {};
  list.forEach((o) => { const k = o.category || 'Otros'; by[k] = by[k] || { v: 0, c: 0 }; by[k].v += Math.abs(o.amountMinor); by[k].c += 1; });
  return Object.entries(by).map(([k, x]) => ({ cat: k, v: x.v, c: x.c })).sort((a, b) => b.v - a.v);
}

export function lastNDays(s: C.State, cur: string, n = 7, end = new Date()) {
  const out: { key: string; total: number; label: string }[] = [];
  const L = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end); d.setDate(d.getDate() - i);
    const key = C.nowIsoLocal(d).slice(0, 10);
    const total = C.sumMinor(s.operations.filter((o: any) => o.type === 'expense' && o.currency === cur && !o.voided && !o.excludedFromSpending && C.sameDay(o.date, key)));
    out.push({ key, total, label: L[d.getDay()] });
  }
  return out;
}

// Texto «¿Qué fue?»: saca monto y categoría de frases como «uber 18».
export function parseWhat(s: C.State, text: string, cur: string, type: string) {
  const t = String(text || '').trim();
  const m = t.match(/(\d+(?:[.,]\d{1,2})?)/);
  const amount = m ? m[1].replace(',', '.') : '';
  const name = t.replace(m ? m[0] : '', '').replace(/\s+(soles?|s\/|lucas?|dolares?|usd|\$)\b/gi, '').replace(/\s+/g, ' ').trim();
  let category = '';
  if (name) {
    const sug = C.catalogSuggestions(s, cur, type, name)[0];
    if (sug && C.normalizeText(sug.concept).startsWith(C.normalizeText(name).slice(0, 3))) category = sug.category;
  }
  return { amount, name: name ? name.charAt(0).toUpperCase() + name.slice(1) : '', category };
}

export function defaultAccountId(s: C.State, cur: string) {
  const list = C.accountsByCurrency(s, cur).filter((a: any) => !a.archived && a.kind !== 'reserve');
  if (!list.length) return '';
  if ((s.settings.look || {}).defaultAccount === 'most') return list.slice().sort((a: any, b: any) => C.balanceOf(s, b) - C.balanceOf(s, a))[0].id;
  const last = s.settings.lastAccountId && list.find((a: any) => a.id === s.settings.lastAccountId);
  if (last) return last.id;
  const recent = C.operationsForCurrency(s, cur).find((o: any) => o.accountId && list.some((a: any) => a.id === o.accountId));
  return recent ? recent.accountId : list[0].id;
}
