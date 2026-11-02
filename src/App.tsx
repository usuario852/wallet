/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as C from './domain/core';
import { useWallet, dismissToast, commit, ensureCash } from './store';
import { Provider, View, Sheet } from './ui/ctx';
import { bankOf, skinFor, cssVars, lookOf } from './design/theme';
import { IHome, IList, ICal, IBars, IPlus } from './ui/icons';
import { setFeel, feel, askTiltOnce, subscribeTilt } from './ui/feel';
import Home from './screens/Home';
import Movements from './screens/Movements';
import Plan from './screens/Plan';
import Analysis from './screens/Analysis';
import Settings from './screens/Settings';
import Personalize from './screens/Personalize';
import AccountDetail from './screens/AccountDetail';
import Investments from './screens/Investments';
import News from './screens/News';
import Onboarding from './screens/Onboarding';
import { SheetHost } from './sheets/Host';

function useSystemDark() {
  const q = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;
  const [d, setD] = useState(!!q?.matches);
  useEffect(() => { if (!q) return; const f = () => setD(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []);
  return d;
}
const systemReduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Formas de la mesa: piedras de borde nítido que respiran; la inclinación las desplaza.
// Se mueven escribiendo transform directo en cada una (sin re-render ni variables heredadas).
// ---------------------------------------------------------------------------
function Pebbles({ tilt }: { tilt: boolean }) {
  const refs = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
  useEffect(() => {
    if (!tilt) { refs.forEach((r) => { if (r.current) r.current.style.transform = ''; }); return; }
    const depth = [22, 14, 30];
    let raf = 0, nx = 0, ny = 0;
    const off = subscribeTilt((x, y) => {
      nx = x; ny = y;
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; refs.forEach((r, i) => { if (r.current) r.current.style.transform = `translate3d(${Math.round(nx * depth[i])}px,${Math.round(ny * depth[i] * 0.8)}px,0)`; }); });
    });
    return () => { off(); cancelAnimationFrame(raf); };
  }, [tilt]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="pebs" aria-hidden="true">
      <span ref={refs[0]} className="peb p1"><i /></span>
      <span ref={refs[1]} className="peb p2"><i /></span>
      <span ref={refs[2]} className="peb p3"><i /></span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barra de vidrio líquido con la gota + al centro. La lente sigue al dedo y agranda el ícono de abajo.
// ---------------------------------------------------------------------------
const TABS: [View, string, (p: any) => any][] = [['home', 'Inicio', IHome], ['movs', 'Movimientos', IList], ['plan', 'Planifica', ICal], ['ana', 'Análisis', IBars]];
function barGeometry(W: number) {
  const c = W / 2, f = (n: number) => n.toFixed(2);
  const path = `M32 16 L${f(c - 28.64)} 16 A12 12 0 0 0 ${f(c - 21.17)} 13.39 A34 34 0 0 1 ${f(c + 21.17)} 13.39 A12 12 0 0 0 ${f(c + 28.64)} 16 L${f(W - 32)} 16 A32 32 0 0 1 ${f(W - 32)} 80 L32 80 A32 32 0 0 1 32 16 Z`;
  const tw = Math.max(52, (c - 57) / 2);
  const lefts = [8, 8 + tw, W - 8 - 2 * tw, W - 8 - tw];
  return { path, tw, lefts };
}
function GlassBar({ view, go, onAdd }: { view: View; go: (v: View) => void; onAdd: () => void; tilt?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLSpanElement>(null);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [W, setW] = useState(370);
  const g = useRef<any>(null);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.round(el.getBoundingClientRect().width)));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const geo = useMemo(() => barGeometry(W), [W]);
  const idx = Math.max(0, TABS.findIndex((t) => t[0] === view));
  const centers = geo.lefts.map((l) => l + geo.tw / 2);
  const near = (x: number) => centers.reduce((bi, c2, i) => (Math.abs(c2 - x) < Math.abs(centers[bi] - x) ? i : bi), 0);
  // La lente se mueve con transform (sin re-render por cada movimiento del dedo).
  const place = (x: number, sx = 1, sy = 1, animate = true) => {
    const el = lens.current; if (!el) return;
    el.style.transition = animate ? 'transform 440ms cubic-bezier(.32,.72,0,1), background-color 200ms ease, box-shadow 200ms ease' : 'none';
    el.style.transform = `translate3d(${x.toFixed(1)}px,0,0) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
  };
  const magnify = (cx: number | null) => tabsRef.current.forEach((b, i) => {
    if (!b) return; const ic = b.firstElementChild as HTMLElement | null;
    const d = cx == null ? 999 : Math.abs(centers[i] - cx);
    const k = Math.max(0, 1 - d / geo.tw);
    if (ic) { ic.style.transition = cx == null ? 'transform 300ms cubic-bezier(.23,1,.32,1)' : 'none'; ic.style.transform = k ? `scale(${(1 + 0.2 * k).toFixed(3)}) translateY(${(-1.5 * k).toFixed(2)}px)` : ''; }
    b.classList.toggle('mag', cx != null && k > 0.5);
  });
  // Al cambiar de pestaña (o de tamaño), la lente va a su lugar.
  useEffect(() => { if (!g.current || !g.current.moved) place(geo.lefts[idx]); }, [idx, geo]); // eslint-disable-line react-hooks/exhaustive-deps
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    g.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, r, moved: false, last: e.clientX, t: performance.now(), v: 0, cur: near(e.clientX - r.left), raf: 0, x: 0 };
    lens.current?.classList.add('press');
  };
  const move = (e: React.PointerEvent) => {
    const s = g.current; if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (!s.moved) {
      if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)) return;
      s.moved = true;
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ }
      lens.current?.classList.add('drag');
    }
    const now = performance.now();
    s.v = s.v * 0.6 + ((e.clientX - s.last) / Math.max(1, now - s.t)) * 0.4; s.last = e.clientX; s.t = now;
    const cx = Math.max(geo.tw / 2 + 4, Math.min(W - geo.tw / 2 - 4, e.clientX - s.r.left));
    s.x = cx;
    if (!s.raf) s.raf = requestAnimationFrame(() => {
      s.raf = 0;
      const st = Math.min(0.22, Math.abs(s.v) * 0.35);
      place(s.x - geo.tw / 2, 1.08 + st, 1.12 - st * 0.4, false);
      magnify(s.x);
      const n = near(s.x); if (n !== s.cur) { s.cur = n; feel('snap'); }
    });
  };
  const end = (e: React.PointerEvent, cancel = false) => {
    const s = g.current; if (!s || e.pointerId !== s.id) return;
    if (s.raf) cancelAnimationFrame(s.raf);
    lens.current?.classList.remove('drag', 'press');
    magnify(null);
    const x = s.moved ? s.x + s.v * 120 : e.clientX - s.r.left;
    const i = cancel ? idx : near(x);
    g.current = null;
    place(geo.lefts[i]);
    if (i !== idx) { if (!s.moved) feel('tap'); go(TABS[i][0]); }
  };
  return (
    <div className="gbar" ref={wrap}>
      <svg className="gshadow" viewBox={`0 0 ${W} 80`} aria-hidden="true"><path d={geo.path} /></svg>
      <div className="glass" style={{ clipPath: `path('${geo.path}')`, WebkitClipPath: `path('${geo.path}')` } as any} />
      <svg className="grim" viewBox={`0 0 ${W} 80`} aria-hidden="true"><path d={geo.path} /></svg>
      <nav className="gtabs" aria-label="Secciones" onPointerDown={down} onPointerMove={move} onPointerUp={(e) => end(e)} onPointerCancel={(e) => end(e, true)} onLostPointerCapture={(e) => { if (g.current && g.current.moved) end(e); }}>
        <span ref={lens} className="glens" style={{ width: geo.tw, transform: `translate3d(${geo.lefts[idx]}px,0,0)` }} aria-hidden="true" />
        {TABS.map(([v, label, Ic], i) => (
          <button key={v} ref={(el) => { tabsRef.current[i] = el; }} className={'gtab' + (view === v ? ' on' : '')} style={{ left: geo.lefts[i], width: geo.tw }} aria-current={view === v ? 'page' : undefined} onClick={(e) => { if (e.detail === 0) go(v); }}>
            <span className="gic"><Ic /></span>{label}
          </button>
        ))}
      </nav>
      <button className="gdrop" style={{ left: W / 2 - 28 }} aria-label="Registrar" onClick={onAdd}><IPlus /></button>
    </div>
  );
}

export default function App() {
  const { s, toast } = useWallet();
  const sysDark = useSystemDark();
  const dark = s.settings.theme === 'dark' || (s.settings.theme !== 'light' && sysDark);
  const look = lookOf(s.settings);
  const reduce = look.motion === 'none' || systemReduce();
  const [view, setView] = useState<View>('home');
  const [params, setParams] = useState<any>({});
  const [stack, setStack] = useState<{ v: View; p: any }[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [closing, setClosing] = useState(false);
  const [hide, setHide] = useState<boolean>(!!look.hide);
  const [sel, setSel] = useState<string | null>(null);
  const [dx, setDx] = useState(0);
  const phRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setFeel({ sound: !!look.sound, reduce }); }, [look.sound, reduce]);
  useEffect(() => { if (s.settings.onboardingComplete) ensureCash(); }, [s.settings.onboardingComplete]);

  const go = useCallback((v: View, p: any = {}) => {
    const order = ['home', 'movs', 'plan', 'ana'];
    const a = order.indexOf(view), b = order.indexOf(v);
    setDx(a >= 0 && b >= 0 && a !== b ? (b > a ? 12 : -12) : 0);
    setStack((st) => (order.includes(v) ? [] : st.concat([{ v: view, p: params }])));
    setView(v); setParams(p); setSheet(null);
    requestAnimationFrame(() => document.querySelector('.scr')?.scrollTo({ top: 0 }));
  }, [view, params]);
  const back = useCallback(() => {
    setStack((st) => { const last = st[st.length - 1]; if (last) { setView(last.v); setParams(last.p); } else { setView('home'); setParams({}); } return st.slice(0, -1); });
  }, []);
  // Teclado del teléfono: iOS solo lo abre si el foco llega dentro del toque.
  const prime = useRef<HTMLInputElement>(null);
  const open = useCallback((kind: string, props: any = {}) => {
    if (kind === 'register' && !props.editId) { try { prime.current?.focus({ preventScroll: true }); } catch { /* sin teclado */ } }
    setClosing(false);
    setSheet({ kind, props: Object.assign({ _drop: kind === 'register' && props._drop }, props) });
  }, []);
  // La hoja sale por donde entró; luego se desmonta.
  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setSheet(null); setClosing(false); }, reduce ? 160 : 260);
  }, [reduce]);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('checkin') || q.get('action') === 'checkin') open('mood');
    if (q.get('view') === 'plan') setView('plan');
    if (q.get('view') === 'analysis') setView('ana');
    if (q.toString()) history.replaceState(null, '', location.pathname);
  }, [open]);

  // Permiso de inclinación en el primer toque (iOS lo exige dentro de un gesto).
  useEffect(() => {
    if (!look.tilt || reduce) return;
    const f = () => { askTiltOnce(); window.removeEventListener('pointerdown', f); };
    window.addEventListener('pointerdown', f, { once: true });
    return () => window.removeEventListener('pointerdown', f);
  }, [look.tilt, reduce]);

  const cur = s.settings.activeCurrency;
  const selAcc = sel ? C.accountById(s, sel) : null;
  useEffect(() => { if (sel && (!selAcc || selAcc.archived || selAcc.currency !== cur)) setSel(null); }, [sel, selAcc, cur]);

  let bank = 'wallet';
  if (view === 'account' && params.id) bank = bankOf(C.accountById(s, params.id));
  else if ((view === 'home' || view === 'movs' || view === 'ana') && selAcc) bank = bankOf(selAcc);
  const skin = skinFor(bank, dark, look);
  const vars = cssVars(skin);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.setAttribute('content', skin.pg); m.removeAttribute('media'); });
    document.documentElement.style.setProperty('--app-bg', skin.pg);
  }, [dark, skin.pg]);

  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const root = document.documentElement;
    const f = () => {
      const kb = vv.scale > 1.01 ? 0 : Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      const up = kb > 120;
      root.style.setProperty('--kb', (up ? kb : 0) + 'px');
      root.classList.toggle('kbup', up);
    };
    vv.addEventListener('resize', f); vv.addEventListener('scroll', f); f();
    return () => { vv.removeEventListener('resize', f); vv.removeEventListener('scroll', f); };
  }, []);

  // El gasto cae en su naipe: al registrar, el monto vuela desde la gota hasta la cuenta.
  useEffect(() => {
    const onLand = (e: any) => {
      const { accountId, text } = e.detail || {};
      feel('success');
      const ph = phRef.current, pill = flyRef.current;
      const card = ph && accountId ? ph.querySelector('[data-acc="' + accountId + '"]') as HTMLElement | null : null;
      if (!ph || !pill || !card || reduce || view !== 'home') return;
      const pr = ph.getBoundingClientRect(), cr = card.getBoundingClientRect(), drop = ph.querySelector('.gdrop') as HTMLElement | null;
      const dr = drop ? drop.getBoundingClientRect() : { left: pr.left + pr.width / 2 - 28, top: pr.bottom - 80, width: 56, height: 56 } as any;
      if (cr.top < pr.top || cr.bottom > pr.bottom - 90) return;
      pill.textContent = text || '';
      const x0 = dr.left - pr.left + dr.width / 2 - 50, y0 = dr.top - pr.top + dr.height / 2 - 17;
      const x1 = Math.min(cr.left - pr.left + 4, pr.width - 110), y1 = cr.top - pr.top + 22;
      const ox = pill.parentElement!;
      pill.style.opacity = '1';
      const ax = ox.animate([{ transform: `translateX(${x0}px)` }, { transform: `translateX(${x1}px)` }], { duration: 440, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'forwards' });
      pill.animate([{ transform: `translateY(${y0}px) scale(1)`, opacity: 1 }, { transform: `translateY(${y1}px) scale(.92)`, opacity: 1, offset: 0.85 }, { transform: `translateY(${y1}px) scale(.6)`, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' });
      ax.onfinish = () => { card.classList.add('dip'); setTimeout(() => card.classList.remove('dip'), 160); };
    };
    window.addEventListener('wallet:landed', onLand);
    return () => window.removeEventListener('wallet:landed', onLand);
  }, [reduce, view]);

  const ctx = useMemo(() => ({ view, params, go, back, open, close, dark, look, hide, toggleHide: () => setHide((h) => !h), sel, setSel }), [view, params, go, back, open, close, dark, look, hide, sel]);

  const tabs = ['home', 'movs', 'plan', 'ana'].includes(view);
  const cls = ['ph', 'w25', 'ty-s', 'sk-' + bank, dark ? 'dk' : '', tabs && s.settings.onboardingComplete ? 'has-nav' : '', 'mo-' + look.motion, reduce ? 'rm' : '', look.motion === 'none' ? '' : 'breathe', sheet ? 'has-sheet' : '', closing ? 'sheet-out' : '', sheet && sheet.kind === 'register' && !(sheet.props || {}).editId ? 'from-drop' : ''].join(' ');

  if (!s.settings.onboardingComplete) {
    return <Provider value={ctx}><div className={cls} style={vars as any}><Pebbles tilt={false} /><Onboarding /><SheetHost sheet={sheet} /></div></Provider>;
  }

  let screen: React.ReactNode = null;
  if (view === 'home') screen = <Home />;
  else if (view === 'movs') screen = <Movements />;
  else if (view === 'plan') screen = <Plan />;
  else if (view === 'ana') screen = <Analysis />;
  else if (view === 'settings') screen = <Settings />;
  else if (view === 'look') screen = <Personalize />;
  else if (view === 'account') screen = <AccountDetail id={params.id} />;
  else if (view === 'inv') screen = <Investments />;
  else if (view === 'news') screen = <News />;

  return (
    <Provider value={ctx}>
      <div className={cls} style={vars as any} ref={phRef}>
        <Pebbles tilt={!!look.tilt && !reduce} />
        <div className="scrn" key={view} style={{ ['--dx' as any]: dx + 'px' }}>{screen}</div>
        {tabs && <GlassBar view={view} go={go} tilt={!!look.tilt && !reduce} onAdd={() => { feel('tap'); open('register', { accountId: sel || undefined, _drop: true }); }} />}
        <input ref={prime} className="kbprime" inputMode="decimal" aria-hidden="true" tabIndex={-1} autoComplete="off" defaultValue="" />
        <SheetHost sheet={sheet} />
        <div className="flyx" aria-hidden="true"><div className="flyp" ref={flyRef} /></div>
        <div className={'toast' + (toast ? ' on' : '')} role="status" aria-live="polite">
          {toast && <>
            <span>{toast.text}</span>
            {toast.undo ? <button className="undo" onClick={() => { const u = toast.undo; dismissToast(); feel('undo'); u && u(); }}>Deshacer</button> : <button className="undo" onClick={dismissToast} aria-label="Cerrar aviso" style={{ textDecoration: 'none' }}>✕</button>}
          </>}
        </div>
      </div>
    </Provider>
  );
}

export function setCurrency(code: string) { commit((s) => { s.settings.activeCurrency = code; }, { silent: true }); }
