/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { LAB, LAB_MARKETS } from './lab/mode';

// Datos externos (tipo de cambio, mercados, noticias) con caché local para
// que la app abra al instante y funcione sin señal.
function readCache(key: string) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function writeCache(key: string, v: any) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* sin espacio: no pasa nada */ } }

const inflight: Record<string, Promise<any> | undefined> = {};
async function cached(key: string, url: string, maxAgeMs: number, force = false) {
  // En el laboratorio no hay red: precios de referencia inventados y nada más.
  if (LAB) { if (url.startsWith('/api/markets')) return LAB_MARKETS; throw new Error('lab'); }
  const c = readCache(key);
  if (!force && c && Date.now() - (c.savedAt || 0) < maxAgeMs) return c.data;
  if (!inflight[url]) {
    inflight[url] = fetch(url, { headers: { Accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error('http_' + r.status); return r.json(); })
      .then((data) => { writeCache(key, { savedAt: Date.now(), data }); return data; })
      .finally(() => { inflight[url] = undefined; });
  }
  try { return await inflight[url]; } catch (e) { if (c) return c.data; throw e; }
}

export function useMarkets(watch: string[] = [], force = 0) {
  const key = 'wallet_markets_v2' + (watch.length ? ':' + watch.join(',') : '');
  const [data, setData] = useState<any>(() => (readCache(key) || {}).data || null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    cached(key, '/api/markets' + (watch.length ? '?watch=' + encodeURIComponent(watch.join(',')) : ''), 15 * 60 * 1000, force > 0)
      .then((d) => { if (alive) { setData(d); setErr(''); } })
      .catch(() => { if (alive) setErr('No pude actualizar los precios.'); });
    return () => { alive = false; };
  }, [key, force]);
  return { data, err };
}
export function marketItem(data: any, id: string) { return data && Array.isArray(data.items) ? data.items.find((x: any) => x.id === id) : null; }

export function useNews(force = 0) {
  const [data, setData] = useState<any>(() => (readCache('wallet_news_v2') || {}).data || null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    cached('wallet_news_v2', '/api/news', 20 * 60 * 1000, force > 0).then((d) => { if (alive) { setData(d); setErr(''); } }).catch(() => { if (alive) setErr('No pude traer las noticias ahora.'); });
    return () => { alive = false; };
  }, [force]);
  return { data, err };
}

export async function searchSymbols(q: string) {
  if (LAB) throw new Error('lab');
  const r = await fetch('/api/symbol-search?q=' + encodeURIComponent(q));
  if (!r.ok) throw new Error('search');
  const d = await r.json();
  return Array.isArray(d.results) ? d.results : Array.isArray(d) ? d : d.items || [];
}

// Tipo de cambio de referencia para mover entre monedas (como la v21).
export async function referenceRate(from: string, to: string, rates: any) {
  if (from === to) return 1;
  if (LAB) return { rate: from === 'USD' ? 3.752 : 1 / 3.752, cached: true };
  const key = from + '_' + to;
  const c = rates && rates[key];
  if (c && Date.now() - c.fetchedAt < 6 * 3600 * 1000 && Number(c.rate) > 0) return { rate: Number(c.rate), cached: true };
  const res = await fetch('https://api.frankfurter.dev/v2/rate/' + encodeURIComponent(from) + '/' + encodeURIComponent(to), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('rate');
  const d = await res.json();
  const rate = Number(d.rate);
  if (!rate || rate <= 0) throw new Error('rate');
  return { rate, cached: false, date: d.date };
}
