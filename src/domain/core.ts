// Núcleo de Wallet: el mismo modelo de datos y los mismos cálculos que la v21
// (wallet_data_v8). Todo lo que se lee de aquí debe dar exactamente lo mismo
// que la app anterior con los mismos datos.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type Minor = number;
export type State = any;
export type Op = any;
export type Account = any;

export const STORAGE_KEY = 'wallet_data_v8';
export const LEGACY_KEY_V7 = 'wallet_data_v7';
export const LEGACY_KEY = 'mindwallet_data_v6';
export const LEGACY_KEY_V5 = 'mindwallet_data_v5';
export const QUARANTINE_KEY = 'wallet_data_corrupto';
export const OPENAI_KEY_STORE = 'wallet_openai_key_v1';

export const CURRENCY_META: Record<string, { code: string; symbol: string; name: string; decimals: number }> = {
  PEN: { code: 'PEN', symbol: 'S/', name: 'Soles', decimals: 2 },
  USD: { code: 'USD', symbol: 'US$', name: 'Dólares', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euros', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'Libras esterlinas', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Yenes', decimals: 0 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Francos suizos', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Dólares canadienses', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Dólares australianos', decimals: 2 },
  CNY: { code: 'CNY', symbol: 'CN¥', name: 'Yuanes', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Reales', decimals: 2 },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Pesos mexicanos', decimals: 2 },
  CLP: { code: 'CLP', symbol: 'CLP$', name: 'Pesos chilenos', decimals: 0 },
  COP: { code: 'COP', symbol: 'COP$', name: 'Pesos colombianos', decimals: 2 }
};

export function currencyMeta(code: string) {
  return CURRENCY_META[code] || { code, symbol: code, name: code, decimals: 2 };
}

export function uid(prefix = 'id') {
  try { return prefix + '_' + crypto.randomUUID(); } catch { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2); }
}

export function nowIsoLocal(d = new Date()) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 19);
}
export const todayLocal = () => nowIsoLocal().slice(0, 10);
export const currentPeriod = () => todayLocal().slice(0, 7);
export function dateFromLocalIso(iso: string) { return new Date(String(iso).length <= 10 ? iso + 'T12:00:00' : iso); }
export const periodOf = (iso: string) => String(iso || '').slice(0, 7);
export const sameDay = (iso: string, day: string) => String(iso || '').slice(0, 10) === day;
export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
export function normalizeText(s: any) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

export function toMinor(amount: any, currency: string) {
  const f = Math.pow(10, currencyMeta(currency).decimals);
  return Math.round((Number(amount) || 0) * f);
}
export function fromMinor(minor: any, currency: string) {
  return (Number(minor) || 0) / Math.pow(10, currencyMeta(currency).decimals);
}

// Formato del usuario: coma para miles, punto para decimales, el símbolo
// siempre delante y pegado con un espacio que no se parte.
export function fmtNumber(n: number, decimals = 2) {
  const fixed = Math.abs(n).toFixed(decimals);
  const [w, d] = fixed.split('.');
  return w.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : '');
}
export function money(minor: any, currency: string, opts: { sign?: boolean; noCents?: boolean } = {}) {
  const m = currencyMeta(currency);
  const v = fromMinor(minor, currency);
  const s = opts.sign ? (v < 0 ? '−' : v > 0 ? '+' : '') : v < 0 ? '−' : '';
  return s + m.symbol + ' ' + fmtNumber(v, opts.noCents ? 0 : m.decimals);
}
export function moneyParts(minor: any, currency: string) {
  const m = currencyMeta(currency);
  const v = fromMinor(minor, currency);
  const [w, d] = fmtNumber(v, m.decimals).split('.');
  return { sign: v < 0 ? '−' : '', symbol: m.symbol, whole: w, dec: d || '' };
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const MON3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function monthName(i: number) { return MONTHS[i]; }
export function shortDate(iso: string) { const d = dateFromLocalIso(iso); return d.getDate() + ' ' + MON3[d.getMonth()]; }
export function longDate(iso: string) { const d = dateFromLocalIso(iso); return cap(DAYS[d.getDay()]) + ' ' + d.getDate() + ' de ' + MONTHS[d.getMonth()]; }
export function dayLabel(key: string) {
  const t = todayLocal();
  if (key === t) return 'Hoy';
  const y = nowIsoLocal(new Date(Date.now() - 864e5)).slice(0, 10);
  if (key === y) return 'Ayer';
  const d = dateFromLocalIso(key);
  return cap(DAYS[d.getDay()]) + ' ' + d.getDate() + (periodOf(key) === currentPeriod() ? '' : ' de ' + MONTHS[d.getMonth()]);
}
export function monthLabel(period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) return period;
  const [y, m] = period.split('-').map(Number);
  return cap(MONTHS[m - 1]) + (y !== new Date().getFullYear() ? ' ' + y : '');
}
export function addMonthsISO(dateStr: string, months: number) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const base = new Date(y, m - 1 + months, 1, 12);
  const max = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(d, max));
  return nowIsoLocal(base).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Categorías y catálogo (idénticos a la v21)
// ---------------------------------------------------------------------------
export const V8_CATEGORY_DEFS: Record<string, [string, string[]][]> = {
  expense: [
    ['Alimentacion', ['Supermercado', 'Restaurantes', 'Delivery', 'Cafe', 'Snacks']],
    ['Transporte', ['Taxi / apps', 'Transporte publico', 'Combustible', 'Estacionamiento', 'Peajes', 'Mantenimiento']],
    ['Vivienda', ['Alquiler', 'Mantenimiento', 'Muebles', 'Electrodomesticos']],
    ['Servicios', ['Luz', 'Agua', 'Internet', 'Celular', 'Suscripciones', 'Software']],
    ['Salud', ['Farmacia', 'Consulta', 'Dentista', 'Terapia', 'Gimnasio']],
    ['Educacion', ['Cursos', 'Libros', 'Universidad / instituto', 'Materiales']],
    ['Ocio', ['Cine', 'Eventos', 'Videojuegos', 'Salidas', 'Hobbies']],
    ['Compras', ['Ropa', 'Calzado', 'Tecnologia', 'Regalos', 'Cuidado personal']],
    ['Viajes', ['Vuelos', 'Hotel', 'Tours', 'Seguro', 'Equipaje']],
    ['Mascotas', ['Alimento', 'Veterinario', 'Accesorios']],
    ['Hogar', ['Limpieza', 'Ferreteria', 'Decoracion']],
    ['Finanzas', ['Comisiones', 'Impuestos', 'Seguros']],
    ['Familia', ['Apoyo familiar', 'Ninos', 'Celebraciones']],
    ['Otros', ['Tramites', 'Imprevistos']]
  ],
  income: [
    ['Sueldo', []], ['Independiente', ['Freelance', 'Honorarios']], ['Rendimientos', ['Intereses', 'Dividendos']],
    ['Reembolso', []], ['Venta', []], ['Bonos', []], ['Otros ingresos', []]
  ]
};

// Nombres con tilde solo para mostrar; el dato guardado no cambia.
const ACCENTED: Record<string, string> = { Alimentacion: 'Alimentación', Educacion: 'Educación', Tecnologia: 'Tecnología', Ferreteria: 'Ferretería', Decoracion: 'Decoración', Ninos: 'Niños', Tramites: 'Trámites', Electrodomesticos: 'Electrodomésticos' };
export const showCat = (c: string) => ACCENTED[c] || c;

type CatRow = [string, string, number];
export const CATALOG: Record<string, CatRow[]> = {
  PEN: [
    ['Alimentacion', 'Menu del dia', 15], ['Alimentacion', 'Cafe', 10], ['Alimentacion', 'Pollo a la brasa', 32], ['Alimentacion', 'Ceviche', 35], ['Alimentacion', 'Chifa', 24], ['Alimentacion', 'Hamburguesa', 25], ['Alimentacion', 'Supermercado', 80], ['Alimentacion', 'Pan', 6], ['Alimentacion', 'Leche', 5], ['Alimentacion', 'Arroz 1 kg', 5], ['Alimentacion', 'Frutas y verduras', 25], ['Alimentacion', 'Delivery', 35],
    ['Transporte', 'Bus / combi', 2.5], ['Transporte', 'Metropolitano', 3.2], ['Transporte', 'Metro de Lima', 1.5], ['Transporte', 'Taxi / app', 18], ['Transporte', 'Gasolina', 80], ['Transporte', 'Estacionamiento', 8],
    ['Servicios', 'Plan celular', 45], ['Servicios', 'Internet hogar', 80], ['Servicios', 'Netflix', 34.9], ['Servicios', 'Spotify', 19.9], ['Servicios', 'iCloud / Google One', 9.9], ['Servicios', 'Suscripcion IA', 75],
    ['Vivienda', 'Alquiler', 1200], ['Vivienda', 'Mantenimiento', 180], ['Vivienda', 'Luz', 90], ['Vivienda', 'Agua', 45],
    ['Salud', 'Farmacia', 30], ['Salud', 'Consulta medica', 100], ['Salud', 'Dentista', 120], ['Salud', 'Gimnasio', 100],
    ['Educacion', 'Curso online', 90], ['Educacion', 'Libros', 50], ['Educacion', 'Universidad / instituto', 600],
    ['Ocio', 'Cine', 25], ['Ocio', 'Bar / salida', 60], ['Ocio', 'Concierto / evento', 120], ['Ocio', 'Videojuego', 80],
    ['Compras', 'Ropa', 120], ['Compras', 'Zapatillas', 220], ['Compras', 'Tecnologia', 300], ['Compras', 'Regalo', 70],
    ['Viajes', 'Pasaje nacional', 250], ['Viajes', 'Hotel', 200], ['Viajes', 'Tour', 100], ['Viajes', 'Equipaje', 100],
    ['Hogar', 'Limpieza', 35], ['Hogar', 'Ferreteria', 60], ['Mascotas', 'Alimento mascota', 70], ['Mascotas', 'Veterinario', 80],
    ['Otros', 'Tramite', 50], ['Otros', 'Imprevisto', 50],
    ['Alimentacion', 'Desayuno', 12], ['Alimentacion', 'Almuerzo / menu', 16], ['Alimentacion', 'Cena', 25], ['Alimentacion', 'Cafe americano', 9], ['Alimentacion', 'Capuccino', 13], ['Alimentacion', 'Postre', 12], ['Alimentacion', 'Helado', 10], ['Alimentacion', 'Agua embotellada', 3], ['Alimentacion', 'Gaseosa', 5], ['Alimentacion', 'Snack', 6], ['Alimentacion', 'Frutas', 15], ['Alimentacion', 'Verduras', 18], ['Alimentacion', 'Huevos', 10], ['Alimentacion', 'Pollo', 20], ['Alimentacion', 'Carne', 30], ['Alimentacion', 'Pescado', 28], ['Alimentacion', 'Abarrotes', 35], ['Alimentacion', 'Tottus', 90], ['Alimentacion', 'Plaza Vea', 90], ['Alimentacion', 'Wong', 110], ['Alimentacion', 'Metro supermercado', 80], ['Alimentacion', 'Rappi', 35], ['Alimentacion', 'PedidosYa', 35], ['Alimentacion', 'Starbucks', 16], ['Alimentacion', 'Bembos', 28], ['Alimentacion', 'KFC', 30], ['Alimentacion', 'Popeyes', 30], ['Alimentacion', 'McDonalds', 28], ['Alimentacion', 'Pizza', 35],
    ['Transporte', 'Uber', 18], ['Transporte', 'Cabify', 20], ['Transporte', 'Indrive', 16], ['Transporte', 'Corredor', 2.5], ['Transporte', 'Mototaxi', 5], ['Transporte', 'Peaje', 7.5], ['Transporte', 'Lavado de auto', 25], ['Transporte', 'Mantenimiento auto', 250], ['Transporte', 'SOAT', 120], ['Transporte', 'Revision tecnica', 100],
    ['Servicios', 'Claro', 50], ['Servicios', 'Movistar', 50], ['Servicios', 'Entel', 50], ['Servicios', 'Bitel', 35], ['Servicios', 'Disney+', 35], ['Servicios', 'Max', 30], ['Servicios', 'Prime Video', 25], ['Servicios', 'YouTube Premium', 24], ['Servicios', 'ChatGPT', 75], ['Servicios', 'Google One', 10], ['Servicios', 'iCloud+', 4], ['Servicios', 'Canva', 45], ['Servicios', 'Microsoft 365', 30],
    ['Salud', 'Inkafarma', 35], ['Salud', 'Mifarma', 35], ['Salud', 'Medicamentos', 30], ['Salud', 'Analisis clinicos', 80], ['Salud', 'Lentes / optica', 150], ['Salud', 'Psicologia', 100], ['Salud', 'Seguro de salud', 150],
    ['Educacion', 'Udemy', 45], ['Educacion', 'Platzi', 80], ['Educacion', 'Domestika', 45], ['Educacion', 'Certificacion', 250], ['Educacion', 'Material de estudio', 35],
    ['Ocio', 'Cineplanet', 30], ['Ocio', 'Cinemark', 30], ['Ocio', 'Discoteca / bar', 70], ['Ocio', 'Streaming / alquiler', 15], ['Ocio', 'PlayStation / Xbox', 100], ['Ocio', 'Steam', 60], ['Ocio', 'Hobby', 50],
    ['Compras', 'Polo / camiseta', 45], ['Compras', 'Pantalon', 90], ['Compras', 'Casaca', 150], ['Compras', 'Corte de cabello', 30], ['Compras', 'Barberia', 35], ['Compras', 'Perfume', 180], ['Compras', 'Skincare', 60], ['Compras', 'Accesorio celular', 40], ['Compras', 'Cable / cargador', 45], ['Compras', 'Audifonos', 100], ['Compras', 'Power bank', 100], ['Compras', 'Disco externo', 250],
    ['Viajes', 'Taxi aeropuerto', 45], ['Viajes', 'Comida de viaje', 35], ['Viajes', 'Roaming / eSIM', 50], ['Viajes', 'Souvenir', 40], ['Viajes', 'Equipaje adicional', 120],
    ['Mascotas', 'Arena para gato', 35], ['Mascotas', 'Bano mascota', 40], ['Mascotas', 'Vacuna mascota', 70], ['Mascotas', 'Accesorios mascota', 40],
    ['Hogar', 'Detergente', 18], ['Hogar', 'Papel higienico', 18], ['Hogar', 'Utensilios', 30], ['Hogar', 'Mueble', 250], ['Hogar', 'Reparacion', 100],
    ['Finanzas', 'Comision bancaria', 10], ['Finanzas', 'Seguro', 100], ['Finanzas', 'Impuesto / tasa', 50], ['Familia', 'Apoyo familiar', 100], ['Familia', 'Cumpleanos', 100], ['Otros', 'RENIEC / tramite', 40], ['Otros', 'Notaria', 80]
  ],
  USD: [
    ['Alimentacion', 'Coffee shop', 5], ['Alimentacion', 'Lunch', 15], ['Alimentacion', 'Dinner', 30], ['Alimentacion', 'Groceries', 60], ['Alimentacion', 'Food delivery', 25], ['Transporte', 'Ride share', 18], ['Transporte', 'Public transport', 4], ['Transporte', 'Gas', 45], ['Servicios', 'Netflix', 17.99], ['Servicios', 'Spotify', 11.99], ['Servicios', 'iCloud / Google One', 2.99], ['Servicios', 'Software subscription', 15], ['Servicios', 'AI subscription', 20], ['Vivienda', 'Rent', 900], ['Vivienda', 'Utilities', 120], ['Salud', 'Pharmacy', 25], ['Salud', 'Medical visit', 80], ['Salud', 'Gym', 45], ['Educacion', 'Online course', 30], ['Educacion', 'Books', 25], ['Ocio', 'Cinema', 15], ['Ocio', 'Night out', 50], ['Ocio', 'Concert / event', 80], ['Compras', 'Clothing', 60], ['Compras', 'Shoes', 90], ['Compras', 'Technology', 300], ['Viajes', 'Flight', 350], ['Viajes', 'Hotel', 140], ['Viajes', 'Tour / activity', 60], ['Viajes', 'Travel insurance', 35], ['Otros', 'Fee / charge', 10], ['Otros', 'Miscellaneous', 25],
    ['Alimentacion', 'Breakfast', 10], ['Alimentacion', 'Starbucks', 6], ['Alimentacion', 'Weekly groceries', 75], ['Alimentacion', 'Restaurant', 30], ['Alimentacion', 'Fast food', 15], ['Alimentacion', 'DoorDash / delivery', 25], ['Transporte', 'Uber / Lyft', 22], ['Transporte', 'Parking', 15], ['Transporte', 'Toll', 8], ['Transporte', 'Car maintenance', 250], ['Servicios', 'ChatGPT', 20], ['Servicios', 'YouTube Premium', 14], ['Servicios', 'Disney+', 12], ['Servicios', 'Prime Video', 15], ['Servicios', 'Google One', 3], ['Servicios', 'iCloud+', 1], ['Servicios', 'Microsoft 365', 10], ['Servicios', 'Adobe / software', 25], ['Salud', 'Prescription / pharmacy', 30], ['Salud', 'Dental visit', 120], ['Salud', 'Therapy', 100], ['Salud', 'Health insurance', 250], ['Educacion', 'Udemy / course', 30], ['Educacion', 'Certification', 150], ['Ocio', 'Movie ticket', 18], ['Ocio', 'Game', 60], ['Ocio', 'Event ticket', 80], ['Compras', 'Phone accessory', 30], ['Compras', 'Headphones', 80], ['Compras', 'Casual clothing', 70], ['Compras', 'Personal care', 35], ['Viajes', 'Airport transfer', 45], ['Viajes', 'eSIM / roaming', 25], ['Viajes', 'Checked bag', 60], ['Viajes', 'Travel meal', 25], ['Mascotas', 'Pet food', 45], ['Mascotas', 'Vet', 100], ['Hogar', 'Cleaning supplies', 30], ['Hogar', 'Home repair', 100], ['Finanzas', 'Bank fee', 10], ['Otros', 'Document / fee', 25]
  ]
};
export const CATALOG_INCOME: Record<string, CatRow[]> = {
  PEN: [['Sueldo', 'Sueldo / planilla', 2500], ['Independiente', 'Proyecto freelance', 500], ['Reembolso', 'Reembolso', 50], ['Rendimientos', 'Intereses / rendimientos', 30], ['Venta', 'Venta de articulo', 100], ['Otros ingresos', 'Transferencia recibida', 100]],
  USD: [['Sueldo', 'Salary / payroll', 1200], ['Independiente', 'Freelance project', 300], ['Reembolso', 'Refund', 25], ['Rendimientos', 'Interest / yield', 10], ['Venta', 'Sale', 50], ['Otros ingresos', 'Transfer received', 50]]
};

export function makeDefaultCategories() {
  const out: any = { expense: [], income: [] };
  for (const type of ['expense', 'income']) V8_CATEGORY_DEFS[type].forEach(([name, subs]) => out[type].push({ id: uid('cat'), name, subcategories: [...subs], archived: false, builtin: true }));
  return out;
}
export function defaultMoodSchedule(wake = '08:00', sleep = '23:30') {
  const toM = (v: string) => { const [h, m] = String(v).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const fmt = (n: number) => String(Math.floor((n % 1440) / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  const a = toM(wake); let b = toM(sleep); if (b <= a) b += 1440; const span = b - a;
  return [0.08, 0.34, 0.66, 0.9].map((x) => Math.round((a + span * x) / 15) * 15).map(fmt);
}

export function defaultState(): State {
  return {
    version: '8.2',
    settings: {
      activeCurrency: 'PEN', enabledCurrencies: ['PEN', 'USD'], theme: 'system', accent: 'forest', onboardingComplete: false,
      includeMoodForAI: true, aiWebSearch: true, proactiveInsights: true, weeklyReview: true, migratedFromV6: false, migratedFromV7: false,
      mood: { enabled: true, wake: '08:00', sleep: '23:30', times: defaultMoodSchedule(), skipRecentMinutes: 120 },
      notifications: { enabled: false, pushId: '', pushSecret: '', debtEnabled: true, weeklyReview: true }
    },
    accounts: [], operations: [], budgets: { PEN: { monthlyMinor: 0, categories: {} }, USD: { monthlyMinor: 0, categories: {} } }, fixed: [], debts: [],
    moodCheckins: [], lastMood: null, categories: makeDefaultCategories(), customProducts: [], rates: {}, catalogOverrides: {}, dismissedInsights: []
  };
}

function localizeLegacyIso(iso: string) {
  try { const d = new Date(iso); if (Number.isNaN(d.getTime())) return String(iso).slice(0, 19); return nowIsoLocal(d); } catch { return nowIsoLocal(); }
}

export function migrateLegacy(parsed: any): State {
  const s = defaultState();
  s.settings.migratedFromV6 = true;
  const oldAccounts = Array.isArray(parsed.carteras) ? parsed.carteras : [];
  const oldTx = Array.isArray(parsed.transacciones) ? parsed.transacciones : [];
  const effects: any = {};
  oldTx.forEach((t: any) => { if (!t || !t.carteraId) return; const delta = t.tipo === 'ingreso' ? Number(t.monto || 0) : -Number(t.monto || 0); effects[t.carteraId] = (effects[t.carteraId] || 0) + delta; });
  s.accounts = oldAccounts.map((a: any) => ({ id: a.id || uid('acc'), name: a.nombre || 'Cuenta', institution: '', currency: 'PEN', kind: 'regular', openingMinor: toMinor(Number(a.saldo || 0) - (effects[a.id] || 0), 'PEN'), archived: false }));
  if (!s.accounts.length) s.accounts = [{ id: uid('acc'), name: 'Efectivo', institution: '', currency: 'PEN', kind: 'regular', openingMinor: 0, archived: false }];
  s.operations = oldTx.map((t: any) => ({
    id: t.id || uid('op'), type: t.tipo === 'ingreso' ? 'income' : 'expense', accountId: t.carteraId, currency: 'PEN', amountMinor: toMinor(t.monto, 'PEN'),
    category: t.categoria || (t.tipo === 'ingreso' ? 'Otros ingresos' : 'Otros'), concept: t.concepto || 'Movimiento', date: t.fecha ? localizeLegacyIso(t.fecha) : nowIsoLocal(),
    mood: t.animo ? { stress: Number(t.animo.estres || 3), anxiety: Number(t.animo.ansiedad || 2), happiness: Number(t.animo.felicidad || 7), tiredness: Number(t.animo.cansancio || 3), boredom: Number(t.animo.aburrimiento || 2), alcohol: !!t.animo.alcohol, note: t.animo.nota || '', timestamp: t.animo.timestamp || t.fecha || nowIsoLocal() } : null,
    excludedFromSpending: t.categoria === 'Ahorro' || /^aporte:/i.test(t.concepto || ''), legacy: true
  }));
  (Array.isArray(parsed.metasAhorro) ? parsed.metasAhorro : []).forEach((g: any) => {
    s.accounts.push({ id: 'reserve_' + (g.id || uid('goal')), name: g.nombre || 'Ahorro', institution: '', currency: 'PEN', kind: 'reserve', openingMinor: toMinor(g.montoActual || 0, 'PEN'), goalMinor: toMinor(g.montoObjetivo || 0, 'PEN'), goalDate: g.fechaObjetivo || null, archived: false });
  });
  s.budgets.PEN.monthlyMinor = toMinor(Number((parsed.config && parsed.config.presupuestoMensual) || 1500), 'PEN');
  Object.entries(parsed.presupuestosCategoria || {}).forEach(([cat, val]) => { s.budgets.PEN.categories[cat] = toMinor(val, 'PEN'); });
  s.fixed = (parsed.gastosFijos || []).map((f: any) => ({ id: f.id || uid('fixed'), type: f.tipo === 'ingreso' ? 'income' : 'expense', concept: f.concepto || 'Fijo', amountMinor: toMinor(f.monto || 0, 'PEN'), currency: 'PEN', day: Number(f.diaVencimiento || 1), category: f.tipo === 'ingreso' ? 'Sueldo' : 'Vivienda', paidPeriod: f.pagadoPeriodo || null }));
  if (parsed.ultimoEstadoAnimo) { const a = parsed.ultimoEstadoAnimo; s.lastMood = { stress: a.estres || 3, anxiety: a.ansiedad || 2, happiness: a.felicidad || 7, tiredness: a.cansancio || 3, boredom: a.aburrimiento || 2, alcohol: !!a.alcohol, note: a.nota || '', timestamp: a.timestamp || nowIsoLocal() }; }
  return s;
}

export function migrateV7(s7: any): State {
  const d = defaultState();
  const s = JSON.parse(JSON.stringify(s7 || {}));
  d.settings = Object.assign(d.settings, s.settings || {}, { onboardingComplete: true, migratedFromV7: true });
  d.settings.mood = Object.assign(defaultState().settings.mood, (s.settings && s.settings.mood) || {});
  d.settings.notifications = Object.assign(defaultState().settings.notifications, (s.settings && s.settings.notifications) || {});
  d.accounts = Array.isArray(s.accounts) ? s.accounts : []; d.operations = Array.isArray(s.operations) ? s.operations : []; d.budgets = s.budgets || d.budgets; d.fixed = Array.isArray(s.fixed) ? s.fixed : [];
  d.rates = s.rates || {}; d.catalogOverrides = s.catalogOverrides || {}; d.dismissedInsights = s.dismissedInsights || [];
  if (s.lastMood) {
    const old = s.lastMood;
    const valence = clamp(Math.round(Number(old.happiness || 7) * 10), 0, 100); const energy = clamp(Math.round((11 - Number(old.tiredness || 3)) * 10), 0, 100); const tension = clamp(Math.round(((Number(old.stress || 3) + Number(old.anxiety || 2)) / 2) * 10), 0, 100);
    const c = { id: uid('mood'), timestamp: old.timestamp || nowIsoLocal(), valence, energy, tension, tags: [Number(old.anxiety || 0) >= 7 ? 'Ansioso' : null, Number(old.tiredness || 0) >= 7 ? 'Cansado' : null, Number(old.boredom || 0) >= 7 ? 'Aburrido' : null].filter(Boolean), note: old.note || '', source: 'migration' };
    d.moodCheckins = [c]; d.lastMood = c;
  }
  return repairState(d);
}

export function repairState(s: any): State {
  const d = defaultState(); s = s || {}; if (!s.version) s.version = '8.2';
  s.settings = Object.assign(d.settings, s.settings || {});
  s.settings.mood = Object.assign(d.settings.mood, (s.settings && s.settings.mood) || {});
  s.settings.notifications = Object.assign(d.settings.notifications, (s.settings && s.settings.notifications) || {});
  s.accounts = Array.isArray(s.accounts) ? s.accounts : d.accounts; s.operations = Array.isArray(s.operations) ? s.operations : []; s.budgets = s.budgets || d.budgets; s.fixed = Array.isArray(s.fixed) ? s.fixed : []; s.debts = Array.isArray(s.debts) ? s.debts : [];
  s.moodCheckins = Array.isArray(s.moodCheckins) ? s.moodCheckins : [];
  s.lastMood = s.moodCheckins.length ? s.moodCheckins.slice().sort((a: any, b: any) => +dateFromLocalIso(b.timestamp) - +dateFromLocalIso(a.timestamp))[0] : s.lastMood || null;
  s.categories = s.categories && Array.isArray(s.categories.expense) && Array.isArray(s.categories.income) ? s.categories : makeDefaultCategories();
  s.customProducts = Array.isArray(s.customProducts) ? s.customProducts : [];
  s.rates = s.rates || {}; s.catalogOverrides = s.catalogOverrides || {}; s.dismissedInsights = s.dismissedInsights || [];
  if (!Array.isArray(s.watchlist)) s.watchlist = [];
  s.settings.enabledCurrencies = Array.from(new Set((s.settings.enabledCurrencies || ['PEN', 'USD']).filter(Boolean)));
  if (!s.settings.enabledCurrencies.length) s.settings.enabledCurrencies = ['PEN'];
  if (!s.settings.enabledCurrencies.includes(s.settings.activeCurrency)) s.settings.activeCurrency = s.settings.enabledCurrencies[0];
  s.settings.mood.times = Array.isArray(s.settings.mood.times) && s.settings.mood.times.length ? s.settings.mood.times : defaultMoodSchedule(s.settings.mood.wake, s.settings.mood.sleep);
  if (!s.settings.aiModel) s.settings.aiModel = 'gpt-5.4-nano';
  if (s.settings.aiEffort === undefined) s.settings.aiEffort = 'low';
  if (s.settings.aiCanWrite === undefined) s.settings.aiCanWrite = true;
  if (s.settings.brandLogos === undefined) s.settings.brandLogos = true;
  return s;
}

export function looksLikeState(v: any) {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.accounts) && (v.operations === undefined || Array.isArray(v.operations));
}

export type Health = { mode: 'ok' | 'unreadable' | 'recovery_required' | 'failed'; reason: string; quarantined: boolean };

// Misma lógica de carga que la v21: si existe un estado actual y no se puede
// leer, NUNCA se cae a un respaldo antiguo ni se escribe encima.
export function loadState(storage: Storage): { state: State; health: Health } {
  let raw: string | null = null;
  try { raw = storage.getItem(STORAGE_KEY); } catch {
    return { state: defaultState(), health: { mode: 'unreadable', reason: 'El navegador no deja leer el almacenamiento local.', quarantined: false } };
  }
  if (raw !== null && raw !== '') {
    let parsed: any = null; let parseError = '';
    try { parsed = JSON.parse(raw); } catch { parseError = 'El archivo de datos no se puede leer (JSON inválido).'; }
    if (parsed !== null && looksLikeState(parsed)) return { state: repairState(parsed), health: { mode: 'ok', reason: '', quarantined: false } };
    let quarantined = false;
    try { if (!storage.getItem(QUARANTINE_KEY)) storage.setItem(QUARANTINE_KEY, raw); quarantined = true; } catch { quarantined = false; }
    const safe = defaultState(); safe.settings.onboardingComplete = true;
    return { state: safe, health: { mode: 'recovery_required', reason: parseError || 'El archivo de datos existe pero no tiene la forma de una cartera de Wallet.', quarantined } };
  }
  try {
    const v7 = storage.getItem(LEGACY_KEY_V7);
    if (v7) { const p = JSON.parse(v7); if (looksLikeState(p)) return { state: migrateV7(p), health: { mode: 'ok', reason: '', quarantined: false } }; }
    const legacy = storage.getItem(LEGACY_KEY) || storage.getItem(LEGACY_KEY_V5);
    if (legacy) { const m = migrateLegacy(JSON.parse(legacy)); m.settings.onboardingComplete = true; return { state: migrateV7(m), health: { mode: 'ok', reason: '', quarantined: false } }; }
  } catch { /* sin respaldo legible */ }
  return { state: defaultState(), health: { mode: 'ok', reason: '', quarantined: false } };
}

export function saveState(storage: Storage, state: State, health: Health): { ok: boolean; health: Health; reason?: string } {
  if (health.mode === 'recovery_required') return { ok: false, health, reason: 'recovery_required' };
  let serialized: string;
  try { serialized = JSON.stringify(state); } catch { return { ok: false, health: { mode: 'failed', reason: 'El estado no se puede serializar.', quarantined: false } }; }
  try {
    storage.setItem(STORAGE_KEY, serialized);
    if (storage.getItem(STORAGE_KEY) !== serialized) throw new Error('la relectura no coincide');
    return { ok: true, health: health.mode === 'failed' ? { mode: 'ok', reason: '', quarantined: false } : health };
  } catch (e: any) {
    return { ok: false, health: { mode: 'failed', reason: /quota/i.test(String(e && e.name) + String(e && e.message)) ? 'No queda espacio en el almacenamiento del navegador.' : 'El navegador rechazó la escritura.', quarantined: false } };
  }
}

// ---------------------------------------------------------------------------
// Libro mayor
// ---------------------------------------------------------------------------
export const accountById = (s: State, id: string) => s.accounts.find((a: any) => a.id === id);
export const accountName = (s: State, id: string) => (accountById(s, id) || {}).name || 'Cuenta archivada';
export const accountsByCurrency = (s: State, cur: string, includeArchived = false) => s.accounts.filter((a: any) => a.currency === cur && (includeArchived || !a.archived));

export function opEffectOnAccount(op: Op, accountId: string) {
  if (!op || op.voided) return 0;
  if (op.type === 'expense' && op.accountId === accountId) return -Math.abs(op.amountMinor || 0);
  if (op.type === 'income' && op.accountId === accountId) return Math.abs(op.amountMinor || 0);
  if (op.type === 'adjustment' && op.accountId === accountId) return Number(op.deltaMinor || 0);
  if (op.type === 'transfer') { if (op.fromAccountId === accountId) return -Math.abs(op.amountMinor || 0); if (op.toAccountId === accountId) return Math.abs(op.amountMinor || 0); }
  if (op.type === 'fx') { if (op.fromAccountId === accountId) return -Math.abs(op.fromAmountMinor || 0); if (op.toAccountId === accountId) return Math.abs(op.toAmountMinor || 0); }
  return 0;
}
export function balanceOf(s: State, a: Account) {
  if (!a) return 0;
  let t = Number(a.openingMinor || 0);
  for (const op of s.operations) t += opEffectOnAccount(op, a.id);
  return Math.round(t);
}
export function currencyTotals(s: State, cur: string) {
  return accountsByCurrency(s, cur).filter((a: any) => !a.archived).reduce((r: any, a: any) => {
    const b = balanceOf(s, a); r.total += b; if (a.kind === 'reserve') r.reserved += b; else r.available += b; return r;
  }, { total: 0, available: 0, reserved: 0 });
}
export function operationTouchesCurrency(op: Op, cur: string) {
  if (!op || op.voided) return false;
  if (op.type === 'fx') return op.fromCurrency === cur || op.toCurrency === cur;
  return op.currency === cur;
}
export const byDateDesc = (a: Op, b: Op) => +dateFromLocalIso(b.date) - +dateFromLocalIso(a.date);
export const operationsForCurrency = (s: State, cur: string) => s.operations.filter((op: Op) => operationTouchesCurrency(op, cur)).sort(byDateDesc);
export function operationsForAccount(s: State, id: string) {
  return s.operations.filter((op: Op) => (op.type === 'expense' || op.type === 'income' || op.type === 'adjustment') ? op.accountId === id : op.fromAccountId === id || op.toAccountId === id).sort(byDateDesc);
}
export const spendingOps = (s: State, cur: string, period?: string | null) => s.operations.filter((op: Op) => op.type === 'expense' && op.currency === cur && !op.voided && !op.excludedFromSpending && (!period || periodOf(op.date) === period));
export const incomeOps = (s: State, cur: string, period?: string | null) => s.operations.filter((op: Op) => op.type === 'income' && op.currency === cur && !op.voided && !op.excludedFromIncome && (!period || periodOf(op.date) === period));
export const sumMinor = (list: any[], field = 'amountMinor') => list.reduce((n, x) => n + Math.abs(Number(x[field] || 0)), 0);
export const budgetFor = (s: State, cur: string) => s.budgets[cur] || { monthlyMinor: 0, categories: {} };
export function ensureBudget(s: State, cur: string) { if (!s.budgets[cur]) s.budgets[cur] = { monthlyMinor: 0, categories: {} }; return s.budgets[cur]; }

export function operationDisplayAmount(op: Op, cur: string) {
  if (op.type === 'expense') return { minor: -Math.abs(op.amountMinor), currency: op.currency };
  if (op.type === 'income') return { minor: Math.abs(op.amountMinor), currency: op.currency };
  if (op.type === 'adjustment') return { minor: op.deltaMinor, currency: op.currency };
  if (op.type === 'transfer') return { minor: 0, currency: op.currency };
  if (op.type === 'fx') { if (cur === op.fromCurrency) return { minor: -Math.abs(op.fromAmountMinor), currency: op.fromCurrency }; return { minor: Math.abs(op.toAmountMinor), currency: op.toCurrency }; }
  return { minor: 0, currency: cur };
}
export function operationTitle(s: State, op: Op) {
  if (op.type === 'expense' || op.type === 'income') return op.concept || (op.type === 'expense' ? 'Gasto' : 'Ingreso');
  if (op.type === 'adjustment') return op.concept || 'Ajuste de saldo';
  if (op.type === 'transfer') return accountName(s, op.fromAccountId) + ' → ' + accountName(s, op.toAccountId);
  if (op.type === 'fx') return 'Cambio ' + op.fromCurrency + ' → ' + op.toCurrency;
  return 'Movimiento';
}

export function validateOperation(s: State, op: Op): string | null {
  if (!op || typeof op !== 'object') return 'La operación no es válida.';
  const type = op.type;
  if (['expense', 'income', 'transfer', 'fx', 'adjustment'].indexOf(type) === -1) return 'Tipo de movimiento desconocido.';
  if (type === 'fx') {
    if (!op.fromAccountId || !op.toAccountId) return 'Un cambio de divisa necesita cuenta de origen y de destino.';
    if (op.fromAccountId === op.toAccountId) return 'No se puede cambiar divisa dentro de la misma cuenta.';
    const from = accountById(s, op.fromAccountId), to = accountById(s, op.toAccountId);
    if (!from || !to) return 'Alguna de las cuentas no existe.';
    if (from.currency === to.currency) return 'Un cambio de divisa necesita dos monedas distintas.';
    if (!Number.isSafeInteger(Number(op.fromAmountMinor)) || Number(op.fromAmountMinor) <= 0) return 'El importe de salida no es válido.';
    if (!Number.isSafeInteger(Number(op.toAmountMinor)) || Number(op.toAmountMinor) <= 0) return 'El importe de entrada no es válido.';
    return null;
  }
  if (type === 'adjustment') {
    const d = Number(op.deltaMinor);
    if (!Number.isSafeInteger(d) || d === 0) return 'El ajuste no es válido.';
    const acc = accountById(s, op.accountId); if (!acc) return 'La cuenta no existe.';
    return null;
  }
  const amount = Number(op.amountMinor);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(amount)) return 'El importe no es un número válido.';
  if (amount <= 0) return 'El importe debe ser mayor que cero.';
  if (type === 'transfer') {
    if (!op.fromAccountId || !op.toAccountId) return 'Una transferencia necesita origen y destino.';
    if (op.fromAccountId === op.toAccountId) return 'No se puede transferir una cuenta a sí misma.';
    const from = accountById(s, op.fromAccountId), to = accountById(s, op.toAccountId);
    if (!from || !to) return 'Alguna de las cuentas no existe.';
    if (from.currency !== to.currency) return 'Las dos cuentas deben ser de la misma moneda. Para monedas distintas, usa un cambio de divisa.';
    if (op.currency && op.currency !== from.currency) return 'La moneda no coincide con la de las cuentas.';
    return null;
  }
  const account = accountById(s, op.accountId);
  if (!account) return 'La cuenta no existe.';
  if (op.currency && op.currency !== account.currency) return 'Un movimiento en ' + op.currency + ' no puede ir a una cuenta en ' + account.currency + '.';
  return null;
}

// ---------------------------------------------------------------------------
// Ánimo (modelo v8)
// ---------------------------------------------------------------------------
export const MOOD_VALID_MINUTES = 12 * 60;
export function normalizeMood(m: any) {
  if (!m) return null;
  if (m.valence != null) return { id: m.id || null, timestamp: m.timestamp || null, valence: clamp(Number(m.valence), 0, 100), energy: clamp(Number(m.energy), 0, 100), tension: clamp(Number(m.tension), 0, 100), tags: Array.isArray(m.tags) ? m.tags : [], note: m.note || '' };
  return { id: m.id || null, timestamp: m.timestamp || null, valence: clamp(Number(m.happiness || 7) * 10, 0, 100), energy: clamp((11 - Number(m.tiredness || 3)) * 10, 0, 100), tension: clamp(((Number(m.stress || 3) + Number(m.anxiety || 2)) / 2) * 10, 0, 100), tags: [], note: m.note || '' };
}
export const latestMoodCheckin = (s: State) => (s.moodCheckins || []).slice().sort((a: any, b: any) => +dateFromLocalIso(b.timestamp) - +dateFromLocalIso(a.timestamp))[0] || null;
export function moodIsFresh(s: State) {
  const m = latestMoodCheckin(s); if (!m || !m.timestamp) return false;
  const age = (Date.now() - dateFromLocalIso(m.timestamp).getTime()) / 60000;
  return Number.isFinite(age) && age >= 0 && age <= MOOD_VALID_MINUTES;
}
export function moodForNewOperation(s: State, dateIso?: string) {
  if (!moodIsFresh(s)) return null;
  const when = dateFromLocalIso(dateIso || nowIsoLocal()).getTime();
  if (!Number.isFinite(when)) return null;
  if (Math.abs(Date.now() - when) / 60000 > MOOD_VALID_MINUTES) return null;
  return Object.assign({}, s.lastMood);
}
export function moodContextForDate(s: State, iso: string) {
  const target = dateFromLocalIso(iso).getTime(); let best: any = null;
  for (const c of s.moodCheckins || []) { const t = dateFromLocalIso(c.timestamp).getTime(); if (t <= target && (!best || t > dateFromLocalIso(best.timestamp).getTime())) best = c; }
  return best ? normalizeMood(best) : null;
}
export const moodForOperation = (s: State, op: Op) => (op && op.mood ? normalizeMood(op.mood) : moodContextForDate(s, (op && op.date) || nowIsoLocal()));
export function moodDescriptor(m: any) {
  m = normalizeMood(m); if (!m) return 'Sin check-in';
  if (m.tension >= 72) return 'Tensión alta';
  if (m.valence >= 65 && m.energy >= 58) return 'Animado';
  if (m.valence >= 62 && m.energy < 50) return 'Tranquilo';
  if (m.valence < 40 && m.energy < 45) return 'Agotado';
  if (m.valence < 42 && m.energy >= 58) return 'Inquieto';
  if (m.tension <= 28 && m.valence >= 55) return 'Calmado';
  return 'Estado intermedio';
}

// ---------------------------------------------------------------------------
// Compromisos: deudas con cuotas y fijos mensuales
// ---------------------------------------------------------------------------
export const installmentsForDebt = (d: any) => (Array.isArray(d.installments) ? d.installments : []);
export const debtPaidMinor = (d: any) => installmentsForDebt(d).reduce((n: number, i: any) => n + Math.min(Number(i.paidMinor || 0), Number(i.amountMinor || 0)), 0);
export const debtRemainingMinor = (d: any) => Math.max(0, Number(d.totalMinor || 0) - debtPaidMinor(d));
export function debtStatus(d: any) {
  const rem = debtRemainingMinor(d); if (rem <= 0) return 'paid';
  const today = todayLocal();
  if (installmentsForDebt(d).some((i: any) => Number(i.paidMinor || 0) < Number(i.amountMinor || 0) && i.dueDate < today)) return 'overdue';
  return debtPaidMinor(d) > 0 ? 'partial' : 'pending';
}
export const debtsForCurrency = (s: State, cur: string) => (s.debts || []).filter((d: any) => d.currency === cur && !d.archived);
export function debtTotals(s: State, cur: string) {
  return debtsForCurrency(s, cur).reduce((r: any, d: any) => { const rem = debtRemainingMinor(d); if (d.direction === 'receivable') r.receivable += rem; else r.payable += rem; return r; }, { payable: 0, receivable: 0 });
}
export const nextPendingInstallment = (d: any) => installmentsForDebt(d).filter((i: any) => Number(i.paidMinor || 0) < Number(i.amountMinor || 0)).sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate))[0] || null;

export function createDebt(s: State, d: any) {
  const cur = d.currency; const total = toMinor(d.amount, cur); const count = clamp(Number(d.installments || 1), 1, 120);
  if (!total || !String(d.name || '').trim()) throw new Error('Completa nombre y monto');
  const first = d.dueDate || todayLocal(); const base = Math.floor(total / count); const remainder = total - base * count; const installments = [];
  for (let i = 0; i < count; i++) installments.push({ id: uid('inst'), dueDate: addMonthsISO(first, i), amountMinor: base + (i === count - 1 ? remainder : 0), paidMinor: 0, payments: [] });
  const debt = { id: uid('debt'), direction: d.direction === 'receivable' ? 'receivable' : 'payable', name: String(d.name).trim(), currency: cur, totalMinor: total, category: d.category || 'Otros', countAsFlow: d.countAsFlow !== false, notes: d.notes || '', createdAt: nowIsoLocal(), installments, archived: false };
  s.debts.push(debt);
  return debt;
}

export type Upcoming = { type: 'debt' | 'fixed'; id: string; installmentId?: string; date: string; label: string; amountMinor: number; direction: 'payable' | 'receivable'; status: 'overdue' | 'upcoming'; category?: string; fixedType?: string };
export function upcomingItems(s: State, cur: string, limit = 8): Upcoming[] {
  const items: Upcoming[] = []; const today = todayLocal();
  debtsForCurrency(s, cur).forEach((d: any) => installmentsForDebt(d).forEach((i: any) => {
    if (i.paidMinor >= i.amountMinor) return;
    items.push({ type: 'debt', id: d.id, installmentId: i.id, date: i.dueDate, label: d.name, amountMinor: i.amountMinor - (i.paidMinor || 0), direction: d.direction, status: i.dueDate < today ? 'overdue' : 'upcoming', category: d.category });
  }));
  s.fixed.filter((f: any) => f.currency === cur).forEach((f: any) => {
    const [y, m] = today.split('-').map(Number); const max = new Date(y, m, 0).getDate(); const day = Math.min(Number(f.day || 1), max);
    const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (f.paidPeriod !== currentPeriod()) items.push({ type: 'fixed', id: f.id, date, label: f.concept, amountMinor: f.amountMinor, direction: f.type === 'income' ? 'receivable' : 'payable', status: date < today ? 'overdue' : 'upcoming', category: f.category, fixedType: f.type });
  });
  return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Sugerencias del registro (historial + productos propios + catálogo)
// ---------------------------------------------------------------------------
export function catalogSuggestions(s: State, cur: string, type: string, query = '') {
  const q = normalizeText(query); const hist: any = {};
  operationsForCurrency(s, cur).forEach((op: Op) => {
    if (op.type !== type || !op.concept) return;
    const k = normalizeText(op.concept);
    if (!hist[k]) hist[k] = { category: op.category || '', concept: op.concept, amountMinor: op.amountMinor, count: 0, last: op.date, source: 'history', accountId: op.accountId };
    hist[k].count += 1;
  });
  const history = Object.values(hist).sort((a: any, b: any) => b.count - a.count || +dateFromLocalIso(b.last) - +dateFromLocalIso(a.last));
  const custom = (s.customProducts || []).filter((p: any) => !p.archived && p.currency === cur && p.type === type).map((p: any) => ({ category: p.category, concept: p.name, amountMinor: p.amountMinor || 0, count: 0, source: 'custom' }));
  const source = (type === 'income' ? CATALOG_INCOME[cur] || [] : CATALOG[cur] || []).map(([category, concept, amount]) => ({ category, concept, amountMinor: toMinor(amount, cur), count: 0, source: 'catalog' }));
  const merged: any[] = []; const seen = new Set();
  [...history, ...custom, ...source].forEach((x: any) => { const k = normalizeText(x.concept); if (seen.has(k)) return; if (q && !normalizeText(x.concept + ' ' + x.category).includes(q)) return; seen.add(k); merged.push(x); });
  return merged.slice(0, query ? 28 : 12);
}

// ---------------------------------------------------------------------------
// Integridad (igual que la v21)
// ---------------------------------------------------------------------------
export function walletIntegrity(s: State) {
  const issues: any[] = [];
  s.accounts.forEach((a: any) => { if (a.archived && Math.abs(balanceOf(s, a)) > 0) issues.push({ kind: 'archived_with_balance', account: a.name }); });
  const ids = new Set(s.accounts.map((a: any) => a.id));
  const orphans = s.operations.filter((o: Op) => { const r = [o.accountId, o.fromAccountId, o.toAccountId].filter(Boolean); return r.length && !r.every((x: string) => ids.has(x)); });
  if (orphans.length) issues.push({ kind: 'orphan_operations', count: orphans.length });
  return issues;
}

// Respaldo: mismas reglas que la v21.
export function validateBackup(parsed: any): string | null {
  if (!parsed || typeof parsed !== 'object') return 'El archivo no contiene un objeto.';
  if (!Array.isArray(parsed.accounts)) return 'El archivo no tiene una lista de cuentas.';
  if (parsed.operations !== undefined && !Array.isArray(parsed.operations)) return 'La lista de movimientos está dañada.';
  const ids = new Set();
  for (const a of parsed.accounts) {
    if (!a || typeof a !== 'object') return 'Hay una cuenta que no es un objeto.';
    if (!a.id || typeof a.id !== 'string') return 'Hay una cuenta sin identificador.';
    if (ids.has(a.id)) return 'Hay dos cuentas con el mismo identificador (' + a.id + ').';
    ids.add(a.id);
    if (!a.currency || typeof a.currency !== 'string') return 'La cuenta «' + (a.name || a.id) + '» no tiene moneda.';
    if (a.openingMinor !== undefined && !Number.isFinite(Number(a.openingMinor))) return 'La cuenta «' + (a.name || a.id) + '» tiene un saldo inicial inválido.';
  }
  let orphans = 0;
  for (const o of parsed.operations || []) {
    if (!o || typeof o !== 'object' || !o.id) return 'Hay un movimiento sin identificador.';
    if (o.amountMinor !== undefined && !Number.isFinite(Number(o.amountMinor))) return 'El movimiento «' + (o.concept || o.id) + '» tiene un importe inválido.';
    const refs = [o.accountId, o.fromAccountId, o.toAccountId].filter(Boolean);
    if (refs.length && !refs.every((r: string) => ids.has(r))) orphans += 1;
  }
  if (orphans) return orphans + ' movimientos apuntan a cuentas que no están en el archivo. El backup está incompleto.';
  return null;
}
export function stateFromBackup(parsed: any): { state?: State; error?: string } {
  if (parsed && Array.isArray(parsed.carteras)) return { state: migrateV7(migrateLegacy(parsed)) };
  const problem = validateBackup(parsed);
  if (problem) return { error: problem };
  return { state: String(parsed.version || '').startsWith('7') ? migrateV7(parsed) : repairState(parsed) };
}
