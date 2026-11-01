/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as C from '../domain/core';
import * as D from '../domain/derive';
import { useWallet, addOperation, updateOperation, notify } from '../store';
import { useUI } from '../ui/ctx';
import { SheetFrame, Seg, AmountField, useKeypad, CardFace, useMoney } from '../ui/bits';
import { bankOf, cssVars, skinFor } from '../design/theme';
import { referenceRate } from '../net';

type Tab = 'expense' | 'income' | 'move';

export default function Register({ props }: { props: any }) {
  const { s } = useWallet();
  const { close, dark, look, open } = useUI();
  const M = useMoney();
  const editing = props.editId ? s.operations.find((o: any) => o.id === props.editId) : null;
  const cur = editing ? editing.currency : (props.accountId && C.accountById(s, props.accountId)?.currency) || s.settings.activeCurrency;
  const [tab, setTab] = useState<Tab>(editing ? editing.type : props.tab || 'expense');
  const kp = useKeypad(editing ? String(C.fromMinor(editing.amountMinor, cur)) : props.amount ? String(props.amount) : '');
  const [what, setWhat] = useState(editing ? editing.concept : '');
  const [cat, setCat] = useState<string>(editing ? editing.category : '');
  const [auto, setAuto] = useState('');
  const regular = C.accountsByCurrency(s, cur).filter((a: any) => !a.archived && a.kind !== 'reserve');
  const [acc, setAcc] = useState<string>(editing ? editing.accountId : props.accountId && regular.some((a: any) => a.id === props.accountId) ? props.accountId : D.defaultAccountId(s, cur));
  const [dayMode, setDayMode] = useState<'hoy' | 'ayer' | 'otro'>(editing ? (C.sameDay(editing.date, C.todayLocal()) ? 'hoy' : 'otro') : 'hoy');
  const [otherDate, setOtherDate] = useState(editing ? String(editing.date).slice(0, 10) : C.todayLocal());
  const [note, setNote] = useState(editing ? editing.note || '' : '');
  // El monto se escribe con el teclado del teléfono, que ya viene abierto desde el toque en Registrar.
  const amtRef = useRef<HTMLInputElement>(null);
  const whatRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!editing && !props.amount) { amtRef.current?.focus({ preventScroll: true }); return; }
    const a = document.activeElement as HTMLElement | null;
    if (a && a.classList.contains('kbprime')) a.blur();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mover
  const allAcc = s.accounts.filter((a: any) => !a.archived);
  const [from, setFrom] = useState<string>(props.fromId || (props.toId ? (allAcc.find((a: any) => a.id !== props.toId && a.currency === (C.accountById(s, props.toId) || {}).currency && a.kind !== 'reserve') || {}).id : acc) || (allAcc[0] || {}).id);
  const [to, setTo] = useState<string>(props.toId || (allAcc.find((a: any) => a.id !== from && a.currency === (C.accountById(s, from) || {}).currency) || allAcc.find((a: any) => a.id !== from) || {}).id);
  const [rate, setRate] = useState<{ display: string; direction: 'direct' | 'inverse'; ref: number | null; label: string; loading: boolean }>({ display: '', direction: 'direct', ref: null, label: '', loading: false });
  const fromA = C.accountById(s, from), toA = C.accountById(s, to);
  const cross = !!(fromA && toA && fromA.currency !== toA.currency);

  useEffect(() => {
    if (tab !== 'move' || !cross || !fromA || !toA) return;
    let alive = true;
    setRate((r) => ({ ...r, loading: true }));
    referenceRate(fromA.currency, toA.currency, s.rates).then((res: any) => {
      if (!alive) return;
      const direct = Number(res.rate);
      const inv = direct < 1;
      const display = inv ? Number((1 / direct).toFixed(6)) : Number(direct.toFixed(6));
      setRate({ display: String(display), direction: inv ? 'inverse' : 'direct', ref: direct, loading: false, label: (inv ? '1 ' + toA.currency + ' = ' + display + ' ' + fromA.currency : '1 ' + fromA.currency + ' = ' + display + ' ' + toA.currency) + ', referencia de mercado' });
    }).catch(() => { if (alive) setRate({ display: '', direction: 'direct', ref: null, loading: false, label: 'Sin conexión a la referencia. Escribe la tasa que te dieron.' }); });
    return () => { alive = false; };
  }, [tab, from, to]);

  const type = tab === 'income' ? 'income' : 'expense';
  const cats = (s.categories[type] || []).filter((c: any) => !c.archived).map((c: any) => c.name);
  const chosenCat = cat || auto || (type === 'income' ? 'Otros ingresos' : 'Otros');
  const orderedCats = useMemo(() => [chosenCat].concat(cats.filter((c: string) => c !== chosenCat)).filter((c: string) => cats.includes(c) || c === chosenCat), [chosenCat, cats.join('|')]);
  const freq = useMemo(() => C.catalogSuggestions(s, cur, type, '').slice(0, 8), [s, cur, type]);
  const sugg = useMemo(() => (what.trim().length >= 2 ? C.catalogSuggestions(s, cur, type, what.trim()).slice(0, 6) : []), [s, cur, type, what]);

  const onWhat = (v: string) => {
    setWhat(v);
    const p = D.parseWhat(s, v, cur, type);
    if (p.amount && !kp.value) kp.set(p.amount);
    setAuto(p.category || '');
  };
  const choose = (x: any) => { setWhat(x.concept); setCat(x.category); if (!kp.value || Number(kp.value) === 0) kp.set(String(C.fromMinor(x.amountMinor, cur))); if (x.accountId && regular.some((a: any) => a.id === x.accountId) && !props.accountId) setAcc(x.accountId); };

  const amountMinor = C.toMinor(kp.value || 0, tab === 'move' && fromA ? fromA.currency : cur);
  const accObj = C.accountById(s, acc);
  const dateIso = (() => {
    if (dayMode === 'hoy') return C.nowIsoLocal();
    if (dayMode === 'ayer') return C.nowIsoLocal(new Date(Date.now() - 864e5));
    return otherDate + 'T12:00:00';
  })();

  const submit = () => {
    if (tab === 'move') {
      if (!fromA || !toA || fromA.id === toA.id) return notify('Elige dos cuentas distintas');
      if (!amountMinor) return notify('Escribe cuánto mueves');
      if (!cross) {
        const op = addOperation({ type: 'transfer', fromAccountId: fromA.id, toAccountId: toA.id, currency: fromA.currency, amountMinor, concept: toA.kind === 'reserve' ? 'Aporte a ' + toA.name : 'Transferencia interna', date: dateIso }, 'Moviste ' + C.money(amountMinor, fromA.currency) + ' a ' + toA.name);
        if (op) close();
        return;
      }
      const dr = Number(rate.display); if (!dr || dr <= 0) return notify('Escribe un tipo de cambio válido');
      const direct = rate.direction === 'inverse' ? 1 / dr : dr;
      const toAmountMinor = C.toMinor(C.fromMinor(amountMinor, fromA.currency) * direct, toA.currency);
      const op = addOperation({ type: 'fx', fromAccountId: fromA.id, toAccountId: toA.id, fromCurrency: fromA.currency, toCurrency: toA.currency, fromAmountMinor: amountMinor, toAmountMinor, directRate: direct, displayRate: dr, rateDirection: rate.direction, referenceDirectRate: rate.ref, concept: 'Cambio de divisa', date: dateIso }, 'Cambio registrado');
      if (op) close();
      return;
    }
    if (!amountMinor) return notify('Escribe el monto');
    if (!accObj) return notify('Elige una cuenta');
    const concept = (what.trim() || chosenCat).trim();
    const base: any = { type, accountId: accObj.id, currency: cur, amountMinor, category: chosenCat, concept, note };
    if (editing) {
      if (updateOperation(editing.id, Object.assign(base, { date: dayMode === 'otro' && otherDate !== String(editing.date).slice(0, 10) ? otherDate + 'T12:00:00' : dayMode === 'otro' ? editing.date : dateIso }))) close();
      return;
    }
    base.date = dateIso;
    base.mood = C.moodForNewOperation(s, dateIso);
    const op = addOperation(base, (type === 'income' ? 'Registraste ' : 'Registraste ') + concept.toLowerCase() + ', ' + C.money(amountMinor, cur) + ', en ' + accObj.name);
    if (op) close();
  };

  // La hoja toma el color de la cuenta elegida.
  const skinAcc = tab === 'move' ? fromA : accObj;
  const skin = skinFor(look.style === 'bank' && skinAcc ? bankOf(skinAcc) : 'wallet', dark, look);
  const ok = tab === 'move' ? (fromA && toA ? (cross ? 'Cambiar ' : 'Mover ') + (amountMinor ? C.money(amountMinor, fromA.currency) : '') + ' a ' + toA.name : 'Mover') : (editing ? 'Guardar cambios' : 'Registrar ' + (amountMinor ? C.money(amountMinor, cur) + ' ' : '') + 'en ' + (accObj ? accObj.name : ''));
  const disabled = !amountMinor || (tab !== 'move' && !accObj) || (tab === 'move' && cross && !Number(rate.display));

  if (tab !== 'move' && !regular.length) {
    return (
      <SheetFrame title="Registrar" onClose={close}>
        <div className="empty" style={{ marginTop: 0 }}><b>Primero necesitas una cuenta en {C.currencyMeta(cur).name.toLowerCase()}.</b><span>Las metas de ahorro no se usan para gastar.</span><button className="liq pri" onClick={() => open('account-new', { currency: cur })}>Crear cuenta</button></div>
      </SheetFrame>
    );
  }

  return (
    <div style={cssVars(skin) as any}>
      <SheetFrame title={editing ? 'Editar movimiento' : 'Registrar'} onClose={close} full>
        {!editing && <Seg items={[['expense', 'Gasto'], ['income', 'Ingreso'], ['move', 'Mover']]} value={tab} onChange={setTab} label="Tipo" className="n3" />}
        <AmountField ref={amtRef} value={kp.value} onChange={kp.set} onEnter={() => (whatRef.current ? whatRef.current.focus() : amtRef.current?.blur())} currency={tab === 'move' && fromA ? fromA.currency : cur} />
        {tab !== 'move' ? <>
          <label className="wq">¿Qué fue?<input ref={whatRef} value={what} onChange={(e) => onWhat(e.target.value)} placeholder={type === 'income' ? 'Ej. sueldo, venta' : 'Ej. uber 18, almuerzo 15'} autoComplete="off" enterKeyHint="done" /></label>
          {sugg.length > 0 && what.trim() && !sugg.some((x: any) => C.normalizeText(x.concept) === C.normalizeText(what)) && (
            <div className="fq noscr">{sugg.map((x: any) => <button key={x.concept} className="fqc" onClick={() => choose(x)}>{x.concept} <span className="fqa">{C.money(x.amountMinor, cur)}</span></button>)}</div>
          )}
          {!what.trim() && freq.length > 0 && <>
            <div className="lab2"><span className="lab">Frecuentes</span></div>
            <div className="fq noscr">{freq.map((x: any) => <button key={x.concept} className="fqc" onClick={() => choose(x)}>{x.concept} <span className="fqa">{C.money(x.amountMinor, cur)}</span></button>)}</div>
          </>}
          <div className="lab2"><span className="lab">Categoría{!cat && auto ? ', sugerida' : ''}</span><button className="ed" onClick={() => open('categories')}>Editar</button></div>
          <div className="cats noscr">{orderedCats.map((c: string) => <button key={c} className={'cc' + (chosenCat === c ? ' on' : '')} aria-pressed={chosenCat === c} onClick={() => setCat(c)}>{C.showCat(c)}</button>)}</div>
          <div className="lab">Cuenta</div>
          <div className="raccs noscr">
            {regular.map((a: any) => (
              <button key={a.id} className={'ra2w' + (acc === a.id ? ' on' : '')} aria-pressed={acc === a.id} onClick={() => setAcc(a.id)} aria-label={a.name + ', ' + M(C.balanceOf(s, a), cur)}>
                <CardFace account={a} dark={dark} className="ra2"><i className="ck" aria-hidden="true">✓</i></CardFace>
                <span className="ral">{a.name}</span>
              </button>
            ))}
          </div>
        </> : <>
          <div className="lab">Desde</div>
          <div className="raccs noscr">
            {allAcc.map((a: any) => (
              <button key={a.id} className={'ra2w' + (from === a.id ? ' on' : '')} aria-pressed={from === a.id} onClick={() => { setFrom(a.id); if (to === a.id) setTo((allAcc.find((b: any) => b.id !== a.id) || {}).id); }} aria-label={'Desde ' + a.name}>
                <CardFace account={a} dark={dark} className="ra2"><i className="ck" aria-hidden="true">✓</i></CardFace>
                <span className="ral">{a.name}</span>
              </button>
            ))}
          </div>
          <div className="lab">Hacia</div>
          <div className="raccs noscr">
            {allAcc.filter((a: any) => a.id !== from).map((a: any) => (
              <button key={a.id} className={'ra2w' + (to === a.id ? ' on' : '')} aria-pressed={to === a.id} onClick={() => setTo(a.id)} aria-label={'Hacia ' + a.name}>
                <CardFace account={a} dark={dark} className="ra2"><i className="ck" aria-hidden="true">✓</i></CardFace>
                <span className="ral">{a.name}{a.currency !== (fromA || {}).currency ? ' ' + C.currencyMeta(a.currency).symbol : ''}</span>
              </button>
            ))}
          </div>
          {cross && <label className="wq">Tipo de cambio{rate.loading ? ', consultando…' : ''}<input inputMode="decimal" value={rate.display} onChange={(e) => setRate({ ...rate, display: e.target.value.replace(',', '.') })} placeholder="Tasa" /><span className="hint2">{rate.label || 'Puedes escribir la tasa que te dieron.'}</span></label>}
          <p className="hint2">{!fromA || !toA ? '' : cross ? (Number(rate.display) && amountMinor ? 'Recibes ' + C.money(C.toMinor(C.fromMinor(amountMinor, fromA.currency) * (rate.direction === 'inverse' ? 1 / Number(rate.display) : Number(rate.display)), toA.currency), toA.currency) + ' en ' + toA.name + '.' : 'Escribe monto y tasa para ver cuánto recibes.') : 'Mover entre tus cuentas no cambia tu patrimonio.'}</p>
        </>}
        <div className="lab">Cuándo</div>
        <div className="dys">
          <button className={'cc' + (dayMode === 'hoy' ? ' on' : '')} onClick={() => setDayMode('hoy')}>Hoy</button>
          <button className={'cc' + (dayMode === 'ayer' ? ' on' : '')} onClick={() => setDayMode('ayer')}>Ayer</button>
          {dayMode === 'otro' ? <input type="date" value={otherDate} max={C.todayLocal()} onChange={(e) => setOtherDate(e.target.value)} aria-label="Fecha" /> : <button className="cc" onClick={() => setDayMode('otro')}>Otro día</button>}
        </div>
        {editing && <label className="wq">Nota<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" /></label>}
        <div className="okwrap"><button className={'okb' + (disabled ? ' dis' : '')} disabled={disabled} onClick={submit}>{ok}</button></div>
      </SheetFrame>
    </div>
  );
}
