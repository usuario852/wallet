/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import * as C from '../domain/core';
import { useWallet } from '../store';
import { useUI } from '../ui/ctx';
import { Odometer, useMoney, RowIcon } from '../ui/bits';
import { IPlus, IMove, IChat } from '../ui/icons';
import { bankOf, markSrc, markAspect } from '../design/theme';
import { OpRow } from './Home';
import { BackHeader } from './parts';

export default function AccountDetail({ id }: { id: string }) {
  const { s } = useWallet();
  const { open, go, look, hide } = useUI();
  const M = useMoney();
  const a = C.accountById(s, id);
  if (!a) return <><BackHeader /><div className="scr"><div className="sec"><div className="empty"><b>Esta cuenta ya no existe.</b></div></div></div></>;
  const bal = C.balanceOf(s, a);
  const bank = bankOf(a);
  const mk = look.style === 'bank' ? markSrc(bank) : '';
  const ops = C.operationsForAccount(s, a.id).filter((o: any) => !o.voided);
  const per = C.currentPeriod();
  const mon = ops.filter((o: any) => C.periodOf(o.date) === per);
  const inM = mon.reduce((n: number, o: any) => { const e = C.opEffectOnAccount(o, a.id); return e > 0 ? n + e : n; }, 0);
  const outM = mon.reduce((n: number, o: any) => { const e = C.opEffectOnAccount(o, a.id); return e < 0 ? n - e : n; }, 0);
  const isRes = a.kind === 'reserve';
  const goalPct = isRes && a.goalMinor ? C.clamp(C.pct(Math.max(bal, 0), a.goalMinor), 0, 100) : null;
  const groups: { key: string; ops: any[] }[] = [];
  ops.slice(0, 12).forEach((o: any) => { const k = String(o.date).slice(0, 10); let g = groups.find((x) => x.key === k); if (!g) { g = { key: k, ops: [] }; groups.push(g); } g.ops.push(o); });

  return (
    <>
      <BackHeader right={<button className="eb" onClick={() => open('account-edit', { id: a.id })}>Editar</button>} />
      <div className="scr noscr">
        <div className="zz">
          <div className="sec dph phd" style={{ paddingTop: 4 }}>
            <span className="pht"><b>{a.name}</b><small>{C.monthLabel(per)}: entraron {M(inM, a.currency)}, salieron {M(outM, a.currency)}</small></span>
          </div>
          <div className="sec">
            <div className="hero dhero">
              <span className="lbl">{mk ? <img className={'hmk ' + markAspect(bank)} src={mk} alt={a.name} /> : (a.institution || C.currencyMeta(a.currency).name)}</span>
              <span className="dlb">{isRes ? 'Ahorro reservado' : 'Saldo'}</span>
              {hide ? <div className="hidn">••••</div> : <Odometer minor={bal} currency={a.currency} cents={look.cents} />}
              {goalPct != null && <span className="sub">{goalPct}% de tu meta de {M(a.goalMinor, a.currency)}{a.goalDate ? ', para el ' + C.shortDate(a.goalDate) : ''}</span>}
              {bal < 0 && <span className="sub">Esta cuenta está en negativo. Revísala cuando puedas.</span>}
            </div>
          </div>
          <div className="sec acts">
            <button className="act" onClick={() => (isRes ? open('register', { tab: 'move', toId: a.id }) : open('register', { accountId: a.id }))}><span className="ai"><IPlus size={20} /></span><b>{isRes ? 'Aportar' : 'Registrar'}</b></button>
            <button className="act2" onClick={() => open('register', { tab: 'move', fromId: a.id })}><IMove /><b>Mover</b></button>
            <button className="act2" onClick={() => open('ask', { prompt: '¿Cómo va mi cuenta ' + a.name + ' este mes?' })}><IChat /><b>Preguntar</b></button>
          </div>
          <div className="sec blk">
            <div className="sh"><span>Últimos movimientos</span></div>
            {groups.length ? groups.map((g) => (
              <div className="day" key={g.key} style={{ marginTop: 10 }}>
                <div className="dh"><span className="dhl"><b>{C.dayLabel(g.key)}</b><small className="nums">{g.ops.length} mov.</small></span></div>
                <div className="ledger">{g.ops.map((o: any) => <OpRow key={o.id} op={o} cur={a.currency} accountId={a.id} time />)}</div>
              </div>
            )) : <div className="empt"><span>Sin movimientos todavía.</span><button className="lnk" onClick={() => open('register', { accountId: a.id })}>Registrar</button></div>}
            {ops.length > 12 && <button className="dall" onClick={() => go('movs')}>Ver todos</button>}
          </div>
          <div className="endpad" />
        </div>
      </div>
    </>
  );
}
export { RowIcon };
