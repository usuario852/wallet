/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import * as C from '../domain/core';
import { useWallet, commit } from '../store';
import { useUI } from '../ui/ctx';
import { IChevD, IArrowUp, IArrowDown, IX } from '../ui/icons';
import { BackHeader } from './parts';
import { useMarkets } from '../net';

function pctNum(txt: string) { const n = Number(String(txt || '').replace('%', '').replace(',', '.').replace('+', '')); return Number.isFinite(n) ? n : null; }

export default function Investments() {
  const { s } = useWallet();
  const { open, hide } = useUI();
  const watch: any[] = s.watchlist || [];
  const [force, setForce] = useState(0);
  const { data, err } = useMarkets(watch.map((w) => w.id), force);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dismiss, setDismiss] = useState(false);
  const items = (data && data.items ? data.items : []).filter((x: any) => x.group === 'seguimiento');
  const price = (id: string) => items.find((x: any) => x.id === id);
  const rows = watch.map((w) => ({ w, p: price(w.id) }));
  const held = rows.filter((r) => r.p && Number(r.w.qty) > 0);
  const total = held.reduce((n, r) => n + Number(r.w.qty) * Number(r.p.raw), 0);
  const dayChange = held.reduce((n, r) => { const c = pctNum(r.p.change); if (c == null) return n; const v = Number(r.w.qty) * Number(r.p.raw); return n + v - v / (1 + c / 100); }, 0);
  const big = rows.filter((r) => r.p && Math.abs(pctNum(r.p.change) || 0) >= 5)[0];
  const usd = (n: number) => (hide ? 'US$ ••••' : 'US$ ' + C.fmtNumber(n, 2));

  return (
    <>
      <BackHeader right={<button className="eb" onClick={() => open('watch-add')}>Agregar</button>} />
      <div className="scr noscr">
        <div className="sec phd" style={{ paddingTop: 8 }}><span className="pht"><b>Inversiones</b><small>Precios de referencia, cada 15 min.</small></span></div>
        <div className="sec">
          <div className="hero total ihero">
            <span className="lbl">{held.length ? 'Valen hoy' : 'Lo que sigues'}</span>
            {held.length ? <div className="big"><span className="cu">US$</span><span className="odo md">{hide ? '••••' : C.fmtNumber(total, 2).split('.')[0]}<span className="sep dec">{hide ? '' : '.' + C.fmtNumber(total, 2).split('.')[1]}</span></span></div> : <div className="big"><span className="odo md">{watch.length}</span></div>}
            {held.length > 0 && !hide && <span className="cmp"><i>{dayChange >= 0 ? '↑' : '↓'}</i>{(dayChange >= 0 ? '+' : '−') + 'US$ ' + C.fmtNumber(Math.abs(dayChange), 2)} hoy</span>}
            <span className="inote">No suma a tu patrimonio líquido. Cada moneda va por separado.</span>
          </div>
          {big && !dismiss && (
            <div className="alertb" role="status"><span className="ai2" aria-hidden="true">{(pctNum(big.p.change) || 0) > 0 ? '↑' : '↓'}</span><span>{big.w.label} {(pctNum(big.p.change) || 0) > 0 ? 'subió' : 'bajó'} {Math.abs(pctNum(big.p.change) || 0).toFixed(1)}% {big.w.kind === 'cripto' ? 'en las últimas 24 h' : 'hoy'}.</span><button className="x" style={{ width: 40, height: 40, margin: 0 }} onClick={() => setDismiss(true)} aria-label="Cerrar aviso"><IX size={18} /></button></div>
          )}
          {err && <p className="tsm2">{err} <button className="lnk" onClick={() => setForce(force + 1)}>Reintentar</button></p>}
          {watch.length ? (
            <div className="card ilist">
              {rows.map(({ w, p }) => {
                const ch = p ? pctNum(p.change) : null;
                const on = openId === w.id;
                const qty = Number(w.qty) || 0;
                return (
                  <React.Fragment key={w.id}>
                    <button className={'irow' + (on ? ' on' : '')} aria-expanded={on} onClick={() => setOpenId(on ? null : w.id)}>
                      <span className="tkr">{String(w.detail || w.id).split(' ')[0].replace(/\.US$/i, '').slice(0, 5).toUpperCase()}</span>
                      <span className="nm"><span>{w.label}</span><span className="dt">{qty ? qty + (w.kind === 'cripto' ? ' unidades' : qty === 1 ? ' acción' : ' acciones') : w.kind === 'cripto' ? 'Cripto' : 'Siguiendo'}</span></span>
                      <span className="iv">
                        <b className="nums">{p ? (qty ? usd(qty * Number(p.raw)) : p.value) : '—'}</b>
                        {ch != null && <span className="chg">{ch >= 0 ? <IArrowUp /> : <IArrowDown />}{(ch > 0 ? '+' : '') + ch.toFixed(1)}%</span>}
                      </span>
                      <span className="xchev"><IChevD /></span>
                    </button>
                    {on && (
                      <div className="idet">
                        <div><span>Precio hoy</span><b className="nums">{p ? p.value : 'Sin dato'}</b></div>
                        <div><span>Compraste a</span><b className="nums">{w.buy ? 'US$ ' + C.fmtNumber(Number(w.buy), 2) : 'Sin dato'}</b></div>
                        {p && qty > 0 && w.buy ? <p>{Number(p.raw) >= Number(w.buy) ? 'Ganas ' : 'Pierdes '}{usd(Math.abs((Number(p.raw) - Number(w.buy)) * qty))} desde que compraste.</p> : null}
                        <span className="acts3"><button className="liq" onClick={() => open('watch-edit', { id: w.id })}>Editar</button><button className="liq" onClick={() => commit((x) => { x.watchlist = x.watchlist.filter((y: any) => y.id !== w.id); })}>Dejar de seguir</button></span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="empty"><b>Sigue acciones, fondos o cripto.</b><span>Busca por nombre: «apple», «bitcoin», «vanguard». Si pones cuántas tienes, Wallet calcula cuánto valen.</span><button className="liq pri" onClick={() => open('watch-add')}>Agregar</button></div>
          )}
          <p className="tsm2">Datos de Stooq y CoinGecko. Pueden tener unos minutos de retraso.</p>
        </div>
        <div className="endpad" />
      </div>
    </>
  );
}
