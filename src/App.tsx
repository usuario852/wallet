/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { LAB, bridge, bumpLab, clearLaunchQuery } from './lab/mode';

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
  const open = useCallback((kind: string, props: any = {}) => setSheet({ kind, props }), []);
  const close = useCallback(() => setSheet(null), []);

  // Avisos que abren la app con una intención (?checkin=1 desde una notificación).
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('checkin') || q.get('action') === 'checkin') open('mood');
    if (q.get('view') === 'plan') setView('plan');
    if (q.get('view') === 'analysis') setView('ana');
    clearLaunchQuery();
  }, [open]);

  const cur = s.settings.activeCurrency;
  const selAcc = sel ? C.accountById(s, sel) : null;
  useEffect(() => { if (sel && (!selAcc || selAcc.archived || selAcc.currency !== cur)) setSel(null); }, [sel, selAcc, cur]);

  // Piel: el banco de la cuenta elegida (Inicio, Movimientos) o de la cuenta abierta.
  let bank = 'wallet';
  if (view === 'account' && params.id) bank = bankOf(C.accountById(s, params.id));
  else if ((view === 'home' || view === 'movs' || view === 'ana') && selAcc) bank = bankOf(selAcc);
  if (look.style !== 'bank' && bank !== 'wallet') bank = 'wallet';
  const skin = skinFor(look.style === 'bank' ? bank : 'wallet', dark, look, view);
  const vars = cssVars(skin);

  useEffect(() => {
    if (!LAB) return;
    Object.assign(bridge, { view, sel, go, setSel });
    bumpLab();
  }, [view, sel, go]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', skin.pg);
    document.documentElement.style.setProperty('--app-bg', skin.pg);
  }, [dark, skin.pg]);

  const ctx = useMemo(() => ({ view, params, go, back, open, close, dark, look, hide, toggleHide: () => setHide((h) => !h), sel, setSel }), [view, params, go, back, open, close, dark, look, hide, sel]);

  const tabs = ['home', 'movs', 'plan', 'ana'].includes(view);
  const cls = ['ph', 'v-' + view, 'sk-' + bank, dark ? 'dk' : '', tabs && s.settings.onboardingComplete ? 'has-nav' : '', 'sz-' + look.size, 'dn-' + look.dens, 'mo-' + look.motion].join(' ');

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
          <nav className="nav" aria-label="Secciones">
            <button className={'tab' + (view === 'home' ? ' on' : '')} aria-current={view === 'home'} onClick={() => go('home')}><IHome />Inicio</button>
            <button className={'tab' + (view === 'movs' ? ' on' : '')} aria-current={view === 'movs'} onClick={() => go('movs')}><IList />Movimientos</button>
            <button className="plus" aria-label="Registrar" onClick={() => open('register', { accountId: sel || undefined })}><IPlus /></button>
            <button className={'tab' + (view === 'plan' ? ' on' : '')} aria-current={view === 'plan'} onClick={() => go('plan')}><ICal />Planifica</button>
            <button className={'tab' + (view === 'ana' ? ' on' : '')} aria-current={view === 'ana'} onClick={() => go('ana')}><IBars />Análisis</button>
          </nav>
        )}
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
