/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSyncExternalStore } from 'react';

// Laboratorio visual (?lab=1). Este módulo se evalúa antes que el store: con el
// modo activo, el almacenamiento y la red del navegador pasan a versiones en
// memoria que nunca tocan los datos reales. Fuera de ?lab=1 no hace nada.

export const LAB = typeof location !== 'undefined' && new URLSearchParams(location.search).get('lab') === '1';

export class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

// Tipo de cambio inventado para la tira del Inicio en el laboratorio.
export const LAB_MARKETS = { items: [{ id: 'usdpen', raw: 3.752 }, { id: 'eurpen', raw: 4.061 }] };

// Intentos de salir de la memoria que el laboratorio bloqueó (para el HUD y las pruebas).
export const labBlocked: string[] = [];
export const labStorage: Storage | null = LAB ? (new MemoryStorage() as any) : null;
export let labGuarded = false;

function installGuards() {
  const g: any = globalThis;
  const block = (what: string) => { labBlocked.push(what); };
  const pin = (obj: any, k: string, v: any) => Object.defineProperty(obj, k, { configurable: true, enumerable: true, get: () => v, set: () => {} });
  try {
    pin(g, 'localStorage', labStorage);
    pin(g, 'sessionStorage', new MemoryStorage());
    pin(g, 'indexedDB', undefined);
    pin(g, 'fetch', (input: any) => { block('fetch ' + String(input && input.url ? input.url : input)); return Promise.reject(new TypeError('Laboratorio: la red está desactivada')); });
    pin(g, 'XMLHttpRequest', function () { block('xhr'); throw new Error('Laboratorio: la red está desactivada'); });
    pin(g, 'WebSocket', function (u: string) { block('websocket ' + u); throw new Error('Laboratorio: la red está desactivada'); });
    if (g.navigator) {
      try { pin(g.navigator, 'sendBeacon', () => { block('beacon'); return false; }); } catch { /* sin beacon */ }
      if (g.navigator.serviceWorker) pin(g.navigator.serviceWorker, 'register', () => { block('serviceWorker'); return Promise.reject(new Error('Laboratorio')); });
    }
    labGuarded = g.localStorage === labStorage;
  } catch { labGuarded = false; }
}
if (LAB) installGuards();

// Al abrir desde un aviso (?checkin=1…) la app limpia la URL. En el laboratorio no: lleva ?lab=1.
export function clearLaunchQuery() {
  if (LAB || !location.search) return;
  history.replaceState(null, '', location.pathname);
}

// ---------------------------------------------------------------------------
// Estado del laboratorio: lo comparten el HUD, App y el saldo.
// ---------------------------------------------------------------------------
export type LabState = {
  variant: 'orig' | 'a' | 'b' | 'c';
  font: 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7' | 's8';
  saldo: 'odo' | 'coh';
  num: 'tnum' | 'pnum';
  stress: 'normal' | 'extreme' | 'empty';
  motion: 'normal' | 'reduced';
  hud: 'open' | 'min' | 'hidden';
  tab: 'a' | 'b';
};
const LAB_DEFAULTS: LabState = { variant: 'orig', font: 's1', saldo: 'odo', num: 'tnum', stress: 'normal', motion: 'normal', hud: 'min', tab: 'a' };
const URL_KEYS: Record<string, keyof LabState> = { v: 'variant', f: 'font', saldo: 'saldo', num: 'num', esc: 'stress', mov: 'motion', hud: 'hud', tab: 'tab' };

function fromUrl(): LabState {
  const out: any = { ...LAB_DEFAULTS };
  if (!LAB) return out;
  const q = new URLSearchParams(location.search);
  Object.entries(URL_KEYS).forEach(([k, f]) => { const v = q.get(k); if (v) out[f] = v; });
  return out;
}
let lab: LabState = fromUrl();
const subs = new Set<() => void>();
let ver = 0;
export const getLab = () => lab;
export function setLab(patch: Partial<LabState>) { lab = { ...lab, ...patch }; ver++; subs.forEach((f) => f()); }
export function subscribeLab(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }
export function useLab() { useSyncExternalStore(subscribeLab, () => ver, () => ver); return lab; }
export function bumpLab() { ver++; subs.forEach((f) => f()); }

// Puente con App: el HUD navega y elige cuenta con las mismas funciones que la app.
export const bridge: { view?: string; sel?: string | null; go?: (v: any) => void; setSel?: (id: string | null) => void } = {};
// Ganchos que solo el laboratorio rellena.
export const labHooks: { skin: null | ((p: any, bank: string, dark: boolean, view: string) => any) } = { skin: null };
