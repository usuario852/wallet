import { storeReady } from './_store.js';

export default function handler(req, res) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey || !storeReady) {
    return res.status(404).json({
      error: 'not_configured',
      missing: [!publicKey && 'VAPID_PUBLIC_KEY', !storeReady && 'KV_REST_API_URL/KV_REST_API_TOKEN'].filter(Boolean)
    });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ publicKey });
}
