/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { feel } from '../ui/feel';
import * as C from '../domain/core';
import * as D from '../domain/derive';
import { useWallet, addMoodCheckin } from '../store';
import { useUI } from '../ui/ctx';
import { Odometer, CardFace, RowIcon, useMoney, CurTabs } from '../ui/bits';
import { Mark, INews, IEye, IChat } from '../ui/icons';
import { bankOf, markSrc, markAspect, palette, tileSrc } from '../design/theme';
import { useMarkets, marketItem } from '../net';
import { setCurrency } from '../App';
import { Banner } from './parts';

// Arriba manda la fecha (o el nombre de la app); nunca un saludo.
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
function greeting(look: any): React.ReactNode {
  if (look.greet === 'wallet') return 'Wallet';
  const d = new Date();
  return <>{DIA[d.getDay()]} {d.getDate()} <span>{MES[d.getMonth()]}</span></>;
}

export function Header() {
  const { look, hide, toggleHide, go, open } = useUI();
  return (
    <div className="hdr">
      <button className="brand" onClick={() => go('settings')} aria-label="Ajustes"><Mark /><span className="bt"><b>{greeting(look)}</b></span></button>
      <span className="tools">
        <button className="ib" aria-label="El día: noticias" onClick={() => go('news')}><INews /></button>
        <button className="ib" aria-label="Preguntar a la IA" onClick={() => open('ask')}><IChat /></button>
        <button className="ib" aria-label={hide ? 'Mostrar montos' : 'Ocultar montos'} aria-pressed={hide} onClick={toggleHide}><IEye off={hide} /></button>
      </span>
    </div>
  );
}

export function FxStrip() {
  const { data } = useMarkets();
  const usd = marketItem(data, 'usdpen'); const eur = marketItem(data, 'eurpen');
  if (!usd && !eur) return <span className="fx" />;
  return (
    <span className="fx nums" aria-label="Tipo de cambio">
      {usd && <span>USD <b>{Number(usd.raw).toFixed(3)}</b></span>}
      {eur && <span>EUR <b>{Number(eur.raw).toFixed(3)}</b></span>}
    </span>
  );
}

// Ánimo de un toque: cinco formas, de piedra tensa a piedra suave. La etiqueta siempre acompaña a la forma.
export const MOOD5: { k: number; label: string; v: number; e: number; t: number }[] = [
  { k: 1, label: 'Mal', v: 15, e: 30, t: 75 }, { k: 2, label: 'Bajo', v: 35, e: 40, t: 55 }, { k: 3, label: 'Normal', v: 55, e: 55, t: 35 },
  { k: 4, label: 'Bien', v: 72, e: 62, t: 25 }, { k: 5, label: 'Muy bien', v: 88, e: 72, t: 15 }
];
const MOOD_PATHS = [
  'M20 4 L27 9 L35 8 L34 17 L39 24 L32 29 L31 37 L22 34 L14 39 L11 31 L3 27 L8 20 L5 11 L13 10 Z',
  'M21 5 C28 5 31 9 35 13 C38 18 36 24 37 29 C35 35 28 37 21 36 C14 37 8 34 6 28 C3 22 6 16 8 11 C12 6 16 5 21 5 Z',
  'M20 5 C29 4 36 10 36 19 C37 28 31 35 21 36 C12 36 5 30 5 21 C4 12 11 5 20 5 Z',
  'M20 4 C30 3 37 11 37 20 C37 30 30 37 20 37 C10 37 3 30 4 20 C4 11 10 4 20 4 Z',
  'M20 3 C31 3 38 10 38 20 C38 31 31 38 20 38 C9 38 2 31 2 20 C2 9 9 3 20 3 Z'
];
export function MoodShape({ k, size = 34 }: { k: number; size?: number }) {
  return <svg className={'mshape s' + k} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"><path d={MOOD_PATHS[k - 1]} /></svg>;
}
export function moodLevel(m: any) { if (!m) return 0; const v = Number(m.valence ?? 55); return v < 25 ? 1 : v < 45 ? 2 : v < 64 ? 3 : v < 80 ? 4 : 5; }
function ago(iso: string) {
  const min = Math.round((Date.now() - C.dateFromLocalIso(iso).getTime()) / 6e4);
  if (min < 2) return 'ahora'; if (min < 60) return 'hace ' + min + ' min'; const h = Math.round(min / 60); if (h < 24) return 'hace ' + h + ' h'; return 'hace ' + Math.round(h / 24) + ' d';
}
export function MoodQuick({ compact = false, onPick }: { compact?: boolean; onPick?: (m: any) => void }) {
  const { s } = useWallet();
  const { open } = useUI();
  const last = C.latestMoodCheckin(s);
  const lvl = last && C.moodIsFresh(s) ? moodLevel(last) : 0;
  const [picked, setPicked] = useState(0);
  const pick = (m: typeof MOOD5[0]) => {
    feel('tap');
    if (onPick) { setPicked(picked === m.k ? 0 : m.k); onPick(m); return; }
    setPicked(m.k);
    addMoodCheckin({ valence: m.v, energy: m.e, tension: m.t, source: 'quick' });
  };
  const on = onPick ? picked : picked || lvl;
  return (
    <div className={'mood5' + (compact ? ' sm' : '')}>
      {!compact && <div className="sh"><span>¿Cómo estás?</span>{last ? <span className="mago">{ago(last.timestamp)}</span> : null}</div>}
      <div className="m5row" role="group" aria-label="¿Cómo estás?">
        {MOOD5.map((m) => <button key={m.k} className={'m5' + (on === m.k ? ' on' : '')} aria-pressed={on === m.k} onClick={() => pick(m)}><MoodShape k={m.k} size={compact ? 28 : 34} /><span>{m.label}</span></button>)}
        {!compact && <button className="m5 m5x" onClick={() => open('mood')} aria-label="Más detalle de tu ánimo"><span className="dots3" aria-hidden="true"><i /><i /><i /></span><span>Más</span></button>}
      </div>
    </div>
  );
}

export default function Home() {
  const { s } = useWallet();
  const ui = useUI();
  const { look, dark, sel, setSel, open, go, hide } = ui;
  const M = useMoney();
  const cur = s.settings.activeCurrency;
  const accounts = D.accountsForHome(s, cur);
  const acc = sel ? C.accountById(s, sel) : null;
  const totals = C.currencyTotals(s, cur);
  const enabled = s.settings.enabledCurrencies;

  // El número grande y una línea de etiqueta y valor, sin frases explicativas.
  let bigMinor = totals.total, label: React.ReactNode = 'Patrimonio líquido';
  let subL = totals.reserved ? 'Disponible' : '', subV = totals.reserved ? M(totals.available, cur) : '';
  if (!acc && look.big === 'disp') { bigMinor = totals.available; label = 'Disponible para gastar'; subL = totals.reserved ? 'Reservado' : ''; subV = totals.reserved ? M(totals.reserved, cur) : ''; }
  if (!acc && look.big === 'hoy') { bigMinor = D.todaySpent(s, cur); label = 'Gastado hoy'; subL = 'Patrimonio'; subV = M(totals.total, cur); }
  const positive = accounts.filter((a: any) => C.balanceOf(s, a) > 0);
  const posTotal = positive.reduce((n: number, a: any) => n + C.balanceOf(s, a), 0);
  if (acc) {
    bigMinor = C.balanceOf(s, acc); label = acc.name;
    if (acc.kind === 'reserve' && acc.goalMinor) { subL = 'Meta ' + M(acc.goalMinor, cur) + ' ·'; subV = C.pct(Math.max(0, bigMinor), acc.goalMinor) + '%'; }
    else if (posTotal > 0 && bigMinor > 0) { subL = 'Del total'; subV = Math.round((bigMinor / posTotal) * 100) + '%'; }
    else { subL = ''; subV = ''; }
  }
  const mk = acc ? tileSrc(bankOf(acc)) : '';

  const today = D.todaySpent(s, cur, sel);
  const pd = D.perDay(s, cur, sel);
  const out = D.outThisMonth(s, cur);
  const upcoming = C.upcomingItems(s, cur, 8);
  const payable = C.debtsForCurrency(s, cur).filter((d: any) => d.direction === 'payable' && C.debtRemainingMinor(d) > 0);
  const blocks: [string, boolean][] = look.blocks;
  const big = (n: number) => (Math.abs(C.fromMinor(n, cur)) >= 1e7 ? 'sm' : Math.abs(C.fromMinor(n, cur)) >= 1e6 ? 'md' : '');

  const naipes = (
    <div className="sec accs" key="naipes">
      {look.naip === 'fila' ? (
        <div className="fila">
          {accounts.map((a: any) => {
            const b = bankOf(a); const src = markSrc(b);
            return (
              <button key={a.id} className={'fr2' + (sel === a.id ? ' on' : '')} onClick={() => setSel(sel === a.id ? null : a.id)} aria-pressed={sel === a.id}>
                <span className="fsw" style={{ ['--cb' as any]: palette(b, dark).cb }}>{src && <img className={'mk ' + markAspect(b)} src={src} alt="" />}</span>
                <b>{a.name}</b><span className="nums">{M(C.balanceOf(s, a), cur)}</span>
              </button>
            );
          })}
          <button className="fr2" onClick={() => open('account-new', { currency: cur })}><b>+ Agregar cuenta</b></button>
        </div>
      ) : (
        <div className="deck noscr">
          {accounts.map((a: any, i: number) => {
            const on = sel === a.id; const after = !!sel && accounts.findIndex((x: any) => x.id === sel) < i;
            return (
              <button key={a.id} className="ncw" aria-label={a.name + ', ' + M(C.balanceOf(s, a), cur)} aria-pressed={on} onClick={() => { feel('tap'); setSel(on ? null : a.id); }}>
                <CardFace account={a} dark={dark} balance={C.balanceOf(s, a)} full={on} className={'nc' + (on ? ' on' : '') + (after ? ' after' : '')} />
              </button>
            );
          })}
          <button className="plus" onClick={() => open('account-new', { currency: cur })} aria-label="Agregar cuenta">+</button>
        </div>
      )}
    </div>
  );

  // Tarjeta del día: el margen por día y un medidor neutro (hoy contra lo que te toca).
  const lastDay = new Date(Date.now() + 864e5).getDate() === 1;
  const daysLeft = D.daysInMonth(new Date()) - new Date().getDate() + 1;
  const allow = pd.kind === 'over' ? 0 : pd.minor;
  const fillPct = allow > 0 ? Math.min(100, Math.round((today / allow) * 100)) : today > 0 ? 100 : 0;
  const overPct = allow > 0 && today > allow ? Math.min(100, Math.round((allow / today) * 100)) : null;
  const adv = (
    <div className="sec" key="hoy">
      <button className="adv" onClick={() => go('ana')}>
        <small>{acc ? 'Con este saldo, ' + (lastDay ? 'hoy' : 'hasta fin de mes') : pd.kind === 'over' ? 'Este mes' : lastDay ? 'Para hoy, último día' : 'Hasta fin de mes'}</small>
        <span className="n nums">{pd.kind === 'over' ? M(pd.minor, cur) : M(pd.minor, cur)}<span>{pd.kind === 'over' ? 'sobre tu límite' : 'por día'}</span></span>
        <span className="meter" aria-hidden="true">
          {overPct != null ? <><i style={{ width: overPct + '%' }} /><s style={{ left: overPct + '%' }} /><em style={{ left: overPct + '%' }} /></> : <i style={{ width: fillPct + '%' }} />}
        </span>
        <span className="lv"><span>{acc ? 'Hoy aquí' : 'Hoy llevas'} <b className="nums">{M(today, cur)}</b></span><span>{daysLeft === 1 ? 'Último día' : daysLeft + ' días'}</span></span>
        {!acc && out.count > 0 && <span className="lv"><span>Por salir este mes{out.late ? ', ' + out.late + (out.late === 1 ? ' vencido' : ' vencidos') : ''}</span><b className="nums">{M(out.minor, cur)}</b></span>}
      </button>
    </div>
  );

  const mood = <div className="sec blk" key="animo"><MoodQuick /></div>;

  const debts = !sel && payable.length ? (
    <div className="sec blk" key="deuda">
      <div className="sh"><span>Lo que debes</span><button className="lnk" onClick={() => go('plan', { tab: 'deudas' })}>Ver todo</button></div>
      <div className="list">
        {payable.slice(0, 3).map((d: any) => {
          const nx = C.nextPendingInstallment(d);
          return (
            <button key={d.id} className="mrow" onClick={() => open('debt', { id: d.id })}>
              <span className="lft"><RowIcon text={d.name} /><span className="nm"><span>{d.name}</span><span className="dt">{nx ? (nx.dueDate < C.todayLocal() ? 'Cuota vencida el ' : 'Próxima cuota el ') + C.shortDate(nx.dueDate) : 'Sin cuotas pendientes'}</span></span></span>
              <b className="am">{M(C.debtRemainingMinor(d), cur)}</b>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  const prox = !sel ? (
    <div className="sec blk" key="prox">
      <div className="sh"><span>Próximo</span><button className="lnk" onClick={() => go('plan')}>Agenda</button></div>
      {upcoming.length ? (
        <div className="list">
          {upcoming.map((u) => {
            const d = C.dateFromLocalIso(u.date);
            return (
              <button key={u.type + u.id + (u.installmentId || '')} className="mrow" onClick={() => open('settle', { item: u })}>
                <span className="lft"><span className={'leaf' + (u.status === 'overdue' ? ' late' : '')}><b>{d.getDate()}</b><span>{C.shortDate(u.date).split(' ')[1]}</span></span><span className="nm"><span>{u.label}</span><span className={'dt' + (u.status === 'overdue' ? ' late' : '')}>{u.status === 'overdue' ? overdueText(u.date) : u.direction === 'receivable' ? 'Por cobrar' : 'Por pagar'}</span></span></span>
                <span className={'am' + (u.direction === 'receivable' ? ' inc' : '')}>{u.direction === 'receivable' ? '+' : ''}{M(u.amountMinor, cur)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empt"><span>Sin pagos programados.</span><button className="lnk" onClick={() => open('fixed-new')}>Agregar pago</button></div>
      )}
    </div>
  ) : null;

  const recent = acc ? C.operationsForAccount(s, acc.id).filter((o: any) => !o.voided).slice(0, 4) : C.operationsForCurrency(s, cur).filter((o: any) => !o.voided).slice(0, 4);
  const accRecent = accounts.length ? (
    <div className="sec blk" key="recent">
      <div className="sh"><span>{acc ? 'Lo último en ' + acc.name : 'Lo último'}</span>{acc ? <button className="lnk" onClick={() => go('account', { id: acc.id })}>Ver la cuenta</button> : <button className="lnk" onClick={() => go('movs')}>Ver todo</button>}</div>
      {recent.length ? (
        <div className="ledger">{recent.map((o: any) => <OpRow key={o.id} op={o} cur={cur} accountId={acc ? acc.id : undefined} time />)}</div>
      ) : (
        <div className="empt"><span>Aún no registras nada{acc ? ' aquí' : ''}.</span><button className="lnk" onClick={() => open('register', { accountId: acc ? acc.id : undefined })}>Registrar</button></div>
      )}
    </div>
  ) : null;

  const inv = !sel && (s.watchlist || []).length ? (
    <div className="sec invrow" key="inv"><button className="mrow" onClick={() => go('inv')}><span className="lft"><span className="ic"><span className="ini">↗</span></span><span className="nm"><span>Inversiones</span><span className="dt">{(s.watchlist || []).length} que sigues</span></span></span><span className="lnk">Ver</span></button></div>
  ) : null;
  const blockEls: Record<string, React.ReactNode> = { naipes: <>{naipes}{inv}</>, hoy: adv, animo: mood, acc: accRecent, deuda: debts, prox };

  return (
    <>
      <Header />
      <div className="scr noscr">
        <div className="zz">
          <Banner />
          {!accounts.length ? (
            <div className="sec">
              <div className="hero total first">
                <span className="lbl">Patrimonio líquido</span>
                <b className="ft">Agrega tu primera cuenta en {C.currencyMeta(cur).name.toLowerCase()}</b>
                <button className="liq pri" onClick={() => open('account-new', { currency: cur })}>Agregar cuenta</button>
              </div>
            </div>
          ) : <div className="sec">
            <div className="hero total">
              <span className="lbl hrow"><span className="hname">{mk && <img className="hlogo" src={mk} alt="" />}{label}</span>
                {acc ? <button className="hback" onClick={() => setSel(null)}>Todas</button> : <CurTabs value={cur} list={enabled} onChange={(c) => { setSel(null); setCurrency(c); }} />}</span>
              <div className={'hnum' + (hide ? ' hid' : '')}>
                <Odometer minor={bigMinor} currency={cur} cents={look.cents} size={big(bigMinor)} />
                <span className="dots" aria-hidden="true">{C.currencyMeta(cur).symbol} ••••</span>
              </div>
              {subL && <span className="sub nums">{subL} {!hide && <b>{subV}</b>}</span>}
              {cur === 'PEN' && !acc && <FxStrip />}
            </div>
          </div>}
          {accounts.length > 0 && blocks.filter((b) => b[1]).map((b) => <React.Fragment key={b[0]}>{blockEls[b[0]]}</React.Fragment>)}
          {!blocks.some((b) => b[0] === 'acc' && b[1]) && accRecent}
          <div className="endpad" />
        </div>
      </div>
    </>
  );
}

export function overdueText(date: string) {
  const days = Math.round((C.dateFromLocalIso(C.todayLocal()).getTime() - C.dateFromLocalIso(date).getTime()) / 864e5);
  return days <= 0 ? 'Vence hoy' : days === 1 ? 'Venció ayer' : 'Atrasado ' + days + ' días';
}

// Hora del movimiento (8:02 p. m.), solo si se registró con hora.
function opTime(date: any) {
  const t = String(date || '').slice(11, 16);
  if (!/^\d{2}:\d{2}$/.test(t) || t === '00:00') return '';
  const [h, m] = t.split(':').map(Number);
  return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? '\u00a0a.\u00a0m.' : '\u00a0p.\u00a0m.');
}

export function OpRow({ op, cur, accountId, onOpen, time = false }: { op: any; cur: string; accountId?: string; onOpen?: () => void; time?: boolean }) {
  const { s } = useWallet();
  const { open } = useUI();
  const M = useMoney();
  let minor = 0, currency = cur, inc = false;
  if (accountId) { minor = C.opEffectOnAccount(op, accountId); const a = C.accountById(s, accountId); currency = a ? a.currency : cur; inc = minor > 0; }
  else { const d = C.operationDisplayAmount(op, cur); minor = d.minor; currency = d.currency; inc = d.minor > 0; }
  const title = C.operationTitle(s, op);
  let detail = '';
  if (op.type === 'expense' || op.type === 'income') detail = C.showCat(op.category || '') + (accountId ? '' : ' · ' + C.accountName(s, op.accountId));
  else if (op.type === 'transfer') detail = 'Entre tus cuentas';
  else if (op.type === 'fx') detail = 'Cambio de moneda';
  else if (op.type === 'adjustment') detail = 'Ajuste · ' + C.accountName(s, op.accountId);
  const hm = time ? opTime(op.date) : '';
  if (hm) detail += ' · ' + hm;
  const isT = op.type === 'transfer' && !accountId;
  return (
    <button className="mrow" onClick={onOpen || (() => open('op', { id: op.id }))}>
      <span className="lft">
        {op.type === 'transfer' || op.type === 'fx' ? <span className="ic"><span className="ini">⇄</span></span> : <RowIcon text={op.concept} cat={op.type === 'adjustment' ? '' : op.category} />}
        <span className="nm"><span>{title}</span><span className="dt">{detail}</span></span>
      </span>
      <span className={'am' + (inc ? ' inc' : '')}>{isT ? M(op.amountMinor, op.currency) : M(minor, currency, true)}</span>
    </button>
  );
}
