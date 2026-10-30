// Noticias — lectura, clasificación y orden por relevancia.
//
// El problema de la primera versión: RPP y Gestión publican de todo, así que
// una nota del US Open acababa en «Perú» y una pelea de boxeo en «Economía
// peruana». Aquí cada titular se clasifica por su contenido, no por quién lo
// publica, y se le calcula una relevancia. Nada de esto necesita API key.

const FEEDS = [
  // Perú, generalistas
  { url: 'https://rpp.pe/feed', source: 'RPP', local: true },
  { url: 'https://www.infobae.com/feeds/rss/america/peru/', source: 'Infobae Perú', local: true },
  { url: 'https://larepublica.pe/rss/politica', source: 'La República', local: true },
  { url: 'https://andina.pe/agencia/seccion-economia.aspx?rss=1', source: 'Andina', local: true, bias: 'economia' },
  { url: 'https://news.google.com/rss?hl=es-419&gl=PE&ceid=PE:es-419', source: 'Google News Perú', local: true },
  // Economía y negocios
  { url: 'https://gestion.pe/arcio/rss/', source: 'Gestión', local: true, bias: 'economia' },
  { url: 'https://elcomercio.pe/arcio/rss/category/economia/', source: 'El Comercio', local: true, bias: 'economia' },
  { url: 'https://news.google.com/rss/search?q=BCRP+OR+%22tipo+de+cambio%22+OR+%22inflaci%C3%B3n+Per%C3%BA%22+OR+%22econom%C3%ADa+peruana%22&hl=es-419&gl=PE&ceid=PE:es-419', source: 'Google News', local: true, bias: 'economia' },
  // Mundo
  { url: 'https://feeds.bbci.co.uk/mundo/rss.xml', source: 'BBC Mundo', bias: 'mundo' },
  { url: 'https://rss.dw.com/rdf/rss-sp-all', source: 'DW', bias: 'mundo' },
  { url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=es-419&gl=PE&ceid=PE:es-419', source: 'Google News', bias: 'mundo' },
  // Mercados
  { url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=es-419&gl=PE&ceid=PE:es-419', source: 'Google News', bias: 'mercados' },
  { url: 'https://news.google.com/rss/search?q=%22Reserva+Federal%22+OR+%22Wall+Street%22+OR+%22mercados+burs%C3%A1tiles%22+OR+%22tasas+de+inter%C3%A9s%22&hl=es-419&gl=PE&ceid=PE:es-419', source: 'Google News', bias: 'mercados' }
];

// --- léxicos ------------------------------------------------------------------
const L = {
  economia: ['bcrp', 'banco central', 'inflacion', 'tipo de cambio', 'sunat', 'sunafil', 'pbi', 'economia', 'economica', 'economico', 'impuesto', 'tributar', 'mef', 'presupuesto publico', 'credito', 'banca', 'bancos', 'inversion', 'mineria', 'exportacion', 'exportaciones', 'canasta', 'precios', 'sueldo minimo', 'remuneracion', 'afp', 'onp', 'empleo', 'informalidad', 'recaudacion', 'dolar', 'sol peruano', 'indecopi', 'consumidor', 'tarifas', 'peaje', 'combustible', 'gas natural', 'fraude digital', 'estafa', 'banco de la nacion', 'interbank', 'yape', 'plin'],
  mercados: ['wall street', 's&p', 'nasdaq', 'dow jones', 'bolsa', 'bursatil', 'acciones', 'bitcoin', 'cripto', 'criptomoneda', 'ethereum', 'reserva federal', 'la fed', 'bce', 'commodities', 'petroleo', 'barril', 'oro', 'cobre', 'bonos', 'rendimiento', 'tasa de interes', 'wti', 'brent', 'etf', 'inversionistas', 'indices'],
  deportes: ['gol', 'goles', 'futbol', 'alianza lima', 'universitario', 'sporting cristal', 'liga 1', 'torneo clausura', 'torneo apertura', 'clasico', 'seleccion peruana', 'mundial', 'us open', 'nba', 'boxeo', 'pelea', 'dazn', 'partido', 'tenis', 'liga mx', 'real madrid', 'barcelona', 'champions', 'hinchas', 'banderazo', 'entrenador', 'titularidad', 'copa', 'atletismo', 'voley'],
  espectaculos: ['cantante', 'actriz', 'actor', 'farandula', 'concierto', 'pelicula', 'serie', 'estreno', 'reality', 'influencer', 'tiktok', 'instagram', 'celine dion', 'chollywood', 'magaly', 'espectaculos', 'premios', 'festival'],
  tecnologia: ['inteligencia artificial', 'openai', 'anthropic', 'chatgpt', 'startup', 'software', 'chip', 'semiconductor', 'ciberseguridad', 'datos personales', 'algoritmo', 'robot'],
  politica: ['congreso', 'presidenta', 'presidente', 'ministro', 'ministra', 'elecciones', 'jne', 'onpe', 'fiscalia', 'poder judicial', 'proyecto de ley', 'gabinete', 'censura', 'alcalde', 'gobernador']
};

const PERU = ['peru', 'peruano', 'peruana', 'peruanos', 'lima', 'callao', 'arequipa', 'cusco', 'trujillo', 'piura', 'chiclayo', 'iquitos', 'huancayo', 'tacna', 'puno', 'cajamarca', 'ancash', 'ayacucho', 'loreto', 'bcrp', 'sunat', 'mef', 'indecopi', 'osiptel', 'jne', 'onpe', 'minsa', 'essalud', 'reniec', 'sunarp', 'sutran', 'sol peruano', 'machu picchu'];
const EXTERIOR = ['mexico', 'espana', 'argentina', 'colombia', 'chile', 'venezuela', 'ecuador', 'bolivia', 'brasil', 'estados unidos', 'eeuu', 'washington', 'madrid', 'buenos aires', 'liga mx', 'club america', 'cruz azul', 'laliga', 'premier league', 'gaza', 'ucrania', 'israel', 'rusia', 'china', 'trump', 'milei'];

const norm = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9ñ ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function hits(text, list) {
  let n = 0;
  const found = [];
  list.forEach((term) => { if (text.includes(term)) { n += term.indexOf(' ') !== -1 ? 2 : 1; found.push(term); } });
  return { n, found };
}

// --- lectura de feeds ---------------------------------------------------------
const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

const tag = (block, name) => {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'));
  return m ? decode(m[1]) : '';
};

function imageOf(block) {
  const patterns = [
    /<media:content[^>]+url="([^"]+)"/i,
    /<media:thumbnail[^>]+url="([^"]+)"/i,
    /<enclosure[^>]+url="([^"]+)"[^>]*type="image/i,
    /<enclosure[^>]+type="image[^"]*"[^>]*url="([^"]+)"/i,
    /&lt;img[^&]*src=&quot;([^&"]+)/i,
    /<img[^>]+src="([^"]+)"/i
  ];
  for (const re of patterns) {
    const m = block.match(re);
    if (m && /^https?:\/\//i.test(m[1]) && !/\.(gif|svg)(\?|$)/i.test(m[1])) return m[1].replace(/&amp;/g, '&');
  }
  return '';
}

function parseFeed(xml, feed) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 18).map((block) => {
    let link = tag(block, 'link');
    if (!link) {
      const href = block.match(/<link[^>]*href="([^"]+)"/i);
      link = href ? href[1] : '';
    }
    let title = tag(block, 'title');
    const dash = title.lastIndexOf(' - ');
    const outlet = tag(block, 'source') || (dash > 20 ? title.slice(dash + 3) : '') || feed.source;
    if (dash > 20 && !tag(block, 'source')) title = title.slice(0, dash);
    return {
      title,
      source: outlet,
      link,
      image: imageOf(block),
      publishedAt: tag(block, 'pubDate') || tag(block, 'updated') || tag(block, 'published') || '',
      summary: (tag(block, 'description') || tag(block, 'summary') || '').slice(0, 200),
      feedLocal: !!feed.local,
      feedBias: feed.bias || ''
    };
  }).filter((x) => x.title && /^https?:\/\//i.test(x.link));
}

async function readFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WalletPersonal/1.0)', Accept: 'application/rss+xml, application/xml, text/xml, */*' }
    });
    if (!response.ok) return [];
    return parseFeed(await response.text(), feed);
  } catch (_) { return []; }
  finally { clearTimeout(timer); }
}

// --- clasificación ------------------------------------------------------------
function classify(item) {
  const text = norm(item.title + ' ' + item.summary);
  const scores = {};
  const tags = [];
  Object.keys(L).forEach((topic) => {
    const r = hits(text, L[topic]);
    scores[topic] = r.n;
    r.found.slice(0, 2).forEach((t) => tags.push(t));
  });

  const peru = hits(text, PERU);
  const exterior = hits(text, EXTERIOR);
  // Que lo publique un medio peruano no lo convierte en una noticia del Perú.
  const isLocal = peru.n > 0 || (item.feedLocal && exterior.n === 0 && scores.deportes === 0 && scores.espectaculos === 0);

  let topic;
  if (scores.deportes >= 2 || (scores.deportes > 0 && scores.deportes >= scores.economia)) topic = 'otros';
  else if (scores.espectaculos >= 2) topic = 'otros';
  else if (scores.mercados >= 2 && scores.mercados >= scores.economia) topic = 'mercados';
  else if (scores.economia >= 2) topic = isLocal ? 'economia' : 'mercados';
  else if (scores.politica >= 2 && isLocal) topic = 'peru';
  else if (scores.tecnologia >= 2) topic = isLocal ? 'peru' : 'mundo';
  else if (isLocal) topic = 'peru';
  else topic = 'mundo';

  // El sesgo del feed solo confirma, nunca impone: por eso Gestión deja de meter
  // boxeo en economía.
  if (item.feedBias === 'economia' && topic === 'peru' && scores.economia > 0) topic = 'economia';

  return { topic, isLocal, tags: [...new Set(tags)].slice(0, 6), scores };
}

function relevance(item, meta) {
  // WAL-NEWS-005: una fecha que no se puede interpretar daba NaN, y NaN se
  // propagaba a toda la puntuación dejando el titular sin orden.
  const parsed = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
  const ageHours = Number.isFinite(parsed) ? Math.max(0, (Date.now() - parsed) / 3600000) : 12;
  let score = 100;
  score -= Math.min(60, ageHours * 2.2);            // lo de anteayer ya no es noticia
  if (meta.isLocal) score += 12;
  if (meta.topic === 'economia' || meta.topic === 'mercados') score += 16;
  if (meta.topic === 'otros') score -= 25;
  score += Math.min(12, (meta.scores.economia + meta.scores.mercados) * 2);
  if (item.image) score += 4;
  // Teletipo de programación, no noticia.
  if (/en vivo|d[oó]nde ver|a qu[eé] hora|gratis por|qu[eé] canal/i.test(item.title)) score -= 35;
  if (item.title.length < 30) score -= 6;
  return Number.isFinite(score) ? Math.round(score) : 0;
}

function fingerprint(title) {
  return norm(title).split(' ').filter(Boolean).slice(0, 7).join(' ');
}

export default async function handler(req, res) {
  const lists = await Promise.all(FEEDS.map(readFeed));
  const seen = new Set();
  const all = [];

  [].concat(...lists).forEach((item) => {
    const key = fingerprint(item.title);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const meta = classify(item);
    all.push({
      title: item.title,
      source: item.source,
      link: item.link,
      image: item.image || '',
      publishedAt: item.publishedAt,
      topic: meta.topic,
      local: meta.isLocal,
      tags: meta.tags,
      score: relevance(item, meta)
    });
  });

  const topics = {};
  ['economia', 'peru', 'mercados', 'mundo', 'otros'].forEach((topic) => {
    topics[topic] = all.filter((x) => x.topic === topic).sort((a, b) => b.score - a.score).slice(0, 10);
  });

  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res.status(all.length ? 200 : 502).json({ at: Date.now(), topics, total: all.length });
}

export const _internals = { classify, relevance, parseFeed, imageOf, fingerprint, norm, FEEDS };
