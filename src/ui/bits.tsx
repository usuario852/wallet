/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import * as C from '../domain/core';
import { brandFor, markSrc, markAspect, bankOf, palette } from '../design/theme';
import { IX, catGlyph } from './icons';
import { useUI } from './ctx';

// Contador tipo odómetro: cada dígito rueda hasta su valor.
export function Odometer({ minor, currency, cents = true, size = '' }: { minor: number; currency: string; cents?: boolean; size?: string }) {
  const { look } = useUI();
  const p = C.moneyParts(minor, currency);
  const str = p.whole + (cents && p.dec ? '.' + p.dec : '');
  const [shown, setShown] = useState(look.motion === 'none' ? str : str.replace(/\d/g, '0'));
  useEffect(() => { const t = setTimeout(() => setShown(str), 30); return () => clearTimeout(t); }, [str]);
  const chars = shown.length === str.length ? shown : str;
  const dot = str.indexOf('.');
  const label = (p.sign ? 'menos ' : '') + p.symbol + ' ' + str;
  return (
    <div className="big" role="img" aria-label={label}>
      <span className="cu">{p.symbol}</span>
      <span className={'odo ' + size} aria-hidden="true">
        {p.sign && <span className="sep neg">−</span>}
        {chars.split('').map((ch, i) => {
          const dec = dot >= 0 && i >= dot ? ' dec' : '';
          if (!/\d/.test(ch)) return <span key={i} className={'sep' + dec}>{ch}</span>;
          const target = /\d/.test(str[i]) ? Number(chars[i]) : 0;
          return (
            <span key={i} className={'col' + dec}>
              <span className="strip" style={{ transform: `translateY(${-target}em)`, transitionDelay: (str.length - 1 - i) * 30 + 'ms' }}>
                {'0123456789'.split('').map((d) => <span key={d}>{d}</span>)}
              </span>
            </span>
          );
        })}
      </span>
    </div>
  );
}

export function Money({ minor, currency, sign = false, className = '' }: { minor: number; currency: string; sign?: boolean; className?: string }) {
  const { hide } = useUI();
  if (hide) return <span className={className}>{C.currencyMeta(currency).symbol}{' '}••••</span>;
  return <span className={className}>{C.money(minor, currency, { sign })}</span>;
}
export function useMoney() {
  const { hide } = useUI();
  return (minor: number, cur: string, sign = false) => (hide ? C.currencyMeta(cur).symbol + ' ••••' : C.money(minor, cur, { sign }));
}

// Icono de una fila: logo del comercio o banco, o inicial.
export function RowIcon({ text, fallback, bank, cat }: { text?: string; fallback?: string; bank?: string; cat?: string }) {
  if (bank === 'cash') return <span className="ic cash-ic">{catGlyph('efectivo')}</span>;
  if (bank) {
    const src = markSrc(bank);
    if (src) return <span className="ic brand-ic" style={{ ['--bc' as any]: palette(bank, false).cb }}><img src={src} alt="" style={{ objectFit: 'contain', padding: markAspect(bank) === 'w' ? 7 : 6 }} /></span>;
  }
  const b = text ? brandFor(text) : null;
  if (b && b.kind === 'icon') return <span className="ic brand-ic" style={{ ['--bc' as any]: b.hex }}><svg viewBox="0 0 24 24" fill={contrastOn(b.hex)}><path d={b.path} /></svg></span>;
  if (b && b.kind === 'mark') return <span className="ic brand-ic" style={{ ['--bc' as any]: b.hex }}><span className="mono" style={{ color: contrastOn(b.hex) }}>{b.mark}</span></span>;
  if (b && b.kind === 'bank') return <RowIcon bank={b.key} />;
  const g = cat ? catGlyph(cat) : null;
  if (g) return <span className="ic cat-ic">{g}</span>;
  return <span className="ic"><span className="ini">{(fallback || text || '?').trim().charAt(0).toUpperCase()}</span></span>;
}
function lum(hex: string) {
  const h = hex.replace('#', ''); if (h.length !== 6) return 0;
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrastOn(hex: string) { return lum(hex) > 0.42 ? '#141414' : '#FFFFFF'; }

// Tarjeta de cuenta (naipe) con su color de banco.
export function CardFace({ account, dark, className = 'rb', children, style }: { account: any; dark: boolean; className?: string; children?: React.ReactNode; style?: any }) {
  const bank = bankOf(account);
  const p = palette(bank, dark);
  const src = markSrc(bank);
  return (
    <span className={className} style={Object.assign({ ['--cb' as any]: account.kind === 'reserve' && bank === 'wallet' ? 'color-mix(in srgb, var(--tx) 70%, var(--pg))' : p.cb, ['--ci' as any]: account.kind === 'reserve' && bank === 'wallet' ? 'var(--pg)' : p.ci }, style || {})}>
      <span className="mkw">{src ? <img className={'mk ' + markAspect(bank)} src={src} alt="" /> : <b className="nmB">{account.name}</b>}</span>
      {children}
    </span>
  );
}

export function SheetFrame({ title, sub, onClose, children, full = false, label }: { title: React.ReactNode; sub?: string; onClose: () => void; children: React.ReactNode; full?: boolean; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => { window.removeEventListener('keydown', k); prev?.focus?.(); };
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={'rs' + (full ? ' full' : '')} role="dialog" aria-modal="true" aria-label={label || (typeof title === 'string' ? title : '')} ref={ref} tabIndex={-1}>
        <span className="grab" />
        <div className="shd"><span><b>{title}</b>{sub && <span className="dsub">{sub}</span>}</span><button className="x" onClick={onClose} aria-label="Cerrar"><IX /></button></div>
        {children}
      </div>
    </>
  );
}

export function Seg<T extends string>({ items, value, onChange, label, className = '' }: { items: [T, string][]; value: T; onChange: (v: T) => void; label?: string; className?: string }) {
  return (
    <div className={'seg2 ' + (items.length === 3 ? 'n3 ' : items.length === 4 ? 'n4 ' : '') + className} role="group" aria-label={label}>
      {items.map(([k, t]) => <button key={k} className={'sk' + (value === k ? ' on' : '')} aria-pressed={value === k} onClick={() => onChange(k)}>{t}</button>)}
    </div>
  );
}
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className={'sw' + (on ? ' on' : '')} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}><i /></button>;
}
export function CurTabs({ value, list, onChange, small = false }: { value: string; list: string[]; onChange: (c: string) => void; small?: boolean }) {
  if (list.length < 2) return null;
  return (
    <span className={'tabs' + (small ? ' sm' : '')} role="group" aria-label="Moneda">
      {list.map((c) => <button key={c} className={value === c ? 'on' : ''} aria-pressed={value === c} onClick={() => onChange(c)}>{C.currencyMeta(c).symbol}</button>)}
    </span>
  );
}

// Teclado numérico propio (el monto se escribe como texto «12.50»).
export function useKeypad(initial = '') {
  const [v, setV] = useState(initial);
  const key = (d: string) => setV((cur) => {
    if (d === 'del') return cur.slice(0, -1);
    if (d === '.') return cur.includes('.') ? cur : (cur || '0') + '.';
    if (cur.includes('.') && cur.split('.')[1].length >= 2) return cur;
    if (cur === '0') return d;
    if (cur.replace('.', '').length >= 9) return cur;
    return cur + d;
  });
  return { value: v, set: setV, key };
}
export function AmountDisplay({ value, currency }: { value: string; currency: string }) {
  const n = Number(value || 0);
  const [w, d] = (value || '0').split('.');
  const whole = C.fmtNumber(Number(w || 0), 0);
  return (
    <div className={'amt' + (!n ? ' blank' : '')} aria-live="polite">
      <span className="cu">{C.currencyMeta(currency).symbol}</span>
      <b className="nums">{whole}</b><em className="nums">.{(d || '').padEnd(2, '0').slice(0, 2)}</em>
    </div>
  );
}
export function Keypad({ onKey }: { onKey: (k: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
  return (
    <div className="kp">
      {keys.map((k) => <button key={k} className="kk" onClick={() => onKey(k)} aria-label={k === 'del' ? 'Borrar' : k === '.' ? 'Punto decimal' : k}>{k === 'del' ? '⌫' : k}</button>)}
    </div>
  );
}
