// Búsqueda de instrumentos por nombre.
// «apple» → AAPL, «bitcoin» → BTC, «vanguard s&p» → VOO.
// Yahoo Finance para acciones, ETFs e índices; CoinGecko para cripto. Ninguna
// de las dos pide clave. El navegador no puede llamarlas por CORS, por eso se
// consultan aquí.

const timeout = (ms) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
};

async function yahoo(query) {
  const url = 'https://query2.finance.yahoo.com/v1/finance/search?q=' + encodeURIComponent(query) +
    '&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=true';
  const response = await fetch(url, {
    signal: timeout(6000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WalletPersonal/1.0)', Accept: 'application/json' }
  });
  if (!response.ok) throw new Error('http_' + response.status);
  const data = await response.json();
  const quotes = (data && data.quotes) || [];
  return quotes
    .filter((q) => q.symbol && ['EQUITY', 'ETF', 'INDEX', 'MUTUALFUND'].includes(q.quoteType))
    .map((q) => ({
      id: String(q.symbol).toLowerCase(),
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      exchange: q.exchDisp || q.exchange || '',
      kind: q.quoteType === 'ETF' ? 'etf' : q.quoteType === 'INDEX' ? 'indice' : 'accion',
      provider: 'stooq'
    }))
    .slice(0, 8);
}

async function coingecko(query) {
  const response = await fetch('https://api.coingecko.com/api/v3/search?query=' + encodeURIComponent(query), {
    signal: timeout(6000),
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error('http_' + response.status);
  const data = await response.json();
  return ((data && data.coins) || []).slice(0, 6).map((c) => ({
    id: c.id,
    symbol: String(c.symbol || '').toUpperCase(),
    name: c.name,
    exchange: 'Cripto',
    kind: 'cripto',
    provider: 'coingecko',
    image: c.thumb || ''
  }));
}

export default async function handler(req, res) {
  const query = String((req.query && req.query.q) || '').trim();
  if (query.length < 2) return res.status(400).json({ error: 'consulta_corta' });
  // WAL-SYM-003: acotar la longitud de la consulta.
  if (query.length > 64) return res.status(400).json({ error: 'consulta_demasiado_larga' });

  const settled = await Promise.allSettled([yahoo(query), coingecko(query)]);
  const results = [];
  const failed = [];
  ['yahoo', 'coingecko'].forEach((name, i) => {
    if (settled[i].status === 'fulfilled') results.push(...settled[i].value);
    else failed.push(name);
  });

  // WAL-SYM-001/002: «no hay coincidencias» no es un error del servidor, y hay
  // que poder distinguirlo de «los proveedores se cayeron».
  if (!results.length) {
    if (failed.length === 2) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ error: 'proveedores_caidos', failed, results: [] });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=3600');
    return res.status(200).json({ query, results: [], failed });
  }
  // Coincidencia exacta de símbolo primero; luego acciones y ETFs, y la cripto
  // detrás, que suele tener homónimos de todo tipo.
  const q = query.toLowerCase();
  const rank = (item) => (item.symbol.toLowerCase() === q ? 0 : item.kind === 'cripto' ? 2 : 1);
  results.sort((a, b) => rank(a) - rank(b));

  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({ query, results: results.slice(0, 10), failed });
}
