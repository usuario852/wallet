/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from 'react';
import * as C from '../domain/core';
import { useWallet, commit, notify, enablePush, disablePush, replaceState, getState } from '../store';
import { useUI } from '../ui/ctx';
import { useMoney, Seg, Switch, CardFace } from '../ui/bits';
import { IChevR } from '../ui/icons';
import { BackHeader, exportJson, exportCsv } from './parts';
import { hasServerAI } from '../ai';

export const APP_VERSION = '22.0';

export default function Settings() {
  const { s } = useWallet();
  const { open, go, dark } = useUI();
  const M = useMoney();
  const st = s.settings;
  const look = st.look || {};
  const [key, setKey] = useState(() => { try { return localStorage.getItem(C.OPENAI_KEY_STORE) || ''; } catch { return ''; } });
  const [serverAI, setServerAI] = useState<boolean | null>(null);
  const file = useRef<HTMLInputElement>(null);
  React.useEffect(() => { hasServerAI().then(setServerAI); }, []);
  const set = (fn: (x: any) => void) => commit((x) => fn(x));
  const sysDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const active = s.accounts.filter((a: any) => !a.archived).sort((a: any, b: any) => a.currency.localeCompare(b.currency));
  const archived = s.accounts.filter((a: any) => a.archived);
  const n = st.notifications || {};

  const restore = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) return notify('El archivo es demasiado grande para ser un respaldo de Wallet');
    const r = new FileReader();
    r.onerror = () => notify('No pude leer el archivo');
    r.onload = () => {
      let parsed: any; try { parsed = JSON.parse(String(r.result)); } catch { return notify('El archivo no contiene un respaldo válido'); }
      const res = C.stateFromBackup(parsed);
      if (res.error || !res.state) return notify(res.error || 'No reconozco este respaldo');
      const next = res.state;
      open('confirm', {
        title: 'Restaurar respaldo', text: 'El archivo tiene ' + next.accounts.length + ' cuentas y ' + next.operations.length + ' movimientos. Reemplazará lo que hay en este teléfono. Antes guardo una copia de lo actual, por si acaso.', ok: 'Restaurar',
        onOk: () => {
          try { localStorage.setItem('wallet_data_previo_a_restaurar', JSON.stringify(getState())); } catch { /* */ }
          const w = C.saveState(localStorage, next, { mode: 'ok', reason: '', quarantined: false });
          if (!w.ok) return notify('No pude escribir el respaldo. Tus datos siguen intactos.');
          replaceState(next, w.health); notify('Respaldo restaurado'); go('home');
        }
      });
    };
    r.readAsText(f);
  };

  return (
    <>
      <BackHeader />
      <div className="scr noscr aj">
        <div className="sec ptl" style={{ paddingTop: 8 }}><div className="pht"><b>Ajustes</b><small>Todo se guarda en este teléfono.</small></div></div>
        <div className="sec">
          <span className="glab">Apariencia</span>
          <div className="card">
            <Seg items={[['system', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']]} value={st.theme === 'dark' || st.theme === 'light' ? st.theme : 'system'} onChange={(v) => set((x) => { x.settings.theme = v; })} label="Tema" className="n3" />
            <p className="tsm2">{st.theme === 'system' || !['light', 'dark'].includes(st.theme) ? 'Sigue al iPhone. Ahora está en modo ' + (sysDark ? 'oscuro' : 'claro') + '.' : 'No sigue al iPhone.'}</p>
            <button className="srow" onClick={() => go('look')}><span className="sc"><b>Personaliza</b><small>Colores, tamaño de letra, qué se ve en el Inicio.</small></span><span className="chr"><IChevR /></span></button>
            <div className="srow"><span className="sc"><b>Logos de bancos y comercios</b><small>Apagado, ves iniciales.</small></span><Switch on={st.brandLogos !== false} onChange={(v) => set((x) => { x.settings.brandLogos = v; })} label="Logos" /></div>
          </div>

          <span className="glab">Tus cuentas</span>
          <div className="card">
            <div className="minis">
              {active.map((a: any) => (
                <button key={a.id} className="miniw" onClick={() => open('account-edit', { id: a.id })} aria-label={'Editar ' + a.name}>
                  <CardFace account={a} dark={dark} className="mini" />
                  <small>{a.name}</small>
                </button>
              ))}
              <button className="miniw" onClick={() => open('account-new', { currency: st.activeCurrency })} aria-label="Agregar cuenta"><span className="mini add">+</span><small>Agregar</small></button>
            </div>
            {archived.length > 0 && <div style={{ marginTop: 10 }}>
              {archived.map((a: any) => (
                <div className="srow" key={a.id}><span className="sc"><b>{a.name}</b><small>Archivada, {M(C.balanceOf(s, a), a.currency)}</small></span><button className="liq" onClick={() => set((x) => { C.accountById(x, a.id).archived = false; })}>Recuperar</button></div>
              ))}
            </div>}
          </div>

          <span className="glab">Monedas</span>
          <div className="card">
            {st.enabledCurrencies.map((c: string) => <div className="srow" key={c}><span className="sc"><b>{C.currencyMeta(c).name} · {C.currencyMeta(c).symbol}</b><small>{C.accountsByCurrency(s, c).length === 0 ? 'Sin cuentas' : C.accountsByCurrency(s, c).length === 1 ? '1 cuenta' : C.accountsByCurrency(s, c).length + ' cuentas'}</small></span></div>)}
            <button className="srow" onClick={() => go('inv')}><span className="sc"><b>Inversiones</b><small>Acciones, fondos y cripto que sigues. No suman a tu patrimonio.</small></span><span className="chr"><IChevR /></span></button>
            <button className="srow" onClick={() => open('currency')}><span className="sc"><b>Agregar moneda</b></span><span className="chr"><IChevR /></span></button>
          </div>

          <span className="glab">Al registrar</span>
          <div className="card">
            <p className="tsm2" style={{ margin: '4px 0 8px' }}>Cuenta que aparece elegida</p>
            <Seg items={[['last', 'La última que usaste'], ['most', 'La de más saldo']]} value={look.defaultAccount === 'most' ? 'most' : 'last'} onChange={(v) => set((x) => { x.settings.look = Object.assign({}, x.settings.look || {}, { defaultAccount: v }); })} label="Cuenta por defecto" />
            <button className="srow" onClick={() => open('categories')}><span className="sc"><b>Categorías</b><small>{(s.categories.expense || []).filter((c: any) => !c.archived).length} de gasto, {(s.categories.income || []).filter((c: any) => !c.archived).length} de ingreso</small></span><span className="chr"><IChevR /></span></button>
          </div>

          <span className="glab">Avisos</span>
          <div className="card">
            <div className="srow"><span className="sc"><b>Avisos en este teléfono</b><small>{n.enabled ? 'Activados.' : 'En iPhone, primero agrega Wallet a la pantalla de inicio.'}</small></span><Switch on={!!n.enabled} onChange={(v) => (v ? enablePush() : disablePush())} label="Avisos" /></div>
            <div className="srow"><span className="sc"><b>Pagos y cobros</b><small>Un día antes y el mismo día.</small></span><Switch on={n.debtEnabled !== false} onChange={(v) => set((x) => { x.settings.notifications.debtEnabled = v; })} label="Pagos y cobros" /></div>
            <div className="srow"><span className="sc"><b>Cómo te sientes</b><small>Hasta 4 preguntas cortas al día.</small></span><Switch on={st.mood.enabled !== false} onChange={(v) => set((x) => { x.settings.mood.enabled = v; })} label="Ánimo" /></div>
            <div className="srow"><span className="sc"><b>Resumen semanal</b><small>Los domingos.</small></span><Switch on={n.weeklyReview !== false} onChange={(v) => set((x) => { x.settings.notifications.weeklyReview = v; })} label="Resumen semanal" /></div>
          </div>

          <span className="glab">Inteligencia artificial</span>
          <div className="card">
            <p className="tsm2" style={{ margin: '4px 0 10px' }}>Es opcional. Todo en Wallet funciona sin IA. {serverAI ? 'Esta app ya tiene una clave configurada.' : 'Pega tu clave de OpenAI; se guarda solo en este teléfono.'}</p>
            {!serverAI && <label className="wq">Clave de OpenAI
              <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" autoComplete="off" />
            </label>}
            {!serverAI && <div className="row2" style={{ marginTop: 8 }}>
              <button className="liq pri" onClick={() => { try { localStorage.setItem(C.OPENAI_KEY_STORE, key.trim()); notify('Clave guardada en este teléfono'); } catch { notify('No pude guardar la clave'); } }}>Guardar clave</button>
              <button className="liq" onClick={() => { try { localStorage.removeItem(C.OPENAI_KEY_STORE); } catch { /* */ } setKey(''); notify('Clave quitada'); }}>Quitar</button>
            </div>}
            <p className="tsm2" style={{ margin: '12px 0 6px' }}>Modelo</p>
            <Seg items={[['gpt-5.4-nano', 'Rápido'], ['gpt-5.6-luna', 'Más capaz']]} value={st.aiModel === 'gpt-5.6-luna' ? 'gpt-5.6-luna' : 'gpt-5.4-nano'} onChange={(v) => set((x) => { x.settings.aiModel = v; })} label="Modelo" />
            <div className="srow"><span className="sc"><b>Buscar en internet</b><small>Cuando la pregunta lo necesite.</small></span><Switch on={st.aiWebSearch !== false} onChange={(v) => set((x) => { x.settings.aiWebSearch = v; })} label="Buscar en internet" /></div>
            <div className="srow"><span className="sc"><b>Puede registrar por ti</b><small>Si lo apagas, solo lee y responde.</small></span><Switch on={st.aiCanWrite !== false} onChange={(v) => set((x) => { x.settings.aiCanWrite = v; })} label="Puede registrar" /></div>
            <div className="srow"><span className="sc"><b>Usar tu ánimo</b><small>Para leer tus gastos con contexto.</small></span><Switch on={st.includeMoodForAI !== false} onChange={(v) => set((x) => { x.settings.includeMoodForAI = v; })} label="Usar ánimo" /></div>
          </div>

          <span className="glab">Tus datos</span>
          <div className="card">
            <button className="srow" onClick={() => { exportJson(); notify('Respaldo descargado'); }}><span className="sc"><b>Descargar respaldo</b><small>Un archivo con todo. Guárdalo en un lugar seguro.</small></span><span className="chr"><IChevR /></span></button>
            <button className="srow" onClick={() => { exportCsv(); notify('Archivo CSV descargado'); }}><span className="sc"><b>Exportar a Excel (CSV)</b></span><span className="chr"><IChevR /></span></button>
            <button className="srow" onClick={() => file.current?.click()}><span className="sc"><b>Restaurar un respaldo</b><small>Reemplaza lo de este teléfono.</small></span><span className="chr"><IChevR /></span></button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ''; }} />
          </div>

          <span className="glab">Zona de cuidado</span>
          <div className="card">
            <button className="dngrow" onClick={() => open('confirm', { title: 'Restaurar Wallet de fábrica', text: 'Se borran todas tus cuentas, movimientos y ajustes de este teléfono. No se puede deshacer. Descarga un respaldo antes si lo quieres conservar.', ok: 'Borrar todo', danger: true, onOk: async () => { await disablePush(true); try { [C.STORAGE_KEY, C.LEGACY_KEY_V7, C.LEGACY_KEY, C.LEGACY_KEY_V5, C.OPENAI_KEY_STORE].forEach((k) => localStorage.removeItem(k)); } catch { /* */ } const fresh = C.defaultState(); C.saveState(localStorage, fresh, { mode: 'ok', reason: '', quarantined: false }); replaceState(fresh, { mode: 'ok', reason: '', quarantined: false }); go('home'); notify('Wallet quedó como nueva'); } })}>Restaurar Wallet de fábrica</button>
          </div>
          <p className="ver">Wallet {APP_VERSION}</p>
        </div>
        <div className="endpad" />
      </div>
    </>
  );
}
