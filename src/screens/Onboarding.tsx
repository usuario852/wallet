/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from 'react';
import * as C from '../domain/core';
import { useWallet, commit, notify, replaceState } from '../store';
import { useUI } from '../ui/ctx';
import { CardFace } from '../ui/bits';
import { BANK_KEYS, bankName } from '../design/theme';
import { Mark, IPlus } from '../ui/icons';
import { MOOD5, MoodShape } from './Home';
import { feel } from '../ui/feel';
import { ensureCash } from '../store';

export default function Onboarding() {
  const { s } = useWallet();
  const { dark } = useUI();
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [bal, setBal] = useState('');
  const [cur, setCur] = useState('PEN');
  const file = useRef<HTMLInputElement>(null);
  const finish = () => { commit((x) => { x.settings.onboardingComplete = true; }); ensureCash(); };
  const [scene, setScene] = useState(0);
  const [pick, setPick] = useState<string | null>('bcp');
  const [flown, setFlown] = useState(0);
  const [mood, setMood] = useState(0);
  const [bar, setBar] = useState<number | null>(4);

  React.useEffect(() => { if (step === 1) ensureCash(); }, [step]);
  const create = () => {
    const nm = name.trim() || (brand ? (brand === 'cash' ? 'Efectivo' : bankName(brand)) : '');
    if (!nm) return notify('Ponle un nombre a tu cuenta');
    const a: any = { id: C.uid('acc'), name: nm, institution: brand && brand !== 'cash' ? bankName(brand) : '', currency: cur, kind: 'regular', openingMinor: C.toMinor(bal || 0, cur), archived: false };
    if (brand) a.brand = brand;
    if (commit((x) => { x.accounts.push(a); x.settings.activeCurrency = cur; if (!x.settings.enabledCurrencies.includes(cur)) x.settings.enabledCurrencies.push(cur); })) { setStep(2); setBrand(''); setName(''); setBal(''); }
  };
  const restore = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let parsed: any; try { parsed = JSON.parse(String(r.result)); } catch { return notify('Ese archivo no es un respaldo de Wallet'); }
      const res = C.stateFromBackup(parsed);
      if (!res.state) return notify(res.error || 'No reconozco ese respaldo');
      res.state.settings.onboardingComplete = true;
      const w = C.saveState(localStorage, res.state, { mode: 'ok', reason: '', quarantined: false });
      if (!w.ok) return notify('No pude guardar el respaldo');
      replaceState(res.state, w.health); notify('Respaldo restaurado');
    };
    r.readAsText(f);
  };

  // Tour: cuatro escenas que se tocan. Cada una enseña un gesto real de la app.
  const SC = [
    { t: 'Tus cuentas, como naipes', p: 'Toca uno: se levanta y ves su saldo completo.' },
    { t: 'Registra en un toque', p: 'Toca el + y mira cómo el gasto cae en su naipe.' },
    { t: '¿Cómo estás?', p: 'Tu ánimo junto a tu gasto, para notar patrones.' },
    { t: 'Mira a fondo', p: 'Flujo, hábitos, ánimo y metas. Toca un mes.' }
  ];
  const demo = [['bcp', 'BCP', 512940], ['interbank', 'Interbank', 175410], ['yape', 'Yape', 27650]] as const;
  const bars = [62, 48, 71, 55, 80, 44];
  if (step === 0) return (
    <div className="onb tour">
      <div className="tskip"><span className="tmark"><Mark /><b>Wallet</b></span><button className="lnk" onClick={() => setStep(1)}>Saltar</button></div>
      <div className="tstage" key={scene}>
        {scene === 0 && <div className="tdeck">{demo.map(([k, n, v], i) => { const on = pick === k; const after = !!pick && demo.findIndex((d) => d[0] === pick) < i; return (
          <button key={k} className="ncw" onClick={() => { feel('tap'); setPick(on ? null : k); }} aria-pressed={on} aria-label={n}>
            <CardFace account={{ id: 'd' + k, brand: k, name: n, currency: 'PEN' }} dark={dark} balance={v} full={on} className={'nc' + (on ? ' on' : '') + (after ? ' after' : '')} />
          </button>); })}</div>}
        {scene === 1 && <div className="tdrop">
          <div className="tcard"><CardFace account={{ id: 'dy', brand: 'yape', name: 'Yape', currency: 'PEN' }} dark={dark} balance={27650 - flown * 1250} className={'nc' + (flown ? ' dip2' : '')} key={flown} /></div>
          {flown > 0 && <span className="tpill" key={'p' + flown}>−S/ 12.50</span>}
          <button className="gdrop tgd" onClick={() => { feel('success'); setFlown((n) => n + 1); }} aria-label="Registrar un gasto de prueba"><IPlus /></button>
        </div>}
        {scene === 2 && <div className="m5row tmood">{MOOD5.map((m) => <button key={m.k} className={'m5 mk' + m.k + (mood === m.k ? ' on' : '') + (mood && mood !== m.k ? ' dim' : '')} aria-pressed={mood === m.k} onClick={() => { feel('tap'); setMood(m.k); }}><span className="mwrap"><MoodShape k={m.k} size={40} /></span><span>{m.label}</span></button>)}</div>}
        {scene === 3 && <div className="tbars">{bars.map((h, i) => <button key={i} className={'kb' + (bar === i ? ' on' : '')} onClick={() => setBar(i)} aria-label={'Mes ' + (i + 1)}><span className="kbt"><i style={{ height: h + '%', animationDelay: i * 50 + 'ms' }} /></span><small>{['jun', 'jul', 'ago', 'set', 'oct', 'nov'][i]}</small></button>)}</div>}
      </div>
      <div className="ttext" key={'t' + scene}><h1>{SC[scene].t}</h1><p>{SC[scene].p}</p></div>
      <div className="tdots" aria-hidden="true">{SC.map((_, i) => <i key={i} className={i === scene ? 'on' : ''} />)}</div>
      <div className="stack">
        <button className="okb" onClick={() => { feel('tap'); if (scene < SC.length - 1) setScene(scene + 1); else setStep(1); }}>{scene < SC.length - 1 ? 'Siguiente' : 'Empezar'}</button>
        {scene === 0 ? <button className="okb ghost" onClick={() => file.current?.click()}>Tengo un respaldo</button> : <button className="okb ghost" onClick={() => setScene(scene - 1)}>Atrás</button>}
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
      </div>
    </div>
  );

  const banks = BANK_KEYS.filter((k) => k !== 'cash');
  const preview = { name: name || (brand ? (brand === 'cash' ? 'Efectivo' : bankName(brand)) : 'Tu cuenta'), brand: brand || undefined, institution: '' };
  return (
    <div className="onb" style={{ justifyContent: 'flex-start' }}>
      <h1 style={{ fontSize: 32 }}>{step === 1 ? 'Agrega tu primera cuenta' : 'Listo. ¿Otra cuenta?'}</h1>
      <p>{step === 1 ? 'Tu efectivo ya está listo. Suma un banco o Yape.' : (s.accounts.length === 1 ? 'Ya tienes 1 cuenta.' : 'Ya tienes ' + s.accounts.length + ' cuentas.') + ' Puedes agregar otra ahora o después.'}</p>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}><CardFace account={preview} dark={dark} className="rb on" style={{ marginRight: 0, width: 160, height: 100 }} /></div>
      <div className="cats noscr" style={{ margin: '0 -20px', padding: '0 20px' }}>
        {[...banks.map((k) => [k, bankName(k)]), ['cash', 'Efectivo'], ['', 'Otra']].map(([k, t]) => <button key={k || 'otra'} className={'cc' + (brand === k ? ' on' : '')} onClick={() => { setBrand(k); setName(k ? (k === 'cash' ? 'Efectivo' : bankName(k)) : ''); }}>{t}</button>)}
      </div>
      <label className="wq">Nombre<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. BCP, Efectivo" /></label>
      <div className="row2">
        <label className="wq">Cuánto tiene hoy<input inputMode="decimal" value={bal} onChange={(e) => setBal(e.target.value.replace(',', '.'))} placeholder="0.00" /></label>
        <label className="wq">Moneda<select value={cur} onChange={(e) => setCur(e.target.value)}><option value="PEN">Soles, S/</option><option value="USD">Dólares, US$</option></select></label>
      </div>
      <div className="stack" style={{ marginTop: 'auto' }}>
        <button className="okb" onClick={create}>Agregar cuenta</button>
        {step === 2 && <button className="okb ghost" onClick={finish}>Ir a mi Wallet</button>}
        {step === 1 && <button className="okb ghost" onClick={finish}>Lo hago después</button>}
      </div>
    </div>
  );
}
