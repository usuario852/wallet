/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as C from './domain/core';
import { useWallet, dismissToast, commit } from './store';
import { Provider, View, Sheet } from './ui/ctx';
import { bankOf, skinFor, cssVars, lookOf, palette } from './design/theme';
import { IHome, IList, ICal, IBars, IPlus } from './ui/icons';
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

export default function App() {
  const { s, toast } = useWallet();
  const sysDark = useSystemDark();
  const dark = s.settings.theme === 'dark' || (s.settings.theme !== 'light' && sysDark);
  const look = lookOf(s.settings);
  const [view, setView] = useState<View>('home');
  const [params, setParams] = useState<any>({});
  const [stack, setStack] = useState<{ v: View; p: any }[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [hide, setHide] = useState<boolean>(!!look.hide);
  const [sel, setSel] = useState<string | null>(null);

  const go = useCallback((v: View, p: any = {}) => {
    setStack((st) => (['home', 'movs', 'plan', 'ana'].includes(v) ? [] : st.concat([{ v: view, p: params }])));
    setView(v); setParams(p); setSheet(null);
    requestAnimationFrame(() => document.querySelector('.scr')?.scrollTo({ top: 0 }));
  }, [view, params]);
  const back = useCallback(() => {
    setStack((st) => { const last = st[st.length - 1]; if (last) { setView(last.v); setParams(last.p); } else { setView('home'); setParams({}); } return st.slice(0, -1); });
  }, []);
  // Teclado del teléfono: iOS solo lo abre si el foco llega dentro del toque.
  // Registrar enfoca un campo oculto en el mismo toque; la hoja le pasa el foco al monto al montarse.
  const prime = useRef<HTMLInputElement>(null);
  const open = useCallback((kind: string, props: any = {}) => {
    if (kind === 'register' && !props.editId) { try { prime.current?.focus({ preventScroll: true }); } catch { /* sin teclado */ } }
    setSheet({ kind, props });
  }, []);
  const close = useCallback(() => setSheet(null), []);

  // Avisos que abren la app con una intención (?checkin=1 desde una notificación).
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('checkin') || q.get('action') === 'checkin') open('mood');
    if (q.get('view') === 'plan') setView('plan');
    if (q.get('view') === 'analysis') setView('ana');
    if (q.toString()) history.replaceState(null, '', location.pathname);
  }, [open]);

  const cur = s.settings.activeCurrency;
  const selAcc = sel ? C.accountById(s, sel) : null;
  useEffect(() => { if (sel && (!selAcc || selAcc.archived || selAcc.currency !== cur)) setSel(null); }, [sel, selAcc, cur]);

  // Piel: el banco de la cuenta elegida (Inicio, Movimientos) o de la cuenta abierta.
  let bank = 'wallet';
  if (view === 'account' && params.id) bank = bankOf(C.accountById(s, params.id));
  else if ((view === 'home' || view === 'movs' || view === 'ana') && selAcc) bank = bankOf(selAcc);
  if (look.style !== 'bank' && bank !== 'wallet') bank = 'wallet';
  const skin = skinFor(look.style === 'bank' ? bank : 'wallet', dark, look);
  const vars = cssVars(skin);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', skin.pg);
    document.documentElement.style.setProperty('--app-bg', skin.pg);
  }, [dark, skin.pg]);

  // Altura del teclado (--kb): la hoja se apoya encima y el botón final queda a la vista.
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

  const ctx = useMemo(() => ({ view, params, go, back, open, close, dark, look, hide, toggleHide: () => setHide((h) => !h), sel, setSel }), [view, params, go, back, open, close, dark, look, hide, sel]);

  const tabs = ['home', 'movs', 'plan', 'ana'].includes(view);
  const cls = ['ph', 'sk-' + bank, dark ? 'dk' : '', tabs && s.settings.onboardingComplete ? 'has-nav' : '', 'sz-' + look.size, 'dn-' + look.dens, 'mo-' + look.motion].join(' ');

  if (!s.settings.onboardingComplete) {
    return <Provider value={ctx}><div className={cls} style={{ ...(cssVars(palette('wallet', dark)) as any) }}><Onboarding /><SheetHost sheet={sheet} /></div></Provider>;
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
      <div className={cls} style={vars as any}>
        {screen}
        {tabs && (
          <>
            <nav className="nav" aria-label="Secciones">
              {/* Lente de vidrio: se desliza a la pestaña activa. */}
              <span className="lens" aria-hidden="true" style={{ ['--i' as any]: ({ home: 0, movs: 1, plan: 2, ana: 3 } as any)[view] }}><i key={view} /></span>
              <button className={'tab' + (view === 'home' ? ' on' : '')} aria-current={view === 'home'} onClick={() => go('home')}><IHome />Inicio</button>
              <button className={'tab' + (view === 'movs' ? ' on' : '')} aria-current={view === 'movs'} onClick={() => go('movs')}><IList />Movimientos</button>
              <button className={'tab' + (view === 'plan' ? ' on' : '')} aria-current={view === 'plan'} onClick={() => go('plan')}><ICal />Planifica</button>
              <button className={'tab' + (view === 'ana' ? ' on' : '')} aria-current={view === 'ana'} onClick={() => go('ana')}><IBars />Análisis</button>
            </nav>
            <button className="addb" aria-label="Registrar" onClick={() => open('register', { accountId: sel || undefined })}><IPlus /></button>
          </>
        )}
        <input ref={prime} className="kbprime" inputMode="decimal" aria-hidden="true" tabIndex={-1} autoComplete="off" defaultValue="" />
        <SheetHost sheet={sheet} />
        {toast && (
          <div className="toast" role="status" key={toast.id}>
            <span>{toast.text}</span>
            {toast.undo ? <button className="undo" onClick={() => { const u = toast.undo; dismissToast(); u && u(); }}>Deshacer</button> : <button className="undo" onClick={dismissToast} aria-label="Cerrar aviso" style={{ textDecoration: 'none' }}>✕</button>}
          </div>
        )}
      </div>
    </Provider>
  );
}

export function setCurrency(code: string) { commit((s) => { s.settings.activeCurrency = code; }, { silent: true }); }
