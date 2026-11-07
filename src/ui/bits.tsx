/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import * as C from '../domain/core';
import { brandFor, markSrc, markAspect, bankOf, palette } from '../design/theme';
import { IX, catGlyph } from './icons';
import { useUI } from './ctx';
import { getState } from '../store';

// Contador tipo odómetro (Wallet 25): al abrir no rueda; cuando el número cambia, solo ruedan
// los dígitos que cambiaron, 280 ms. Las columnas se alinean por la derecha para que no salten.
export function Odometer({ minor, currency, cents = true, size = '' }: { minor: number; currency: string; cents?: boolean; size?: string }) {
  const p = C.moneyParts(minor, currency);
  const whole = p.whole, dec = cents && p.dec ? p.dec : '';
  const label = (p.sign ? 'menos ' : '') + p.symbol + ' ' + whole + (dec ? '.' + dec : '');
  const col = (ch: string, k: string) => (/\d/.test(ch)
    ? <span key={k} className="col"><span className="strip" style={{ transform: `translateY(${-Number(ch)}em)` }}>{'0123456789'.split('').map((d) => <span key={d}>{d}</span>)}</span></span>
    : <span key={k} className="sep">{ch}</span>);
  const wch = whole.split('');
  return (
    <div className="big" role="img" aria-label={label}>
      <span className="cu">{p.symbol}</span>
      <span className={'odo ' + size} aria-hidden="true">
        {p.sign && <span className="sep neg">−</span>}
        {wch.map((ch, i) => col(ch, 'w' + (wch.length - i)))}
        {dec && <span className="ct"><span className="sep">.</span>{dec.split('').map((ch, i) => col(ch, 'd' + i))}</span>}
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
  // Ajustes › "Logos de bancos y comercios" apagado: ícono de categoría o inicial.
  if (getState().settings.brandLogos === false) {
    const g0 = cat ? catGlyph(cat) : null;
    if (g0) return <span className="ic cat-ic">{g0}</span>;
    return <span className="ic"><span className="ini">{(fallback || text || '?').trim().charAt(0).toUpperCase()}</span></span>;
  }
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

// Tarjeta de cuenta (naipe) con su color de banco. Wallet 25: el monto va grabado abajo, el «S/» pequeño.
export function CardFace({ account, dark, className = 'rb', children, style, balance, full }: { account: any; dark: boolean; className?: string; children?: React.ReactNode; style?: any; balance?: number | null; full?: boolean }) {
  const { hide } = useUI();
  const bank = bankOf(account);
  const p = palette(bank, dark);
  const src = markSrc(bank);
  const goal = account.kind === 'reserve' && bank === 'wallet';
  const pct = goal && account.goalMinor ? Math.max(0, Math.min(100, Math.round(((balance || 0) / account.goalMinor) * 100))) : 0;
  const mp = balance != null ? C.moneyParts(balance, account.currency) : null;
  return (
    <span className={className + (goal ? ' goal' : '') + (bank === 'cash' ? ' cash' : '')} data-acc={account.id} style={Object.assign({ ['--cb' as any]: goal ? '#2A2824' : p.cb, ['--ci' as any]: goal ? '#FFFFFF' : p.ci, ['--pct' as any]: pct + '%' }, style || {})}>
      <span className="mkw">{src ? <img className={'mk ' + markAspect(bank)} src={src} alt="" /> : <b className="nmB">{goal ? account.name : account.name}</b>}</span>
      {mp && <span className="emb"><small>{mp.symbol}</small>{hide ? '••••' : (mp.sign ? '−' : '') + mp.whole}{full && !hide && mp.dec ? <em>.{mp.dec}</em> : null}</span>}
      {children}
    </span>
  );
}

export function SheetFrame({ title, sub, onClose, children, full = false, label }: { title: React.ReactNode; sub?: string; onClose: () => void; children: React.ReactNode; full?: boolean; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<any>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      // Con teclado, el Tab da la vuelta dentro de la hoja (no se escapa a la pantalla de atrás).
      if (e.key !== 'Tab' || !ref.current) return;
      const f = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([type=hidden]),select,textarea,a[href],[tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || a === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (a === last || !ref.current.contains(a))) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', k);
    const prev = document.activeElement as HTMLElement | null;
    // Si la hoja ya enfocó un campo (el monto de Registrar), no se le quita el foco ni el teclado.
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    // Al cerrar, el foco vuelve al botón que la abrió; nunca a un campo, para no reabrir el teclado.
    return () => { window.removeEventListener('keydown', k); if (prev && prev.tagName !== 'INPUT' && prev.isConnected) prev.focus?.(); };
  }, [onClose]);
  // Arrastrar la hoja hacia abajo desde su cabecera la cierra (con resistencia hacia arriba).
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,input,textarea,select')) return;
    drag.current = { y0: e.clientY, t: performance.now(), last: e.clientY, v: 0, dy: 0, on: false, id: e.pointerId };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; const el = ref.current; if (!d || !el || e.pointerId !== d.id) return;
    let dy = e.clientY - d.y0;
    if (!d.on) { if (Math.abs(dy) < 6) return; d.on = true; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ } el.style.transition = 'none'; el.style.animation = 'none'; }
    const now = performance.now(); d.v = (e.clientY - d.last) / Math.max(1, now - d.t); d.last = e.clientY; d.t = now;
    if (dy < 0) dy = -Math.pow(-dy, 0.6);
    d.dy = dy;
    el.style.transform = `translate(-50%, ${dy.toFixed(1)}px)`;
    const scrim = el.previousElementSibling as HTMLElement | null; if (scrim) scrim.style.opacity = String(Math.max(0.2, 1 - Math.max(0, dy) / 500));
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; const el = ref.current; drag.current = null; if (!d || !el || !d.on || e.pointerId !== d.id) return;
    const scrim = el.previousElementSibling as HTMLElement | null;
    if (d.dy > 120 || d.v > 0.7) {
      el.style.transition = 'transform 260ms cubic-bezier(.32,.72,0,1)';
      el.style.transform = 'translate(-50%, 105%)';
      if (scrim) { scrim.style.transition = 'opacity 260ms ease'; scrim.style.opacity = '0'; }
      setTimeout(onClose, 200);
    } else {
      el.style.transition = 'transform 420ms cubic-bezier(.32,.72,0,1)';
      el.style.transform = 'translate(-50%, 0)';
      if (scrim) { scrim.style.transition = 'opacity 300ms ease'; scrim.style.opacity = ''; }
    }
  };
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={'rs' + (full ? ' full' : '')} role="dialog" aria-modal="true" aria-label={label || (typeof title === 'string' ? title : '')} ref={ref} tabIndex={-1}>
        <div className="shtop" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <span className="grab" />
          <div className="shd"><span><b>{title}</b>{sub && <span className="dsub">{sub}</span>}</span><button className="x" onClick={onClose} aria-label="Cerrar"><IX /></button></div>
        </div>
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
// El monto con el teclado del teléfono: un campo invisible sobre la cifra grande.
// Acepta coma o punto como decimal, dos decimales y nueve cifras, como el teclado propio de antes.
export function cleanAmount(prev: string, raw: string) {
  let v = String(raw || '');
  if (v.includes(',') && v.includes('.')) v = v.replace(/,/g, '');
  v = v.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const i = v.indexOf('.');
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '');
  let [w, d] = v.split('.');
  w = (w || '').replace(/^0+(?=\d)/, '');
  if (d !== undefined) { d = d.slice(0, 2); if (!w) w = '0'; }
  if ((w + (d || '')).length > 9) return prev;
  return d !== undefined ? w + '.' + d : w;
}
export const AmountField = React.forwardRef<HTMLInputElement, { value: string; currency: string; onChange: (v: string) => void; onEnter?: () => void }>(function AmountField({ value, currency, onChange, onEnter }, ref) {
  const [focus, setFocus] = useState(false);
  const has = value.includes('.');
  const [w, d = ''] = value.split('.');
  const whole = C.fmtNumber(Number(w || 0), 0);
  const caret = focus ? <i className="caret" aria-hidden="true" /> : null;
  return (
    <label className={'amt amtf' + (!Number(value || 0) ? ' blank' : '') + (focus ? ' focus' : '')}>
      <span className="cu" aria-hidden="true">{C.currencyMeta(currency).symbol}</span>
      <b className="nums" aria-hidden="true">{whole}</b>{!has && caret}
      <em className="nums" aria-hidden="true">.{d && <span className="typed">{d}</span>}{has && caret}<span className="pad">{'0'.repeat(Math.max(0, 2 - d.length))}</span></em>
      <input ref={ref} className="amti" inputMode="decimal" enterKeyHint="next" autoComplete="off" autoCorrect="off" spellCheck={false}
        aria-label={'Monto en ' + C.currencyMeta(currency).name.toLowerCase()} value={value}
        onChange={(e) => onChange(cleanAmount(value, e.target.value))}
        onFocus={(e) => { setFocus(true); const t = e.currentTarget; requestAnimationFrame(() => { try { t.setSelectionRange(t.value.length, t.value.length); } catch { /* */ } }); }}
        onBlur={() => setFocus(false)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter?.(); } }} />
    </label>
  );
});
export function Keypad({ onKey }: { onKey: (k: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
  return (
    <div className="kp">
      {keys.map((k) => <button key={k} className="kk" onClick={() => onKey(k)} aria-label={k === 'del' ? 'Borrar' : k === '.' ? 'Punto decimal' : k}>{k === 'del' ? '⌫' : k}</button>)}
    </div>
  );
}
