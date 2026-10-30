/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import * as C from '../domain/core';
import { useWallet } from '../store';
import { useUI } from '../ui/ctx';
import { useMoney, CurTabs } from '../ui/bits';
import { ISearch } from '../ui/icons';
import { OpRow } from './Home';
import { PageTitle, Banner } from './parts';
import { setCurrency } from '../App';

const FL: [string, string][] = [['all', 'Todo'], ['expense', 'Gastos'], ['income', 'Ingresos'], ['transfer', 'Transferencias'], ['adjustment', 'Ajustes']];

export default function Movements() {
  const { s } = useWallet();
  const { sel, setSel, open } = useUI();
  const M = useMoney();
  const cur = s.settings.activeCurrency;
  const [q, setQ] = useState('');
  const [flt, setFlt] = useState('all');
  const [month, setMonth] = useState(C.currentPeriod());
  const acc = sel ? C.accountById(s, sel) : null;

  const all = useMemo(() => (acc ? C.operationsForAccount(s, acc.id).filter((o: any) => !o.voided) : C.operationsForCurrency(s, cur)), [s, acc, cur]);
  const months = useMemo(() => Array.from(new Set<string>(all.map((o: any) => C.periodOf(o.date)))).filter(Boolean).sort().reverse(), [all]);
  if (!months.includes(C.currentPeriod())) months.unshift(C.currentPeriod());
  let list = all;
  if (month !== 'all') list = list.filter((o: any) => C.periodOf(o.date) === month);
  if (flt !== 'all') list = flt === 'transfer' ? list.filter((o: any) => o.type === 'transfer' || o.type === 'fx') : list.filter((o: any) => o.type === flt);
  const nq = C.normalizeText(q);
  if (nq) list = list.filter((o: any) => C.normalizeText(C.operationTitle(s, o) + ' ' + (o.category || '') + ' ' + (o.note || '') + ' ' + C.accountName(s, o.accountId || o.fromAccountId) + ' ' + C.fromMinor(o.amountMinor || o.fromAmountMinor || 0, cur)).includes(nq));

  // Totales de lo visible, mismas reglas que la v21.
  const out = C.sumMinor(list.filter((o: any) => o.type === 'expense' && !o.excludedFromSpending));
  const inc = C.sumMinor(list.filter((o: any) => o.type === 'income'));
  const net = inc - out;

  const groups: { key: string; ops: any[] }[] = [];
  list.forEach((o: any) => { const k = String(o.date || '').slice(0, 10); let g = groups.find((x) => x.key === k); if (!g) { g = { key: k, ops: [] }; groups.push(g); } g.ops.push(o); });

  const title = acc ? 'Movimientos en ' + acc.name : 'Movimientos';
  const sub = (month === 'all' ? 'Todo el historial' : C.monthLabel(month)) + ', ' + list.length + (list.length === 1 ? ' movimiento' : ' movimientos');

  return (
    <div className="scr noscr nohdr">
      <div className="zz">
        <Banner />
        <PageTitle title={title} sub={sub} right={<CurTabs small value={cur} list={s.settings.enabledCurrencies} onChange={(c) => { setSel(null); setCurrency(c); }} />} />
        <div className="sec"><div className="strip3">
          <span><small>Entradas</small><b className="nums">{M(inc, cur)}</b></span>
          <span><small>Salidas</small><b className="nums">{M(out, cur)}</b></span>
          <span><small>Neto</small><b className="nums">{M(net, cur, true)}</b></span>
        </div></div>
        <div className="sec"><label className="srch"><ISearch /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, categoría o monto" aria-label="Buscar movimientos" /></label></div>
        <div className="sec flt noscr" role="group" aria-label="Filtrar">
          <select className="fsel" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mes">
            <option value="all">Todo</option>
            {months.map((m) => <option key={m} value={m}>{C.monthLabel(m)}</option>)}
          </select>
          {FL.map(([k, t]) => <button key={k} className={'fc' + (flt === k ? ' on' : '')} aria-pressed={flt === k} onClick={() => setFlt(k)}>{t}</button>)}
          {acc && <button className="fc" onClick={() => setSel(null)}>{acc.name} ✕</button>}
        </div>
        <div className="sec">
          {groups.map((g) => {
            const e = C.sumMinor(g.ops.filter((o: any) => o.type === 'expense' && !o.excludedFromSpending));
            const i = C.sumMinor(g.ops.filter((o: any) => o.type === 'income'));
            return (
              <div className="day" key={g.key}>
                <div className="dh"><b>{C.dayLabel(g.key)}</b>{i - e !== 0 && <span className="nums">{M(i - e, cur, true)}</span>}</div>
                <div className="dl">{g.ops.map((o: any) => <OpRow key={o.id} op={o} cur={cur} accountId={acc ? acc.id : undefined} />)}</div>
              </div>
            );
          })}
          {!groups.length && (
            <div className="empty">
              <b>{q || flt !== 'all' ? 'No encontré movimientos así.' : 'Aquí todavía no pasa nada.'}</b>
              <span>{q || flt !== 'all' ? 'Prueba otro mes, otro filtro u otra palabra.' : 'Cuando registres algo, aparece aquí.'}</span>
              {q || flt !== 'all' ? <button className="liq" onClick={() => { setQ(''); setFlt('all'); }}>Limpiar filtros</button> : <button className="liq pri" onClick={() => open('register', { accountId: sel || undefined })}>Registrar</button>}
            </div>
          )}
        </div>
        <div className="endpad" />
      </div>
    </div>
  );
}
