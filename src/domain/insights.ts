/* eslint-disable @typescript-eslint/no-explicit-any */
// Wallet 25 · Análisis a fondo. Lecturas derivadas, sin tocar los cálculos de core.ts ni derive.ts:
// todo sale de spendingOps, incomeOps, balanceOf, currencyTotals, upcomingItems y las cuotas.
import * as C from './core';
import * as D from './derive';

export function periodsBack(n: number, from = C.currentPeriod()) {
  const out: string[] = [];
  for (let k = n - 1; k >= 0; k--) out.push(k ? D.prevPeriod(from, k) : from);
  return out;
}
const MON3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
export const perLabel = (per: string) => MON3[Number(per.slice(5, 7)) - 1];

// Ingresos y gastos por mes (moneda única).
export function flowByMonth(s: C.State, cur: string, n = 6) {
  return periodsBack(n).map((per) => {
    const inc = C.sumMinor(C.incomeOps(s, cur, per));
    const out = C.sumMinor(C.spendingOps(s, cur, per));
    return { per, label: perLabel(per), inc, out, net: inc - out, current: per === C.currentPeriod() };
  });
}

// Promedio de gasto e ingreso de los últimos meses completos con datos.
export function monthlyAverages(s: C.State, cur: string, n = 3) {
  const pers = periodsBack(n, D.prevPeriod(C.currentPeriod()));
  const rows = pers.map((per) => ({ inc: C.sumMinor(C.incomeOps(s, cur, per)), out: C.sumMinor(C.spendingOps(s, cur, per)) })).filter((r) => r.inc || r.out);
  if (!rows.length) {
    const per = C.currentPeriod();
    const day = new Date().getDate(), days = D.daysInMonth();
    const out = C.sumMinor(C.spendingOps(s, cur, per));
    return { inc: C.sumMinor(C.incomeOps(s, cur, per)), out: day >= 7 ? Math.round((out / day) * days) : out, months: 0 };
  }
  return { inc: Math.round(rows.reduce((a, r) => a + r.inc, 0) / rows.length), out: Math.round(rows.reduce((a, r) => a + r.out, 0) / rows.length), months: rows.length };
}

export function savingsRate(inc: number, out: number) { return inc > 0 ? Math.round(((inc - out) / inc) * 100) : null; }

// Cuotas de deuda por pagar en un periodo.
export function debtDueIn(s: C.State, cur: string, per: string) {
  let n = 0;
  C.debtsForCurrency(s, cur).filter((d: any) => d.direction === 'payable').forEach((d: any) => C.installmentsForDebt(d).forEach((i: any) => { if (C.periodOf(i.dueDate) === per) n += Math.max(0, Number(i.amountMinor || 0)); }));
  return n;
}

export type Kpi = { key: string; label: string; value: string; hint: string; tone: 'ok' | 'warn' | 'none'; series: { label: string; v: number; display: string }[] };
export function kpis(s: C.State, cur: string, money: (n: number) => string): Kpi[] {
  const flow = flowByMonth(s, cur, 6);
  const avg = monthlyAverages(s, cur, 3);
  const totals = C.currencyTotals(s, cur);
  const prev = flow[flow.length - 2];
  const rate = prev ? savingsRate(prev.inc, prev.out) : null;
  const em = avg.out > 0 ? totals.available / avg.out : null;
  const per = C.currentPeriod();
  const due = debtDueIn(s, cur, per) + C.upcomingItems(s, cur, 200).filter((u) => u.type === 'fixed' && u.direction === 'payable' && C.periodOf(u.date) === per && /cr[eé]dito|pr[eé]stamo|cuota/i.test(u.label)).reduce((a, u) => a + u.amountMinor, 0);
  const dti = avg.inc > 0 ? Math.round((due / avg.inc) * 100) : null;
  const debtLeft = C.debtsForCurrency(s, cur).filter((d: any) => d.direction === 'payable').reduce((a: number, d: any) => a + C.debtRemainingMinor(d), 0);
  return [
    { key: 'pat', label: 'Patrimonio líquido', value: money(totals.total), hint: debtLeft ? 'Debes ' + money(debtLeft) + ' aparte' : 'Sin deudas registradas', tone: 'none',
      series: flow.map((f) => ({ label: f.label, v: f.net, display: (f.net >= 0 ? '+' : '−') + money(Math.abs(f.net)) })) },
    { key: 'ahorro', label: 'Tasa de ahorro', value: rate == null ? 'Sin ingresos' : rate + '%', hint: prev ? C.cap(C.monthName(Number(prev.per.slice(5, 7)) - 1)) + ' · meta 20%' : 'Meta 20%', tone: rate == null ? 'none' : rate >= 20 ? 'ok' : 'warn',
      series: flowByMonth(s, cur, 7).slice(0, 6).map((f) => { const r = savingsRate(f.inc, f.out); return { label: f.label, v: Math.max(-100, r ?? 0), display: r == null ? '—' : r + '%' }; }) },
    { key: 'fondo', label: 'Fondo de emergencia', value: em == null ? 'Sin gastos' : em.toFixed(1) + ' meses', hint: 'Meta: 3 meses', tone: em == null ? 'none' : em >= 3 ? 'ok' : 'warn',
      series: flow.map((f) => ({ label: f.label, v: f.out, display: money(f.out) })) },
    { key: 'dti', label: 'Deuda sobre ingreso', value: dti == null ? 'Sin ingresos' : dti + '%', hint: 'Sano: menos de 36%', tone: dti == null ? 'none' : dti <= 36 ? 'ok' : 'warn',
      series: periodsBack(6).map((p) => { const d2 = debtDueIn(s, cur, p); return { label: perLabel(p), v: d2, display: money(d2) }; }) }
  ];
}

// Categorías: este mes contra el anterior a la misma altura.
export function categoryDelta(s: C.State, cur: string) {
  const per = C.currentPeriod(), prev = D.prevPeriod(per), day = new Date().getDate();
  const now = D.categoryTotals(C.spendingOps(s, cur, per));
  const before = D.categoryTotals(C.spendingOps(s, cur, prev).filter((o: any) => Number(String(o.date).slice(8, 10)) <= day));
  const keys = Array.from(new Set(now.map((c) => c.cat).concat(before.map((c) => c.cat))));
  return keys.map((cat) => {
    const a = (now.find((c) => c.cat === cat) || { v: 0 }).v, b = (before.find((c) => c.cat === cat) || { v: 0 }).v;
    return { cat, now: a, before: b, delta: a - b };
  }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
}

// Gasto promedio por día de la semana (últimos 90 días).
export function weekdayAverages(s: C.State, cur: string, days = 90) {
  const since = Date.now() - days * 864e5;
  const sums = [0, 0, 0, 0, 0, 0, 0];
  C.spendingOps(s, cur).forEach((o: any) => { const d = C.dateFromLocalIso(o.date); if (+d >= since) sums[(d.getDay() + 6) % 7] += Math.abs(o.amountMinor); });
  const weeks = Math.max(1, days / 7);
  return ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => ({ label: l, name: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i], v: Math.round(sums[i] / weeks) }));
}

// Comercios o conceptos donde más se fue.
export function topMerchants(s: C.State, cur: string, per: string, n = 6) {
  const m = new Map<string, { name: string; v: number; c: number; cat: string }>();
  C.spendingOps(s, cur, per).forEach((o: any) => {
    const k = C.normalizeText(o.concept || o.category);
    const r = m.get(k) || { name: o.concept || C.showCat(o.category), v: 0, c: 0, cat: o.category };
    r.v += Math.abs(o.amountMinor); r.c += 1; m.set(k, r);
  });
  return Array.from(m.values()).sort((a, b) => b.v - a.v).slice(0, n);
}

// Pagos fijos (suscripciones y servicios) al mes y al año.
export function subscriptions(s: C.State, cur: string) {
  return (s.fixed || []).filter((f: any) => f.type === 'expense' && f.currency === cur && !f.archived).map((f: any) => ({ id: f.id, name: f.concept, cat: f.category, month: Number(f.amountMinor || 0), year: Number(f.amountMinor || 0) * 12 }));
}

// 50/30/20: cada categoría de gasto es necesidad o gusto (lo decide la persona la primera vez).
export function needsWants(s: C.State, cur: string, per: string, refInc = 0) {
  const map: Record<string, string> = (s.settings && s.settings.needsWants) || {};
  const cats = D.categoryTotals(C.spendingOps(s, cur, per));
  // El mes en curso aún no tiene todo el ingreso: se compara contra el ingreso habitual.
  const inc = Math.max(C.sumMinor(C.incomeOps(s, cur, per)), refInc);
  let need = 0, want = 0; const unknown: string[] = [];
  cats.forEach((c) => { const k = map[c.cat]; if (k === 'need') need += c.v; else if (k === 'want') want += c.v; else { unknown.push(c.cat); } });
  const out = C.sumMinor(C.spendingOps(s, cur, per));
  const save = Math.max(0, inc - out);
  return { need, want, save, inc, out, unknown, classified: unknown.length === 0 };
}
export function spendCategories(s: C.State) { return ((s.categories && s.categories.expense) || []).filter((c: any) => !c.archived).map((c: any) => c.name); }

// Ánimo y gasto: por nivel (1 mal … 5 muy bien), por tensión y por etiqueta.
export function moodLevelOf(m: any) { if (!m) return 0; const v = Number(m.valence ?? 55); return v < 25 ? 1 : v < 45 ? 2 : v < 64 ? 3 : v < 80 ? 4 : 5; }
export function moodSpending(s: C.State, cur: string, days = 90) {
  const since = Date.now() - days * 864e5;
  const ops = C.spendingOps(s, cur).filter((o: any) => +C.dateFromLocalIso(o.date) >= since).map((o: any) => ({ o, m: C.moodForOperation(s, o) })).filter((x: any) => x.m);
  const levels = [1, 2, 3, 4, 5].map((k) => { const l = ops.filter((x: any) => moodLevelOf(x.m) === k); const t = C.sumMinor(l.map((x: any) => x.o)); return { k, n: l.length, total: t, avg: l.length ? Math.round(t / l.length) : 0 }; });
  const tense = ops.filter((x: any) => x.m.tension >= 65), calm = ops.filter((x: any) => x.m.tension < 35);
  const avg = (a: any[]) => (a.length ? Math.round(C.sumMinor(a.map((x) => x.o)) / a.length) : 0);
  const tagMap = new Map<string, { n: number; total: number }>();
  ops.forEach((x: any) => (x.m.tags || []).forEach((t: string) => { const r = tagMap.get(t) || { n: 0, total: 0 }; r.n += 1; r.total += Math.abs(x.o.amountMinor); tagMap.set(t, r); }));
  const tags = Array.from(tagMap.entries()).map(([t, r]) => ({ tag: t, n: r.n, avg: Math.round(r.total / r.n) })).sort((a, b) => b.n - a.n).slice(0, 6);
  return { n: ops.length, levels, tense: { n: tense.length, avg: avg(tense) }, calm: { n: calm.length, avg: avg(calm) }, tags };
}
export function moodTimeline(s: C.State, days = 14) {
  const since = Date.now() - days * 864e5;
  return (s.moodCheckins || []).map((c: any) => C.normalizeMood(c)).filter((c: any) => c && c.timestamp && +C.dateFromLocalIso(c.timestamp) >= since)
    .sort((a: any, b: any) => +C.dateFromLocalIso(a.timestamp) - +C.dateFromLocalIso(b.timestamp));
}

// Metas: cuándo llegas con un aporte mensual.
export function monthsToGoal(remaining: number, monthly: number) { return monthly > 0 ? Math.ceil(remaining / monthly) : null; }
export function addMonthsLabel(n: number) { const d = new Date(); d.setMonth(d.getMonth() + n); return C.cap(C.monthName(d.getMonth())) + ' ' + d.getFullYear(); }

// Alertas del resumen (se pueden descartar; se guardan en dismissedInsights).
export type Alert = { id: string; kind: 'warn' | 'ok'; title: string; detail: string };
export function alerts(s: C.State, cur: string, money: (n: number) => string): Alert[] {
  const out: Alert[] = [];
  const per = C.currentPeriod(), day = new Date().getDate();
  const b = C.budgetFor(s, cur);
  const cats = D.categoryTotals(C.spendingOps(s, cur, per));
  Object.entries(b.categories || {}).forEach(([cat, lim]: any) => { const v = (cats.find((c) => c.cat === cat) || { v: 0 }).v; if (lim > 0 && v > lim) out.push({ id: 'lim:' + per + ':' + cat, kind: 'warn', title: C.showCat(cat) + ' pasó su límite', detail: money(v - lim) + ' por encima de ' + money(lim) }); });
  const cm = D.cumulative(s, cur, per), pm = D.cumulative(s, cur, D.prevPeriod(per));
  const a = cm.cum[day - 1] || 0, p = pm.cum[Math.min(day, pm.n) - 1] || 0;
  if (p > 0 && day >= 5 && a > p * 1.2) out.push({ id: 'pace:' + per, kind: 'warn', title: 'Vas más rápido que el mes pasado', detail: money(a - p) + ' más a esta altura' });
  const late = C.upcomingItems(s, cur, 50).filter((u) => u.status === 'overdue' && u.direction === 'payable');
  if (late.length) out.push({ id: 'late:' + per + ':' + late.length, kind: 'warn', title: late.length === 1 ? late[0].label + ' está vencido' : late.length + ' pagos vencidos', detail: money(late.reduce((n, u) => n + u.amountMinor, 0)) + ' por pagar' });
  const f = flowByMonth(s, cur, 2)[0];
  const r = savingsRate(f.inc, f.out);
  if (r != null && r >= 20) out.push({ id: 'save:' + f.per, kind: 'ok', title: 'Ahorraste ' + r + '% en ' + C.monthName(Number(f.per.slice(5, 7)) - 1), detail: money(f.inc - f.out) + ' de ' + money(f.inc) });
  const dis: string[] = s.dismissedInsights || [];
  return out.filter((x) => !dis.includes(x.id));
}

// Inversiones: ganancia o pérdida desde la compra (US$), con precios de /api/markets.
export function portfolio(watch: any[], items: any[]) {
  const rows = watch.map((w) => ({ w, p: items.find((x: any) => x.id === w.id) })).filter((r) => r.p && Number(r.w.qty) > 0);
  const value = rows.reduce((n, r) => n + Number(r.w.qty) * Number(r.p.raw), 0);
  const withCost = rows.filter((r) => Number(r.w.buy) > 0);
  const cost = withCost.reduce((n, r) => n + Number(r.w.qty) * Number(r.w.buy), 0);
  const pl = withCost.reduce((n, r) => n + Number(r.w.qty) * (Number(r.p.raw) - Number(r.w.buy)), 0);
  return { value, cost, pl, plPct: cost > 0 ? (pl / cost) * 100 : null, count: rows.length };
}

// Horarios del ánimo: cada 4 horas desde media hora después de despertar hasta media hora antes de dormir.
export function moodScheduleEvery4h(wake: string, sleep: string) {
  const toM = (v: string) => { const [h, m] = String(v || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const fmt = (n: number) => String(Math.floor((n % 1440) / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  const a = toM(wake) + 30; let b = toM(sleep) - 30; if (b <= a) b += 1440;
  const out: number[] = [];
  for (let t = a; t <= b; t += 240) out.push(t);
  if (out.length && b - out[out.length - 1] >= 90) out.push(b);
  return out.map((t) => Math.round(t / 15) * 15).map(fmt);
}
