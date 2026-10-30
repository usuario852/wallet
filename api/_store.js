// Minimal Redis-over-REST helper. Works with Vercel KV and with Upstash, which
// expose the same two environment variables.
const URL_BASE = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const storeReady = Boolean(URL_BASE && TOKEN);

async function command(args) {
  if (!storeReady) throw new Error('store_not_configured');
  // WAL-PUSH-010: si el almacén deja de responder, la petición debe cortarse en
  // vez de mantener viva la función hasta que la mate la plataforma.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(URL_BASE, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: controller.signal
    });
    if (!response.ok) throw new Error('store_error_' + response.status);
    const data = await response.json();
    return data.result;
  } finally { clearTimeout(timer); }
}

export const hset = (key, field, value) => command(['HSET', key, field, JSON.stringify(value)]);
export const hget = async (key, field) => {
  const raw = await command(['HGET', key, field]);
  if (!raw) return null;
  // WAL-PUSH-011: un registro corrupto no es lo mismo que uno inexistente.
  try { return JSON.parse(raw); }
  catch (_) { throw new Error('store_corrupt_record'); }
};
export const hdel = (key, field) => command(['HDEL', key, field]);
export const hgetall = async (key) => {
  const raw = await command(['HGETALL', key]);
  const out = {};
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length; i += 2) {
      try { out[raw[i]] = JSON.parse(raw[i + 1]); } catch (_) {}
    }
  } else if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([k, v]) => { try { out[k] = JSON.parse(v); } catch (_) {} });
  }
  return out;
};
export const DEVICES = 'wallet:devices';
