/* eslint-disable @typescript-eslint/no-explicit-any */
// Wallet 25 · Análisis a fondo: Resumen, Flujo, Hábitos, Ánimo y Metas.
// Una sola moneda a la vez; un eje por gráfico; etiquetas y signos además del color.
import React, { useMemo, useState } from 'react';
import * as C from '../domain/core';
import * as D from '../domain/derive';
import * as I from '../domain/insights';
import { useWallet, commit } from '../store';
import { useUI } from '../ui/ctx';
import { useMoney, RowIcon, CurTabs } from '../ui/bits';
import { bankOf, palette, markSrc, markAspect } from '../design/theme';
import { PageTitle, Banner } from './parts';
import { IChevR, IX } from '../ui/icons';
import { setCurrency } from '../App';
import { MoodShape } from './Home';
import { useMarkets } from '../net';
import { feel } from '../ui/feel';

type Tab = 'res' | 'flujo' | 'hab' | 'animo' | 'metas';
const TABS: [Tab, string][] = [['res', 'Resumen'], ['flujo', 'Flujo'], ['hab', 'Hábitos'], ['animo', 'Ánimo'], ['metas', 'Metas']];
const MOODL = ['Mal', 'Bajo', 'Normal', 'Bien', 'Muy bien'];

function SubTabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const i = TABS.findIndex((t) => t[0] === value);
  return (
    <div className="sg" style={{ ['--n' as any]: TABS.length }} role="tablist" aria-label="Secciones de análisis">
      <i style={{ transform: `translateX(${i * 100}%)` }} aria-hidden="true" />
      {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => { if (value !== k) feel('tap'); onChange(k); }}>{l}</button>)}
    </div>
  );
}

function Card({ title, right, children, className = '' }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <div className={'card3 ' + className}><div className="c3h"><b>{title}</b>{right}</div>{children}</div>;
}

export default function Analysis() {
  const { s } = useWallet();
  const { open, hide } = useUI();
  const M = useMoney();
  const cur = s.settings.activeCurrency;
  const [tab, setTab] = useState<Tab>('res');
  const [prevTab, setPrevTab] = useState<Tab>('res');
  const go = (t: Tab) => { setPrevTab(tab); setTab(t); };
  const dir = TABS.findIndex((t) => t[0] === tab) >= TABS.findIndex((t) => t[0] === prevTab) ? 10 : -10;
  const m = (n: number) => M(n, cur);
  const per = C.currentPeriod();
  const now = new Date(); const day = now.getDate();
  const cm = D.cumulative(s, cur, per);
  const pm = D.cumulative(s, cur, D.prevPeriod(per));
  const spent = cm.cum[day - 1] || 0;
  const prevAt = pm.cum[Math.min(day, pm.n) - 1] || 0;

  return (
    <div className="scr noscr nohdr">
      <div className="zz">
        <Banner />
        <PageTitle eyebrow={C.monthLabel(per) + ' · ' + C.currencyMeta(cur).name} title="Análisis" right={<CurTabs small value={cur} list={s.settings.enabledCurrencies} onChange={setCurrency} />} />
        <div className="sub3"><SubTabs value={tab} onChange={go} /></div>
        <div className="pane" key={tab + cur} style={{ ['--px' as any]: dir + 'px' }}>
          {tab === 'res' && <Resumen m={m} cur={cur} spent={spent} prevAt={prevAt} hide={hide} />}
          {tab === 'flujo' && <Flujo m={m} cur={cur} cm={cm} pm={pm} day={day} />}
          {tab === 'hab' && <Habitos m={m} cur={cur} cm={cm} day={day} />}
          {tab === 'animo' && <Animo m={m} cur={cur} />}
          {tab === 'metas' && <Metas m={m} cur={cur} />}
        </div>
        <div className="sec" style={{ marginTop: 18 }}>
          <button className="qrow" onClick={() => open('ask', { prompt: 'Analiza mis finanzas de este mes en ' + C.currencyMeta(cur).name + ': flujo, hábitos, ánimo y metas. Compara con el mes pasado. Separa hechos de interpretaciones y dame 3 acciones concretas.' })}>
            <span className="sc"><b>¿Qué cambió este mes?</b><small>Pregúntale a la IA</small></span><span className="chr"><IChevR /></span>
          </button>
        </div>
        <div className="endpad" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resumen: total del mes, alertas, indicadores con gráfico que cambia, dinero e inversiones
// ---------------------------------------------------------------------------
function Resumen({ m, cur, spent, prevAt, hide }: { m: (n: number) => string; cur: string; spent: number; prevAt: number; hide: boolean }) {
  const { s } = useWallet();
  const { dark } = useUI();
  const ks = I.kpis(s, cur, m);
  const [k, setK] = useState('ahorro');
  const [gone, setGone] = useState<string[]>([]);
  const al = I.alerts(s, cur, m);
  const kp = ks.find((x) => x.key === k) || ks[0];
  const smax = Math.max(1, ...kp.series.map((x) => Math.abs(x.v)));
  const [sel, setSel] = useState<number | null>(null);
  const totals = C.currencyTotals(s, cur);
  const accs = C.accountsByCurrency(s, cur).filter((a: any) => !a.archived);
  const pos = accs.filter((a: any) => C.balanceOf(s, a) > 0);
  const pTot = pos.reduce((n: number, a: any) => n + C.balanceOf(s, a), 0);
  const watch: any[] = s.watchlist || [];
  const { data } = useMarkets(watch.map((w) => w.id), 0);
  const items = (data && data.items ? data.items : []).filter((x: any) => x.group === 'seguimiento');
  const pf = I.portfolio(watch, items);
  const dismiss = (id: string) => { setGone((g) => g.concat([id])); setTimeout(() => commit((x) => { x.dismissedInsights = (x.dismissedInsights || []).concat([id]).slice(-200); }, { silent: true }), 300); };
  const mp = C.moneyParts(spent, cur);
  const diff = spent - prevAt;
  return <>
    <div className="sec">
      <div className="hero total ahero">
        <span className="lbl">Gastado en {C.monthName(new Date().getMonth())}</span>
        <div className="big"><span className="cu">{mp.symbol}</span><span className="odo md">{hide ? '••••' : mp.whole}{!hide && mp.dec && <span className="ct">.{mp.dec}</span>}</span></div>
        <span className="lv0"><span>Mes pasado a esta altura</span><b className="nums">{m(prevAt)}</b></span>
        {prevAt > 0 && <span className="lv0"><span>Diferencia</span><b className="nums">{diff === 0 ? 'Igual' : (diff > 0 ? '+' : '−') + m(Math.abs(diff))}</b></span>}
      </div>
    </div>
    {al.length > 0 && <div className="sec" style={{ marginTop: 14 }}>
      {al.map((a) => (
        <div key={a.id} className={'alw' + (gone.includes(a.id) ? ' out' : '')}><div>
          <div className="al"><span className={'alic ' + a.kind} aria-hidden="true">{a.kind === 'ok' ? '✓' : '!'}</span><span className="alt"><b>{a.title}</b><span>{a.detail}</span></span><button className="x" onClick={() => dismiss(a.id)} aria-label="Descartar"><IX size={16} /></button></div>
        </div></div>
      ))}
    </div>}
    <Card title="Tus indicadores" right={<span>Toca uno</span>}>
      <div className="kpis">
        {ks.map((x) => (
          <button key={x.key} className={'kpi' + (k === x.key ? ' on' : '')} aria-pressed={k === x.key} onClick={() => { setK(x.key); setSel(null); }}>
            <span><b>{x.label}</b><small>{x.hint}</small></span>
            {x.tone !== 'none' ? <span className={'badge ' + x.tone}>{x.tone === 'ok' ? '✓ Bien' : '! Ojo'}</span> : <span />}
            <em className="nums">{hide && x.key === 'pat' ? '••••' : x.value}</em>
          </button>
        ))}
      </div>
      <div className="kbars" role="img" aria-label={kp.label + ' por mes: ' + kp.series.map((x) => x.label + ' ' + x.display).join(', ')}>
        {kp.series.map((x, i) => (
          <button key={x.label + i} className={'kb' + (sel === i ? ' on' : '') + (x.v < 0 ? ' neg' : '')} onClick={() => setSel(sel === i ? null : i)} aria-label={x.label + ' ' + x.display}>
            <span className="kbt"><i style={{ height: Math.max(2, (Math.abs(x.v) / smax) * 100) + '%' }} /></span>
            <small>{x.label}</small>
          </button>
        ))}
      </div>
      <p className="lv"><span>{sel != null ? C.cap(kp.series[sel].label) : kp.key === 'pat' ? 'Ahorro neto por mes' : kp.key === 'fondo' ? 'Gasto por mes' : kp.key === 'dti' ? 'Cuotas por mes' : 'Ahorro por mes'}</span><b className="nums">{sel != null ? (hide ? '••••' : kp.series[sel].display) : C.cap(kp.series[kp.series.length - 1].label) + ', ' + (hide ? '••••' : kp.series[kp.series.length - 1].display)}</b></p>
    </Card>
    <Card title="Dónde está tu dinero" right={<span className="nums">{m(totals.total)}</span>}>
      {pos.length > 0 && <div className="stack" role="img" aria-label={pos.map((a: any) => a.name + ' ' + m(C.balanceOf(s, a))).join(', ')}>
        {pos.map((a: any) => { const bk = bankOf(a); const src = markSrc(bk); return <i key={a.id} style={{ flexGrow: C.balanceOf(s, a), ['--cb' as any]: palette(bk, dark).cb, ['--ci' as any]: palette(bk, dark).ci }}>{src ? <img className={'mk ' + markAspect(bk)} src={src} alt="" /> : null}</i>; })}
      </div>}
      {accs.map((a: any) => { const b = C.balanceOf(s, a); return (
        <div key={a.id} className="srow"><RowIcon bank={bankOf(a)} text={a.name} /><span className="nm"><b>{a.name}</b><span>{b > 0 && pTot ? Math.round((b / pTot) * 100) + '% de lo que tienes' : b < 0 ? 'En negativo' : 'En cero'}</span></span><b className="am nums">{m(b)}</b></div>
      ); })}
      <p className="lv"><span>Disponible</span><b className="nums">{m(totals.available)}</b></p>
      {totals.reserved > 0 && <p className="lv"><span>Reservado en metas</span><b className="nums">{m(totals.reserved)}</b></p>}
    </Card>
    {pf.count > 0 && <Card title="Inversiones" right={<span>US$, aparte del patrimonio</span>}>
      <div className="big3 nums">{hide ? '••••' : 'US$ ' + C.fmtNumber(pf.value, 2)}</div>
      {pf.plPct != null && <p className="lv"><span>Desde que compraste</span><b className={'nums ' + (pf.pl >= 0 ? 'inc' : '')}>{hide ? '••••' : (pf.pl >= 0 ? '↑ +' : '↓ −') + 'US$ ' + C.fmtNumber(Math.abs(pf.pl), 2) + ' (' + (pf.pl >= 0 ? '+' : '−') + Math.abs(pf.plPct).toFixed(1) + '%)'}</b></p>}
      {pf.plPct == null && <p className="lv"><span>Agrega a cuánto compraste para ver tu ganancia</span><b /></p>}
    </Card>}
  </>;
}

// ---------------------------------------------------------------------------
// Flujo: el mes día a día, ingresos contra gastos por mes y a dónde fue el ingreso
// ---------------------------------------------------------------------------
function Flujo({ m, cur, cm, pm, day }: { m: (n: number) => string; cur: string; cm: any; pm: any; day: number }) {
  const { s } = useWallet();
  const [hov, setHov] = useState<number | null>(null);
  const [n, setN] = useState<6 | 3>(6);
  const [sm, setSm] = useState<number | null>(null);
  const flow = I.flowByMonth(s, cur, n);
  const fmax = Math.max(1, ...flow.map((f) => Math.max(f.inc, f.out)));
  // acumulado
  const W = 340, H = 170, X0 = 4, X1 = 336, Y0 = 150, YT = 14;
  const ymax = Math.max(1, ...cm.cum.slice(0, day), ...pm.cum) * 1.08;
  const NN = Math.max(cm.n, pm.n);
  const x = (d: number) => X0 + ((d - 1) * (X1 - X0)) / (NN - 1 || 1);
  const y = (v: number) => Y0 - (v / ymax) * (Y0 - YT);
  const line = (arr: number[], upTo: number) => arr.slice(0, upTo).map((v, i) => (i ? 'L' : 'M') + x(i + 1).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  const hd = hov ?? day;
  const hasLine = cm.cum.slice(0, day).some((v: number) => v > 0) || pm.cum.some((v: number) => v > 0);
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHov(Math.max(1, Math.min(cm.n, Math.round(((px - X0) / (X1 - X0)) * (NN - 1)) + 1))); };
  // a dónde fue el ingreso del mes pasado
  const lastPer = D.prevPeriod(C.currentPeriod());
  const inc = C.sumMinor(C.incomeOps(s, cur, lastPer));
  const cats = D.categoryTotals(C.spendingOps(s, cur, lastPer));
  const top = cats.slice(0, 5); const rest = cats.slice(5).reduce((a, c) => a + c.v, 0);
  const outT = cats.reduce((a, c) => a + c.v, 0);
  const saved = inc - outT;
  const flowsTo = top.map((c) => ({ name: C.showCat(c.cat), v: c.v })).concat(rest ? [{ name: 'Otras', v: rest }] : []);
  const base = Math.max(inc, outT, 1);
  return <>
    <Card title="Gasto acumulado" right={<span className="leg2"><i className="k1" />Este mes <i className="k2" />Mes pasado</span>}>
      {!hasLine ? <p className="tsm2">Aún sin gastos este mes ni el anterior.</p> : <div className="cw3">
        <div className="tip3" style={{ left: Math.min(78, Math.max(22, (x(hd) / W) * 100)) + '%' }}>Día {hd} · {m(cm.cum[Math.min(hd, day) - 1] || 0)} · antes {m(pm.cum[Math.min(hd, pm.n) - 1] || 0)}</div>
        <svg viewBox={`0 0 ${W} ${H}`} className="chart25" role="img" aria-label="Gasto acumulado de este mes contra el mes pasado" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHov(null)}>
          <line x1={X0} x2={X1} y1={Y0} y2={Y0} className="gl" />
          <line x1={X0} x2={X1} y1={y(ymax / 2 / 1.08)} y2={y(ymax / 2 / 1.08)} className="gl" />
          <text x={X1} y={y(ymax / 2 / 1.08) + 14} textAnchor="end" className="gt2">{m(Math.round(ymax / 2 / 1.08))}</text>
          <path d={line(pm.cum, pm.n)} className="ls" />
          <path d={line(cm.cum, day)} className="lo drw" />
          <line x1={x(hd)} x2={x(hd)} y1={YT} y2={Y0} className="xh" />
          <circle cx={x(Math.min(hd, day))} cy={y(cm.cum[Math.min(hd, day) - 1] || 0)} r="5" className="do" />
          <circle cx={x(Math.min(hd, pm.n))} cy={y(pm.cum[Math.min(hd, pm.n) - 1] || 0)} r="4" className="ds" />
        </svg>
        <div className="xa2"><span>1</span><span>{NN}</span></div>
      </div>}
    </Card>
    <Card title="Entra y sale" right={<span className="sel3">{([6, 3] as const).map((v) => <button key={v} className={'chip sm' + (n === v ? ' on' : '')} onClick={() => { setN(v); setSm(null); }}>{v} meses</button>)}</span>}>
      <div className="gb" style={{ ['--m' as any]: flow.length }}>
        {flow.map((f, i) => (
          <button key={f.per} className={sm === i ? 'on' : ''} onClick={() => setSm(sm === i ? null : i)} aria-label={f.label + ': entró ' + m(f.inc) + ', salió ' + m(f.out)}>
            <span className="pair"><i className={'in' + (f.current ? ' proj' : '')} style={{ height: (f.inc / fmax) * 100 + '%' }} /><i className={'out' + (f.current ? ' proj' : '')} style={{ height: (f.out / fmax) * 100 + '%' }} /></span>
            <small>{f.label}</small>
          </button>
        ))}
      </div>
      <div className="netrow" style={{ ['--m' as any]: flow.length }}>{flow.map((f) => { const v = Math.abs(C.fromMinor(f.net, cur)); return <span key={f.per} className={f.net > 0 ? 'inc' : ''}>{!f.inc && !f.out ? '—' : (f.net >= 0 ? '+' : '−') + (v >= 1000 ? C.fmtNumber(v / 1000, 1) + 'k' : C.fmtNumber(v, 0))}</span>; })}</div>
      <div className="leg"><span><i style={{ background: 'var(--inc)' }} />Entró</span><span><i style={{ background: 'var(--tx)' }} />Salió</span><span><i className="hatch" />Mes en curso</span></div>
      {sm != null && <p className="lv"><span>{C.cap(C.monthName(Number(flow[sm].per.slice(5, 7)) - 1))}</span><b className="nums">+{m(flow[sm].inc)} · −{m(flow[sm].out)}</b></p>}
    </Card>
    <Card title={'A dónde fue tu ingreso de ' + C.monthName(Number(lastPer.slice(5, 7)) - 1)} right={<span className="nums">{m(inc)}</span>}>
      {!inc && !outT ? <p className="tsm2">Sin movimientos ese mes.</p> : <div className="flowto">
        {flowsTo.map((f) => (
          <div key={f.name} className="ft"><span>{f.name}</span><span className="ftb"><i style={{ width: (f.v / base) * 100 + '%' }} /></span><b className="nums">{m(f.v)}</b><small>{inc ? C.pct(f.v, inc) + '%' : ''}</small></div>
        ))}
        <div className={'ft save' + (saved < 0 ? ' neg' : '')}><span>{saved >= 0 ? 'Te quedó' : 'Faltó'}</span><span className="ftb"><i style={{ width: (Math.abs(saved) / base) * 100 + '%' }} /></span><b className="nums">{saved >= 0 ? '+' : '−'}{m(Math.abs(saved))}</b><small>{inc ? C.pct(Math.abs(saved), inc) + '%' : ''}</small></div>
      </div>}
    </Card>
  </>;
}

// ---------------------------------------------------------------------------
// Hábitos: contra el mes pasado, 50/30/20, días de la semana, calendario, fijos y comercios
// ---------------------------------------------------------------------------
function Habitos({ m, cur, cm, day }: { m: (n: number) => string; cur: string; cm: any; day: number }) {
  const { s } = useWallet();
  const per = C.currentPeriod();
  const delta = I.categoryDelta(s, cur).slice(0, 6);
  const dmax = Math.max(1, ...delta.map((d) => Math.abs(d.delta)));
  const [dsel, setDsel] = useState<number | null>(null);
  const avgInc = I.monthlyAverages(s, cur, 3).inc;
  const nw = I.needsWants(s, cur, per, avgInc);
  const useNw = nw;
  const [classify, setClassify] = useState(false);
  const wd = I.weekdayAverages(s, cur);
  const wmax = Math.max(1, ...wd.map((w) => w.v));
  const [wsel, setWsel] = useState<number | null>(null);
  const subs = I.subscriptions(s, cur);
  const [off, setOff] = useState<string[]>([]);
  const [yr, setYr] = useState(false);
  const merch = I.topMerchants(s, cur, per);
  const [hd, setHd] = useState<string>(C.todayLocal());
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const pad = (first + 6) % 7;
  const lv = (v: number) => { if (!v) return 0; const r = v / Math.max(1, ...cm.daily); return r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.8 ? 3 : 4; };
  const hdOps = C.spendingOps(s, cur, per).filter((o: any) => C.sameDay(o.date, hd));
  const cats = I.spendCategories(s);
  const map = (s.settings.needsWants || {}) as Record<string, string>;
  const setNW = (cat: string, v: string) => commit((x) => { x.settings.needsWants = Object.assign({}, x.settings.needsWants || {}, { [cat]: v }); }, { silent: true });
  const segs = [{ k: 'need', l: 'Necesidades', v: useNw.need, t: 50, c: 'var(--tx)' }, { k: 'want', l: 'Gustos', v: useNw.want, t: 30, c: 'color-mix(in srgb,var(--tx) 24%,var(--pg))' }, { k: 'save', l: 'Ahorro', v: useNw.save, t: 20, c: 'var(--inc)' }];
  const nwBase = Math.max(1, useNw.inc || useNw.need + useNw.want + useNw.save);
  const subTotal = subs.filter((x: any) => !off.includes(x.id)).reduce((a: number, x: any) => a + (yr ? x.year : x.month), 0);
  const saving = subs.filter((x: any) => off.includes(x.id)).reduce((a: number, x: any) => a + x.year, 0);
  return <>
    <Card title={'Contra ' + C.monthName(Number(D.prevPeriod(per).slice(5, 7)) - 1)} right={<span>a esta altura</span>}>
      {!delta.length ? <p className="tsm2">Aún sin gastos para comparar.</p> : <div className={'dvwrap' + (dsel != null ? ' pick' : '')}>
        {delta.map((d, i) => (
          <button key={d.cat} className={'dvr' + (dsel === i ? ' on' : '')} onClick={() => setDsel(dsel === i ? null : i)} aria-label={C.showCat(d.cat) + ': ' + (d.delta >= 0 ? 'más ' : 'menos ') + m(Math.abs(d.delta))}>
            <span>{C.showCat(d.cat)}</span>
            <span className="dvt"><em />{d.delta !== 0 && <i style={d.delta > 0 ? { left: '50%', width: (Math.abs(d.delta) / dmax) * 50 + '%', background: 'var(--tx)' } : { right: '50%', width: (Math.abs(d.delta) / dmax) * 50 + '%', background: 'var(--inc)' }} />}</span>
            <b className={'nums' + (d.delta < 0 ? ' inc' : '')}>{d.delta > 0 ? '+' : d.delta < 0 ? '−' : ''}{C.fmtNumber(Math.abs(C.fromMinor(d.delta, cur)), 0)}</b>
          </button>
        ))}
        <p className="lv"><span>{dsel != null ? C.showCat(delta[dsel].cat) : 'Más a la derecha, menos a la izquierda'}</span><b className="nums">{dsel != null ? m(delta[dsel].now) + ' vs ' + m(delta[dsel].before) : ''}</b></p>
      </div>}
    </Card>
    <Card title="50/30/20" right={<button className="lnk" onClick={() => setClassify(!classify)}>{classify ? 'Listo' : 'Clasificar'}</button>}>
      {(!useNw.classified && !classify) ? <div className="nwask"><p className="tsm2">Dime qué categorías son necesidad y cuáles gusto. Lo haces una vez.</p><button className="act ink" onClick={() => setClassify(true)}>Clasificar ahora</button></div> : null}
      {classify && <div className="nwlist">{cats.map((c: string) => (
        <div key={c} className="nwr"><span>{C.showCat(c)}</span><span className="seg2 n2"><button className={'sk' + (map[c] === 'need' ? ' on' : '')} aria-pressed={map[c] === 'need'} onClick={() => setNW(c, 'need')}>Necesidad</button><button className={'sk' + (map[c] === 'want' ? ' on' : '')} aria-pressed={map[c] === 'want'} onClick={() => setNW(c, 'want')}>Gusto</button></span></div>
      ))}</div>}
      {useNw.classified && !classify && <>
        <div className="seg5" role="img" aria-label={segs.map((x) => x.l + ' ' + C.pct(x.v, nwBase) + '%').join(', ')}>
          {segs.map((x) => <span key={x.k} style={{ flexGrow: Math.max(1, x.v), background: x.c, color: x.k === 'want' ? 'var(--tx)' : 'var(--pg)' }}>{C.pct(x.v, nwBase) >= 9 ? C.pct(x.v, nwBase) + '%' : ''}</span>)}
        </div>
        <div className="tgt"><i style={{ left: '50%' }} /><i style={{ left: '80%' }} /><span style={{ left: '50%' }}>50</span><span style={{ left: '80%' }}>80</span></div>
        {segs.map((x) => <p key={x.k} className="lv"><span><i className="sw3" style={{ background: x.c }} />{x.l} ({x.t}%)</span><b className="nums">{m(x.v)} · {C.pct(x.v, nwBase)}%</b></p>)}
        <p className="lv"><span>Sobre tu ingreso habitual</span><b className="nums">{m(useNw.inc)}</b></p>
      </>}
    </Card>
    <Card title="Por día de la semana" right={<span>promedio, 90 días</span>}>
      <div className="wd">{wd.map((w, i) => <button key={i} className={wsel === i ? 'on' : ''} onClick={() => setWsel(wsel === i ? null : i)} aria-label={w.name + ' ' + m(w.v)}><i style={{ height: Math.max(3, (w.v / wmax) * 100) + '%' }} /><small>{w.label}</small></button>)}</div>
      <p className="lv"><span>{wsel != null ? wd[wsel].name : 'Tu día más caro'}</span><b className="nums">{wsel != null ? m(wd[wsel].v) : (() => { const b = wd.reduce((a, w) => (w.v > a.v ? w : a), wd[0]); return b.name + ', ' + m(b.v); })()}</b></p>
    </Card>
    <Card title="Cada día del mes">
      <div className="calh">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="cal">
        {Array.from({ length: pad }).map((_, i) => <span key={'p' + i} className="cd pad" />)}
        {cm.daily.map((v: number, i: number) => { const d = i + 1; const key = per + '-' + String(d).padStart(2, '0'); const fut = d > day;
          return <button key={d} className={'cd ' + (fut ? 'lf' : 'l' + lv(v)) + (hd === key ? ' on' : '')} disabled={fut} onClick={() => setHd(key)} aria-label={d + ', ' + m(v)}>{d}</button>; })}
      </div>
      <p className="lv"><span>{Number(hd.slice(8, 10))} de {C.monthName(now.getMonth())}{hdOps.length ? ' · ' + hdOps.map((o: any) => o.concept).slice(0, 2).join(', ') : ''}</span><b className="nums">{m(cm.daily[Number(hd.slice(8, 10)) - 1] || 0)}</b></p>
    </Card>
    <Card title="Pagos fijos" right={<span className="sel3"><button className={'chip sm' + (!yr ? ' on' : '')} onClick={() => setYr(false)}>Mes</button><button className={'chip sm' + (yr ? ' on' : '')} onClick={() => setYr(true)}>Año</button></span>}>
      {!subs.length ? <p className="tsm2">Sin pagos fijos de gasto.</p> : <>
        {subs.map((x: any) => (
          <button key={x.id} className={'srow' + (off.includes(x.id) ? ' off' : '')} onClick={() => setOff(off.includes(x.id) ? off.filter((y) => y !== x.id) : off.concat([x.id]))} aria-pressed={off.includes(x.id)}>
            <RowIcon text={x.name} cat={x.cat} /><span className="nm"><b>{x.name}</b><span>{off.includes(x.id) ? 'Marcado para revisar' : C.showCat(x.cat)}</span></span><b className="am nums">{m(yr ? x.year : x.month)}</b>
          </button>
        ))}
        <p className="lv"><span>Total {yr ? 'al año' : 'al mes'}</span><b className="nums">{m(subTotal)}</b></p>
        {saving > 0 && <p className="lv"><span>Si dejas los marcados</span><b className="nums inc">+{m(saving)} al año</b></p>}
      </>}
    </Card>
    <Card title="Dónde más gastas" right={<span>{C.monthName(now.getMonth())}</span>}>
      {!merch.length ? <p className="tsm2">Aún sin gastos este mes.</p> : merch.map((x) => (
        <div key={x.name} className="rank"><span>{x.name}</span><i style={{ width: (x.v / merch[0].v) * 100 + '%' }} /><b className="nums">{m(x.v)}</b></div>
      ))}
    </Card>
  </>;
}

// ---------------------------------------------------------------------------
// Ánimo: cuánto gastas según cómo estás, la tensión y tus etiquetas
// ---------------------------------------------------------------------------
function Animo({ m, cur }: { m: (n: number) => string; cur: string }) {
  const { s } = useWallet();
  const { open } = useUI();
  const ms = useMemo(() => I.moodSpending(s, cur), [s, cur]);
  const tl = I.moodTimeline(s, 14);
  const amax = Math.max(1, ...ms.levels.map((l) => l.avg));
  const [lsel, setLsel] = useState<number | null>(null);
  return <>
    <Card title="Gasto según tu ánimo" right={<span>{ms.n} gastos, 90 días</span>}>
      {ms.n < 3 ? <div className="nwask"><p className="tsm2">Registra cómo estás y lo verás junto a tu gasto.</p><button className="act ink" onClick={() => open('mood')}>Registrar ánimo</button></div> : <>
        <div className="mlv">{ms.levels.map((l, i) => (
          <button key={l.k} className={'mlb mk' + l.k + ' ' + (lsel === i ? ' on' : '') + (!l.n ? ' zero' : '')} onClick={() => setLsel(lsel === i ? null : i)} aria-label={MOODL[i] + ': ' + l.n + ' gastos, promedio ' + m(l.avg)}>
            <span className="mlt"><i style={{ height: Math.max(3, (l.avg / amax) * 100) + '%' }} /></span>
            <MoodShape k={l.k} size={22} /><small>{MOODL[i]}</small>
          </button>
        ))}</div>
        <p className="lv"><span>{lsel != null ? MOODL[lsel] + ', ' + ms.levels[lsel].n + (ms.levels[lsel].n === 1 ? ' gasto' : ' gastos') : 'Promedio por gasto'}</span><b className="nums">{lsel != null ? m(ms.levels[lsel].avg) + ' c/u' : 'Toca un ánimo'}</b></p>
      </>}
    </Card>
    {ms.n >= 3 && <Card title="Con tensión y con calma">
      <p className="lv"><span>Tensión alta · {ms.tense.n}</span><b className="nums">{m(ms.tense.avg)} c/u</b></p>
      <p className="lv"><span>Con calma · {ms.calm.n}</span><b className="nums">{m(ms.calm.avg)} c/u</b></p>
      {ms.tense.avg > 0 && ms.calm.avg > 0 && <p className="lv"><span>Diferencia</span><b className="nums">{ms.tense.avg >= ms.calm.avg ? '+' : '−'}{C.pct(Math.abs(ms.tense.avg - ms.calm.avg), ms.calm.avg)}% con tensión</b></p>}
    </Card>}
    <Card title="Tus últimos 14 días" right={<button className="lnk" onClick={() => open('mood')}>Registrar</button>}>
      {!tl.length ? <p className="tsm2">Sin registros todavía.</p> : <div className="mtl" role="img" aria-label={'Ánimo en los últimos 14 días: ' + tl.length + ' registros'}>
        {(() => { const t0 = Date.now() - 14 * 864e5; return tl.slice(-40).map((c: any, i: number) => <span key={i} className={'mtd mk' + I.moodLevelOf(c)} style={{ left: Math.min(100, Math.max(0, ((+C.dateFromLocalIso(c.timestamp) - t0) / (14 * 864e5)) * 100)) + '%', top: (100 - c.valence) * 0.84 + 8 + '%' }} title={C.longDate(c.timestamp)}><MoodShape k={I.moodLevelOf(c)} size={16} /></span>); })()}
        <em className="mtl0">Bien</em><em className="mtl1">Mal</em>
      </div>}
    </Card>
    {ms.tags.length > 0 && <Card title="Etiquetas al gastar">
      {ms.tags.map((t) => <p key={t.tag} className="lv"><span>{t.tag} · {t.n}</span><b className="nums">{m(t.avg)} c/u</b></p>)}
    </Card>}
    <p className="tsm2 sec">Es una relación, no una causa.</p>
  </>;
}

// ---------------------------------------------------------------------------
// Metas: cuándo llegas, cuánto liberas recortando gustos y el calendario de deudas
// ---------------------------------------------------------------------------
function Metas({ m, cur }: { m: (n: number) => string; cur: string }) {
  const { s } = useWallet();
  const { open, dark } = useUI();
  const goals = C.accountsByCurrency(s, cur).filter((a: any) => !a.archived && a.kind === 'reserve' && a.goalMinor);
  const avg = I.monthlyAverages(s, cur, 3);
  const stepM = C.toMinor(cur === 'PEN' ? 10 : 5, cur);
  const defMonthly = Math.max(stepM, Math.round((Math.max(0, avg.inc - avg.out) * 0.25) / stepM) * stepM);
  const [gi, setGi] = useState(0);
  const [mon, setMon] = useState<number>(defMonthly);
  const g = goals[gi];
  const bal = g ? Math.max(0, C.balanceOf(s, g)) : 0;
  const remaining = g ? Math.max(0, g.goalMinor - bal) : 0;
  const months = I.monthsToGoal(remaining, mon);
  const wants = I.needsWants(s, cur, D.prevPeriod(C.currentPeriod())).want || I.needsWants(s, cur, C.currentPeriod()).want;
  const [cut, setCut] = useState(20);
  const debts = C.debtsForCurrency(s, cur).filter((d: any) => d.direction === 'payable' && C.debtRemainingMinor(d) > 0);
  const step = C.toMinor(cur === 'PEN' ? 10 : 5, cur);
  const maxM = Math.max(step * 10, Math.round(Math.max(avg.inc, remaining) / step) * step);
  return <>
    <Card title="Tus metas" right={goals.length > 1 ? <span className="sel3">{goals.map((x: any, i: number) => <button key={x.id} className={'chip sm' + (gi === i ? ' on' : '')} onClick={() => setGi(i)}>{x.name}</button>)}</span> : null}>
      {!g ? <div className="nwask"><p className="tsm2">Crea una meta de ahorro y mira cuándo llegas.</p><button className="act ink" onClick={() => open('account-new', { currency: cur, kind: 'reserve' })}>Nueva meta</button></div> : <>
        <div className="big3 nums">{m(bal)}<small>de {m(g.goalMinor)}</small></div>
        <div className="prog"><i style={{ width: C.pct(bal, g.goalMinor) + '%', background: palette(bankOf(g), dark).cb === '#2A2824' ? 'var(--tx)' : 'var(--tx)' }} /><s style={{ left: C.pct(bal, g.goalMinor) + '%', width: Math.min(100 - C.pct(bal, g.goalMinor), months ? (mon / g.goalMinor) * 100 : 0) + '%' }} /></div>
        <div className="ticks"><span>{C.pct(bal, g.goalMinor)}%</span><span>Falta {m(remaining)}</span></div>
        <label className="rlab">Aportando por mes <b className="nums">{m(mon)}</b>
          <input className="rng" type="range" min={step} max={maxM} step={step} value={Math.min(mon, maxM)} onChange={(e) => setMon(Number(e.target.value))} aria-valuetext={m(mon) + ' al mes'} /></label>
        <p className="lv"><span>Llegas en</span><b className="nums">{remaining === 0 ? 'Ya llegaste' : months ? I.addMonthsLabel(months) + ' · ' + months + (months === 1 ? ' mes' : ' meses') : '—'}</b></p>
      </>}
    </Card>
    <Card title="Si recortas tus gustos" right={<span className="nums">{cut}%</span>}>
      {!wants ? <p className="tsm2">Clasifica tus categorías en Hábitos para simularlo.</p> : <>
        <input className="rng" type="range" min={5} max={60} step={5} value={cut} onChange={(e) => setCut(Number(e.target.value))} aria-label="Porcentaje de recorte" aria-valuetext={cut + '%'} />
        <p className="lv"><span>Gustos al mes</span><b className="nums">{m(wants)}</b></p>
        <p className="lv"><span>Liberas al mes</span><b className="nums inc">+{m(Math.round((wants * cut) / 100))}</b></p>
        <p className="lv"><span>En un año</span><b className="nums inc">+{m(Math.round((wants * cut) / 100) * 12)}</b></p>
        {g && remaining > 0 && <p className="lv"><span>Tu meta, sumándolo</span><b className="nums">{(() => { const k = I.monthsToGoal(remaining, mon + Math.round((wants * cut) / 100)); return k ? I.addMonthsLabel(k) : '—'; })()}</b></p>}
      </>}
    </Card>
    <Card title="Tus deudas" right={debts.length ? <span className="nums">{m(debts.reduce((a: number, d: any) => a + C.debtRemainingMinor(d), 0))}</span> : null}>
      {!debts.length ? <p className="tsm2">Sin deudas por pagar.</p> : debts.map((d: any) => {
        const ins = C.installmentsForDebt(d).slice().sort((a: any, b: any) => (a.dueDate < b.dueDate ? -1 : 1));
        const last = ins[ins.length - 1];
        return (
          <div key={d.id} className="dtl">
            <p className="lv"><span><b>{d.name}</b></span><b className="nums">{m(C.debtRemainingMinor(d))}</b></p>
            <div className="tl">{ins.slice(-8).map((i: any) => <div key={i.id} className={Number(i.paidMinor || 0) >= Number(i.amountMinor || 0) ? 'done' : ''}><i /><small>{C.shortDate(i.dueDate).split(' ')[1]}</small></div>)}</div>
            {last && <p className="lv"><span>Terminas</span><b>{C.cap(C.monthName(Number(String(last.dueDate).slice(5, 7)) - 1))} {String(last.dueDate).slice(0, 4)}</b></p>}
          </div>
        );
      })}
    </Card>
  </>;
}
