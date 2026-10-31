/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach } from 'vitest';

// Pruebas negativas del laboratorio (?lab=1): nada puede tocar el almacenamiento
// real ni la red. Se simula el navegador con espías que anotan cada acceso.

function spyStorage(seed: Record<string, string> = {}) {
  const calls: string[] = [];
  const m = new Map(Object.entries(seed));
  const store = {
    get length() { calls.push('length'); return m.size; },
    key(i: number) { calls.push('key'); return Array.from(m.keys())[i] ?? null; },
    getItem(k: string) { calls.push('get ' + k); return m.has(k) ? m.get(k)! : null; },
    setItem(k: string, v: string) { calls.push('set ' + k); m.set(k, String(v)); },
    removeItem(k: string) { calls.push('remove ' + k); m.delete(k); },
    clear() { calls.push('clear'); m.clear(); }
  };
  return { calls, store, m };
}

function browser(search: string, seed: Record<string, string> = {}) {
  vi.resetModules();
  const g: any = globalThis;
  const local = spyStorage(seed), session = spyStorage();
  const net: string[] = [];
  const hist: any[] = [];
  const def = (k: string, d: PropertyDescriptor) => Object.defineProperty(g, k, { configurable: true, ...d });
  def('window', { value: g, writable: true });
  def('location', { value: { search, pathname: '/', hostname: 'localhost' }, writable: true });
  def('history', { value: { replaceState: (...a: any[]) => hist.push(a) }, writable: true });
  def('localStorage', { value: local.store, writable: true });
  def('sessionStorage', { value: session.store, writable: true });
  def('indexedDB', { get() { net.push('indexedDB'); return undefined; } });
  def('fetch', { value: (u: any) => { net.push('fetch ' + u); return Promise.resolve({ ok: true, json: async () => ({}) }); }, writable: true });
  def('XMLHttpRequest', { value: function () { net.push('xhr'); }, writable: true });
  def('WebSocket', { value: function () { net.push('websocket'); }, writable: true });
  def('navigator', { value: { userAgent: 'test', serviceWorker: { register: () => { net.push('serviceWorker'); return Promise.resolve(); } } }, writable: true });
  return { local, session, net, hist };
}

afterEach(() => { vi.useRealTimers(); });

describe('laboratorio ?lab=1: aislamiento', () => {
  it('no lee ni escribe el almacenamiento real, ni al importar ni al cambiar datos', async () => {
    const env = browser('?lab=1');
    const mode = await import('../src/lab/mode');
    const store = await import('../src/store');
    const { labFixture } = await import('../src/lab/fixtures');
    expect(mode.LAB).toBe(true);
    expect(mode.labGuarded).toBe(true);
    store.replaceState(labFixture('normal'));
    const acc = store.getState().accounts[0];
    const op = store.addOperation({ type: 'expense', accountId: acc.id, currency: 'PEN', amountMinor: 1250, concept: 'Wong', category: 'Alimentacion' });
    expect(op).toBeTruthy();
    store.deleteOperation(op!.id);
    store.commit((s) => { s.accounts = s.accounts.filter((a: any) => a.id !== acc.id); });
    store.retryStorage();
    store.startFresh();
    (globalThis as any).sessionStorage.setItem('x', '1');
    expect(env.local.calls).toEqual([]);
    expect(env.session.calls).toEqual([]);
  });

  it('una mutación en el laboratorio no altera los datos guardados de producción', async () => {
    const C = await import('../src/domain/core');
    const real = JSON.stringify({ ...C.defaultState(), accounts: [{ id: 'real', name: 'Cuenta real', currency: 'PEN', kind: 'regular', openingMinor: 999, archived: false }] });
    const env = browser('?lab=1', { [C.STORAGE_KEY]: real });
    const store = await import('../src/store');
    const { labFixture } = await import('../src/lab/fixtures');
    store.replaceState(labFixture('extreme'));
    store.commit((s) => { s.accounts = []; s.operations = []; });
    expect(env.local.m.get(C.STORAGE_KEY)).toBe(real);
    expect(env.local.calls).toEqual([]);
  });

  it('no sale a la red: ni sincronización de avisos, ni mercados, ni service worker, ni IndexedDB', async () => {
    vi.useFakeTimers();
    const env = browser('?lab=1');
    const mode = await import('../src/lab/mode');
    const store = await import('../src/store');
    const net = await import('../src/net');
    store.commit((s) => { s.settings.notifications = { ...(s.settings.notifications || {}), pushId: 'p', pushSecret: 's' }; });
    store.commit((s) => { s.settings.activeCurrency = 'PEN'; });
    vi.advanceTimersByTime(5000);
    await expect(net.searchSymbols('apple')).rejects.toThrow();
    expect(await net.referenceRate('USD', 'PEN', {})).toMatchObject({ rate: 3.752 });
    await expect((globalThis as any).fetch('/api/push-sync')).rejects.toThrow();
    expect(() => new (globalThis as any).XMLHttpRequest()).toThrow();
    expect(() => new (globalThis as any).WebSocket('wss://x')).toThrow();
    await expect((globalThis as any).navigator.serviceWorker.register('/sw.js')).rejects.toThrow();
    expect((globalThis as any).indexedDB).toBeUndefined();
    expect(env.net).toEqual([]);
    expect(mode.labBlocked.some((x) => x.includes('/api/push-sync'))).toBe(true);
  });

  it('conserva ?lab=1 en la URL', async () => {
    const env = browser('?lab=1&v=b');
    const mode = await import('../src/lab/mode');
    mode.clearLaunchQuery();
    expect(env.hist).toEqual([]);
  });
});

describe('fuera de ?lab=1 todo sigue igual', () => {
  it('sin el parámetro, el store usa el almacenamiento real y la URL se limpia', async () => {
    const env = browser('?checkin=1');
    const mode = await import('../src/lab/mode');
    expect(mode.LAB).toBe(false);
    await import('../src/store');
    expect(env.local.calls.some((c) => c.startsWith('get '))).toBe(true);
    expect((globalThis as any).localStorage).toBe(env.local.store);
    mode.clearLaunchQuery();
    expect(env.hist.length).toBe(1);
  });

  it('solo lab=1 activa el laboratorio', async () => {
    for (const q of ['?lab=0', '?lab=true', '?labs=1', '']) {
      browser(q);
      const mode = await import('../src/lab/mode');
      expect(mode.LAB).toBe(false);
    }
  });
});
