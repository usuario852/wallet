import crypto from 'node:crypto';
import { hset, DEVICES, storeReady } from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!storeReady) return res.status(503).json({ error: 'store_not_configured' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch (_) { return res.status(400).json({ error: 'json_malformado' }); }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'cuerpo_invalido' });

  // WAL-PUSH-004: una suscripción push tiene forma conocida. Antes bastaba con
  // que existiera `endpoint`, aunque no sirviera para enviar nada.
  const sub = body.subscription;
  if (!sub || typeof sub !== 'object') return res.status(400).json({ error: 'missing_subscription' });
  if (typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) {
    return res.status(400).json({ error: 'endpoint_invalido' });
  }
  if (!sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string' ||
      sub.keys.p256dh.length > 200 || sub.keys.auth.length > 100) {
    return res.status(400).json({ error: 'claves_invalidas' });
  }

  // WAL-PUSH-001/002: solo se guardan los campos que el cron usa, con tamaño
  // acotado. Antes se almacenaba cualquier objeto que mandara el cliente.
  const raw = body;
  const profile = {
    timezone: typeof raw.timezone === 'string' ? raw.timezone.slice(0, 64) : 'America/Lima',
    moodEnabled: raw.moodEnabled !== false,
    moodTimes: Array.isArray(raw.moodTimes) ? raw.moodTimes.filter((t) => typeof t === 'string').slice(0, 8) : [],
    debtEnabled: raw.debtEnabled !== false,
    debtReminders: Array.isArray(raw.debtReminders)
      ? raw.debtReminders.slice(0, 40).map((d) => ({
          id: String((d && d.id) || '').slice(0, 64),
          label: String((d && d.label) || '').slice(0, 80),
          dueDate: String((d && d.dueDate) || '').slice(0, 10),
          direction: d && d.direction === 'receivable' ? 'receivable' : 'payable'
        }))
      : [],
    weeklyReview: raw.weeklyReview !== false,
    skipRecentMinutes: Number.isFinite(Number(raw.skipRecentMinutes)) ? Math.min(1440, Math.max(0, Number(raw.skipRecentMinutes))) : 120,
    lastCheckinAt: typeof raw.lastCheckinAt === 'string' ? raw.lastCheckinAt.slice(0, 32) : null
  };
  if (JSON.stringify(profile).length > 20000) return res.status(413).json({ error: 'perfil_demasiado_grande' });

  const id = crypto.randomUUID();
  const secret = crypto.randomBytes(24).toString('base64url');
  const subscription = sub;
  await hset(DEVICES, id, { id, secret, subscription, profile, createdAt: Date.now(), sent: {} });
  return res.status(200).json({ id, secret });
}
