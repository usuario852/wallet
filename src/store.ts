import { useSyncExternalStore } from 'react';
import * as C from './domain/core';
import { LAB, labStorage } from './lab/mode';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Estado global: un único objeto como en la v21, guardado en el mismo sitio.
// Cada cambio pasa por `commit`, que guarda y relee; si no se pudo guardar,
// el cambio se deshace y se avisa. Nunca decimos «guardado» sin estarlo.

type Toast = { id: number; text: string; undo?: () => void } | null;
type Listener = () => void;

// En ?lab=1 todo vive en memoria: nunca se lee ni se escribe el almacenamiento real.
const disk: Storage = labStorage || window.localStorage;
const initial = C.loadState(disk);
let state: C.State = initial.state;
let health: C.Health = initial.health;
let toast: Toast = null;
let version = 0;
const listeners = new Set<Listener>();
let toastTimer: any = null;

function emit() { version++; listeners.forEach((l) => l()); }
export function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }

export function useWallet() {
  useSyncExternalStore(subscribe, () => version);
  return { s: state, health, toast };
}
export const getState = () => state;
export const getHealth = () => health;

export function notify(text: string, undo?: () => void) {
  clearTimeout(toastTimer);
  toast = { id: Date.now(), text, undo };
  emit();
  toastTimer = setTimeout(() => { toast = null; emit(); }, undo ? 5000 : 3200);
}
export function dismissToast() { clearTimeout(toastTimer); toast = null; emit(); }

// Aplica un cambio sobre una copia y solo lo deja si se pudo guardar.
export function commit(mutator: (s: C.State) => void, opts: { silent?: boolean } = {}): boolean {
  const before = JSON.stringify(state);
  const draft = JSON.parse(before);
  mutator(draft);
  const r = C.saveState(disk, draft, health);
  health = r.health;
  if (!r.ok) {
    if (!opts.silent) notify(r.reason === 'recovery_required' ? 'No guardo nada hasta que resuelvas el aviso de datos.' : 'No pude guardar. Revisa el aviso de almacenamiento.');
    emit();
    return false;
  }
  state = draft;
  emit();
  pushSyncSoon();
  return true;
}

export function replaceState(next: C.State, h?: C.Health) {
  if (h) health = h;
  state = next;
  emit();
}

export function retryStorage() {
  const r = C.loadState(disk);
  if (r.health.mode === 'ok') { state = r.state; health = r.health; emit(); notify('Datos recuperados'); return; }
  if (health.mode === 'failed') { const w = C.saveState(disk, state, health); health = w.health; emit(); notify(w.ok ? 'Guardado correctamente' : 'Sigue sin poder guardarse'); return; }
  notify('El archivo sigue sin poder leerse');
}
export function startFresh() {
  health = { mode: 'ok', reason: '', quarantined: false };
  const fresh = C.defaultState();
  const w = C.saveState(disk, fresh, health);
  health = w.health; state = fresh; emit();
  notify(w.ok ? 'Wallet empezó de cero. La copia del archivo dañado sigue guardada.' : 'No se pudo escribir el estado nuevo');
}

// ---------------------------------------------------------------------------
// Operaciones con deshacer
// ---------------------------------------------------------------------------
export function addOperation(op: any, label = 'Movimiento registrado') {
  const problem = C.validateOperation(state, op);
  if (problem) { notify(problem); return null; }
  const final = Object.assign({ id: C.uid('op'), date: C.nowIsoLocal() }, op);
  if (!final.currency) { const a = C.accountById(state, final.accountId) || C.accountById(state, final.fromAccountId); if (a) final.currency = a.currency; }
  const ok = commit((s) => { s.operations.unshift(final); if (final.accountId) s.settings.lastAccountId = final.accountId; });
  if (!ok) return null;
  notify(label, () => { deleteOperation(final.id, true); notify('Listo, lo deshice'); });
  return final;
}

export function deleteOperation(id: string, quiet = false) {
  const op = state.operations.find((o: any) => o.id === id);
  if (!op) return;
  const ok = commit((s) => {
    s.operations = s.operations.filter((o: any) => o.id !== id);
    // Si era el pago de una cuota, la cuota vuelve a quedar pendiente.
    if (op.debtId && op.installmentId) {
      const d = (s.debts || []).find((x: any) => x.id === op.debtId);
      const inst = d && C.installmentsForDebt(d).find((i: any) => i.id === op.installmentId);
      if (inst) { inst.payments = (inst.payments || []).filter((p: any) => p.operationId !== id); inst.paidMinor = Math.max(0, (inst.payments || []).reduce((n: number, p: any) => n + Number(p.amountMinor || 0), 0)); }
    }
    if (op.fixedId && op.fixedPeriod) {
      const f = s.fixed.find((x: any) => x.id === op.fixedId);
      if (f && f.paidPeriod === op.fixedPeriod) f.paidPeriod = null;
    }
  });
  if (ok && !quiet) notify('Movimiento eliminado', () => restoreOperation(op));
}
function restoreOperation(op: any) {
  commit((s) => {
    s.operations.unshift(op);
    if (op.debtId && op.installmentId) {
      const d = (s.debts || []).find((x: any) => x.id === op.debtId);
      const inst = d && C.installmentsForDebt(d).find((i: any) => i.id === op.installmentId);
      if (inst) { inst.payments = (inst.payments || []).concat([{ operationId: op.id, amountMinor: op.amountMinor, date: op.date }]); inst.paidMinor = (inst.paidMinor || 0) + op.amountMinor; }
    }
    if (op.fixedId && op.fixedPeriod) { const f = s.fixed.find((x: any) => x.id === op.fixedId); if (f) f.paidPeriod = op.fixedPeriod; }
  });
}

export function updateOperation(id: string, patch: any) {
  const current = state.operations.find((o: any) => o.id === id);
  if (!current) return false;
  const next = Object.assign({}, current, patch);
  const problem = C.validateOperation(state, next);
  if (problem) { notify(problem); return false; }
  const ok = commit((s) => { const i = s.operations.findIndex((o: any) => o.id === id); s.operations[i] = next; });
  if (ok) notify('Movimiento actualizado', () => commit((s) => { const i = s.operations.findIndex((o: any) => o.id === id); if (i >= 0) s.operations[i] = current; }));
  return ok;
}

// Pago de una cuota: el movimiento y la cuota se escriben juntos (v21).
export function settleInstallment(debtId: string, installmentId: string, accountId: string, minor: number) {
  const debt = state.debts.find((d: any) => d.id === debtId);
  const inst = debt && C.installmentsForDebt(debt).find((i: any) => i.id === installmentId);
  const account = C.accountById(state, accountId);
  if (!debt || !inst || !account) return null;
  const remaining = Math.max(0, inst.amountMinor - (inst.paidMinor || 0));
  const paid = Math.min(remaining, Math.abs(minor));
  if (!paid) return null;
  const receiving = debt.direction === 'receivable';
  const recent = state.operations.find((o: any) => o.debtId === debt.id && o.installmentId === inst.id && Number(o.amountMinor) === paid && Math.abs(Date.now() - C.dateFromLocalIso(o.date).getTime()) < 4000);
  if (recent) { notify('Ese pago ya se registró hace un momento'); return null; }
  const draft = {
    type: receiving ? 'income' : 'expense', accountId: account.id, currency: debt.currency, amountMinor: paid, category: debt.category || 'Otros', concept: debt.name,
    note: (receiving ? 'Cobro' : 'Pago') + ' de compromiso', debtId: debt.id, installmentId: inst.id,
    excludedFromSpending: !receiving && !debt.countAsFlow, excludedFromIncome: receiving && !debt.countAsFlow
  };
  const problem = C.validateOperation(state, draft);
  if (problem) { notify(problem); return null; }
  const op = Object.assign({ id: C.uid('op'), date: C.nowIsoLocal() }, draft);
  const ok = commit((s) => {
    s.operations.unshift(op);
    const d = s.debts.find((x: any) => x.id === debtId); const i = C.installmentsForDebt(d).find((x: any) => x.id === installmentId);
    i.paidMinor = (i.paidMinor || 0) + paid; i.payments = (i.payments || []).concat([{ operationId: op.id, amountMinor: paid, date: op.date }]);
    s.settings.lastAccountId = account.id;
  });
  if (!ok) return null;
  notify((receiving ? 'Cobraste ' : 'Pagaste ') + debt.name + ', ' + C.money(paid, debt.currency), () => deleteOperation(op.id, true));
  return op;
}

// Liquidar un compromiso fijo del mes (v21: registra el movimiento y marca el periodo).
export function settleFixed(fixedId: string, accountId: string) {
  const f = state.fixed.find((x: any) => x.id === fixedId);
  const a = C.accountById(state, accountId);
  if (!f || !a) return null;
  const period = C.currentPeriod();
  const draft = { type: f.type, accountId: a.id, currency: f.currency, amountMinor: f.amountMinor, category: f.category, concept: f.concept, note: 'Compromiso fijo', fixedId: f.id, fixedPeriod: period };
  const problem = C.validateOperation(state, draft);
  if (problem) { notify(problem); return null; }
  const op = Object.assign({ id: C.uid('op'), date: C.nowIsoLocal() }, draft);
  const ok = commit((s) => { s.operations.unshift(op); const x = s.fixed.find((y: any) => y.id === fixedId); x.paidPeriod = period; s.settings.lastAccountId = a.id; });
  if (!ok) return null;
  notify((f.type === 'income' ? 'Cobraste ' : 'Pagaste ') + f.concept + ', ' + C.money(f.amountMinor, f.currency), () => deleteOperation(op.id, true));
  return op;
}

export function addMoodCheckin(data: any) {
  const c = { id: C.uid('mood'), timestamp: data.timestamp || C.nowIsoLocal(), valence: C.clamp(Number(data.valence ?? 55), 0, 100), energy: C.clamp(Number(data.energy ?? 55), 0, 100), tension: C.clamp(Number(data.tension ?? 35), 0, 100), tags: Array.isArray(data.tags) ? data.tags.slice(0, 5) : [], note: String(data.note || ''), confirmedSame: !!data.confirmedSame, source: data.source || 'manual' };
  if (commit((s) => { s.moodCheckins.push(c); s.lastMood = c; })) notify('Ánimo guardado');
}

// ---------------------------------------------------------------------------
// Avisos (Web Push), mismo protocolo que la v21
// ---------------------------------------------------------------------------
export function pushProfilePayload(s = state) {
  const n = s.settings.notifications || {}, mood = s.settings.mood || {};
  const debtReminders: any[] = [];
  (s.debts || []).filter((d: any) => !d.archived).forEach((d: any) => C.installmentsForDebt(d).forEach((i: any) => { if ((i.paidMinor || 0) < i.amountMinor) debtReminders.push({ id: d.id + ':' + i.id, label: d.name, direction: d.direction, dueDate: i.dueDate }); }));
  const last = C.latestMoodCheckin(s);
  return { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima', moodEnabled: mood.enabled !== false, moodTimes: mood.times || [], skipRecentMinutes: mood.skipRecentMinutes || 120, lastCheckinAt: last && last.timestamp ? C.dateFromLocalIso(last.timestamp).toISOString() : null, debtEnabled: n.debtEnabled !== false, debtReminders, weeklyReview: n.weeklyReview !== false };
}
let pushTimer: any = null;
function pushSyncSoon() {
  if (LAB) return;
  const n = state.settings.notifications || {};
  if (!n.pushId || !n.pushSecret) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    fetch('/api/push-sync', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...pushProfilePayload(), id: n.pushId, secret: n.pushSecret }) }).catch(() => {});
  }, 1500);
}
function b64ToBytes(base64: string) { const p = '='.repeat((4 - (base64.length % 4)) % 4); const raw = atob((base64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); }
export async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { notify('Este teléfono no admite avisos web'); return false; }
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (ios && !(navigator as any).standalone) { notify('En iPhone, primero agrega Wallet a la pantalla de inicio'); return false; }
  try {
    const cfg = await fetch('/api/push-config', { cache: 'no-store' });
    if (!cfg.ok) throw new Error('sin_config');
    const { publicKey } = await cfg.json();
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { notify('No se concedió permiso para avisos'); return false; }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    const res = await fetch('/api/push-subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...pushProfilePayload(), subscription: sub.toJSON() }) });
    if (!res.ok) throw new Error('subscribe');
    const data = await res.json();
    commit((s) => { s.settings.notifications.enabled = true; s.settings.notifications.pushId = data.id; s.settings.notifications.pushSecret = data.secret; });
    notify('Avisos activados');
    return true;
  } catch { notify('No pude activar los avisos. Inténtalo otra vez en un rato.'); return false; }
}
export async function disablePush(remote = true) {
  const n = state.settings.notifications || {};
  try {
    if (remote && n.pushId && n.pushSecret) await fetch('/api/push-sync', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: n.pushId, secret: n.pushSecret }) });
    const reg = await navigator.serviceWorker?.ready; const sub = await reg?.pushManager?.getSubscription(); if (sub) await sub.unsubscribe();
  } catch { /* sigue */ }
  commit((s) => { s.settings.notifications.enabled = false; s.settings.notifications.pushId = ''; s.settings.notifications.pushSecret = ''; });
}
