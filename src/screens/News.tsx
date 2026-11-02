/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useUI } from '../ui/ctx';
import { useWallet } from '../store';
import { IChevD } from '../ui/icons';
import { Seg } from '../ui/bits';
import { BackHeader } from './parts';
import { useNews, useMarkets, marketItem } from '../net';
import { askOnce } from '../ai';
import * as C from '../domain/core';

function ago(ts: any) {
  const t = typeof ts === 'number' ? ts : Date.parse(ts);
  if (!Number.isFinite(t)) return '';
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  return m < 60 ? 'hace ' + m + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' d';
}

function Spark({ h }: { h: number[] }) {
  if (!h || h.length < 3) return null;
  const mn = Math.min(...h), mx = Math.max(...h), r = mx - mn || 1;
  const d = h.map((v, i) => (i ? 'L' : 'M') + ((i / (h.length - 1)) * 100).toFixed(1) + ' ' + (22 - ((v - mn) / r) * 20).toFixed(1)).join(' ');
  return <svg className="spk" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><path d={d} /></svg>;
}
const TICK: [string, string][] = [['usdpen', 'Dólar'], ['eurpen', 'Euro'], ['inflacion', 'Inflación 12 m'], ['tasa', 'Tasa BCRP'], ['petroleo', 'Petróleo'], ['oro', 'Oro'], ['cobre', 'Cobre'], ['btc', 'Bitcoin']];

export default function News() {
  const { open, hide } = useUI();
  const { s } = useWallet();
  const [exp, setExp] = useState<string | null>(null);
  const [force, setForce] = useState(0);
  const { data, err } = useNews(force);
  const mk = useMarkets();
  const [region, setRegion] = useState<'pe' | 'mundo'>('pe');
  const [topic, setTopic] = useState('todo');
  const [read, setRead] = useState<string[]>(() => { try { return JSON.parse(sessionStorage.getItem('wallet_news_read') || '[]'); } catch { return []; } });
  const [sum, setSum] = useState<{ loading?: boolean; text?: string; err?: string }>({});
  const T = (data && data.topics) || {};
  const pick = (keys: string[]) => keys.flatMap((k) => (T[k] || []).map((x: any) => ({ ...x, topic: k })));
  let list: any[] = region === 'pe' ? pick(topic === 'todo' ? ['economia', 'peru'] : topic === 'economia' ? ['economia'] : ['peru']) : pick(topic === 'todo' ? ['mundo', 'mercados'] : topic === 'economia' ? ['mercados'] : ['mundo']);
  list = list.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 12);
  const TL: Record<string, string> = { economia: 'Economía', peru: 'Perú', mundo: 'Mundo', mercados: 'Mercados', otros: 'Otros' };
  const usd = marketItem(mk.data, 'usdpen'); const infl = marketItem(mk.data, 'inflacion'); const tasa = marketItem(mk.data, 'tasa');

  const summarize = async () => {
    setSum({ loading: true });
    try {
      const heads = list.slice(0, 8).map((n) => '- ' + n.title + ' (' + n.source + ')').join('\n');
      const text = await askOnce('Resume en 3 viñetas muy cortas, en español de Perú, lo más relevante para el bolsillo de una persona en estos titulares. Para política, menciona solo lo que dicen al menos dos fuentes distintas; si no, omítelo. Sin opiniones.\n\n' + heads);
      setSum({ text });
    } catch (e: any) { setSum({ err: e.message || 'No pude resumir ahora.' }); }
  };
  const markRead = (link: string) => { const n = read.concat([link]); setRead(n); try { sessionStorage.setItem('wallet_news_read', JSON.stringify(n)); } catch { /* */ } };

  return (
    <>
      <BackHeader right={<button className="eb" onClick={() => setForce(force + 1)}>Actualizar</button>} />
      <div className="scr noscr">
        <div className="sec phd" style={{ paddingTop: 8 }}><span className="pht"><b>El día</b><small>{C.longDate(C.todayLocal())}{data && data.at ? ', ' + ago(data.at) : ''}</small></span></div>
        <div className="tick2 noscr">
          {TICK.map(([id, l]) => { const it = marketItem(mk.data, id); if (!it) return null; const ch = String(it.change || ''); const up = ch.startsWith('+'), dn = ch.startsWith('-') || ch.startsWith('−');
            return <div key={id} className="tk"><small>{l}</small><b className="nums">{id === 'usdpen' || id === 'eurpen' ? 'S/ ' + Number(it.raw).toFixed(3) : it.value}</b>{ch && <span className={'chg' + (up ? ' up' : dn ? ' dn' : '')}>{up ? '↑ ' : dn ? '↓ ' : ''}{ch.replace(/^[+-]/, '')}</span>}<Spark h={it.history} /></div>; })}
        </div>
        {(() => {
          const usdA = C.accountsByCurrency(s, 'USD').filter((a: any) => !a.archived);
          const usdT = usdA.reduce((n: number, a: any) => n + C.balanceOf(s, a), 0);
          const rows: [string, string][] = [];
          if (usd && usdT) rows.push(['Tus dólares en soles', hide ? 'S/ ••••' : C.money(Math.round(C.fromMinor(usdT, 'USD') * Number(usd.raw) * 100), 'PEN')]);
          if (usd && usdT && String(usd.change || '')) { const c = Number(String(usd.change).replace(',', '.')); if (Number.isFinite(c) && c) rows.push(['Hoy por el tipo de cambio', (c > 0 ? '+' : '−') + (hide ? 'S/ ••••' : C.money(Math.abs(Math.round(C.fromMinor(usdT, 'USD') * c * 100)), 'PEN'))]); }
          if (infl) { const pen = C.currencyTotals(s, 'PEN').total; const r = Number(String(infl.raw ?? '').replace(',', '.')); if (pen > 0 && Number.isFinite(r) && r > 0) rows.push(['Lo que la inflación le quita a tus soles en un año', hide ? 'S/ ••••' : '−' + C.money(Math.round((pen * r) / 100), 'PEN')]); }
          if (!rows.length) return null;
          return <div className="sec"><div className="card3 flat"><div className="c3h"><b>En tu bolsillo</b></div>{rows.map(([k, v]) => <p key={k} className="lv"><span>{k}</span><b className="nums">{v}</b></p>)}</div></div>;
        })()}
        <div className="sec" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <div className="card3 flat">
            <div className="c3h"><b>En corto</b>{sum.text && <span>Hecho con IA</span>}</div>
            {sum.text ? <ul className="sumu">{sum.text.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).slice(0, 4).map((l, i) => <li key={i}>{l}</li>)}</ul>
              : sum.loading ? <div className="bub m typing" style={{ marginTop: 6 }}><i /><i /><i /></div>
                : <><p className="tsm2">{sum.err || 'Tres líneas con lo que toca tu bolsillo.'}</p><button className="act ink" style={{ marginTop: 10 }} onClick={summarize} disabled={!list.length}>Resumir el día</button></>}
          </div>
          <Seg items={[['pe', 'Perú'], ['mundo', 'Mundo']]} value={region} onChange={(v) => { setRegion(v); setTopic('todo'); }} label="Región" />
          <div className="flt noscr" style={{ marginTop: 0 }}>
            {[['todo', 'Todo'], ['economia', region === 'pe' ? 'Economía' : 'Mercados'], ['otro', region === 'pe' ? 'País' : 'Mundo']].map(([k, t]) => <button key={k} className={'fc' + (topic === k ? ' on' : '')} aria-pressed={topic === k} onClick={() => setTopic(k)}>{t}</button>)}
          </div>
          {err && !list.length && <div className="empty"><b>{err}</b><button className="liq" onClick={() => setForce(force + 1)}>Reintentar</button></div>}
          {!data && !err && <div className="nwl"><span className="sk" /><span className="sk" /><span className="sk" /></div>}
          <div className="nwl">
            {list.map((n) => { const on = exp === n.link; return (
              <div key={n.link} className={'nw2' + (on ? ' on' : '') + (read.includes(n.link) ? ' rd' : '')}>
                <button className="nwh" aria-expanded={on} onClick={() => setExp(on ? null : n.link)}>
                  <span className="nwt"><small>{TL[n.topic] || n.topic} · {n.source} · {ago(n.publishedAt)}</small><b>{n.title}</b></span>
                  <span className="xchev" aria-hidden="true"><IChevD /></span>
                </button>
                <div className="nwb"><div>
                  {n.image && <img className="nimg2" src={n.image} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
                  {(n.tags || []).length > 0 && <p className="tsm2">{(n.tags || []).slice(0, 4).join(' · ')}</p>}
                  <span className="acts3"><a className="act ink" href={n.link} target="_blank" rel="noopener noreferrer" onClick={() => markRead(n.link)}>Leer en {n.source}</a><button className="act" onClick={() => open('ask', { prompt: '¿Cómo me afecta esta noticia, mirando mis cuentas y gastos? «' + n.title + '» (' + n.source + ')' })}>¿Cómo me afecta?</button></span>
                </div></div>
              </div>
            ); })}
          </div>
          <p className="tsm2">Medios del Perú y del mundo. Lo que lees no se guarda.</p>
        </div>
        <div className="endpad" />
      </div>
    </>
  );
}
