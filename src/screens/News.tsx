/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useUI } from '../ui/ctx';
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

export default function News() {
  const { open } = useUI();
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
        <div className="sec" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {(usd || infl || tasa) && <div className="card" style={{ marginTop: 0 }}>
            <div className="ch"><b>En números</b></div>
            {usd && <p className="mood" style={{ margin: '0 0 4px' }}>El dólar está en <b>S/ {Number(usd.raw).toFixed(3)}</b>.</p>}
            {infl && <p className="mood" style={{ margin: '0 0 4px' }}>La inflación de los últimos 12 meses va en <b>{infl.value}</b>.</p>}
            {tasa && <p className="mood" style={{ margin: 0 }}>La tasa del BCRP está en <b>{tasa.value}</b>.</p>}
          </div>}
          <div className="sumb">
            <span className="sl">En corto</span>
            {sum.text ? <><ul>{sum.text.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).slice(0, 4).map((l, i) => <li key={i}>{l}</li>)}</ul><span className="sw2">Resumen hecho con IA. Puede equivocarse: lee las fuentes.</span></>
              : sum.loading ? <span className="tsm">Leyendo los titulares…</span>
                : <><span className="tsm">{sum.err || 'Lo que más toca tus gastos hoy, en pocas líneas.'}</span><button className="liq" style={{ alignSelf: 'flex-start' }} onClick={summarize} disabled={!list.length}>Resumir el día</button></>}
          </div>
          <Seg items={[['pe', 'Perú'], ['mundo', 'Mundo']]} value={region} onChange={(v) => { setRegion(v); setTopic('todo'); }} label="Región" />
          <div className="flt noscr" style={{ marginTop: 0 }}>
            {[['todo', 'Todo'], ['economia', region === 'pe' ? 'Economía' : 'Mercados'], ['otro', region === 'pe' ? 'País' : 'Mundo']].map(([k, t]) => <button key={k} className={'fc' + (topic === k ? ' on' : '')} aria-pressed={topic === k} onClick={() => setTopic(k)}>{t}</button>)}
          </div>
          {err && !list.length && <div className="empty"><b>{err}</b><span>Revisa tu conexión e inténtalo otra vez.</span><button className="liq" onClick={() => setForce(force + 1)}>Reintentar</button></div>}
          {!data && !err && <div className="empty"><b>Trayendo titulares…</b></div>}
          {list.map((n) => (
            <a key={n.link} className={'nrow' + (read.includes(n.link) ? ' rd' : '')} href={n.link} target="_blank" rel="noopener noreferrer" onClick={() => markRead(n.link)}>
              {n.image && <img className="nimg" src={n.image} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
              <span className="ntag">{TL[n.topic] || n.topic}, {ago(n.publishedAt)}</span>
              <b>{n.title}</b>
              <span className="nsrc">{n.source} ›</span>
            </a>
          ))}
          <p className="tsm2">Medios del Perú y del mundo. Lo que lees no se guarda.</p>
          <button className="opt" onClick={() => open('ask', { prompt: '¿Cómo me afectan las noticias económicas de hoy, mirando mis gastos?' })}><b>¿Cómo me afecta?</b><span>Titulares que tocan lo que gastas.</span></button>
        </div>
        <div className="endpad" />
      </div>
    </>
  );
}
