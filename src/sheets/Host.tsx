/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import * as C from '../domain/core';
import { useWallet, commit, notify, deleteOperation, settleInstallment, settleFixed, addMoodCheckin, addOperation } from '../store';
import { useUI, Sheet } from '../ui/ctx';
import { SheetFrame, Seg, Switch, useMoney, CardFace } from '../ui/bits';
import { ISend } from '../ui/icons';
import { BANK_KEYS, bankName, bankOf } from '../design/theme';
import Register from './Register';
import { chat, Msg, PostAction } from '../ai';
import { searchSymbols } from '../net';

export function SheetHost({ sheet }: { sheet: Sheet }) {
  if (!sheet) return null;
  const p = sheet.props || {};
  switch (sheet.kind) {
    case 'register': return <Register props={p} />;
    case 'op': return <OpSheet id={p.id} />;
    case 'account-new': return <AccountSheet props={p} />;
    case 'account-edit': return <AccountSheet props={p} />;
    case 'fixed-new': case 'fixed-edit': return <FixedSheet id={p.id} />;
    case 'debt-new': return <DebtNew />;
    case 'debt': return <DebtSheet id={p.id} />;
    case 'settle': return <SettleSheet item={p.item} />;
    case 'budget': return <BudgetSheet />;
    case 'cat-limits': return <CatLimits />;
    case 'categories': return <Categories />;
    case 'mood': return <MoodSheet />;
    case 'currency': return <CurrencySheet />;
    case 'confirm': return <Confirm {...p} />;
    case 'ask': return <Ask prompt={p.prompt} />;
    case 'watch-add': return <WatchAdd />;
    case 'watch-edit': return <WatchEdit id={p.id} />;
    default: return null;
  }
}

function Confirm({ title, text, ok = 'Confirmar', danger = false, onOk }: any) {
  const { close } = useUI();
  return (
    <SheetFrame title={title} onClose={close}>
      <div className="askb"><p>{text}</p><div className="askr"><button className="kk2" onClick={close}>Cancelar</button><button className={'kk2' + (danger ? ' danger' : '')} style={!danger ? { background: 'var(--pa)', color: 'var(--pi)' } : undefined} onClick={() => { close(); onOk && onOk(); }}>{ok}</button></div></div>
    </SheetFrame>
  );
}

function OpSheet({ id }: { id: string }) {
  const { s } = useWallet();
  const { close, open } = useUI();
  const M = useMoney();
  const op = s.operations.find((o: any) => o.id === id);
  if (!op) return <SheetFrame title="Movimiento" onClose={close}><p className="note">Ya no existe.</p></SheetFrame>;
  const editable = op.type === 'expense' || op.type === 'income';
  const d = new Date(C.dateFromLocalIso(op.date));
  const rows: [string, string][] = [['Fecha', C.longDate(op.date) + (String(op.date).length > 10 && !/T12:00:00/.test(op.date) ? ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : '')]];
  if (editable) rows.push(['Cuenta', C.accountName(s, op.accountId)], ['Categoría', C.showCat(op.category || '')], ['Monto', M(op.amountMinor, op.currency)]);
  if (op.type === 'transfer') rows.push(['Desde', C.accountName(s, op.fromAccountId)], ['Hacia', C.accountName(s, op.toAccountId)], ['Monto', M(op.amountMinor, op.currency)]);
  if (op.type === 'fx') rows.push(['Sale', M(op.fromAmountMinor, op.fromCurrency) + ', ' + C.accountName(s, op.fromAccountId)], ['Entra', M(op.toAmountMinor, op.toCurrency) + ', ' + C.accountName(s, op.toAccountId)], ['Tasa', String(op.displayRate || op.directRate || '')]);
  if (op.type === 'adjustment') rows.push(['Cuenta', C.accountName(s, op.accountId)], ['Ajuste', M(op.deltaMinor, op.currency, true)]);
  const m = op.mood ? C.normalizeMood(op.mood) : null;
  if (m) rows.push(['Ánimo', C.moodDescriptor(m)]);
  return (
    <SheetFrame title={C.operationTitle(s, op)} sub={op.type === 'expense' ? 'Gasto' : op.type === 'income' ? 'Ingreso' : op.type === 'transfer' ? 'Entre tus cuentas' : op.type === 'fx' ? 'Cambio de moneda' : 'Ajuste de saldo'} onClose={close}>
      {rows.map(([k, v]) => <div className="erow" key={k}><span>{k}</span><b>{v}</b></div>)}
      {op.note && <p className="note">{op.note}</p>}
      <div className="row2">
        {editable ? <button className="okb ghost" onClick={() => open('register', { editId: op.id })}>Editar</button> : <span />}
        <button className="okb danger" onClick={() => { close(); deleteOperation(op.id); }}>Eliminar</button>
      </div>
      <p className="note">Si lo eliminas, los saldos se recalculan. Puedes deshacerlo justo después.</p>
    </SheetFrame>
  );
}

function AccountSheet({ props }: { props: any }) {
  const { s } = useWallet();
  const { close, go, dark } = useUI();
  const editing = props.id ? C.accountById(s, props.id) : null;
  const cur = editing ? editing.currency : props.currency || s.settings.activeCurrency;
  const [name, setName] = useState(editing ? editing.name : '');
  const [inst, setInst] = useState(editing ? editing.institution || '' : '');
  const [brand, setBrand] = useState(editing ? bankOf(editing) : '');
  const [currency, setCurrency] = useState(cur);
  const [kind, setKind] = useState(editing ? editing.kind : props.kind || 'regular');
  const [bal, setBal] = useState(editing ? String(C.fromMinor(C.balanceOf(s, editing), cur)) : '');
  const [goal, setGoal] = useState(editing && editing.goalMinor ? String(C.fromMinor(editing.goalMinor, cur)) : '');
  const [goalDate, setGoalDate] = useState(editing && editing.goalDate ? editing.goalDate : '');
  const banks = BANK_KEYS.filter((k) => k !== 'cash');
  const preview = { name: name || (brand ? bankName(brand) : 'Cuenta'), institution: brand && brand !== 'wallet' ? bankName(brand) : inst, kind, brand: brand || undefined };

  const save = () => {
    const nm = name.trim() || (brand && brand !== 'wallet' ? bankName(brand) : '');
    if (!nm) return notify('Escribe un nombre para la cuenta');
    const institution = brand && brand !== 'wallet' && brand !== 'cash' ? bankName(brand) : inst.trim();
    if (editing) {
      const current = C.balanceOf(s, editing); const desired = C.toMinor(bal || 0, editing.currency); const delta = desired - current;
      const ok = commit((x) => {
        const a = C.accountById(x, editing.id); a.name = nm; a.institution = institution; if (brand) a.brand = brand; else delete a.brand;
        if (a.kind === 'reserve') { a.goalMinor = goal ? C.toMinor(goal, a.currency) : 0; a.goalDate = goalDate || null; }
      });
      if (ok && delta) addOperation({ type: 'adjustment', accountId: editing.id, currency: editing.currency, deltaMinor: delta, concept: 'Ajuste manual de saldo' }, 'Saldo ajustado');
      else if (ok) notify('Cuenta actualizada');
      close();
      return;
    }
    const a: any = { id: C.uid('acc'), name: nm, institution, currency, kind, openingMinor: C.toMinor(bal || 0, currency), archived: false };
    if (brand) a.brand = brand;
    if (kind === 'reserve') { a.goalMinor = goal ? C.toMinor(goal, currency) : 0; a.goalDate = goalDate || null; }
    if (commit((x) => { x.accounts.push(a); if (!x.settings.enabledCurrencies.includes(currency)) x.settings.enabledCurrencies.push(currency); })) { notify(kind === 'reserve' ? 'Meta creada' : 'Cuenta creada'); close(); }
  };
  const archive = () => {
    const b = C.balanceOf(s, editing);
    if (Math.abs(b) > 0) return notify('Para archivarla, déjala en cero: mueve su saldo a otra cuenta primero.');
    if (commit((x) => { C.accountById(x, editing.id).archived = true; })) { close(); go('home'); notify('Cuenta archivada', () => commit((x) => { C.accountById(x, editing.id).archived = false; })); }
  };

  return (
    <SheetFrame title={editing ? 'Editar cuenta' : kind === 'reserve' ? 'Nueva meta' : 'Nueva cuenta'} onClose={close} full>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}><CardFace account={preview} dark={dark} className="rb on" style={{ marginRight: 0, width: 150, height: 92 }} /></div>
      {!editing && <Seg items={[['regular', 'Cuenta'], ['reserve', 'Meta de ahorro']]} value={kind} onChange={setKind} label="Tipo" />}
      {kind !== 'reserve' && <>
        <div className="lab">Banco</div>
        <div className="cats noscr">
          {[['', 'Ninguno'], ['cash', 'Efectivo'], ...banks.map((k) => [k, bankName(k)])].map(([k, t]) => <button key={k} className={'cc' + (brand === k ? ' on' : '')} onClick={() => { setBrand(k); if (!name || name === bankName(brand) || name === 'Efectivo') setName(k ? (k === 'cash' ? 'Efectivo' : bankName(k)) : ''); }}>{t}</button>)}
        </div>
      </>}
      <label className="wq">Nombre<input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'reserve' ? 'Ej. Viaje, Emergencias' : 'Ej. BCP, Efectivo'} /></label>
      {!brand && kind !== 'reserve' && <label className="wq">Entidad (opcional)<input value={inst} onChange={(e) => setInst(e.target.value)} placeholder="Ej. Caja Arequipa" /></label>}
      {!editing && s.settings.enabledCurrencies.length > 1 && <><div className="lab">Moneda</div><div className="cats noscr">{s.settings.enabledCurrencies.map((c: string) => <button key={c} className={'cc' + (currency === c ? ' on' : '')} onClick={() => setCurrency(c)}>{C.currencyMeta(c).name}</button>)}</div></>}
      <label className="wq">{editing ? 'Saldo actual' : 'Saldo inicial'} ({C.currencyMeta(currency).symbol})<input inputMode="decimal" value={bal} onChange={(e) => setBal(e.target.value.replace(',', '.'))} placeholder="0.00" /></label>
      {editing && <p className="hint2">Si cambias el saldo, se guarda un ajuste para que la historia cuadre.</p>}
      {kind === 'reserve' && <>
        <label className="wq">Cuánto quieres juntar (opcional)<input inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value.replace(',', '.'))} placeholder="0.00" /></label>
        <label className="wq">Para cuándo (opcional)<input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} /></label>
      </>}
      <button className="okb" onClick={save}>{editing ? 'Guardar' : 'Crear'}</button>
      {editing && <button className="dngrow" style={{ textAlign: 'center' }} onClick={archive}>Archivar cuenta</button>}
      {editing && <p className="hint2" style={{ textAlign: 'center' }}>Solo se archiva con saldo en cero. Su historia se conserva.</p>}
    </SheetFrame>
  );
}

function FixedSheet({ id }: { id?: string }) {
  const { s } = useWallet();
  const { close } = useUI();
  const f = id ? s.fixed.find((x: any) => x.id === id) : null;
  const cur = f ? f.currency : s.settings.activeCurrency;
  const [type, setType] = useState(f ? f.type : 'expense');
  const [concept, setConcept] = useState(f ? f.concept : '');
  const [amount, setAmount] = useState(f ? String(C.fromMinor(f.amountMinor, cur)) : '');
  const [day, setDay] = useState(f ? String(f.day) : '5');
  const [cat, setCat] = useState(f ? f.category : type === 'income' ? 'Sueldo' : 'Servicios');
  const cats = (s.categories[type === 'income' ? 'income' : 'expense'] || []).filter((c: any) => !c.archived).map((c: any) => c.name);
  const save = () => {
    const a = C.toMinor(amount, cur);
    if (!concept.trim() || !a) return notify('Completa nombre y monto');
    const ok = commit((x) => {
      if (f) { const y = x.fixed.find((z: any) => z.id === f.id); Object.assign(y, { type, concept: concept.trim(), amountMinor: a, day: C.clamp(Number(day || 1), 1, 31), category: cat }); }
      else x.fixed.push({ id: C.uid('fixed'), type, concept: concept.trim(), amountMinor: a, currency: cur, day: C.clamp(Number(day || 1), 1, 31), category: cat || (type === 'income' ? 'Sueldo' : 'Otros'), paidPeriod: null });
    });
    if (ok) { notify(f ? 'Pago fijo actualizado' : 'Pago fijo agregado'); close(); }
  };
  return (
    <SheetFrame title={f ? 'Pago fijo' : 'Nuevo pago fijo'} sub="Se repite cada mes" onClose={close} full>
      <Seg items={[['expense', 'Pago'], ['income', 'Cobro']]} value={type} onChange={(v) => { setType(v); setCat(v === 'income' ? 'Sueldo' : 'Servicios'); }} label="Tipo" />
      <label className="wq">Nombre<input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Alquiler, Internet, Sueldo" /></label>
      <label className="wq">Monto ({C.currencyMeta(cur).symbol})<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(',', '.'))} placeholder="0.00" /></label>
      <label className="wq">Día del mes<input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
      <div className="lab">Categoría</div>
      <div className="cats noscr">{cats.map((c: string) => <button key={c} className={'cc' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{C.showCat(c)}</button>)}</div>
      <button className="okb" onClick={save}>{f ? 'Guardar' : 'Agregar'}</button>
      {f && <button className="dngrow" style={{ textAlign: 'center' }} onClick={() => { const copy = { ...f }; if (commit((x) => { x.fixed = x.fixed.filter((z: any) => z.id !== f.id); })) { close(); notify('Pago fijo eliminado', () => commit((x) => { x.fixed.push(copy); })); } }}>Eliminar pago fijo</button>}
    </SheetFrame>
  );
}

function DebtNew() {
  const { s } = useWallet();
  const { close } = useUI();
  const cur = s.settings.activeCurrency;
  const [dir, setDir] = useState('payable');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [n, setN] = useState('1');
  const [due, setDue] = useState(C.todayLocal());
  const [flow, setFlow] = useState(true);
  const save = () => {
    try {
      let created: any = null;
      const ok = commit((x) => { created = C.createDebt(x, { direction: dir, name, currency: cur, amount, installments: n, dueDate: due, countAsFlow: flow, category: dir === 'receivable' ? 'Otros ingresos' : 'Finanzas' }); });
      if (ok && created) { notify((dir === 'payable' ? 'Deuda' : 'Préstamo') + ' agregado'); close(); }
    } catch (e: any) { notify(e.message); }
  };
  return (
    <SheetFrame title={dir === 'payable' ? 'Nueva deuda' : 'Nuevo préstamo'} sub="Tarjetas, préstamos, lo que te deben" onClose={close} full>
      <Seg items={[['payable', 'Yo debo'], ['receivable', 'Me deben']]} value={dir} onChange={setDir} label="Dirección" />
      <label className="wq">Nombre<input value={name} onChange={(e) => setName(e.target.value)} placeholder={dir === 'payable' ? 'Ej. Tarjeta Interbank, Préstamo' : 'Ej. Lo que me debe Ana'} /></label>
      <label className="wq">Total ({C.currencyMeta(cur).symbol})<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(',', '.'))} placeholder="0.00" /></label>
      <div className="row2">
        <label className="wq">Cuotas<input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, '').slice(0, 3))} /></label>
        <label className="wq">Primera cuota<input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      </div>
      <div className="srow"><span className="sc"><b>Contar como {dir === 'payable' ? 'gasto' : 'ingreso'}</b><small>Apágalo si es dinero que ya contaste antes, como una compra con tarjeta.</small></span><Switch on={flow} onChange={setFlow} label="Contar en el flujo" /></div>
      <button className="okb" onClick={save}>Agregar</button>
    </SheetFrame>
  );
}

function DebtSheet({ id }: { id: string }) {
  const { s } = useWallet();
  const { close, open } = useUI();
  const M = useMoney();
  const d = (s.debts || []).find((x: any) => x.id === id);
  if (!d) return <SheetFrame title="Deuda" onClose={close}><p className="note">Ya no existe.</p></SheetFrame>;
  const rem = C.debtRemainingMinor(d);
  const pend = C.installmentsForDebt(d).filter((i: any) => (i.paidMinor || 0) < i.amountMinor);
  return (
    <SheetFrame title={d.name} sub={d.direction === 'receivable' ? 'Te deben' : 'Debes'} onClose={close} full>
      <div className="erow"><span>Pendiente</span><b>{M(rem, d.currency)}</b></div>
      <div className="erow"><span>Total</span><b>{M(d.totalMinor, d.currency)}</b></div>
      <div className="lab">Cuotas</div>
      <div className="dl">
        {C.installmentsForDebt(d).map((i: any, k: number) => {
          const paid = (i.paidMinor || 0) >= i.amountMinor;
          return (
            <div key={i.id} className="mrow" style={{ cursor: 'default' }}>
              <span className="nm"><span>Cuota {k + 1}</span><span className="dt">{paid ? (d.direction === 'receivable' ? 'Cobrada' : 'Pagada') : (i.dueDate < C.todayLocal() ? 'Venció el ' : 'Vence el ') + C.shortDate(i.dueDate)}</span></span>
              {paid ? <span className="am">{M(i.amountMinor, d.currency)}</span> : <button className={'liq' + (i.dueDate < C.todayLocal() ? ' pri' : '')} onClick={() => open('settle', { item: { type: 'debt', id: d.id, installmentId: i.id, date: i.dueDate, label: d.name, amountMinor: i.amountMinor - (i.paidMinor || 0), direction: d.direction, status: i.dueDate < C.todayLocal() ? 'overdue' : 'upcoming' } })}>{d.direction === 'receivable' ? 'Cobrar ' : 'Pagar '}{M(i.amountMinor - (i.paidMinor || 0), d.currency)}</button>}
            </div>
          );
        })}
      </div>
      {!pend.length && <p className="note">Todo saldado.</p>}
      <button className="dngrow" style={{ textAlign: 'center' }} onClick={() => open('confirm', { title: 'Archivar', text: 'Deja de aparecer en la agenda. Sus pagos siguen en tu historial.', ok: 'Archivar', onOk: () => commit((x) => { x.debts.find((y: any) => y.id === d.id).archived = true; }) && notify('Archivado', () => commit((x) => { x.debts.find((y: any) => y.id === d.id).archived = false; })) })}>Archivar</button>
    </SheetFrame>
  );
}

function SettleSheet({ item }: { item: C.Upcoming }) {
  const { s } = useWallet();
  const { close, dark } = useUI();
  const M = useMoney();
  const debt = item.type === 'debt' ? s.debts.find((d: any) => d.id === item.id) : null;
  const fixed = item.type === 'fixed' ? s.fixed.find((f: any) => f.id === item.id) : null;
  const cur = (debt || fixed || {}).currency || s.settings.activeCurrency;
  const accs = C.accountsByCurrency(s, cur).filter((a: any) => !a.archived && a.kind !== 'reserve');
  const [acc, setAcc] = useState<string>(s.settings.lastAccountId && accs.some((a: any) => a.id === s.settings.lastAccountId) ? s.settings.lastAccountId : (accs[0] || {}).id);
  const [amt, setAmt] = useState(String(C.fromMinor(item.amountMinor, cur)));
  const receiving = item.direction === 'receivable';
  const go = () => {
    if (!acc) return notify('Necesitas una cuenta en esa moneda');
    if (debt) { if (settleInstallment(debt.id, item.installmentId!, acc, C.toMinor(amt, cur))) close(); }
    else if (fixed) { if (settleFixed(fixed.id, acc)) close(); }
  };
  return (
    <SheetFrame title={(receiving ? 'Cobrar ' : 'Pagar ') + item.label} sub={item.status === 'overdue' ? 'Venció el ' + C.shortDate(item.date) : 'Vence el ' + C.shortDate(item.date)} onClose={close}>
      {debt ? <label className="wq">Monto ({C.currencyMeta(cur).symbol})<input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(',', '.'))} /></label> : <div className="erow"><span>Monto</span><b>{M(item.amountMinor, cur)}</b></div>}
      <div className="lab">{receiving ? 'Entra a' : 'Sale de'}</div>
      <div className="raccs noscr">
        {accs.map((a: any) => (
          <button key={a.id} className={'ra2w' + (acc === a.id ? ' on' : '')} aria-pressed={acc === a.id} onClick={() => setAcc(a.id)} aria-label={a.name}>
            <CardFace account={a} dark={dark} className="ra2"><i className="ck" aria-hidden="true">✓</i></CardFace>
            <span className="ral">{a.name}</span>
          </button>
        ))}
      </div>
      <button className="okb" onClick={go}>{receiving ? 'Registrar cobro' : 'Registrar pago'}</button>
      <p className="note">Se registra como {receiving ? 'ingreso' : 'gasto'} en esa cuenta. Puedes deshacerlo.</p>
    </SheetFrame>
  );
}

function BudgetSheet() {
  const { s } = useWallet();
  const { close } = useUI();
  const cur = s.settings.activeCurrency;
  const [v, setV] = useState(String(C.fromMinor(C.budgetFor(s, cur).monthlyMinor || 0, cur) || ''));
  return (
    <SheetFrame title="Límite del mes" sub={C.currencyMeta(cur).name} onClose={close}>
      <label className="wq">Cuánto quieres gastar como máximo ({C.currencyMeta(cur).symbol})<input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value.replace(',', '.'))} placeholder="0" autoFocus /></label>
      <p className="note">Solo cuentan los gastos reales. Mover entre cuentas, cambiar moneda o ahorrar no consume tu límite. Déjalo en cero para quitarlo.</p>
      <button className="okb" onClick={() => { if (commit((x) => { C.ensureBudget(x, cur).monthlyMinor = C.toMinor(v || 0, cur); })) { notify('Límite actualizado'); close(); } }}>Guardar</button>
    </SheetFrame>
  );
}

function CatLimits() {
  const { s } = useWallet();
  const { close } = useUI();
  const cur = s.settings.activeCurrency;
  const b = C.budgetFor(s, cur);
  const cats = (s.categories.expense || []).filter((c: any) => !c.archived).map((c: any) => c.name);
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(cats.map((c: string) => [c, b.categories && b.categories[c] ? String(C.fromMinor(b.categories[c], cur)) : ''])));
  return (
    <SheetFrame title="Límites por categoría" onClose={close} full>
      <p className="note">Deja vacío para no poner límite.</p>
      {cats.map((c: string) => <label className="wq" key={c}>{C.showCat(c)}<input inputMode="decimal" value={vals[c] || ''} onChange={(e) => setVals({ ...vals, [c]: e.target.value.replace(',', '.') })} placeholder="Sin límite" /></label>)}
      <button className="okb" onClick={() => { if (commit((x) => { const bb = C.ensureBudget(x, cur); bb.categories = bb.categories || {}; cats.forEach((c: string) => { bb.categories[c] = C.toMinor(vals[c] || 0, cur); }); })) { notify('Límites guardados'); close(); } }}>Guardar</button>
    </SheetFrame>
  );
}

function Categories() {
  const { s } = useWallet();
  const { close } = useUI();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const list = (s.categories[type] || []);
  const add = () => {
    const nm = name.trim(); if (!nm) return;
    if (list.some((c: any) => C.normalizeText(c.name) === C.normalizeText(nm) && !c.archived)) return notify('Ya existe');
    if (commit((x) => { const ex = x.categories[type].find((c: any) => C.normalizeText(c.name) === C.normalizeText(nm)); if (ex) ex.archived = false; else x.categories[type].push({ id: C.uid('cat'), name: nm, subcategories: [], archived: false, builtin: false }); })) { setName(''); notify('Categoría agregada'); }
  };
  return (
    <SheetFrame title="Categorías" onClose={close} full>
      <Seg items={[['expense', 'Gastos'], ['income', 'Ingresos']]} value={type} onChange={setType} label="Tipo" />
      <div style={{ display: 'flex', gap: 8 }}><label className="wq" style={{ flex: 1 }}><span className="sr">Nueva categoría</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva categoría" /></label><button className="liq pri" style={{ alignSelf: 'flex-end', minHeight: 44 }} onClick={add}>Agregar</button></div>
      <div className="dl">
        {list.map((c: any) => (
          <div key={c.id} className="srow" style={{ padding: '4px 0' }}>
            <span className="sc"><b style={{ opacity: c.archived ? 0.5 : 1 }}>{C.showCat(c.name)}</b>{c.archived && <small>Oculta</small>}</span>
            <button className="liq" onClick={() => commit((x) => { const y = x.categories[type].find((z: any) => z.id === c.id); y.archived = !y.archived; })}>{c.archived ? 'Mostrar' : 'Ocultar'}</button>
          </div>
        ))}
      </div>
      <p className="note">Ocultar no borra: los movimientos viejos conservan su categoría.</p>
    </SheetFrame>
  );
}

const TAGS = ['Cansado', 'Ansioso', 'Contento', 'Estresado', 'Aburrido', 'Con energía', 'Triste', 'Tranquilo'];
function MoodSheet() {
  const { s } = useWallet();
  const { close } = useUI();
  const last = C.normalizeMood(C.latestMoodCheckin(s));
  const [v, setV] = useState(last ? last.valence : 55);
  const [e, setE] = useState(last ? last.energy : 55);
  const [t, setT] = useState(last ? last.tension : 35);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const onPt = (ev: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    setV(Math.round(C.clamp(((ev.clientX - r.left) / r.width) * 100, 0, 100)));
    setE(Math.round(C.clamp((1 - (ev.clientY - r.top) / r.height) * 100, 0, 100)));
  };
  const desc = C.moodDescriptor({ valence: v, energy: e, tension: t });
  return (
    <SheetFrame title="¿Cómo estás?" sub={'Ahora: ' + desc} onClose={close} full>
      <div ref={ref} className="moodmap" onPointerDown={(ev) => { (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId); onPt(ev); }} onPointerMove={(ev) => { if (ev.buttons) onPt(ev); }} role="slider" aria-label="Ánimo y energía" aria-valuetext={desc} tabIndex={0}
        onKeyDown={(ev) => { if (ev.key === 'ArrowLeft') setV(Math.max(0, v - 5)); if (ev.key === 'ArrowRight') setV(Math.min(100, v + 5)); if (ev.key === 'ArrowUp') setE(Math.min(100, e + 5)); if (ev.key === 'ArrowDown') setE(Math.max(0, e - 5)); }}>
        <span className="ax" style={{ left: 10, bottom: 8 }}>Mal</span><span className="ax" style={{ right: 10, bottom: 8 }}>Bien</span><span className="ax" style={{ left: '50%', top: 8, transform: 'translateX(-50%)' }}>Con energía</span><span className="ax" style={{ left: '50%', bottom: 8, transform: 'translateX(-50%)' }}>Sin energía</span>
        <i className="dotm" style={{ left: v + '%', top: 100 - e + '%' }} />
      </div>
      <label className="range">Tensión: {t < 30 ? 'baja' : t < 65 ? 'media' : 'alta'}<input type="range" min={0} max={100} value={t} onChange={(ev) => setT(Number(ev.target.value))} /></label>
      <div className="tags">{TAGS.map((g) => <button key={g} className={'cc' + (tags.includes(g) ? ' on' : '')} onClick={() => setTags(tags.includes(g) ? tags.filter((x) => x !== g) : tags.concat([g]).slice(0, 5))}>{g}</button>)}</div>
      <label className="wq">Nota (opcional)<input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Algo que quieras recordar" /></label>
      <button className="okb" onClick={() => { addMoodCheckin({ valence: v, energy: e, tension: t, tags, note }); close(); }}>Guardar</button>
      <p className="note">Dura unas horas: los gastos que registres en ese tiempo guardan este contexto.</p>
    </SheetFrame>
  );
}

function CurrencySheet() {
  const { s } = useWallet();
  const { close } = useUI();
  const [code, setCode] = useState('');
  const enable = (c: string) => { c = c.toUpperCase(); if (!/^[A-Z]{3}$/.test(c)) return notify('Usa un código de 3 letras, como EUR'); if (commit((x) => { if (!x.settings.enabledCurrencies.includes(c)) x.settings.enabledCurrencies.push(c); x.settings.activeCurrency = c; })) { notify(C.currencyMeta(c).name + ' agregada'); close(); } };
  return (
    <SheetFrame title="Agregar moneda" onClose={close} full>
      <p className="note">Cada moneda lleva su propia cuenta. Nunca se mezclan ni se suman.</p>
      <div className="dl">{Object.keys(C.CURRENCY_META).filter((c) => !s.settings.enabledCurrencies.includes(c)).map((c) => <button key={c} className="mrow" onClick={() => enable(c)}><span className="nm"><span>{C.currencyMeta(c).name}</span><span className="dt">{c}, {C.currencyMeta(c).symbol}</span></span><span className="lnk">Agregar</span></button>)}</div>
      <label className="wq">Otro código<input value={code} maxLength={3} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ej. SEK" /></label>
      <button className="okb" onClick={() => enable(code)}>Agregar código</button>
    </SheetFrame>
  );
}

function Ask({ prompt }: { prompt?: string }) {
  const { close, open } = useUI();
  const [hist, setHist] = useState<Msg[]>(() => { try { return JSON.parse(sessionStorage.getItem('wallet_ai_chat') || '[]'); } catch { return []; } });
  const [text, setText] = useState(prompt || '');
  const [busy, setBusy] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { try { sessionStorage.setItem('wallet_ai_chat', JSON.stringify(hist.slice(-30))); } catch { /* */ } body.current?.scrollIntoView({ block: 'end' }); }, [hist]);
  const post = (a: PostAction) => {
    if (!a) return;
    if (a.kind === 'move') setTimeout(() => open('register', { tab: 'move', fromId: a.fromId, toId: a.toId, amount: a.amount }), 400);
    if (a.kind === 'delete') setTimeout(() => open('op', { id: a.id }), 400);
  };
  const send = async (msg: string) => {
    const m = msg.trim(); if (!m || busy) return;
    const h = hist.concat([{ role: 'user', text: m }]);
    setHist(h); setText(''); setBusy(true);
    try { const r = await chat(h); setHist(h.concat([{ role: 'model', text: r.text, sources: r.sources }])); post(r.action); }
    catch (e: any) { setHist(h.concat([{ role: 'model', text: e.message || 'No pude responder ahora.', error: true }])); }
    finally { setBusy(false); }
  };
  const SUG = ['¿Cuánto gasté este mes?', '¿Qué categoría pesa más?', 'Registra 15 soles de almuerzo', '¿Cómo voy con mi límite?'];
  return (
    <SheetFrame title="Preguntar" sub="La IA lee tus datos de Wallet" onClose={close} full>
      <div className="chat">
        {!hist.length && <div className="sugs">{SUG.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}</div>}
        {hist.map((m, i) => (
          <div key={i} className={'msg ' + (m.role === 'user' ? 'u' : 'm') + (m.error ? ' err' : '')}>
            {m.text}
            {m.sources && m.sources.length > 0 && <div style={{ marginTop: 6, fontSize: 13 }}>{m.sources.slice(0, 3).map((x) => <div key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer">{x.title}</a></div>)}</div>}
          </div>
        ))}
        {busy && <div className="msg m">Pensando…</div>}
        <div ref={body} />
      </div>
      <div className="compose">
        <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe o pide algo" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} aria-label="Mensaje" />
        <button className="send" onClick={() => send(text)} disabled={busy || !text.trim()} aria-label="Enviar"><ISend /></button>
      </div>
      {hist.length > 0 && <button className="ed" style={{ alignSelf: 'center' }} onClick={() => setHist([])}>Nueva conversación</button>}
      <p className="note" style={{ textAlign: 'center' }}>La IA puede equivocarse. Lo que borra o cambia de moneda siempre te lo pregunta antes.</p>
    </SheetFrame>
  );
}

function WatchAdd() {
  const { s } = useWallet();
  const { close } = useUI();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const search = async () => {
    if (q.trim().length < 2) return;
    setBusy(true); setErr('');
    try { setRes(await searchSymbols(q.trim())); } catch { setErr('No pude buscar ahora.'); } finally { setBusy(false); }
  };
  const add = (p: any) => {
    const id = p.provider === 'coingecko' ? p.id : p.symbol.charAt(0) === '^' ? p.symbol.toLowerCase() : String(p.symbol).toLowerCase() + '.us';
    if ((s.watchlist || []).some((x: any) => x.id === id)) return notify('Ya lo sigues');
    if ((s.watchlist || []).length >= 20) return notify('Puedes seguir hasta 20');
    if (commit((x) => { x.watchlist.push({ id, label: String(p.name).slice(0, 24), detail: p.symbol + ' · ' + (p.exchange || p.kind), kind: p.kind }); })) { notify('Siguiendo ' + p.name); close(); }
  };
  return (
    <SheetFrame title="Agregar inversión" onClose={close} full>
      <div style={{ display: 'flex', gap: 8 }}><label className="wq" style={{ flex: 1 }}><span className="sr">Buscar</span><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="apple, bitcoin, vanguard…" autoFocus /></label><button className="liq pri" style={{ alignSelf: 'flex-end', minHeight: 44 }} onClick={search}>Buscar</button></div>
      {busy && <p className="note">Buscando…</p>}
      {err && <p className="note">{err}</p>}
      <div className="dl">{res.map((p) => <button key={p.provider + p.id + p.symbol} className="mrow" onClick={() => add(p)}><span className="lft"><span className="tkr">{String(p.symbol).slice(0, 5)}</span><span className="nm"><span>{p.name}</span><span className="dt">{p.exchange || p.kind}</span></span></span><span className="lnk">Seguir</span></button>)}</div>
      {!res.length && !busy && <p className="note">Acciones y fondos de EE. UU. y cripto.</p>}
    </SheetFrame>
  );
}
function WatchEdit({ id }: { id: string }) {
  const { s } = useWallet();
  const { close } = useUI();
  const w = (s.watchlist || []).find((x: any) => x.id === id);
  const [qty, setQty] = useState(w && w.qty ? String(w.qty) : '');
  const [buy, setBuy] = useState(w && w.buy ? String(w.buy) : '');
  if (!w) return null;
  return (
    <SheetFrame title={w.label} sub="Lo que tienes (opcional)" onClose={close}>
      <label className="wq">Cuántas tienes<input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(',', '.'))} placeholder="0" /></label>
      <label className="wq">A cuánto compraste (US$ por unidad)<input inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value.replace(',', '.'))} placeholder="0.00" /></label>
      <button className="okb" onClick={() => { if (commit((x) => { const y = x.watchlist.find((z: any) => z.id === id); y.qty = Number(qty) || 0; y.buy = Number(buy) || 0; })) close(); }}>Guardar</button>
    </SheetFrame>
  );
}
