import { hget, hset, hdel, DEVICES, storeReady } from './_store.js';

export default async function handler(req, res) {
  // WAL-PUSH-006: comprobar el método antes de intentar leer el cuerpo.
  if (req.method !== 'PUT' && req.method !== 'DELETE') return res.status(405).json({ error: 'method_not_allowed' });
  if (!storeReady) return res.status(503).json({ error: 'store_not_configured' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch (_) { return res.status(400).json({ error: 'json_malformado' }); }
  const { id, secret, ...profile } = body;
  if (!id || !secret) return res.status(400).json({ error: 'missing_credentials' });

  const device = await hget(DEVICES, id);
  if (!device || device.secret !== secret) return res.status(403).json({ error: 'forbidden' });

  if (req.method === 'DELETE') {
    await hdel(DEVICES, id);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'PUT') {
    device.profile = profile;
    device.updatedAt = Date.now();
    await hset(DEVICES, id, device);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'method_not_allowed' });
}
