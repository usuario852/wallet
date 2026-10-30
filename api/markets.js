// Mercados y macro — agregador de fuentes abiertas.
// Ninguna necesita API key:
//   · open.er-api.com  → tipo de cambio (incluye el sol)
//   · BCRP             → tasa de referencia, inflación y tipo de cambio oficial
//   · Stooq            → índices y materias primas, en CSV
//   · CoinGecko        → bitcoin
//   · Banco Mundial    → PBI, inflación anual y desempleo de Perú
// Lo que falle se omite; lo que responda se devuelve. El CDN cachea 15 minutos.

// WAL-MKT-007: el temporizador quedaba vivo aunque la petición terminara antes,
// manteniendo la función despierta sin necesidad.
const withTimeout = (ms) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
};

async function getJson(url, ms = 6000) {
  const t = withTimeout(ms);
  try {
    const response = await fetch(url, { signal: t.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('http_' + response.status);
    return await response.json();
  } finally { t.done(); }
}

async function getText(url, ms = 6000) {
  const t = withTimeout(ms);
  try {
    const response = await fetch(url, { signal: t.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WalletPersonal/1.0)' } });
    if (!response.ok) throw new Error('http_' + response.status);
    return await response.text();
  } finally { t.done(); }
}

const number = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Formato español escrito a mano: no todos los entornos de Node traen el ICU
// completo, y con el fallback un tipo de cambio salía como "3.7421".
const es = (value, decimals = 2) => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const fixed = Math.abs(Number(value)).toFixed(decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (Number(value) < 0 ? '-' : '') + grouped + (fraction ? ',' + fraction : '');
};

const pctText = (value) => (value == null ? '' : (value > 0 ? '+' : '') + value.toFixed(2).replace('.', ',') + '%');

// --- Tipo de cambio -----------------------------------------------------------
async function fx() {
  const data = await getJson('https://open.er-api.com/v6/latest/USD');
  const rates = data && data.rates;
  if (!rates || !rates.PEN) throw new Error('sin_datos');
  const items = [
    { id: 'usdpen', group: 'divisas', label: 'USD/PEN', value: es(rates.PEN, 4), raw: rates.PEN, note: 'Dólar frente al sol' }
  ];
  if (rates.EUR) items.push({ id: 'eurpen', group: 'divisas', label: 'EUR/PEN', value: es(rates.PEN / rates.EUR, 3), raw: rates.PEN / rates.EUR, note: 'Euro frente al sol' });
  if (rates.BRL) items.push({ id: 'usdbrl', group: 'divisas', label: 'USD/BRL', value: es(rates.BRL, 3), raw: rates.BRL, note: 'Real brasileño' });
  if (rates.CLP) items.push({ id: 'usdclp', group: 'divisas', label: 'USD/CLP', value: es(rates.CLP, 1), raw: rates.CLP, note: 'Peso chileno' });
  return items;
}

// --- BCRP ---------------------------------------------------------------------
// Cada serie se pide por separado para que una caída no arrastre a las demás.
const BCRP_SERIES = [
  { code: 'PD04722MD', id: 'tasa', label: 'Tasa BCRP', decimals: 2, suffix: '%', note: 'Tasa de referencia de política monetaria' },
  { code: 'PN01270PM', id: 'inflacion', label: 'Inflación 12m', decimals: 2, suffix: '%', note: 'Variación anual del IPC de Lima' },
  { code: 'PD04640PD', id: 'tcventa', label: 'TC venta', decimals: 3, suffix: '', note: 'Tipo de cambio interbancario de venta' }
];

async function bcrpSeries(series) {
  const end = new Date();
  const start = new Date(end.getTime() - 200 * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);
  const url = 'https://estadisticas.bcrp.gob.pe/estadisticas/series/api/' + series.code + '/json/' + iso(start) + '/' + iso(end) + '/esp';
  const data = await getJson(url, 7000);
  const periods = (data && data.periods) || [];
  const clean = periods
    .map((p) => ({ name: p.name, value: number(String((p.values || [])[0]).replace(',', '.')) }))
    .filter((p) => p.value != null);
  if (!clean.length) throw new Error('serie_vacia');
  const last = clean[clean.length - 1];
  const previous = clean.length > 1 ? clean[clean.length - 2] : null;
  const change = previous && previous.value ? last.value - previous.value : null;
  return {
    id: series.id,
    group: 'macro',
    label: series.label,
    value: es(last.value, series.decimals) + series.suffix,
    raw: last.value,
    change: change == null || Math.abs(change) < 0.0005 ? '' : (change > 0 ? '+' : '') + es(change, series.decimals),
    note: series.note + ' · ' + last.name,
    history: clean.slice(-24).map((p) => p.value)
  };
}

async function bcrp() {
  const settled = await Promise.allSettled(BCRP_SERIES.map(bcrpSeries));
  return settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
}

// --- Índices y materias primas (Stooq, CSV) -----------------------------------
const STOOQ = [
  { symbol: '^spx', id: 'spx', label: 'S&P 500', decimals: 2, note: 'Bolsa de Estados Unidos' },
  { symbol: '^ndq', id: 'ndx', label: 'Nasdaq 100', decimals: 2, note: 'Tecnológicas de Estados Unidos' },
  { symbol: 'gc.f', id: 'oro', label: 'Oro', decimals: 1, prefix: 'US$ ', note: 'Onza troy' },
  { symbol: 'cl.f', id: 'petroleo', label: 'Petróleo', decimals: 2, prefix: 'US$ ', note: 'Barril WTI' },
  { symbol: 'hg.f', id: 'cobre', label: 'Cobre', decimals: 3, prefix: 'US$ ', note: 'Libra — principal exportación del Perú' }
];

async function stooq() {
  const symbols = STOOQ.map((s) => s.symbol).join(',');
  const csv = await getText('https://stooq.com/q/l/?s=' + encodeURIComponent(symbols) + '&f=sd2t2ohlcv&h&e=csv', 7000);
  const lines = csv.trim().split('\n').slice(1);
  const items = [];
  lines.forEach((line) => {
    const cells = line.split(',');
    const symbol = String(cells[0] || '').toLowerCase();
    const config = STOOQ.find((s) => s.symbol === symbol);
    if (!config) return;
    const open = number(cells[3]);
    const close = number(cells[6]);
    if (close == null) return;
    const change = open ? ((close - open) / open) * 100 : null;
    items.push({
      id: config.id,
      group: 'mercados',
      label: config.label,
      value: (config.prefix || '') + es(close, config.decimals),
      raw: close,
      change: pctText(change),
      note: config.note
    });
  });
  return items;
}

// --- Bitcoin ------------------------------------------------------------------
async function crypto() {
  const data = await getJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
  const btc = data && data.bitcoin;
  if (!btc || btc.usd == null) throw new Error('sin_datos');
  return [{
    id: 'btc', group: 'mercados', label: 'Bitcoin',
    value: 'US$ ' + es(btc.usd, 0), raw: btc.usd,
    change: pctText(number(btc.usd_24h_change)), note: 'Últimas 24 horas'
  }];
}

// --- Banco Mundial: contexto anual del país -----------------------------------
const WORLD_BANK = [
  { indicator: 'NY.GDP.MKTP.KD.ZG', id: 'pbi', label: 'PBI Perú', suffix: '%', note: 'Crecimiento anual' },
  { indicator: 'FP.CPI.TOTL.ZG', id: 'ipc_anual', label: 'Inflación anual', suffix: '%', note: 'Promedio del año' },
  { indicator: 'SL.UEM.TOTL.ZS', id: 'desempleo', label: 'Desempleo', suffix: '%', note: 'Población activa' }
];

async function worldBank() {
  const settled = await Promise.allSettled(WORLD_BANK.map(async (config) => {
    const data = await getJson('https://api.worldbank.org/v2/country/PE/indicator/' + config.indicator + '?format=json&per_page=6&mrnev=1');
    const rows = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
    const row = rows.find((r) => r && r.value != null);
    if (!row) throw new Error('sin_datos');
    return {
      id: config.id, group: 'pais', label: config.label,
      value: es(row.value, 1) + config.suffix, raw: row.value,
      change: '', note: config.note + ' · ' + row.date
    };
  }));
  return settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
}


// --- Estados Unidos: FRED -----------------------------------------------------
// Necesita una clave gratuita (https://fred.stlouisfed.org/docs/api/api_key.html)
// en la variable de entorno FRED_API_KEY. Sin ella, este bloque simplemente no
// aparece; nada más se ve afectado.
const FRED_SERIES = [
  { id: 'fed', code: 'DFF', label: 'Tasa Fed', suffix: '%', decimals: 2, note: 'Tasa efectiva de fondos federales' },
  { id: 'us_cpi', code: 'CPIAUCSL', label: 'Inflación EE.UU.', suffix: '%', decimals: 1, yoy: true, note: 'IPC, variación anual' },
  { id: 'us_unemp', code: 'UNRATE', label: 'Desempleo EE.UU.', suffix: '%', decimals: 1, note: 'Tasa de desempleo' },
  { id: 'us_10y', code: 'DGS10', label: 'Bono 10 años', suffix: '%', decimals: 2, note: 'Rendimiento del Tesoro a 10 años' }
];

async function fredSeries(series, key) {
  const url = 'https://api.stlouisfed.org/fred/series/observations?series_id=' + series.code +
    '&api_key=' + key + '&file_type=json&sort_order=desc&limit=' + (series.yoy ? 14 : 3);
  const data = await getJson(url, 7000);
  const obs = ((data && data.observations) || []).filter((o) => o.value && o.value !== '.');
  if (!obs.length) throw new Error('serie_vacia');
  const last = Number(obs[0].value);
  let value = last;
  let change = null;
  if (series.yoy) {
    const yearAgo = obs.find((o, i) => i >= 11);
    if (!yearAgo) throw new Error('sin_interanual');
    value = ((last - Number(yearAgo.value)) / Number(yearAgo.value)) * 100;
    const prevObs = obs[1] ? Number(obs[1].value) : null;
    const prevYear = obs[12] ? Number(obs[12].value) : null;
    if (prevObs && prevYear) change = value - ((prevObs - prevYear) / prevYear) * 100;
  } else if (obs[1]) {
    change = last - Number(obs[1].value);
  }
  return {
    id: series.id, group: 'eeuu', label: series.label,
    value: es(value, series.decimals) + series.suffix, raw: value,
    change: change == null || Math.abs(change) < 0.005 ? '' : (change > 0 ? '+' : '') + es(change, series.decimals),
    note: series.note + ' · ' + obs[0].date
  };
}

async function fred() {
  const key = process.env.FRED_API_KEY;
  if (!key) return [];
  const settled = await Promise.allSettled(FRED_SERIES.map((s) => fredSeries(s, key)));
  return settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
}

// --- Lista de seguimiento -----------------------------------------------------
// El cliente manda ?watch=aapl.us,voo.us,bitcoin  (stooq para bolsa, coingecko
// para cripto: se distinguen porque los de bolsa llevan punto).
async function watchlist(spec) {
  const ids = String(spec || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 20);
  if (!ids.length) return [];
  const market = ids.filter((id) => id.indexOf('.') !== -1 || id.charAt(0) === '^');
  const coins = ids.filter((id) => market.indexOf(id) === -1);
  const items = [];

  if (market.length) {
    try {
      const csv = await getText('https://stooq.com/q/l/?s=' + encodeURIComponent(market.join(',')) + '&f=sd2t2ohlcnv&h&e=csv', 8000);
      csv.trim().split('\n').slice(1).forEach((line) => {
        const cells = line.split(',');
        const symbol = String(cells[0] || '').toLowerCase();
        const open = number(cells[3]);
        const close = number(cells[6]);
        const name = cells[7] && cells[7] !== 'N/D' ? cells[7] : '';
        if (close == null) return;
        const change = open ? ((close - open) / open) * 100 : null;
        items.push({
          id: symbol, group: 'seguimiento',
          label: (name || symbol.replace(/\.us$/, '').toUpperCase()).slice(0, 22),
          value: 'US$ ' + es(close, close > 1000 ? 0 : 2), raw: close,
          change: pctText(change), note: symbol.toUpperCase()
        });
      });
    } catch (_) {}
  }

  if (coins.length) {
    try {
      const data = await getJson('https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(coins.join(',')) +
        '&vs_currencies=usd&include_24hr_change=true', 7000);
      coins.forEach((id) => {
        const row = data && data[id];
        if (!row || row.usd == null) return;
        items.push({
          id, group: 'seguimiento',
          label: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
          value: 'US$ ' + es(row.usd, row.usd > 1000 ? 0 : row.usd > 1 ? 2 : 4), raw: row.usd,
          change: pctText(number(row.usd_24h_change)), note: 'Últimas 24 horas'
        });
      });
    } catch (_) {}
  }
  return items;
}

export const _internals = { es, pctText, number, STOOQ, BCRP_SERIES, FRED_SERIES, watchlist };

export default async function handler(req, res) {
  const watch = (req.query && req.query.watch) || '';
  const settled = await Promise.allSettled([fx(), bcrp(), stooq(), crypto(), worldBank(), fred(), watchlist(watch)]);
  const items = [];
  const failed = [];
  const names = ['divisas', 'bcrp', 'mercados', 'cripto', 'banco mundial', 'fred', 'seguimiento'];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') items.push(...result.value);
    else failed.push(names[i]);
  });

  if (!items.length) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'sin_fuentes', failed });
  }
  // La lista de seguimiento cambia por usuario, así que esa respuesta no se
  // comparte en el CDN; el resto sí.
  res.setHeader('Cache-Control', watch ? 'private, max-age=300' : 'public, s-maxage=900, stale-while-revalidate=7200');
  return res.status(200).json({ at: Date.now(), items, failed, fred: !!process.env.FRED_API_KEY });
}
