/* eslint-disable @typescript-eslint/no-explicit-any */
// Wallet 25 · Lo que se siente: vibración, sonido e inclinación.
// - Vibración: Android con navigator.vibrate; iPhone (iOS 18+) con el interruptor nativo
//   <input type="checkbox" switch>, que da un toque háptico al cambiar. Sin soporte, no pasa nada.
// - Sonido: clics sintetizados con WebAudio, sin archivos. Solo si Personaliza lo enciende.
// - Inclinación: DeviceOrientation. En iPhone pide permiso una vez, en el primer toque.

let soundOn = false;
let reduce = false;
export function setFeel(o: { sound?: boolean; reduce?: boolean }) {
  if (o.sound !== undefined) soundOn = o.sound;
  if (o.reduce !== undefined) reduce = o.reduce;
}

let hapLabel: HTMLLabelElement | null = null;
function hapticEl() {
  if (hapLabel || typeof document === 'undefined') return hapLabel;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  hapLabel = label;
  return label;
}
export function haptic(kind: 'light' | 'success' | 'snap' = 'light') {
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).vibrate) { (navigator as any).vibrate(kind === 'success' ? [10, 40, 14] : 10); return; }
    const el = hapticEl(); if (el) el.click();
  } catch { /* sin háptica */ }
}

let ctx: AudioContext | null = null;
export function sound(kind: 'tap' | 'success' | 'undo' | 'snap' = 'tap') {
  if (!soundOn) return;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    ctx = ctx || new AC();
    const c = ctx!; if (c.state === 'suspended') c.resume();
    const t = c.currentTime;
    const tone = (f: number, at: number, dur: number, vol: number) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, t + at);
      g.gain.setValueAtTime(0, t + at); g.gain.linearRampToValueAtTime(vol, t + at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g).connect(c.destination); o.start(t + at); o.stop(t + at + dur + 0.02);
    };
    if (kind === 'tap' || kind === 'snap') tone(kind === 'snap' ? 1240 : 980, 0, 0.05, 0.05);
    if (kind === 'success') { tone(880, 0, 0.09, 0.05); tone(1320, 0.07, 0.12, 0.045); }
    if (kind === 'undo') { tone(990, 0, 0.08, 0.045); tone(660, 0.06, 0.1, 0.04); }
  } catch { /* sin sonido */ }
}
export function feel(kind: 'tap' | 'success' | 'undo' | 'snap') { haptic(kind === 'success' ? 'success' : 'light'); sound(kind); }

// Inclinación: un único oyente; los suscriptores reciben x, y en [-1, 1].
type TiltFn = (x: number, y: number) => void;
const tiltSubs = new Set<TiltFn>();
let tiltOn = false;
function onOri(e: DeviceOrientationEvent) {
  if (e.gamma == null || e.beta == null || reduce) return;
  const x = Math.max(-1, Math.min(1, e.gamma / 30));
  const y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  tiltSubs.forEach((f) => f(x, y));
}
function startTilt() {
  if (tiltOn || typeof window === 'undefined') return;
  tiltOn = true;
  window.addEventListener('deviceorientation', onOri);
}
export function subscribeTilt(f: TiltFn) { tiltSubs.add(f); return () => { tiltSubs.delete(f); }; }
// Llamar en el primer toque: iOS exige un gesto para pedir el permiso.
export function askTiltOnce() {
  const D: any = (window as any).DeviceOrientationEvent;
  if (!D) return;
  if (typeof D.requestPermission === 'function') {
    let asked = '';
    try { asked = localStorage.getItem('wallet_tilt') || ''; } catch { /* */ }
    if (asked === 'denied') return;
    D.requestPermission().then((r: string) => { try { localStorage.setItem('wallet_tilt', r); } catch { /* */ } if (r === 'granted') startTilt(); }).catch(() => { /* */ });
  } else startTilt();
}
