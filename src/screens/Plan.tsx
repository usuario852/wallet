/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import * as C from '../domain/core';
import * as D from '../domain/derive';
import { useWallet, commit } from '../store';
import { useUI } from '../ui/ctx';
import { useMoney, RowIcon, Seg, CurTabs } from '../ui/bits';
import { PageTitle, Banner } from './parts';
import { overdueText } from './Home';
import { setCurrency } from '../App';

export default function Plan() {
  const { s } = useWallet();
  const { open, params, go } = useUI();
  const M = useMoney();
  const cur = s.settings.activeCurrency;
  const [tab, setTab] = useState<'agenda' | 'metas' | 'deudas'>(params.tab || 'agenda');
  const per = C.currentPeriod();
  const b = C.budgetFor(s, cur);
  const lim = b.monthlyMinor || 0;
  const spent = C.sumMinor(C.spendingOps(s, cur, per));
  const now = new Date(); const day = now.getDate(); const days = D.daysInMonth(now);
  const proj = Math.round((spent / day) * days);
  const out = D.outThisMonth(s, cur);
  const items = C.upcomingItems(s, cur, 60);
  const reserves = C.accountsByCurrency(s, cur).filter((a: any) => a.kind === 'reserve' && !a.archived);
  const debts = C.debtsForCurrency(s, cur);
  const dt = C.debtTotals(s, cur);
  const fixed = s.fixed.filter((f: any) => f.currency === cur).slice().sort((a: any, b: any) => Number(a.day || 99) - Number(b.day || 99));
  const step = C.toMinor(cur === 'PEN' ? 250 : 50, cur);
  const setLim = (v: number) => commit((st) => { C.ensureBudget(st, cur).monthlyMinor = Math.max(0, v); });
  const catLims = Object.entries(b.categories || {}).filter(([, v]) => Number(v) > 0) as [string, number][];
  const spentBy: Record<string, number> = {};
  C.spendingOps(s, cur, per).forEach((o: any) => { spentBy[o.category] = (spentBy[o.category] || 0) + Math.abs(o.amountMinor); });

  const subtitle = C.cap(out.count ? (out.late ? out.late + (out.late === 1 ? ' vencido' : ' vencidos') + (out.count - out.late ? ' y ' + (out.count - out.late) + ' más' : '') : out.count + (out.count === 1 ? ' pago por delante' : ' pagos por delante')) : 'nada pendiente');

  return (
    <div className="scr noscr nohdr">
      <div className="zz">
        <Banner />
        <PageTitle eyebrow={C.monthLabel(per) + ' · ' + C.currencyMeta(cur).name} title="Planifica" sub={out.count ? subtitle : undefined} right={<CurTabs small value={cur} list={s.settings.enabledCurrencies} onChange={setCurrency} />} />

        <div className="sec">
          <div className={'card bud' + (lim && proj > lim ? ' over' : '')}>
            <div className="ch"><b>Límite del mes</b>
              <span className="lim">
                {lim ? <>
                  <button className="lb" aria-label="Bajar límite" onClick={() => setLim(lim - step)}>−</button>
                  <button className="liq" onClick={() => open('budget')} aria-label="Editar límite">{M(lim, cur)}</button>
                  <button className="lb" aria-label="Subir límite" onClick={() => setLim(lim + step)}>+</button>
                </> : <button className="liq soft" onClick={() => open('budget')}>Poner un límite</button>}
              </span>
            </div>
            <div className="bv"><b className="nums">{M(spent, cur)}</b><span>gastados</span></div>
            {lim > 0 && <>
              <div className="btr" role="img" aria-label={'Gastaste ' + C.pct(spent, lim) + '% de tu límite. A este ritmo llegarías al ' + C.pct(proj, lim) + '%.'}>
                <i className="bproj" style={{ width: Math.min(100, (proj / lim) * 100) + '%' }} />
                <i className="bfill" style={{ width: Math.min(100, (spent / lim) * 100) + '%' }} />
                <i className="bpace" style={{ left: Math.min(100, (day / days) * 100) + '%' }} />
              </div>
              <div className="bk2"><span><i className="kf" />Gastado</span><span><i className="kp2" />A este ritmo</span><span><i className="kt" />Ideal a hoy</span></div>
              <p className="bl">A este ritmo cierras {C.monthName(now.getMonth())} en unos {C.currencyMeta(cur).symbol}{' '}{C.fmtNumber(C.fromMinor(proj, cur), 0)}{proj > lim ? ', unos ' + C.currencyMeta(cur).symbol + ' ' + C.fmtNumber(C.fromMinor(proj - lim, cur), 0) + ' sobre tu límite.' : ', dentro de tu límite.'}</p>
              <p className="tsm2">{spent >= lim ? 'Ya pasaste tu límite del mes.' : 'Para no pasar tu límite: hasta ' + M(Math.round((lim - spent) / (days - day + 1)), cur) + ' por día hasta el ' + days + '.'}</p>
            </>}
            {!lim && <p className="tsm2">Con un límite verás cuánto puedes gastar por día.</p>}
          </div>
        </div>

        <div className="sec" style={{ marginTop: 14 }}><Seg items={[['agenda', 'Agenda'], ['metas', 'Metas'], ['deudas', 'Deudas']]} value={tab} onChange={setTab} label="Sección" className="n3" /></div>

        {tab === 'agenda' && (
          <div className="sec blk" style={{ marginTop: 16 }}>
            <div className="sh2r"><b>Agenda</b><span className="tsm">Por salir este mes <b className="nums">{M(out.minor, cur)}</b></span></div>
            {items.length ? (
              <div className="rail">
                {items.map((u, ix) => {
                  const late = u.status === 'overdue';
                  const isSave = u.type === 'fixed' && /ahorro|aporte/i.test(u.label + ' ' + (u.category || ''));
                  return (
                    <div key={u.type + u.id + (u.installmentId || '')} className={'lr' + (late ? ' late' : '')}>
                      <i className="rdot" /><Stamp iso={u.date} on={ix === 0 && !late} />
                      <span className="lft"><RowIcon text={u.label} /><span className="nm"><span>{u.label}</span><span className="dt">{late && <i className="wi" aria-hidden="true">!</i>}{late ? overdueText(u.date) : u.direction === 'receivable' ? 'Por cobrar' : u.type === 'debt' ? 'Cuota' : 'Fijo mensual'}</span></span></span>
                      <span className="agr">
                        <span className={'am' + (u.direction === 'receivable' ? ' inc' : '')}>{u.direction === 'receivable' ? '+' : ''}{M(u.amountMinor, cur)}</span>
                        <button className={'liq' + (late ? ' pri' : '')} onClick={() => open('settle', { item: u })} aria-label={(u.direction === 'receivable' ? 'Cobrar ' : isSave ? 'Separar ' : 'Pagar ') + u.label}>{u.direction === 'receivable' ? 'Cobrar' : isSave ? 'Separar' : 'Pagar'}</button>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : <div className="empt stamped"><Stamp iso={C.todayLocal()} on /><span>Nada pendiente.</span><button className="lnk" onClick={() => open('fixed-new')}>Agregar pago</button></div>}

            <div className="sh2r" style={{ marginTop: 22 }}><b>Pagos fijos cada mes</b><button className="lnk" onClick={() => open('fixed-new')}>Agregar</button></div>
            {fixed.length ? (
              <div className="dl">
                {fixed.map((f: any) => (
                  <button key={f.id} className="mrow" onClick={() => open('fixed-edit', { id: f.id })}>
                    <span className="lft"><RowIcon text={f.concept} /><span className="nm"><span>{f.concept}</span><span className="dt">Día {f.day}, {C.showCat(f.category || '')}{f.paidPeriod === per ? ', ya ' + (f.type === 'income' ? 'cobrado' : 'pagado') + ' este mes' : ''}</span></span></span>
                    <span className={'am' + (f.type === 'income' ? ' inc' : '')}>{f.type === 'income' ? '+' : ''}{M(f.amountMinor, cur)}</span>
                  </button>
                ))}
              </div>
            ) : <div className="empt"><span>Ninguno todavía.</span></div>}

            <div className="sh2r" style={{ marginTop: 22 }}><b>Límites por categoría</b><button className="lnk" onClick={() => open('cat-limits')}>{catLims.length ? 'Editar' : 'Poner'}</button></div>
            {catLims.length ? (
              <div className="card" style={{ marginTop: 0 }}>
                {catLims.map(([cat, v]) => {
                  const sp = spentBy[cat] || 0; const p = Math.min(100, (sp / v) * 100);
                  return (
                    <div key={cat} className="cb" style={{ cursor: 'default' }}>
                      <span className="cn">{C.showCat(cat)}</span>
                      <span className="ctrack"><span className="cbar" style={{ width: p + '%', background: sp > v ? 'var(--dg)' : undefined }} /></span>
                      <span className="cv nums">{C.fmtNumber(C.fromMinor(sp, cur), 0)}/{C.fmtNumber(C.fromMinor(v, cur), 0)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <div className="empt"><span>Ninguna categoría con límite.</span></div>}
          </div>
        )}

        {tab === 'metas' && (
          <div className="sec" style={{ marginTop: 6 }}>
            <p className="tsm2" style={{ marginTop: 10 }}>Lo apartado sigue dentro de tu patrimonio líquido: {M(reserves.reduce((n: number, a: any) => n + Math.max(0, C.balanceOf(s, a)), 0), cur)}.</p>
            {reserves.map((a: any) => {
              const bal = C.balanceOf(s, a); const p = a.goalMinor ? Math.min(100, (Math.max(0, bal) / a.goalMinor) * 100) : 0;
              return (
                <div key={a.id} className="card goal">
                  <div className="ch"><b>{a.name}</b><span className="tsm">{a.goalDate ? 'para el ' + C.shortDate(a.goalDate) : 'sin fecha'}</span></div>
                  <div className="gv"><b className="nums">{M(bal, cur)}</b>{a.goalMinor ? <span>de {M(a.goalMinor, cur)}</span> : null}</div>
                  {a.goalMinor ? <span className="ctrack gt"><span className="cbar" style={{ width: p + '%' }} /></span> : <div style={{ height: 10 }} />}
                  <div className="gf">
                    <span className="tsm">{a.goalMinor ? (bal >= a.goalMinor ? '¡Lo lograste!' : 'Faltan ' + M(a.goalMinor - Math.max(0, bal), cur)) : 'Sin monto objetivo'}</span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button className="liq" onClick={() => go('account', { id: a.id })}>Ver</button>
                      <button className="liq pri" onClick={() => open('register', { tab: 'move', toId: a.id })}>Aportar</button>
                    </span>
                  </div>
                </div>
              );
            })}
            {!reserves.length && <p className="tsm2">Una meta es una cuenta aparte para lo que quieres guardar: un viaje, un fondo de emergencia.</p>}
            <button className="newg" onClick={() => open('account-new', { currency: cur, kind: 'reserve' })}>+ Nueva meta</button>
          </div>
        )}

        {tab === 'deudas' && (
          <div className="sec" style={{ marginTop: 6 }}>
            <div className="card dgrid">
              <span className="dt2"><span className="tsm">Debes</span><b className="nums">{M(dt.payable, cur)}</b></span>
              <span className="dt2"><span className="tsm">Te deben</span><b className="nums">{M(dt.receivable, cur)}</b></span>
            </div>
            <p className="tsm2">Lo pendiente no cambia tu patrimonio hasta que lo pagas o cobras.</p>
            <div className="dl" style={{ marginTop: 10 }}>
              {debts.map((d: any) => {
                const rem = C.debtRemainingMinor(d); const st = C.debtStatus(d); const nx = C.nextPendingInstallment(d);
                return (
                  <button key={d.id} className="mrow" onClick={() => open('debt', { id: d.id })}>
                    <span className="lft"><RowIcon text={d.name} /><span className="nm"><span>{d.name}</span><span className="dt">{st === 'paid' ? (d.direction === 'receivable' ? 'Cobrado' : 'Pagado') : (d.direction === 'receivable' ? 'Te debe' : 'Debes') + (nx ? ', cuota el ' + C.shortDate(nx.dueDate) : '') + (st === 'overdue' ? ', vencida' : '')}</span></span></span>
                    <span className={'am' + (d.direction === 'receivable' ? ' inc' : '')}>{M(rem, cur)}</span>
                  </button>
                );
              })}
              {!debts.length && <div className="mrow" style={{ cursor: 'default' }}><span className="tsm">Sin deudas ni préstamos registrados.</span></div>}
            </div>
            <button className="newg" onClick={() => open('debt-new')}>+ Nueva deuda o préstamo</button>
          </div>
        )}
        <div className="endpad" />
      </div>
    </div>
  );
}

// Sello de fecha, el mismo de Movimientos: número grande y mes.
const MON3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
function Stamp({ iso, on = false }: { iso: string; on?: boolean }) {
  const d = C.dateFromLocalIso(iso);
  return <span className={'dstamp mini' + (on ? ' today' : '')} aria-label={C.shortDate(iso)}><b className="nums">{d.getDate()}</b><small>{MON3[d.getMonth()]}</small></span>;
}
