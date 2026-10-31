/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import * as C from '../domain/core';
import * as D from '../domain/derive';
import { useWallet } from '../store';
import { useUI } from '../ui/ctx';
import { useMoney, RowIcon, Seg, CurTabs } from '../ui/bits';
import { bankOf, palette } from '../design/theme';
import { PageTitle, Banner } from './parts';
import { IChevR } from '../ui/icons';
import { setCurrency } from '../App';

export default function Analysis() {
  const { s } = useWallet();
  const { open, dark, hide } = useUI();
  const M = useMoney();
  const cur = s.settings.activeCurrency;
  const [range, setRange] = useState<'month' | 'week'>('month');
  const [hov, setHov] = useState<number | null>(null);
  const [hc, setHc] = useState<number | null>(null);
  const [hd, setHd] = useState<string>(C.todayLocal());
  const per = C.currentPeriod();
  const now = new Date(); const day = now.getDate();
  const cm = D.cumulative(s, cur, per);
  const pm = D.cumulative(s, cur, D.prevPeriod(per));
  const spent = cm.cum[day - 1] || 0;
  const prevAt = pm.cum[Math.min(day, pm.n) - 1] || 0;
  const avg3 = Math.round([1, 2, 3].map((k) => { const c = D.cumulative(s, cur, D.prevPeriod(per, k)); return c.cum[Math.min(day, c.n) - 1] || 0; }).reduce((a, b) => a + b, 0) / 3);
  const has3 = [1, 2, 3].some((k) => C.spendingOps(s, cur, D.prevPeriod(per, k)).length);
  const week = D.lastNDays(s, cur, 7);
  const weekTotal = week.reduce((n, d) => n + d.total, 0);
  const prevWeek = D.lastNDays(s, cur, 7, new Date(Date.now() - 7 * 864e5)).reduce((n, d) => n + d.total, 0);

  const list = range === 'month' ? C.spendingOps(s, cur, per) : C.spendingOps(s, cur).filter((o: any) => week.some((d) => C.sameDay(o.date, d.key)));
  const cats = D.categoryTotals(list);
  const total = C.sumMinor(list);
  const cmax = cats[0] ? cats[0].v : 1;

  // Gráfico acumulado
  const W = 340, H = 160, X0 = 10, X1 = 330, Y0 = 140, YT = 16;
  const ymax = Math.max(1, ...cm.cum.slice(0, day), ...pm.cum) * 1.08;
  const x = (d: number) => X0 + ((d - 1) * (X1 - X0)) / (cm.n - 1 || 1);
  const y = (v: number) => Y0 - (v / ymax) * (Y0 - YT);
  const line = (arr: number[], upTo: number) => arr.slice(0, upTo).map((v, i) => (i ? 'L' : 'M') + x(i + 1).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  const octD = line(cm.cum, day);
  const sepD = line(pm.cum, pm.n);
  const areaD = octD + ' L' + x(day).toFixed(1) + ' ' + Y0 + ' L' + x(1).toFixed(1) + ' ' + Y0 + ' Z';
  const stepRaw = ymax / 3; const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, stepRaw)))); const step = Math.ceil(stepRaw / mag) * mag;
  const grid: number[] = []; for (let v = step; v < ymax; v += step) grid.push(v);
  const hd2 = hov ?? day;

  // Calendario
  const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const pad = (first + 6) % 7;
  const lv = (v: number) => { if (!v) return 0; const r = v / Math.max(1, ...cm.daily); return r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.8 ? 3 : 4; };
  const hdDay = Number(hd.slice(8, 10));
  const hdOps = list.filter((o: any) => C.sameDay(o.date, hd));

  // Dónde está el dinero
  const accs = C.accountsByCurrency(s, cur).filter((a: any) => !a.archived);
  const amax = Math.max(1, ...accs.map((a: any) => Math.abs(C.balanceOf(s, a))));
  const totals = C.currencyTotals(s, cur);

  // Ánimo y gasto
  const withMood = C.spendingOps(s, cur, per).map((o: any) => ({ o, m: C.moodForOperation(s, o) })).filter((x: any) => x.m);
  const tense = withMood.filter((x: any) => x.m.tension >= 70);
  const calm = withMood.filter((x: any) => x.m.tension < 40);
  const avgT = (arr: any[]) => (arr.length ? Math.round(C.sumMinor(arr.map((x) => x.o)) / arr.length) : 0);

  const cmp = (a: number, b: number, what: string) => (a === b ? 'Igual que ' + what : M(Math.abs(a - b), cur) + (a > b ? ' más que ' : ' menos que ') + what);
  // La flecha solo aparece si hay cambio; sin cambio, el texto basta.
  const arrow = (a: number, b: number) => (a === b ? null : <i aria-hidden="true">{a > b ? '↑' : '↓'}</i>);
  const hasLine = cm.cum.slice(0, day).some((v) => v > 0) || pm.cum.some((v) => v > 0);

  return (
    <div className="scr noscr nohdr">
      <div className="zz">
        <Banner />
        <PageTitle eyebrow={C.monthLabel(per) + ' · ' + C.currencyMeta(cur).name} title="Análisis" right={<CurTabs small value={cur} list={s.settings.enabledCurrencies} onChange={setCurrency} />} />
        <div className="sec" style={{ marginTop: 12 }}><Seg items={[['month', 'Este mes'], ['week', 'Últimos 7 días']]} value={range} onChange={setRange} label="Periodo" /></div>
        <div className="sec">
          <div className="hero total ahero">
            <span className="lbl">{range === 'month' ? 'Gastado en ' + C.monthName(now.getMonth()) : 'Gastado en 7 días'}</span>
            {(() => { const mp = C.moneyParts(range === 'month' ? spent : weekTotal, cur); return <div className="big"><span className="cu">{mp.symbol}</span><span className="odo">{hide ? '••••' : mp.whole}<span className="sep dec">{hide || !mp.dec ? '' : '.' + mp.dec}</span></span></div>; })()}
            {range === 'month' ? <>
              <span className="cmp">{arrow(spent, prevAt)}{cmp(spent, prevAt, 'el mes pasado a esta altura')}</span>
              {has3 && <span className="cmp">{arrow(spent, avg3)}{cmp(spent, avg3, 'tu promedio de 3 meses')}</span>}
            </> : <span className="cmp">{arrow(weekTotal, prevWeek)}{cmp(weekTotal, prevWeek, 'los 7 días anteriores')}</span>}
          </div>
        </div>

        {range === 'month' ? (
          <div className="sec"><div className="card">
            <div className="ch"><b>Gasto acumulado</b></div>
            {!hasLine ? <p className="tsm2">Todavía no hay gastos este mes ni el anterior. Cuando registres uno, aquí verás cómo avanza el mes frente al pasado.</p> : <div className="chart">
              <div className="tt" style={{ left: Math.min(70, Math.max(30, (x(hd2) / W) * 100)) + '%' }}>
                <b className="nums">{M(cm.cum[Math.min(hd2, day) - 1] || 0, cur)}</b><span><i className="k1" />Este mes, al {hd2 <= day ? hd2 : day}</span>
                <b className="nums">{M(pm.cum[Math.min(hd2, pm.n) - 1] || 0, cur)}</b><span><i className="k2" />Mes pasado, mismo día</span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gasto acumulado del mes comparado con el mes anterior">
                <line x1={X0} x2={X1} y1={Y0} y2={Y0} className="gl" />
                {grid.map((g) => <g key={g}><line x1={X0} x2={X1} y1={y(g)} y2={y(g)} className="gl" /><text x={X0} y={y(g) - 4} className="gt2">{C.currencyMeta(cur).symbol} {C.fmtNumber(C.fromMinor(g, cur), 0)}</text></g>)}
                <path d={sepD} className="ls" />
                {day > 1 && <path d={areaD} className="ar" />}
                <path d={octD} className="lo" />
                <line x1={x(hd2)} x2={x(hd2)} y1={YT} y2={Y0} className="xh" />
                <circle cx={x(Math.min(hd2, day))} cy={y(cm.cum[Math.min(hd2, day) - 1] || 0)} r="4.5" className="do" />
                <circle cx={x(Math.min(hd2, pm.n))} cy={y(pm.cum[Math.min(hd2, pm.n) - 1] || 0)} r="3.5" className="ds" />
                {Array.from({ length: cm.n }).map((_, i) => <rect key={i} x={x(i + 1) - 5} y={YT} width="10" height={Y0 - YT} className="hit" onMouseEnter={() => setHov(i + 1)} onClick={() => setHov(i + 1)} />)}
              </svg>
              <div className="xa"><span style={{ left: (x(1) / W) * 100 + '%', transform: 'none' }}>1</span>{day > 3 && day < cm.n - 3 && <span style={{ left: (x(day) / W) * 100 + '%' }}>{day}</span>}<span style={{ left: (x(cm.n) / W) * 100 + '%', transform: 'translateX(-100%)' }}>{cm.n}</span></div>
            </div>}
          </div></div>
        ) : (
          <div className="sec"><div className="card">
            <div className="ch"><b>Día por día</b><span className="tsm">Toca un día</span></div>
            <div className="wk">
              {week.map((d) => {
                const h = Math.max(2, (d.total / Math.max(1, ...week.map((w) => w.total))) * 110);
                return <button key={d.key} className={'wc' + (hd === d.key ? ' on' : '') + (!d.total ? ' zero' : '')} onClick={() => setHd(d.key)} aria-label={C.dayLabel(d.key) + ', ' + M(d.total, cur)}><span className="wb" style={{ height: h }} /><small>{d.label}</small></button>;
              })}
            </div>
            <p className="tsm2">{C.dayLabel(hd)}: {M(week.find((w) => w.key === hd)?.total || 0, cur)}</p>
          </div></div>
        )}

        <div className="sec"><div className="card">
          <div className="ch"><b>En qué se fue</b><span className="tsm">{M(total, cur)}</span></div>
          {cats.length ? cats.slice(0, 8).map((c, i) => (
            <button key={c.cat} className={'cb' + (hc === i ? ' on' : '')} onClick={() => setHc(hc === i ? null : i)}>
              <span className="cn">{C.showCat(c.cat)}</span>
              <span className="ctrack"><span className="cbar" style={{ width: (c.v / cmax) * 100 + '%' }} /></span>
              <span className="cv nums">{M(c.v, cur)}</span>
            </button>
          )) : <p className="tsm2">Todavía no hay gastos en este periodo.</p>}
          {cats.length > 0 && <p className="tsm2">{hc != null && cats[hc] ? C.showCat(cats[hc].cat) + ': ' + M(cats[hc].v, cur) + ' en ' + cats[hc].c + (cats[hc].c === 1 ? ' movimiento' : ' movimientos') + ', ' + C.pct(cats[hc].v, total) + '% del total.' : 'Toca una categoría para ver su detalle.'}</p>}
        </div></div>

        {range === 'month' && (
          <div className="sec"><div className="card">
            <div className="ch"><b>Cada día del mes</b></div>
            <div className="calh">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="cal">
              {Array.from({ length: pad }).map((_, i) => <span key={'p' + i} className="cd pad" />)}
              {cm.daily.map((v, i) => {
                const d = i + 1; const key = per + '-' + String(d).padStart(2, '0'); const fut = d > day;
                return <button key={d} className={'cd ' + (fut ? 'lf' : 'l' + lv(v)) + (hd === key ? ' on' : '')} disabled={fut} onClick={() => setHd(key)} aria-label={d + ' de ' + C.monthName(now.getMonth()) + (fut ? '' : ', ' + M(v, cur))}>{d}</button>;
              })}
            </div>
            <div className="calk"><i className="l0" /><span>Sin gasto</span><span style={{ width: 10 }} /><span>Menos</span><i className="l1" /><i className="l2" /><i className="l3" /><i className="l4" /><span>Más</span></div>
            <p className="tsm2">{hdDay} de {C.monthName(now.getMonth())}: {M(cm.daily[hdDay - 1] || 0, cur)}{hdOps.length ? ' en ' + hdOps.map((o: any) => o.concept).slice(0, 3).join(', ') + (hdOps.length > 3 ? '…' : '') : ''}</p>
          </div></div>
        )}

        <div className="sec"><div className="card">
          <div className="ch"><b>Dónde está tu dinero</b></div>
          {!accs.length && <p className="tsm2" style={{ marginTop: 0 }}>Todavía no tienes cuentas en {C.currencyMeta(cur).name.toLowerCase()}.</p>}
          {accs.map((a: any) => {
            const b = C.balanceOf(s, a); const bank = bankOf(a);
            return (
              <div key={a.id} className="wr" style={{ cursor: 'default' }}>
                <RowIcon bank={bank} text={a.name} />
                <span className="wn"><span className="wt"><b>{a.name}</b><span className="nums">{M(b, cur)}</span></span><span className="ctrack"><span className="cbar" style={{ width: Math.max(1.5, (Math.abs(b) / amax) * 100) + '%', background: palette(bank, dark).dot }} /></span></span>
              </div>
            );
          })}
          {accs.length > 0 && <p className="wsum"><span>Disponible <b className="nums">{M(totals.available, cur)}</b></span><span>Reservado <b className="nums">{M(totals.reserved, cur)}</b></span><span>Patrimonio líquido <b className="nums">{M(totals.total, cur)}</b></span></p>}
        </div></div>

        <div className="sec"><div className="card">
          <div className="ch"><b>Tu ánimo y tu gasto</b><button className="lnk" onClick={() => open('mood')}>Cómo estás</button></div>
          {withMood.length >= 3 ? <>
            <p className="mood">Con tensión alta registraste <b>{tense.length}</b> {tense.length === 1 ? 'gasto' : 'gastos'} este mes, de {M(avgT(tense), cur)} en promedio. Con calma, {M(avgT(calm), cur)}.</p>
            <div className="mrw"><span>Tensión alta</span><span className="ctrack"><span className="cbar" style={{ width: C.pct(C.sumMinor(tense.map((x: any) => x.o)), Math.max(1, C.sumMinor(withMood.map((x: any) => x.o)))) + '%' }} /></span><b className="nums">{M(C.sumMinor(tense.map((x: any) => x.o)), cur)}</b></div>
            <div className="mrw"><span>Con calma</span><span className="ctrack"><span className="cbar" style={{ width: C.pct(C.sumMinor(calm.map((x: any) => x.o)), Math.max(1, C.sumMinor(withMood.map((x: any) => x.o)))) + '%' }} /></span><b className="nums">{M(C.sumMinor(calm.map((x: any) => x.o)), cur)}</b></div>
            <p className="tsm2">Es una relación, no una causa. Sirve para notar patrones.</p>
          </> : <p className="tsm2">Registra cómo te sientes y lo verás junto a tu gasto.</p>}
        </div></div>

        <div className="sec"><button className="qrow" onClick={() => open('ask', { prompt: 'Analiza mis gastos de este mes. Busca patrones entre categorías, días y ánimo. Separa hechos de interpretaciones.' })}><span className="sc"><b>¿Qué cambió este mes?</b><small>Categorías, días y ánimo, comparados con {C.monthName((new Date().getMonth() + 11) % 12)}.</small></span><span className="chr"><IChevR /></span></button></div>
        <div className="endpad" />
      </div>
    </div>
  );
}
