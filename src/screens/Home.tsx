/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import * as C from '../domain/core';
import * as D from '../domain/derive';
import { useWallet } from '../store';
import { useUI } from '../ui/ctx';
import { Odometer, CardFace, RowIcon, useMoney, CurTabs } from '../ui/bits';
import { Mark, INews, IEye, IPlus, IMove, IChat } from '../ui/icons';
import { bankOf, markSrc, markAspect, palette } from '../design/theme';
import { useMarkets, marketItem } from '../net';
import { setCurrency } from '../App';
import { Banner } from './parts';

// Arriba manda la fecha (o el nombre de la app); nunca un saludo.
function greeting(look: any) {
  if (look.greet === 'wallet') return 'Wallet';
  return C.longDate(C.todayLocal());
}

export function Header() {
  const { look, hide, toggleHide, go } = useUI();
  return (
    <div className="hdr">
      <button className="brand" onClick={() => go('settings')} aria-label="Ajustes"><Mark /><span className="bt"><b>{greeting(look)}</b></span></button>
      <span className="tools">
        <button className="ib" aria-label="El día: noticias" onClick={() => go('news')}><INews /></button>
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

export default function Home() {
  const { s } = useWallet();
  const ui = useUI();
  const { look, dark, sel, setSel, open, go, hide } = ui;
  const M = useMoney();
  const cur = s.settings.activeCurrency;
  const [more, setMore] = useState(false);
  const [bandOpen, setBandOpen] = useState(true);
  const accounts = D.accountsForHome(s, cur);
  const acc = sel ? C.accountById(s, sel) : null;
  const totals = C.currencyTotals(s, cur);
  const enabled = s.settings.enabledCurrencies;

  // Número grande
  let bigMinor = totals.total, label: React.ReactNode = 'Patrimonio líquido', sub = totals.reserved
    ? 'Disponible ' + M(totals.available, cur) + ', reservado ' + M(totals.reserved, cur)
    : 'En ' + accounts.length + (accounts.length === 1 ? ' cuenta' : ' cuentas') + ', todo disponible.';
  if (!acc && look.big === 'disp') { bigMinor = totals.available; label = 'Disponible para gastar'; sub = 'Sin contar ' + M(totals.reserved, cur) + ' reservados'; }
  if (!acc && look.big === 'hoy') { bigMinor = D.todaySpent(s, cur); label = 'Gastado hoy'; const pd = D.perDay(s, cur); sub = pd.kind === 'over' ? 'Vas ' + M(pd.minor, cur) + ' sobre tu límite' : 'Puedes gastar ' + M(pd.minor, cur) + ' por día'; }
  const positive = accounts.filter((a: any) => C.balanceOf(s, a) > 0);
  const posTotal = positive.reduce((n: number, a: any) => n + C.balanceOf(s, a), 0);
  let heroBank = 'wallet';
  if (acc) {
    bigMinor = C.balanceOf(s, acc); heroBank = bankOf(acc);
    label = acc.name;
    sub = acc.kind === 'reserve' ? (acc.goalMinor ? C.pct(Math.max(0, bigMinor), acc.goalMinor) + '% de tu meta de ' + M(acc.goalMinor, cur) : 'Ahorro reservado') : posTotal > 0 && bigMinor > 0 ? Math.round((bigMinor / posTotal) * 100) + '% de lo que hay en tus cuentas' : '';
  }
  const mk = acc && look.style === 'bank' ? markSrc(heroBank) : '';

  // Recuadros
  const today = D.todaySpent(s, cur, sel);
  const pd = D.perDay(s, cur, sel);
  const out = D.outThisMonth(s, cur);

  // Próximo
  const upcoming = C.upcomingItems(s, cur, 8);
  const payable = C.debtsForCurrency(s, cur).filter((d: any) => d.direction === 'payable' && C.debtRemainingMinor(d) > 0);

  const blocks: [string, boolean][] = look.blocks;

  const cards = more ? accounts : accounts.slice(0, 4);
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
        <div className="selB noscr">
          {cards.map((a: any) => (
            <button key={a.id} className="rbw" style={{ all: 'unset', display: 'contents' }} aria-label={a.name + ', ' + M(C.balanceOf(s, a), cur)} aria-pressed={sel === a.id} onClick={() => setSel(sel === a.id ? null : a.id)}>
              <CardFace account={a} dark={dark} className={'rb' + (sel === a.id ? ' on' : '') + (sel && sel !== a.id ? ' off' : '')}>
                <span className="rbal">{M(C.balanceOf(s, a), cur)}</span>
              </CardFace>
            </button>
          ))}
          {!more && accounts.length > 4 ? (
            <button className="more" onClick={() => setMore(true)} aria-label={'Ver ' + (accounts.length - 4) + ' cuentas más'}>+{accounts.length - 4}</button>
          ) : (
            <button className="more" onClick={() => open('account-new', { currency: cur })} aria-label="Agregar cuenta">+</button>
          )}
        </div>
      )}
    </div>
  );

  const tiles = (
    <div className="tiles" key="hoy">
      <div className="tile"><span className="tk">Hoy</span><b className="tv nums">{M(today, cur)}</b><span className="td">{today ? 'gastado' : 'sin gastos todavía'}</span></div>
      {pd.kind === 'over'
        ? <div className="tile"><span className="tk">Te pasaste</span><b className="tv nums">{M(pd.minor, cur)}</b><span className="td">{pd.note}</span></div>
        : <div className="tile"><span className="tk">Por día</span><b className="tv nums">{M(pd.minor, cur)}</b><span className="td">{pd.note.startsWith('con lo disponible') ? 'hasta fin de mes' : pd.note.replace(', hasta fin de mes', '')}</span></div>}
      {sel
        ? <div className="tile"><span className="tk">Este mes</span><b className="tv nums">{M(C.sumMinor(C.spendingOps(s, cur, C.currentPeriod()).filter((o: any) => o.accountId === sel)), cur)}</b><span className="td">gastado aquí</span></div>
        : <button className="tile" onClick={() => go('plan')}><span className="tk">Por salir</span><b className="tv nums">{out.count ? M(out.minor, cur) : 'Nada'}</b><span className="td">{!out.count ? 'en el mes' : out.late ? out.late + (out.late === 1 ? ' vencido' : ' vencidos') + (out.count - out.late ? ' y ' + (out.count - out.late) + ' más' : '') : out.count + (out.count === 1 ? ' pago' : ' pagos') + ' este mes'}</span></button>}
    </div>
  );

  const acts = (
    <div className="sec acts" key="acc">
      <button className="act" onClick={() => open('register', { accountId: sel || undefined })}><span className="ai"><IPlus size={20} /></span><b>Registrar</b></button>
      <button className="act2" onClick={() => open('register', { tab: 'move', fromId: sel || undefined })}><IMove /><b>Mover</b></button>
      <button className="act2" onClick={() => open('ask')}><IChat /><b>Preguntar</b></button>
    </div>
  );

  const debts = !sel && payable.length ? (
    <div className="sec blk" key="deuda">
      <div className="sh"><span>Lo que debes</span><button className="lnk" onClick={() => go('plan', { tab: 'deudas' })}>Ver todo</button></div>
      {payable.slice(0, 3).map((d: any) => {
        const nx = C.nextPendingInstallment(d);
        return (
          <button key={d.id} className="debt" onClick={() => open('debt', { id: d.id })}>
            <span className="lft"><RowIcon text={d.name} /><span className="nm"><span>{d.name}</span><span className="dt">{nx ? (nx.dueDate < C.todayLocal() ? 'Cuota vencida el ' : 'Próxima cuota el ') + C.shortDate(nx.dueDate) : 'Sin cuotas pendientes'}</span></span></span>
            <b className="am">{M(C.debtRemainingMinor(d), cur)}</b>
          </button>
        );
      })}
    </div>
  ) : null;

  const prox = !sel ? (
    <div className="sec blk" key="prox">
      <div className="sh"><span>Próximo</span><button className="lnk" onClick={() => go('plan')}>Agenda</button></div>
      {upcoming.length ? (
        <div className="rail">
          {upcoming.map((u) => (
            <button key={u.type + u.id + (u.installmentId || '')} className={'lr' + (u.status === 'overdue' ? ' late' : '')} onClick={() => open('settle', { item: u })}>
              <i className="rdot" /><span className="rd8">{C.shortDate(u.date)}</span>
              <span className="lft"><RowIcon text={u.label} /><span className="nm"><span>{u.label}</span><span className="dt">{u.status === 'overdue' && <i className="wi" aria-hidden="true">!</i>}{u.status === 'overdue' ? overdueText(u.date) : u.direction === 'receivable' ? 'Por cobrar' : 'Por pagar'}</span></span></span>
              <span className={'am' + (u.direction === 'receivable' ? ' inc' : '')}>{u.direction === 'receivable' ? '+' : ''}{M(u.amountMinor, cur)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empt"><span>Sin pagos programados.</span><button className="lnk" onClick={() => open('fixed-new')}>Agregar pago</button></div>
      )}
    </div>
  ) : null;

  // Lo último que pasó: de la cuenta elegida o, sin cuenta, de la moneda activa.
  const recent = acc ? C.operationsForAccount(s, acc.id).filter((o: any) => !o.voided).slice(0, 4) : C.operationsForCurrency(s, cur).filter((o: any) => !o.voided).slice(0, 4);
  const accRecent = accounts.length ? (
    <div className="sec blk" key="recent">
      <div className="sh"><span>Lo último</span>{acc ? <button className="lnk" onClick={() => go('account', { id: acc.id })}>Ver la cuenta</button> : <button className="lnk" onClick={() => go('movs')}>Ver todo</button>}</div>
      {recent.length ? (
        <div className="ledger">{recent.map((o: any) => <OpRow key={o.id} op={o} cur={cur} accountId={acc ? acc.id : undefined} time />)}</div>
      ) : (
        <div className="empt"><span>Aún no registras nada{acc ? ' aquí' : ''}.</span><button className="lnk" onClick={() => open('register', { accountId: acc ? acc.id : undefined })}>Registrar</button></div>
      )}
    </div>
  ) : null;

  const inv = !sel && (s.watchlist || []).length ? (
    <div className="sec invrow" key="inv"><button className="debt" onClick={() => go('inv')}><span className="lft"><span className="ic"><span className="ini">↗</span></span><span className="nm"><span>Inversiones</span><span className="dt">{(s.watchlist || []).length} que sigues</span></span></span><span className="lnk">Ver</span></button></div>
  ) : null;
  const blockEls: Record<string, React.ReactNode> = { naipes: <>{naipes}{inv}</>, hoy: tiles, acc: acts, deuda: debts, prox };

  return (
    <>
      <Header />
      <div className="scr noscr">
        <div className="zz">
          <Banner />
          <div className="sec row">
            <CurTabs value={cur} list={enabled} onChange={(c) => { setSel(null); setCurrency(c); }} />
            {cur === 'PEN' ? <FxStrip /> : <span />}
          </div>
          {!accounts.length ? (
            <div className="sec">
              <div className="hero total first">
                <span className="lbl">Patrimonio líquido</span>
                <b className="ft">Agrega tu primera cuenta en {C.currencyMeta(cur).name.toLowerCase()}</b>
                <span className="sub">Tu banco, Yape o el efectivo que tienes a la mano. Desde ahí, Wallet suma todo por ti.</span>
                <button className="liq pri" onClick={() => open('account-new', { currency: cur })}>Agregar cuenta</button>
              </div>
            </div>
          ) : <div className="sec">
            <div className={'hero' + (!acc ? ' total withband' : ' withpill')}>
              <span className="lbl">{mk ? <img className={'hmk ' + markAspect(heroBank)} src={mk} alt={String(label)} /> : label}</span>
              {hide ? <div className="hidn">••••</div> : <Odometer minor={bigMinor} currency={cur} cents={look.cents} size={Math.abs(C.fromMinor(bigMinor, cur)) >= 1e7 ? 'sm' : Math.abs(C.fromMinor(bigMinor, cur)) >= 1e6 ? 'md' : ''} />}
              {acc && <button className="pill" onClick={() => setSel(null)}>{'Ver las ' + accounts.length + ' cuentas'}</button>}
              {!hide && sub && <span className="sub nums">{sub}</span>}
              {!acc && positive.length > 1 && (
                <>
                  <button className="band2" onClick={() => setBandOpen(!bandOpen)} aria-expanded={bandOpen} aria-label="Cómo se reparte tu dinero entre tus cuentas">
                    {positive.map((a: any) => <i key={a.id} style={{ width: (C.balanceOf(s, a) / posTotal) * 100 + '%', background: palette(bankOf(a), dark).dot }} />)}
                  </button>
                  {bandOpen && <span className="bleg">{positive.map((a: any) => <span key={a.id}><i style={{ background: palette(bankOf(a), dark).dot }} />{a.name} <b className="nums">{Math.round((C.balanceOf(s, a) / posTotal) * 100)}%</b></span>)}</span>}
                </>
              )}
            </div>
          </div>}
          {accounts.length > 0 && blocks.filter((b) => b[1]).map((b) => <React.Fragment key={b[0]}>{blockEls[b[0]]}{b[0] === 'acc' && accRecent}</React.Fragment>)}
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
  return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' a. m.' : ' p. m.');
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
