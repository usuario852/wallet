import webpush from 'web-push';
import { hgetall, hset, hdel, DEVICES, storeReady } from './_store.js';

// Runs every 15 minutes (see vercel.json). For each registered device it works
// out the local time in that device's timezone and decides what, if anything,
// is due right now. Nothing financial is stored here: only reminder metadata.

function localParts(timezone) {
  // WAL-NOTIF-006: una zona horaria inválida hace que Intl lance. Si eso ocurre
  // dentro del bucle, un solo dispositivo mal configurado deja sin avisos a
  // todos los demás.
  let zone = timezone || 'America/Lima';
  try { new Intl.DateTimeFormat('en-CA', { timeZone: zone }); }
  catch (_) { zone = 'America/Lima'; }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short'
  });
  const parts = {};
  formatter.formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: parts.weekday
  };
}

// WAL-NOTIF-005: «99:99» no es una hora. Antes se aceptaba y producía un
// minuto del día imposible que nunca coincidía con nada.
function toMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

// WAL-NOTIF-004: la distancia entre minutos del día es circular. Con resta
// absoluta, las 23:58 y las 00:02 quedan a 1436 minutos en vez de a 4, así que
// un aviso de medianoche no se disparaba nunca.
function minutesApart(a, b) {
  const diff = Math.abs(a - b) % 1440;
  return Math.min(diff, 1440 - diff);
}

function dueMessages(profile, now) {
  const out = [];
  // WAL-NOTIF-001: el algoritmo asumía un cron cada 15 minutos, pero el plan
  // Hobby solo permite uno diario. Si la ventana no acompaña a la cadencia real,
  // ningún aviso coincide nunca. Se configura con CRON_WINDOW_MINUTES.
  const window = Math.max(1, Math.min(720, Number(process.env.CRON_WINDOW_MINUTES) || 8));

  if (profile.moodEnabled !== false) {
    (profile.moodTimes || []).forEach((time) => {
      const minutes = toMinutes(time);
      if (minutes === null || minutesApart(minutes, now.minutes) > window) return;
      const skip = Number(profile.skipRecentMinutes || 120);
      if (profile.lastCheckinAt) {
        const age = (Date.now() - new Date(profile.lastCheckinAt).getTime()) / 60000;
        if (age < skip) return;
      }
      out.push({
        key: `mood:${now.date}:${time}`,
        title: '¿Cómo estás ahora?',
        body: 'Un check-in rápido para dar contexto a tu día.',
        url: './?action=checkin'
      });
    });
  }

  if (profile.debtEnabled !== false) {
    (profile.debtReminders || []).forEach((reminder) => {
      if (minutesApart(now.minutes, 9 * 60) > window) return;
      const due = String(reminder.dueDate || '');
      const today = now.date;
      const tomorrow = new Date(new Date(today + 'T12:00:00').getTime() + 86400000).toISOString().slice(0, 10);
      const when = due === today ? 'hoy' : due === tomorrow ? 'mañana' : null;
      if (!when) return;
      out.push({
        key: `debt:${reminder.id}:${due}`,
        title: reminder.direction === 'receivable' ? `Cobro ${when}: ${reminder.label}` : `Pago ${when}: ${reminder.label}`,
        body: 'Abre Wallet para registrarlo cuando lo hagas.',
        url: './?view=plan'
      });
    });
  }

  if (profile.weeklyReview !== false && now.weekday === 'Sun' && minutesApart(now.minutes, 19 * 60) <= window) {
    out.push({
      key: `weekly:${now.date}`,
      title: 'Tu semana en Wallet',
      body: 'Una mirada rápida a lo que gastaste y lo que viene.',
      url: './?view=analysis&range=week'
    });
  }

  return out;
}

export default async function handler(req, res) {
  // WAL-CRON-001: antes, si no había CRON_SECRET, el endpoint quedaba abierto a
  // cualquiera. Un endpoint que gasta envíos y recorre todos los dispositivos
  // tiene que fallar cerrado, no abierto.
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: 'cron_secret_no_configurado' });
  const header = req.headers.authorization || '';
  if (header !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });
  if (!storeReady) return res.status(503).json({ error: 'store_not_configured' });
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return res.status(503).json({ error: 'vapid_not_configured' });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:wallet@example.com', publicKey, privateKey);

  const devices = await hgetall(DEVICES);
  let sent = 0, removed = 0, skipped = 0;
  const failures = {};

  for (const [id, device] of Object.entries(devices)) {
   try {
    const profile = device.profile || {};
    const now = localParts(profile.timezone);
    const messages = dueMessages(profile, now);
    if (!messages.length) continue;
    device.sent = device.sent || {};
    let changed = false;

    for (const message of messages) {
      if (device.sent[message.key]) continue;
      try {
        await webpush.sendNotification(device.subscription, JSON.stringify({
          title: message.title, body: message.body, url: message.url, tag: message.key.split(':')[0]
        }));
        device.sent[message.key] = Date.now();
        changed = true;
        sent += 1;
      } catch (error) {
        if (error && (error.statusCode === 404 || error.statusCode === 410)) {
          await hdel(DEVICES, id);
          removed += 1;
          changed = false;
          break;
        }
        // WAL-NOTIF-008: los fallos de envío se agregan por motivo en vez de
        // desaparecer, para poder ver por qué no llegan los avisos.
        const reason = String((error && (error.statusCode || error.code)) || 'error');
        failures[reason] = (failures[reason] || 0) + 1;
      }
    }

    if (changed) {
      // Keep the dedupe log small: only the last two days matter.
      const cutoff = Date.now() - 2 * 86400000;
      device.sent = Object.fromEntries(Object.entries(device.sent).filter(([, at]) => at > cutoff));
      await hset(DEVICES, id, device);
    }
   } catch (error) {
     // WAL-NOTIF-007: cada dispositivo se aísla. Uno roto no puede impedir que
     // el resto reciba sus avisos.
     skipped += 1;
     const reason = String((error && error.message) || 'error').slice(0, 60);
     failures['device:' + reason] = (failures['device:' + reason] || 0) + 1;
   }
  }

  return res.status(200).json({
    ok: true, devices: Object.keys(devices).length, sent, removed, skipped,
    window, failures
  });
}
