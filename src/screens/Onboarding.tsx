/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from 'react';
import * as C from '../domain/core';
import { useWallet, commit, notify, replaceState } from '../store';
import { useUI } from '../ui/ctx';
import { CardFace } from '../ui/bits';
import { BANK_KEYS, bankName } from '../design/theme';

export default function Onboarding() {
  const { s } = useWallet();
  const { dark } = useUI();
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [bal, setBal] = useState('');
  const [cur, setCur] = useState('PEN');
  const file = useRef<HTMLInputElement>(null);
  const finish = () => commit((x) => { x.settings.onboardingComplete = true; });

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

  if (step === 0) return (
    <div className="onb">
      <h1>Tu dinero, en orden y a la vista.</h1>
      <p>Wallet lleva tus cuentas, tus gastos y lo que viene, sin mezclar monedas. Todo se guarda en este teléfono.</p>
      <div className="stack">
        <button className="okb" onClick={() => setStep(1)}>Empezar</button>
        <button className="okb ghost" onClick={() => file.current?.click()}>Tengo un respaldo</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
      </div>
    </div>
  );

  const banks = BANK_KEYS.filter((k) => k !== 'cash');
  const preview = { name: name || (brand ? (brand === 'cash' ? 'Efectivo' : bankName(brand)) : 'Tu cuenta'), brand: brand || undefined, institution: '' };
  return (
    <div className="onb" style={{ justifyContent: 'flex-start' }}>
      <h1 style={{ fontSize: 32 }}>{step === 1 ? 'Agrega tu primera cuenta' : 'Listo. ¿Otra cuenta?'}</h1>
      <p>{step === 1 ? 'Un banco, Yape o tu efectivo. Luego puedes agregar más.' : (s.accounts.length === 1 ? 'Ya tienes 1 cuenta.' : 'Ya tienes ' + s.accounts.length + ' cuentas.') + ' Puedes agregar otra ahora o después.'}</p>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}><CardFace account={preview} dark={dark} className="rb on" style={{ marginRight: 0, width: 160, height: 100 }} /></div>
      <div className="cats noscr" style={{ margin: '0 -20px', padding: '0 20px' }}>
        {[['cash', 'Efectivo'], ...banks.map((k) => [k, bankName(k)]), ['', 'Otra']].map(([k, t]) => <button key={k || 'otra'} className={'cc' + (brand === k ? ' on' : '')} onClick={() => { setBrand(k); setName(k ? (k === 'cash' ? 'Efectivo' : bankName(k)) : ''); }}>{t}</button>)}
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
