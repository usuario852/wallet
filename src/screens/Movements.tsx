/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import * as C from '../domain/core';
import { useWallet } from '../store';
import { useUI } from '../ui/ctx';
import { useMoney, CurTabs } from '../ui/bits';
import { bankOf, tileSrc } from '../design/theme';
import { ISearch } from '../ui/icons';
import { OpRow } from './Home';
import { PageTitle, Banner } from './parts';
import { setCurrency } from '../App';

// "Hoy", "Ayer" o el día de la semana; el número va en el sello.
function dayHead(key: string) { return C.dayLabel(key); }

const FL: [string, string][] = [['all', 'Todo'], ['expense', 'Gastos'], ['income', 'Ingresos'], ['transfer', 'Transferencias'], ['adjustment', 'Ajustes']];

export default function Movements() {
  const { s } = useWallet();
  const { sel, setSel, open, dark } = useUI();
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
  const maxF = Math.max(inc, out, 1);

  const groups: { key: string; ops: any[] }[] = [];
  list.forEach((o: any) => { const k = String(o.date || '').slice(0, 10); let g = groups.find((x) => x.key === k); if (!g) { g = { key: k, ops: [] }; groups.push(g); } g.ops.push(o); });

  const title = acc ? 'Movimientos en ' + acc.name : 'Movimientos';
  const period = month === 'all' ? 'Todo el historial' : C.monthLabel(month);
  const eyebrow = period + ' · ' + C.currencyMeta(cur).name;
  const filtered = !!q || flt !== 'all';

  return (
    <div className="scr noscr nohdr">
      <div className="zz">
        <Banner />
        <PageTitle eyebrow={eyebrow} title={title} right={<CurTabs small value={cur} list={s.settings.enabledCurrencies} onChange={(c) => { setSel(null); setCurrency(c); }} />} />
        {acc && <div className="sec accline">{tileSrc(bankOf(acc)) && <img className="hlogo" src={tileSrc(bankOf(acc))} alt="" />}<span>Saldo de {acc.name}</span><b className="nums">{M(C.balanceOf(s, acc), acc.currency)}</b></div>}
        <div className="sec"><div className="flow" role="group" aria-label="Entradas y salidas">
          <div className="frow"><span>Entró</span><i className="fb"><i className="fin" style={{ width: (inc / maxF) * 100 + '%' }} /></i><b className="nums">{M(inc, cur)}</b></div>
          <div className="frow"><span>Salió</span><i className="fb"><i className="fout" style={{ width: (out / maxF) * 100 + '%' }} /></i><b className="nums">{M(out, cur)}</b></div>
          <p className="fnet">{!inc && !out ? 'Nada entró ni salió todavía.' : net >= 0 ? <>Te quedan <b className="nums">{M(net, cur)}</b> de lo que entró.</> : <>Salió <b className="nums">{M(-net, cur)}</b> más de lo que entró.</>}</p>
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
          <div className="rh" aria-live="polite">
            <span className="nums">{list.length} {list.length === 1 ? 'movimiento' : 'movimientos'}</span>
            {filtered && <button className="lnk" onClick={() => { setQ(''); setFlt('all'); }}>Limpiar filtros</button>}
          </div>
          {groups.map((g) => {
            const e = C.sumMinor(g.ops.filter((o: any) => o.type === 'expense' && !o.excludedFromSpending));
            const i = C.sumMinor(g.ops.filter((o: any) => o.type === 'income'));
            return (
              <div className="day" key={g.key}>
                <div className="dbody">
                  <div className="dh"><span className="dhl"><b>{dayHead(g.key)}</b><small className="nums">{g.ops.length === 1 ? '1 movimiento' : g.ops.length + ' movimientos'}</small></span>{i - e !== 0 && <span className="nums">{M(i - e, cur, true)}</span>}</div>
                  <div className="ledger">{g.ops.map((o: any) => <OpRow key={o.id} op={o} cur={cur} accountId={acc ? acc.id : undefined} time />)}</div>
                </div>
              </div>
            );
          })}
          {!groups.length && (
            <div className="empty">
              <b>{filtered ? 'No encontré movimientos así.' : 'Aquí todavía no pasa nada.'}</b>
              <span>{filtered ? 'Prueba otro mes, otro filtro u otra palabra.' : 'Cuando registres algo, aparece aquí.'}</span>
              {filtered ? <button className="liq" onClick={() => { setQ(''); setFlt('all'); }}>Limpiar filtros</button> : <button className="liq pri" onClick={() => open('register', { accountId: sel || undefined })}>Registrar</button>}
            </div>
          )}
        </div>
        <div className="endpad" />
      </div>
    </div>
  );
}
