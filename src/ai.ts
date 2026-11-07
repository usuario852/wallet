/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from './domain/core';
import * as D from './domain/derive';
import { getState, commit, addOperation, notify, deleteOperation, updateOperation, settleInstallment, settleFixed, addMoodCheckin } from './store';
import { referenceRate } from './net';

// IA (opcional): OpenAI Responses API. Primero por /api/ai (la clave puede
// vivir en el servidor); si no hay, directo con la clave guardada en el
// teléfono. `store: false`: la conversación no se guarda en OpenAI.

const loadKey = () => { try { return localStorage.getItem(C.OPENAI_KEY_STORE) || ''; } catch { return ''; } };
let serverAvailable: boolean | null = null;

export async function hasServerAI() {
  if (serverAvailable !== null) return serverAvailable;
  try {
    const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: [] }) });
    serverAvailable = r.status === 400; // con clave: rechaza el cuerpo vacío; sin clave: 501
  } catch { serverAvailable = false; }
  return serverAvailable;
}
export function aiReady() { return !!loadKey() || serverAvailable === true; }

async function request(body: any) {
  if (serverAvailable !== false) {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (loadKey()) headers['x-wallet-key'] = loadKey();
      const r = await fetch('/api/ai', { method: 'POST', headers, body: JSON.stringify(body) });
      if (r.ok) { serverAvailable = true; return r.json(); }
      if (r.status !== 404 && r.status !== 501) {
        let detail = ''; try { const d = await r.json(); detail = String((d.error && (d.error.message || d.error)) || ''); } catch { /* */ }
        throw new Error(detail || 'El servidor respondió ' + r.status);
      }
      serverAvailable = false;
    } catch (e) { if (serverAvailable === true) throw e; serverAvailable = false; }
  }
  const key = loadKey();
  if (!key) throw new Error('Para usar la IA, pega tu clave de OpenAI en Ajustes.');
  const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(body) });
  if (!r.ok) {
    if (r.status === 401) throw new Error('La clave de OpenAI no es válida.');
    if (r.status === 429) throw new Error('OpenAI está limitando las consultas ahora. Prueba en un rato.');
    let detail = ''; try { const d = await r.json(); detail = String(d.error && d.error.message || ''); } catch { /* */ }
    throw new Error(detail || 'Error ' + r.status);
  }
  return r.json();
}

const fn = (name: string, description: string, properties: any, required: string[] = []) => ({ type: 'function', name, description, parameters: { type: 'object', properties, required } });
const TOOLS_READ = [
  fn('consultar_resumen', 'Saldos, gasto e ingreso del mes, límite y cuentas de una moneda.', { moneda: { type: 'string' } }),
  fn('buscar_movimientos', 'Busca movimientos reales por texto, categoría o cuenta.', { texto: { type: 'string' }, moneda: { type: 'string' }, limite: { type: 'number' } }, ['texto']),
  fn('analizar_periodo', 'Totales, reparto por categoría y comparación con el periodo anterior.', { rango: { type: 'string', enum: ['week', 'month', 'prev_month'] }, moneda: { type: 'string' } }),
  fn('compromisos_pendientes', 'Pagos y cobros pendientes (cuotas y fijos).', { moneda: { type: 'string' } })
];
const TOOLS_WRITE = [
  fn('registrar_movimiento', 'Registra un gasto o ingreso.', { tipo: { type: 'string', enum: ['gasto', 'ingreso'] }, monto: { type: 'number' }, moneda: { type: 'string' }, cuenta: { type: 'string' }, categoria: { type: 'string' }, concepto: { type: 'string' } }, ['tipo', 'monto', 'concepto']),
  fn('transferir_entre_cuentas', 'Mueve dinero entre dos cuentas. Entre monedas distintas usa la tasa que diga el usuario o la de referencia del mercado.', { origen: { type: 'string' }, destino: { type: 'string' }, monto: { type: 'number' }, tasa: { type: 'number', description: 'Unidades de la moneda destino por 1 de origen, si el usuario la dio' } }, ['origen', 'destino', 'monto']),
  fn('crear_cuenta', 'Crea una cuenta normal (no tarjeta de crédito).', { nombre: { type: 'string' }, moneda: { type: 'string' }, saldo_inicial: { type: 'number' }, entidad: { type: 'string' } }, ['nombre']),
  fn('crear_meta', 'Crea una meta de ahorro (cuenta reservada que sigue en el patrimonio).', { nombre: { type: 'string' }, objetivo: { type: 'number' }, moneda: { type: 'string' } }, ['nombre']),
  fn('editar_cuenta', 'Cambia nombre, saldo inicial, objetivo de meta, o archiva/reactiva una cuenta.', { cuenta: { type: 'string' }, nombre: { type: 'string' }, saldo_inicial: { type: 'number' }, objetivo: { type: 'number' }, archivar: { type: 'boolean' } }, ['cuenta']),
  fn('establecer_limite', 'Cambia el límite de gasto mensual de una moneda.', { monto: { type: 'number' }, moneda: { type: 'string' } }, ['monto']),
  fn('limite_categoria', 'Pone o quita (monto 0) el límite mensual de una categoría.', { categoria: { type: 'string' }, monto: { type: 'number' }, moneda: { type: 'string' } }, ['categoria', 'monto']),
  fn('eliminar_movimiento', 'Borra un movimiento (queda Deshacer en pantalla).', { descripcion: { type: 'string' }, monto_aproximado: { type: 'number' }, fecha: { type: 'string', description: 'AAAA-MM-DD si se sabe' }, moneda: { type: 'string' } }, ['descripcion']),
  fn('editar_movimiento', 'Corrige un movimiento: monto, concepto, categoría, cuenta o fecha.', { descripcion: { type: 'string' }, monto_aproximado: { type: 'number' }, moneda: { type: 'string' }, nuevo_monto: { type: 'number' }, nuevo_concepto: { type: 'string' }, nueva_categoria: { type: 'string' }, nueva_cuenta: { type: 'string' }, nueva_fecha: { type: 'string', description: 'AAAA-MM-DD' } }, ['descripcion']),
  fn('crear_deuda', 'Registra algo que debes o que te deben, en cuotas mensuales.', { nombre: { type: 'string' }, total: { type: 'number' }, cuotas: { type: 'number' }, primera_fecha: { type: 'string', description: 'AAAA-MM-DD' }, me_deben: { type: 'boolean' }, moneda: { type: 'string' }, categoria: { type: 'string' } }, ['nombre', 'total']),
  fn('pagar_cuota', 'Paga (o cobra) la próxima cuota pendiente de una deuda.', { deuda: { type: 'string' }, cuenta: { type: 'string' }, monto: { type: 'number' } }, ['deuda']),
  fn('eliminar_deuda', 'Archiva una deuda para que deje de aparecer.', { deuda: { type: 'string' } }, ['deuda']),
  fn('crear_pago_fijo', 'Crea un pago o cobro fijo mensual (servicios, suscripciones, sueldo).', { concepto: { type: 'string' }, monto: { type: 'number' }, dia: { type: 'number' }, categoria: { type: 'string' }, es_ingreso: { type: 'boolean' }, moneda: { type: 'string' } }, ['concepto', 'monto']),
  fn('marcar_fijo_pagado', 'Marca un pago fijo como pagado este mes y registra el movimiento.', { concepto: { type: 'string' }, cuenta: { type: 'string' } }, ['concepto']),
  fn('eliminar_pago_fijo', 'Quita un pago fijo.', { concepto: { type: 'string' } }, ['concepto']),
  fn('registrar_animo', 'Guarda cómo se siente el usuario (0 a 100).', { valencia: { type: 'number', description: '0 mal, 100 muy bien' }, energia: { type: 'number' }, tension: { type: 'number' }, etiquetas: { type: 'array', items: { type: 'string' } }, nota: { type: 'string' } }, ['valencia']),
  fn('cambiar_ajuste', 'Cambia un ajuste de la app.', { ajuste: { type: 'string', enum: ['tema', 'moneda_activa', 'ocultar_montos', 'sonidos', 'inclinacion', 'numero_grande', 'horario_animo'] }, valor: { type: 'string', description: 'tema: light|dark|system; moneda_activa: PEN|USD…; ocultar_montos/sonidos/inclinacion: si|no; numero_grande: liq|disp|hoy; horario_animo: HH:MM,HH:MM,…' } }, ['ajuste', 'valor']),
  fn('borrar_todo', 'Borra todos los datos y deja Wallet en blanco (con la cuenta Efectivo). Queda Deshacer y una copia local.', {}),
  fn('restaurar_copia_previa', 'Vuelve a la copia que se guardó antes del último borrado o restauración.', {})
];

function findAccount(s: any, name: string, cur?: string) {
  const q = C.normalizeText(name || '');
  const list = s.accounts.filter((a: any) => !a.archived && (!cur || a.currency === cur));
  return list.find((a: any) => q && (C.normalizeText(a.name).includes(q) || C.normalizeText(a.institution).includes(q))) || (q ? null : list.find((a: any) => a.id === D.defaultAccountId(s, cur || s.settings.activeCurrency)) || list[0]);
}
function summary(s: any, cur: string) {
  const t = C.currencyTotals(s, cur); const b = C.budgetFor(s, cur);
  return { moneda: cur, patrimonio_liquido: C.money(t.total, cur), disponible: C.money(t.available, cur), reservado: C.money(t.reserved, cur), gasto_mes: C.money(C.sumMinor(C.spendingOps(s, cur, C.currentPeriod())), cur), ingreso_mes: C.money(C.sumMinor(C.incomeOps(s, cur, C.currentPeriod())), cur), limite: b.monthlyMinor ? C.money(b.monthlyMinor, cur) : 'sin límite', cuentas: C.accountsByCurrency(s, cur).map((a: any) => ({ nombre: a.name, tipo: a.kind === 'reserve' ? 'meta' : 'cuenta', saldo: C.money(C.balanceOf(s, a), cur) })) };
}

export type PostAction = { kind: 'move'; fromId: string; toId: string; amount: number } | { kind: 'delete'; id: string } | null;

// Cualquier cambio de la IA queda con Deshacer: se guarda el estado anterior completo.
function withUndo(label: string, mut: (x: any) => void) {
  const before = JSON.parse(JSON.stringify(getState()));
  const ok = commit(mut);
  if (ok) notify(label, () => { commit((x) => { Object.keys(x).forEach((k) => { delete x[k]; }); Object.assign(x, before); }); notify('Listo, lo deshice'); });
  return ok;
}
// Busca el movimiento que el usuario quiso decir: primero el nombre exacto, luego el que empieza igual,
// luego el que lo contiene. Entre empates gana el monto más parecido y después el más reciente.
function findOp(s: any, cur: string, desc: string, approx?: number, date?: string) {
  const q = C.normalizeText(desc || '').trim();
  if (!q) return null;
  const score = (o: any) => {
    const t = C.normalizeText(C.operationTitle(s, o)).trim();
    const c = C.normalizeText(String(o.category || ''));
    if (t === q) return 0;
    if (t.startsWith(q + ' ') || t.startsWith(q)) return 1;
    if (new RegExp('(^|\\s)' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)').test(t)) return 2;
    if (t.includes(q)) return 3;
    if (c === q) return 4;
    return 9;
  };
  let rows = C.operationsForCurrency(s, cur).filter((o: any) => !o.voided).map((o: any) => ({ o, k: score(o) })).filter((x: any) => x.k < 9);
  if (date) { const d = rows.filter((x: any) => String(x.o.date).slice(0, 10) === date); if (d.length) rows = d; }
  const amt = (o: any) => (approx ? Math.abs(C.fromMinor(Math.abs(o.amountMinor || 0), cur) - Number(approx)) : 0);
  rows.sort((a: any, b: any) => a.k - b.k || amt(a.o) - amt(b.o) || (String(b.o.date) > String(a.o.date) ? 1 : String(b.o.date) < String(a.o.date) ? -1 : 0));
  return rows.length ? rows[0].o : null;
}
const findBy = (list: any[], q: string, key = 'name') => { const n = C.normalizeText(q || ''); return list.find((x: any) => C.normalizeText(x[key]) === n) || list.find((x: any) => n && C.normalizeText(x[key]).includes(n)) || null; };

async function execute(name: string, args: any, post: { action: PostAction }) {
  const s = getState(); const cur = String(args.moneda || s.settings.activeCurrency).toUpperCase();
  try {
    if (name === 'consultar_resumen') return { ok: true, data: summary(s, cur) };
    if (name === 'buscar_movimientos') {
      const q = C.normalizeText(args.texto); const lim = C.clamp(Number(args.limite || 12), 1, 30);
      const rows = C.operationsForCurrency(s, cur).filter((o: any) => C.normalizeText(C.operationTitle(s, o) + ' ' + (o.category || '') + ' ' + C.accountName(s, o.accountId || o.fromAccountId)).includes(q)).slice(0, lim)
        .map((o: any) => ({ fecha: o.date, tipo: o.type, concepto: C.operationTitle(s, o), categoria: o.category || '', cuenta: C.accountName(s, o.accountId || o.fromAccountId), monto: C.money(C.operationDisplayAmount(o, cur).minor || o.amountMinor || 0, cur) }));
      return { ok: true, resultados: rows };
    }
    if (name === 'analizar_periodo') {
      const per = args.rango === 'prev_month' ? D.prevPeriod(C.currentPeriod()) : C.currentPeriod();
      const list = args.rango === 'week' ? C.spendingOps(s, cur).filter((o: any) => Date.now() - C.dateFromLocalIso(o.date).getTime() < 7 * 864e5) : C.spendingOps(s, cur, per);
      const prev = args.rango === 'week' ? C.spendingOps(s, cur).filter((o: any) => { const d = Date.now() - C.dateFromLocalIso(o.date).getTime(); return d >= 7 * 864e5 && d < 14 * 864e5; }) : C.spendingOps(s, cur, D.prevPeriod(per));
      return { ok: true, total: C.money(C.sumMinor(list), cur), anterior: C.money(C.sumMinor(prev), cur), movimientos: list.length, categorias: D.categoryTotals(list).slice(0, 8).map((c) => ({ categoria: c.cat, total: C.money(c.v, cur), veces: c.c })) };
    }
    if (name === 'compromisos_pendientes') return { ok: true, pendientes: C.upcomingItems(s, cur, 20).map((u) => ({ fecha: u.date, concepto: u.label, monto: C.money(u.amountMinor, cur), tipo: u.direction === 'receivable' ? 'por cobrar' : 'por pagar', estado: u.status === 'overdue' ? 'vencido' : 'pendiente' })) };
    if (s.settings.aiCanWrite === false) return { ok: false, mensaje: 'El usuario apagó que la IA registre. Solo puedes leer.' };
    if (name === 'registrar_movimiento') {
      const amount = C.toMinor(args.monto, cur); const acc = findAccount(s, args.cuenta, cur);
      if (!amount || amount <= 0 || !acc) return { ok: false, mensaje: 'Falta el monto o no encontré una cuenta en ' + cur };
      const type = args.tipo === 'ingreso' ? 'income' : 'expense';
      const op = addOperation({ type, accountId: acc.id, currency: cur, amountMinor: amount, category: args.categoria || (type === 'income' ? 'Otros ingresos' : 'Otros'), concept: String(args.concepto || 'Movimiento'), mood: C.moodForNewOperation(s), source: 'ai' }, 'La IA registró ' + String(args.concepto || 'un movimiento'));
      return op ? { ok: true, mensaje: 'Registrado ' + C.money(amount, cur) + ' en ' + acc.name } : { ok: false, mensaje: 'No se pudo guardar.' };
    }
    if (name === 'transferir_entre_cuentas') {
      const from = findAccount(s, args.origen); const to = findAccount(s, args.destino); const amount = Number(args.monto || 0);
      if (!from || !to || from.id === to.id || amount <= 0) return { ok: false, mensaje: 'No identifiqué bien las dos cuentas.' };
      if (from.currency === to.currency) { const op = addOperation({ type: 'transfer', fromAccountId: from.id, toAccountId: to.id, currency: from.currency, amountMinor: C.toMinor(amount, from.currency), concept: to.kind === 'reserve' ? 'Aporte a ' + to.name : 'Transferencia interna' }, 'Moviste ' + C.money(C.toMinor(amount, from.currency), from.currency) + ' a ' + to.name); return op ? { ok: true, mensaje: 'Moví ' + C.money(C.toMinor(amount, from.currency), from.currency) + ' de ' + from.name + ' a ' + to.name } : { ok: false }; }
      let direct = Number(args.tasa || 0); let ref: number | null = null;
      try { const r: any = await referenceRate(from.currency, to.currency, s.rates); ref = Number(r.rate) || null; } catch { /* sin referencia */ }
      if (!direct) direct = ref || 0;
      if (!direct) { post.action = { kind: 'move', fromId: from.id, toId: to.id, amount }; return { ok: false, mensaje: 'No conseguí la tasa de referencia. Abrí la pantalla para que escribas la tasa.' }; }
      const inv = direct < 1; const display = inv ? Number((1 / direct).toFixed(4)) : Number(direct.toFixed(4));
      const fromMinor = C.toMinor(amount, from.currency), toMinor = C.toMinor(amount * direct, to.currency);
      const op = addOperation({ type: 'fx', fromAccountId: from.id, toAccountId: to.id, fromCurrency: from.currency, toCurrency: to.currency, fromAmountMinor: fromMinor, toAmountMinor: toMinor, directRate: direct, displayRate: display, rateDirection: inv ? 'inverse' : 'direct', referenceDirectRate: ref, concept: 'Cambio de divisa' }, 'Cambio registrado');
      return op ? { ok: true, mensaje: 'Cambié ' + C.money(fromMinor, from.currency) + ' por ' + C.money(toMinor, to.currency) + ' (tasa ' + display + (args.tasa ? '' : ', referencia de mercado') + ')' } : { ok: false, mensaje: 'No se pudo guardar.' };
    }
    if (name === 'crear_cuenta' || name === 'crear_meta') {
      const reserve = name === 'crear_meta';
      const a: any = { id: C.uid('acc'), name: String(args.nombre), institution: String(args.entidad || ''), currency: cur, kind: reserve ? 'reserve' : 'regular', openingMinor: C.toMinor(args.saldo_inicial || 0, cur), archived: false };
      if (reserve) { a.goalMinor = C.toMinor(args.objetivo || 0, cur); a.goalDate = null; }
      withUndo((reserve ? 'Meta ' : 'Cuenta ') + a.name + ' creada', (x) => { x.accounts.push(a); if (!x.settings.enabledCurrencies.includes(cur)) x.settings.enabledCurrencies.push(cur); });
      return { ok: true, mensaje: (reserve ? 'Meta ' : 'Cuenta ') + a.name + ' creada en ' + cur };
    }
    if (name === 'editar_cuenta') {
      const a = findBy(s.accounts, args.cuenta); if (!a) return { ok: false, mensaje: 'No encontré esa cuenta.' };
      withUndo('Cuenta ' + a.name + ' actualizada', (x) => { const y = x.accounts.find((z: any) => z.id === a.id); if (args.nombre) y.name = String(args.nombre); if (args.saldo_inicial != null) y.openingMinor = C.toMinor(args.saldo_inicial, y.currency); if (args.objetivo != null && y.kind === 'reserve') y.goalMinor = C.toMinor(args.objetivo, y.currency); if (args.archivar != null) y.archived = !!args.archivar; });
      return { ok: true, mensaje: 'Actualicé ' + a.name };
    }
    if (name === 'establecer_limite') { withUndo('Límite de ' + cur + ' en ' + C.money(C.toMinor(args.monto || 0, cur), cur), (x) => { C.ensureBudget(x, cur).monthlyMinor = C.toMinor(args.monto || 0, cur); }); return { ok: true, mensaje: 'Límite de ' + cur + ' en ' + C.money(C.toMinor(args.monto || 0, cur), cur) }; }
    if (name === 'limite_categoria') {
      const cats = (s.categories.expense || []).map((c: any) => ({ name: c.name }));
      const c = findBy(cats, args.categoria); if (!c) return { ok: false, mensaje: 'No encontré esa categoría.' };
      const v = C.toMinor(args.monto || 0, cur);
      withUndo(v ? 'Límite de ' + C.showCat(c.name) + ' en ' + C.money(v, cur) : 'Quité el límite de ' + C.showCat(c.name), (x) => { const b = C.ensureBudget(x, cur); b.categories = b.categories || {}; if (v) b.categories[c.name] = v; else delete b.categories[c.name]; });
      return { ok: true, mensaje: 'Listo' };
    }
    if (name === 'eliminar_movimiento' || name === 'solicitar_eliminar_movimiento') {
      const op = findOp(s, cur, args.descripcion, args.monto_aproximado, args.fecha); if (!op) return { ok: false, mensaje: 'No encontré un movimiento parecido.' };
      deleteOperation(op.id);
      return { ok: true, mensaje: 'Borré «' + C.operationTitle(s, op) + '» del ' + String(op.date).slice(0, 10) + '. Hay Deshacer en pantalla.' };
    }
    if (name === 'editar_movimiento') {
      const op = findOp(s, cur, args.descripcion, args.monto_aproximado); if (!op) return { ok: false, mensaje: 'No encontré un movimiento parecido.' };
      const patch: any = {};
      if (args.nuevo_monto) patch.amountMinor = C.toMinor(args.nuevo_monto, op.currency || cur);
      if (args.nuevo_concepto) patch.concept = String(args.nuevo_concepto);
      if (args.nueva_categoria) patch.category = String(args.nueva_categoria);
      if (args.nueva_cuenta) { const a = findAccount(s, args.nueva_cuenta, op.currency); if (a && op.accountId) patch.accountId = a.id; }
      if (args.nueva_fecha && /^\d{4}-\d{2}-\d{2}$/.test(args.nueva_fecha)) patch.date = args.nueva_fecha + 'T12:00:00';
      return updateOperation(op.id, patch) ? { ok: true, mensaje: 'Corregí «' + C.operationTitle(s, op) + '»' } : { ok: false, mensaje: 'No se pudo cambiar.' };
    }
    if (name === 'crear_deuda') {
      let d: any = null;
      const ok = withUndo('Registré ' + String(args.nombre), (x) => { d = C.createDebt(x, { name: args.nombre, amount: args.total, installments: args.cuotas || 1, dueDate: args.primera_fecha || C.todayLocal(), direction: args.me_deben ? 'receivable' : 'payable', currency: cur, category: args.categoria || 'Otros' }); });
      return ok && d ? { ok: true, mensaje: 'Registré ' + d.name + ': ' + C.money(d.totalMinor, cur) + ' en ' + d.installments.length + ' cuotas' } : { ok: false, mensaje: 'Faltan datos.' };
    }
    if (name === 'pagar_cuota') {
      const d = findBy((s.debts || []).filter((x: any) => !x.archived), args.deuda); if (!d) return { ok: false, mensaje: 'No encontré esa deuda.' };
      const i = C.nextPendingInstallment(d); if (!i) return { ok: false, mensaje: 'No tiene cuotas pendientes.' };
      const a = findAccount(s, args.cuenta, d.currency); if (!a) return { ok: false, mensaje: 'No encontré una cuenta en ' + d.currency };
      const op = settleInstallment(d.id, i.id, a.id, args.monto ? C.toMinor(args.monto, d.currency) : i.amountMinor - (i.paidMinor || 0));
      return op ? { ok: true, mensaje: 'Listo: ' + d.name + ', ' + C.money(op.amountMinor, d.currency) + ' desde ' + a.name } : { ok: false, mensaje: 'No se pudo registrar el pago.' };
    }
    if (name === 'eliminar_deuda') {
      const d = findBy((s.debts || []).filter((x: any) => !x.archived), args.deuda); if (!d) return { ok: false, mensaje: 'No encontré esa deuda.' };
      withUndo('Archivé ' + d.name, (x) => { const y = x.debts.find((z: any) => z.id === d.id); y.archived = true; });
      return { ok: true, mensaje: 'Archivé ' + d.name };
    }
    if (name === 'crear_pago_fijo') {
      const v = C.toMinor(args.monto || 0, cur); if (!v) return { ok: false, mensaje: 'Falta el monto.' };
      const type = args.es_ingreso ? 'income' : 'expense';
      withUndo('Pago fijo ' + String(args.concepto) + ' creado', (x) => { x.fixed.push({ id: C.uid('fixed'), type, concept: String(args.concepto).trim(), amountMinor: v, currency: cur, day: C.clamp(Number(args.dia || 1), 1, 31), category: args.categoria || (type === 'income' ? 'Sueldo' : 'Otros'), paidPeriod: null }); });
      return { ok: true, mensaje: 'Creé ' + args.concepto + ', ' + C.money(v, cur) + ' cada día ' + C.clamp(Number(args.dia || 1), 1, 31) };
    }
    if (name === 'marcar_fijo_pagado') {
      const f = findBy(s.fixed, args.concepto, 'concept'); if (!f) return { ok: false, mensaje: 'No encontré ese pago fijo.' };
      const a = findAccount(s, args.cuenta, f.currency); if (!a) return { ok: false, mensaje: 'No encontré una cuenta en ' + f.currency };
      return settleFixed(f.id, a.id) ? { ok: true, mensaje: 'Marqué ' + f.concept + ' como pagado desde ' + a.name } : { ok: false, mensaje: 'No se pudo.' };
    }
    if (name === 'eliminar_pago_fijo') {
      const f = findBy(s.fixed, args.concepto, 'concept'); if (!f) return { ok: false, mensaje: 'No encontré ese pago fijo.' };
      withUndo('Quité ' + f.concept, (x) => { x.fixed = x.fixed.filter((y: any) => y.id !== f.id); });
      return { ok: true, mensaje: 'Quité ' + f.concept };
    }
    if (name === 'registrar_animo') {
      const c = addMoodCheckin({ valence: args.valencia, energy: args.energia ?? 55, tension: args.tension ?? 35, tags: args.etiquetas || [], note: args.nota || '', source: 'ai' });
      return c ? { ok: true, mensaje: 'Guardé tu ánimo: ' + C.moodDescriptor(c) } : { ok: false };
    }
    if (name === 'cambiar_ajuste') {
      const v = String(args.valor || '').trim(); const yes = /^(si|sí|true|1|on)$/i.test(v);
      const ok = withUndo('Ajuste cambiado', (x) => {
        x.settings.look = x.settings.look || {};
        if (args.ajuste === 'tema' && ['light', 'dark', 'system'].includes(v)) x.settings.theme = v;
        if (args.ajuste === 'moneda_activa') { const c2 = v.toUpperCase(); if (!x.settings.enabledCurrencies.includes(c2)) x.settings.enabledCurrencies.push(c2); x.settings.activeCurrency = c2; }
        if (args.ajuste === 'ocultar_montos') x.settings.look.hide = yes;
        if (args.ajuste === 'sonidos') x.settings.look.sound = yes;
        if (args.ajuste === 'inclinacion') x.settings.look.tilt = yes;
        if (args.ajuste === 'numero_grande' && ['liq', 'disp', 'hoy'].includes(v)) x.settings.look.big = v;
        if (args.ajuste === 'horario_animo') { const t = v.split(/[ ,;]+/).filter((z) => /^\d{1,2}:\d{2}$/.test(z)).map((z) => z.padStart(5, '0')); if (t.length) { x.settings.mood = Object.assign({}, x.settings.mood || {}, { times: t, enabled: true }); } }
      });
      return ok ? { ok: true, mensaje: 'Cambié ' + args.ajuste } : { ok: false };
    }
    if (name === 'borrar_todo') {
      try { localStorage.setItem('wallet_data_previo_a_restaurar', JSON.stringify(s)); } catch { /* */ }
      const fresh = C.defaultState();
      fresh.settings = Object.assign({}, fresh.settings, { onboardingComplete: true, theme: s.settings.theme, look: s.settings.look, mood: s.settings.mood, notifications: s.settings.notifications, aiCanWrite: s.settings.aiCanWrite, aiWebSearch: s.settings.aiWebSearch });
      fresh.accounts = [{ id: C.uid('acc'), name: 'Efectivo', institution: 'Efectivo', brand: 'cash', currency: 'PEN', kind: 'regular', openingMinor: 0, archived: false }];
      withUndo('Borré todos los datos', (x) => { Object.keys(x).forEach((k) => { delete x[k]; }); Object.assign(x, fresh); });
      return { ok: true, mensaje: 'Borré todo. Hay Deshacer en pantalla y una copia previa guardada en el teléfono.' };
    }
    if (name === 'restaurar_copia_previa') {
      let prev: any = null; try { prev = JSON.parse(localStorage.getItem('wallet_data_previo_a_restaurar') || 'null'); } catch { /* */ }
      const res = prev ? C.stateFromBackup(prev) : { error: 'No hay copia previa guardada.' };
      if (!res.state) return { ok: false, mensaje: res.error || 'No hay copia previa.' };
      try { localStorage.setItem('wallet_data_previo_a_restaurar', JSON.stringify(s)); } catch { /* */ }
      const next = res.state;
      withUndo('Restauré la copia previa', (x) => { Object.keys(x).forEach((k) => { delete x[k]; }); Object.assign(x, next); });
      return { ok: true, mensaje: 'Restauré la copia: ' + next.accounts.length + ' cuentas y ' + next.operations.length + ' movimientos.' };
    }
    return { ok: false, mensaje: 'Función no reconocida' };
  } catch { return { ok: false, mensaje: 'Hubo un error al ejecutar la acción.' }; }
}

function context() {
  const s = getState();
  const sums: any = {}; s.settings.enabledCurrencies.forEach((c: string) => { sums[c] = summary(s, c); });
  const recent = s.operations.filter((o: any) => !o.voided).slice().sort(C.byDateDesc).slice(0, 40).map((o: any) => {
    const b: any = { fecha: o.date, tipo: o.type, concepto: o.concept || '', categoria: o.category || '' };
    if (o.type === 'fx') { b.sale = C.money(o.fromAmountMinor, o.fromCurrency); b.entra = C.money(o.toAmountMinor, o.toCurrency); }
    else { b.monto = C.money(o.amountMinor || o.deltaMinor || 0, o.currency); b.cuenta = C.accountName(s, o.accountId || o.fromAccountId); }
    if (s.settings.includeMoodForAI !== false) { const m = C.moodForOperation(s, o); if (m) b.animo = { valencia: m.valence, energia: m.energy, tension: m.tension }; }
    return b;
  });
  return 'Eres la IA de Wallet, una app personal de finanzas. Hablas en español de Perú: claro, breve, sin moralizar. Formato de números: coma para miles y punto para decimales (S/ 1,234.50). Nunca sumes monedas distintas. Lo reservado sigue siendo patrimonio líquido y no es gasto. Transferencias y cambios de moneda no son gasto. Usa funciones para leer datos exactos y para actuar cuando el usuario lo pida. Tienes control total: puedes registrar, corregir, borrar, pagar cuotas, crear o quitar pagos fijos, cambiar ajustes, borrar todo y restaurar la copia previa sin pedir confirmación; cada cambio deja Deshacer en pantalla. Si el pedido es ambiguo (varios movimientos parecidos), di cuál tomaste. Para cambios de moneda usa la tasa que diga el usuario o la referencia de mercado; no inventes tasas ni cifras. Separa hechos de interpretaciones; la relación entre ánimo y gasto es asociación, no causa. Contexto: ' + JSON.stringify({ hoy: C.todayLocal(), moneda_activa: s.settings.activeCurrency, resumenes: sums, ultimos_movimientos: recent });
}

export type Msg = { role: 'user' | 'model'; text: string; error?: boolean; sources?: { title: string; url: string }[] };

export async function chat(history: Msg[]): Promise<{ text: string; sources: any[]; action: PostAction }> {
  const s = getState();
  const tools: any[] = [...TOOLS_READ, ...(s.settings.aiCanWrite === false ? [] : TOOLS_WRITE)];
  if (s.settings.aiWebSearch !== false) tools.push({ type: 'web_search' });
  const input: any[] = history.filter((m) => !m.error).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: [{ type: m.role === 'user' ? 'input_text' : 'output_text', text: m.text }] }));
  const post: { action: PostAction } = { action: null };
  const sources: any[] = [];
  for (let loop = 0; loop < 6; loop++) {
    const data = await request({ model: s.settings.aiModel || 'gpt-5.4-nano', instructions: context(), input, tools, reasoning: { effort: s.settings.aiEffort || 'low' }, store: false });
    const out = data.output || [];
    const calls = out.filter((x: any) => x.type === 'function_call');
    if (calls.length) {
      // En orden: cada acción ve el estado que dejó la anterior.
      for (const c of calls) {
        input.push({ type: 'function_call', call_id: c.call_id, name: c.name, arguments: c.arguments });
        let args = {}; try { args = JSON.parse(c.arguments || '{}'); } catch { /* */ }
        const r = await execute(c.name, args, post);
        input.push({ type: 'function_call_output', call_id: c.call_id, output: JSON.stringify(r) });
      }
      continue;
    }
    let text = '';
    out.forEach((item: any) => { if (item.type === 'message') (item.content || []).forEach((b: any) => { if (b.type === 'output_text') { text += b.text; (b.annotations || []).forEach((a: any) => { if (a.type === 'url_citation' && a.url && !sources.some((x) => x.url === a.url)) sources.push({ title: a.title || a.url, url: a.url }); }); } }); });
    if (!text && data.output_text) text = data.output_text;
    return { text: text.trim() || 'Listo.', sources, action: post.action };
  }
  return { text: 'Listo.', sources, action: post.action };
}

export async function askOnce(prompt: string) {
  const s = getState();
  const data = await request({ model: s.settings.aiModel || 'gpt-5.4-nano', instructions: 'Responde en español de Perú, breve y sin opiniones políticas.', input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }], reasoning: { effort: 'low' }, store: false });
  let text = '';
  (data.output || []).forEach((item: any) => { if (item.type === 'message') (item.content || []).forEach((b: any) => { if (b.type === 'output_text') text += b.text; }); });
  return (text || data.output_text || '').trim();
}

// Solo en desarrollo: permite probar cada acción de la IA sin llamar al modelo.
if (import.meta.env.DEV && typeof window !== 'undefined') (window as any).__aiExec = (name: string, args: any) => { const post = { action: null as PostAction }; return execute(name, args, post).then((r) => ({ r, post: post.action })); };
