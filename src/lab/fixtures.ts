/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from '../domain/core';

// Datos 100 % inventados para el laboratorio. Deterministas: mismo día, mismos datos.
// Nada sale de los datos reales del usuario.

export type Scenario = 'normal' | 'extreme' | 'empty';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function labFixture(kind: Scenario, theme: 'light' | 'dark' = 'light'): C.State {
  const s: any = C.defaultState();
  s.settings.onboardingComplete = true;
  s.settings.theme = theme;
  if (kind === 'empty') return C.repairState(s);

  const today = C.todayLocal();
  const [Y, Mo, Dd] = today.split('-').map(Number);
  const at = (daysAgo: number, h = 12, m = 0) => C.nowIsoLocal(new Date(Y, Mo - 1, Dd - daysAgo, h, m));
  const ymd = (offset: number) => { const d = new Date(Y, Mo - 1, Dd + offset); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const long = kind === 'extreme';
  const acc = (id: string, name: string, brand: string, currency: string, opening: number, extra: any = {}) => ({ id, name, institution: brand && brand !== 'cash' ? name : '', brand, currency, kind: 'regular', openingMinor: C.toMinor(opening, currency), archived: false, ...extra });

  s.accounts = [
    acc('l_bcp', long ? 'Cuenta Sueldo Principal BCP Soles' : 'BCP Sueldo', 'bcp', 'PEN', 7420.35),
    acc('l_bbva', long ? 'BBVA Ahorro Programado para la Casa' : 'BBVA Ahorro', 'bbva', 'PEN', 5310.8),
    acc('l_ibk', 'Interbank Soles', 'interbank', 'PEN', 6645.12),
    acc('l_scot', 'Scotiabank', 'scotiabank', 'PEN', 0),
    acc('l_yape', 'Yape', 'yape', 'PEN', 2186.5),
    acc('l_cash', 'Efectivo', 'cash', 'PEN', 2240),
    { ...acc('l_res', long ? 'Fondo de emergencia de la familia' : 'Fondo de emergencia', '', 'PEN', 3150), kind: 'reserve', goalMinor: C.toMinor(8000, 'PEN') },
    acc('l_ibkusd', 'Interbank Dólares', 'interbank', 'USD', 1284.07)
  ];

  const r = rng(20261031);
  let n = 0;
  const push = (o: any) => s.operations.push({ id: 'lop' + n++, note: '', createdAt: o.date, ...o });
  const spend = (daysAgo: number, amount: number, concept: string, category: string, accountId: string, h = 13, currency = 'PEN') =>
    push({ type: 'expense', date: at(daysAgo, h, Math.floor(r() * 59)), currency, amountMinor: C.toMinor(Math.round(amount * 100) / 100, currency), concept, category, accountId });

  // Gasto diario realista con comercios que reconoce <RowIcon />.
  const shops: [string, string, number, number][] = [
    ['Wong', 'Alimentacion', 60, 210], ['Tottus', 'Alimentacion', 45, 260], ['Plaza Vea', 'Alimentacion', 38, 190], ['Rappi', 'Alimentacion', 24, 68],
    ['PedidosYa', 'Alimentacion', 22, 55], ['Inkafarma', 'Salud', 18, 96], ['Starbucks', 'Alimentacion', 14, 26], ['Uber', 'Transporte', 9, 34],
    ['Cineplanet', 'Ocio', 28, 64], ['Tambo', 'Alimentacion', 6, 19], ['Grifo Primax', 'Transporte', 80, 160], ['Spotify', 'Servicios', 21.9, 21.9]
  ];
  const daily = ['l_bcp', 'l_bcp', 'l_ibk', 'l_ibk', 'l_yape', 'l_cash', 'l_bbva', 'l_scot'];
  for (let d = 0; d < 96; d++) {
    const k = 1 + Math.floor(r() * (d % 7 === 5 || d % 7 === 6 ? 3 : 2.4));
    for (let j = 0; j < k; j++) {
      const [c, cat, lo, hi] = shops[Math.floor(r() * shops.length)];
      spend(d, lo + r() * (hi - lo), long && c === 'Wong' ? 'Wong, compra quincenal de la casa de la abuela en Miraflores' : c, cat, daily[Math.floor(r() * daily.length)], 8 + Math.floor(r() * 13));
    }
  }
  // Servicios del mes y del anterior.
  [0, 1, 2].forEach((m) => {
    const back = m * 30;
    spend(back + 6, 148.6 + m * 7.2, 'Luz del Sur', 'Servicios', 'l_bcp', 10);
    spend(back + 9, 61.3 + m * 3.4, 'Sedapal', 'Servicios', 'l_bcp', 10);
    spend(back + 12, 89.9, 'Claro', 'Servicios', 'l_ibk', 9);
    push({ type: 'income', date: C.nowIsoLocal(new Date(Y, Mo - 1 - m, 1, 9)), currency: 'PEN', amountMinor: C.toMinor(6850, 'PEN'), concept: 'Sueldo', category: 'Sueldo', accountId: 'l_bcp' });
  });
  spend(17, 612.4, 'Latam', 'Ocio', 'l_ibk', 21);
  push({ type: 'income', date: at(4, 18), currency: 'PEN', amountMinor: C.toMinor(920, 'PEN'), concept: 'Freelance identidad visual', category: 'Otros ingresos', accountId: 'l_ibk' });
  push({ type: 'income', date: at(11, 16), currency: 'USD', amountMinor: C.toMinor(450, 'USD'), concept: 'Proyecto remoto', category: 'Otros ingresos', accountId: 'l_ibkusd' });
  spend(3, 38.9, 'Netflix', 'Servicios', 'l_ibkusd', 22, 'USD');
  push({ type: 'transfer', date: at(2, 11), currency: 'PEN', amountMinor: C.toMinor(300, 'PEN'), fromAccountId: 'l_bcp', toAccountId: 'l_yape', concept: 'A Yape' });
  push({ type: 'transfer', date: at(8, 19), currency: 'PEN', amountMinor: C.toMinor(500, 'PEN'), fromAccountId: 'l_bcp', toAccountId: 'l_res', concept: 'Al fondo de emergencia' });
  push({ type: 'adjustment', date: at(5, 20), currency: 'PEN', deltaMinor: C.toMinor(-12.4, 'PEN'), accountId: 'l_cash', concept: 'Ajuste de efectivo' });

  s.fixed = [
    { id: 'lf1', type: 'expense', concept: 'Alquiler', amountMinor: C.toMinor(1650, 'PEN'), currency: 'PEN', day: Math.max(1, Dd - 2), category: 'Vivienda', paidPeriod: null },
    { id: 'lf2', type: 'expense', concept: 'Internet Movistar', amountMinor: C.toMinor(119, 'PEN'), currency: 'PEN', day: Math.min(28, Dd + 2), category: 'Servicios', paidPeriod: null },
    { id: 'lf3', type: 'expense', concept: 'Gimnasio Smart Fit', amountMinor: C.toMinor(99.9, 'PEN'), currency: 'PEN', day: Math.min(28, Dd + 4), category: 'Salud', paidPeriod: null }
  ];
  C.createDebt(s, { direction: 'payable', name: 'Tarjeta Interbank', currency: 'PEN', amount: 2880, installments: 6, dueDate: ymd(-4), category: 'Finanzas' });
  C.createDebt(s, { direction: 'payable', name: long ? 'Préstamo de la tía Rosa para la mudanza' : 'Préstamo de la tía Rosa', currency: 'PEN', amount: 1500, installments: 5, dueDate: ymd(3), category: 'Finanzas' });
  C.createDebt(s, { direction: 'receivable', name: 'Lucía me debe', currency: 'PEN', amount: 260, installments: 1, dueDate: ymd(6), category: 'Otros ingresos' });
  s.budgets.PEN.monthlyMinor = C.toMinor(5200, 'PEN');
  s.moodCheckins = [0, 1, 3, 5, 7, 9, 12].map((d, i) => ({ id: 'lm' + i, timestamp: at(d, 14), valence: 35 + i * 8, energy: 55, tension: i % 2 ? 78 : 28, tags: [], note: '', source: 'manual' }));
  s.lastMood = s.moodCheckins[0];
  s.watchlist = [{ id: 'AAPL', label: 'Apple', detail: 'AAPL · NASDAQ', kind: 'stock' }, { id: 'BTC-USD', label: 'Bitcoin', detail: 'BTC · Cripto', kind: 'crypto' }];

  let out: any = C.repairState(s);
  // Saldo extremo: el patrimonio en soles queda exactamente en S/ 1,234,567.89.
  if (kind === 'extreme') {
    const target = C.toMinor(1234567.89, 'PEN');
    const now = C.currencyTotals(out, 'PEN').total;
    out.accounts.find((a: any) => a.id === 'l_bcp').openingMinor += target - now;
    out = C.repairState(out);
  }
  return out;
}
