/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from './domain/core';
import * as D from './domain/derive';
import { getState, commit, addOperation } from './store';

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
  fn('transferir_entre_cuentas', 'Mueve dinero entre dos cuentas. Entre monedas distintas, la app pide confirmar la tasa.', { origen: { type: 'string' }, destino: { type: 'string' }, monto: { type: 'number' } }, ['origen', 'destino', 'monto']),
  fn('crear_cuenta', 'Crea una cuenta normal (no tarjeta de crédito).', { nombre: { type: 'string' }, moneda: { type: 'string' }, saldo_inicial: { type: 'number' }, entidad: { type: 'string' } }, ['nombre']),
  fn('crear_meta', 'Crea una meta de ahorro (cuenta reservada que sigue en el patrimonio).', { nombre: { type: 'string' }, objetivo: { type: 'number' }, moneda: { type: 'string' } }, ['nombre']),
  fn('establecer_limite', 'Cambia el límite de gasto mensual de una moneda.', { monto: { type: 'number' }, moneda: { type: 'string' } }, ['monto']),
  fn('solicitar_eliminar_movimiento', 'Busca un movimiento y pide confirmación visible antes de borrarlo. No borra directamente.', { descripcion: { type: 'string' }, monto_aproximado: { type: 'number' }, moneda: { type: 'string' } }, ['descripcion'])
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

function execute(name: string, args: any, post: { action: PostAction }) {
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
      if (from.currency === to.currency) { const op = addOperation({ type: 'transfer', fromAccountId: from.id, toAccountId: to.id, currency: from.currency, amountMinor: C.toMinor(amount, from.currency), concept: 'Transferencia interna' }, 'Transferencia registrada'); return op ? { ok: true, mensaje: 'Moví ' + C.money(C.toMinor(amount, from.currency), from.currency) + ' de ' + from.name + ' a ' + to.name } : { ok: false }; }
      post.action = { kind: 'move', fromId: from.id, toId: to.id, amount };
      return { ok: true, mensaje: 'Preparé el cambio de ' + from.currency + ' a ' + to.currency + '. La app mostrará la tasa para que la confirme.' };
    }
    if (name === 'crear_cuenta' || name === 'crear_meta') {
      const reserve = name === 'crear_meta';
      const a: any = { id: C.uid('acc'), name: String(args.nombre), institution: String(args.entidad || ''), currency: cur, kind: reserve ? 'reserve' : 'regular', openingMinor: C.toMinor(args.saldo_inicial || 0, cur), archived: false };
      if (reserve) { a.goalMinor = C.toMinor(args.objetivo || 0, cur); a.goalDate = null; }
      commit((x) => { x.accounts.push(a); if (!x.settings.enabledCurrencies.includes(cur)) x.settings.enabledCurrencies.push(cur); });
      return { ok: true, mensaje: (reserve ? 'Meta ' : 'Cuenta ') + a.name + ' creada en ' + cur };
    }
    if (name === 'establecer_limite') { commit((x) => { C.ensureBudget(x, cur).monthlyMinor = C.toMinor(args.monto || 0, cur); }); return { ok: true, mensaje: 'Límite de ' + cur + ' en ' + C.money(C.toMinor(args.monto || 0, cur), cur) }; }
    if (name === 'solicitar_eliminar_movimiento') {
      const q = C.normalizeText(args.descripcion);
      let rows = C.operationsForCurrency(s, cur).filter((o: any) => C.normalizeText(C.operationTitle(s, o)).includes(q));
      if (args.monto_aproximado) rows = rows.sort((a: any, b: any) => Math.abs(C.fromMinor(Math.abs(a.amountMinor || 0), cur) - Number(args.monto_aproximado)) - Math.abs(C.fromMinor(Math.abs(b.amountMinor || 0), cur) - Number(args.monto_aproximado)));
      const op = rows[0]; if (!op) return { ok: false, mensaje: 'No encontré un movimiento parecido.' };
      post.action = { kind: 'delete', id: op.id };
      return { ok: true, mensaje: 'Encontré «' + C.operationTitle(s, op) + '». La app pedirá confirmación antes de borrarlo.' };
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
  return 'Eres la IA de Wallet, una app personal de finanzas. Hablas en español de Perú: claro, breve, sin moralizar. Formato de números: coma para miles y punto para decimales (S/ 1,234.50). Nunca sumes monedas distintas. Lo reservado sigue siendo patrimonio líquido y no es gasto. Transferencias y cambios de moneda no son gasto. Usa funciones para leer datos exactos y para actuar cuando el usuario lo pida. Borrar y cambiar moneda siempre requieren confirmación visible. No inventes tasas ni cifras. Separa hechos de interpretaciones; la relación entre ánimo y gasto es asociación, no causa. Contexto: ' + JSON.stringify({ hoy: C.todayLocal(), moneda_activa: s.settings.activeCurrency, resumenes: sums, ultimos_movimientos: recent });
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
      calls.forEach((c: any) => {
        input.push({ type: 'function_call', call_id: c.call_id, name: c.name, arguments: c.arguments });
        let args = {}; try { args = JSON.parse(c.arguments || '{}'); } catch { /* */ }
        input.push({ type: 'function_call_output', call_id: c.call_id, output: JSON.stringify(execute(c.name, args, post)) });
      });
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
