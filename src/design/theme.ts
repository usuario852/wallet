/* eslint-disable @typescript-eslint/no-explicit-any */
import BR from './brands.json';
import { ICONS, ALIASES } from './brandIcons.js';

export type Palette = Record<string, any>;
const LIGHT: Record<string, Palette> = (BR as any).light;
const DARK: Record<string, Palette> = (BR as any).dark;

// Wallet 25 · La mesa. La mesa se calla: papel tibio, tinta, nada de acento propio.
// El color vive en los naipes de cada banco (bk) y en la tarjeta del día (palFor).
Object.assign(LIGHT.wallet, {
  pg: '#F7F5F0', sf: '#FFFFFF', s2: '#FFFFFF', ln: 'rgba(23,23,26,.08)', tx: '#17171A', t2: '#64625D',
  hb: '#17171A', hi: '#FFFFFF', pa: '#17171A', pi: '#FFFFFF', ac: '#17171A', nv: '#FFFFFF',
  cb: '#2A2824', ci: '#FFFFFF', pc: 'rgba(255,255,255,.2)', pci: '#FFFFFF', pl: '#17171A', pli: '#FFFFFF',
  dot: '#17171A', hv: '#17171A', hvi: '#FFFFFF', wb: '#FCEBD3', wt: '#7A4A0B', inc: '#15724A'
});
Object.assign(DARK.wallet, {
  pg: '#0E0E0D', sf: '#1A1918', s2: '#1A1918', ln: 'rgba(243,241,236,.08)', tx: '#F3F1EC', t2: '#A8A49C',
  hb: '#F3F1EC', hi: '#0E0E0D', pa: '#F3F1EC', pi: '#0E0E0D', ac: '#F3F1EC', nv: '#1A1918',
  cb: '#2A2824', ci: '#FFFFFF', pc: 'rgba(0,0,0,.12)', pci: '#0E0E0D', pl: '#F3F1EC', pli: '#0E0E0D',
  dot: '#F3F1EC', hv: '#F3F1EC', hvi: '#0E0E0D', wb: '#3A2C12', wt: '#F5CF8A', inc: '#5FD19A'
});

// Efectivo: el billete es crema, pero la selección y la acción van en tinta (no ocre).


const clean = (s: any) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Qué banco es una cuenta: por su entidad o, si no, por su nombre.
const BANK_ALIASES: [string, string[]][] = [
  ['bcp', ['bcp', 'banco de credito', 'viabcp', 'credito del peru']],
  ['interbank', ['interbank', 'ibk']],
  ['bbva', ['bbva', 'continental', 'bbva continental']],
  ['scotiabank', ['scotiabank', 'scotia']],
  ['bn', ['banco de la nacion', 'banco nacion', 'bn']],
  ['pichincha', ['pichincha', 'banco pichincha']],
  ['mibanco', ['mibanco']],
  ['bancofalabella', ['banco falabella', 'falabella', 'cmr']],
  ['bancoripley', ['banco ripley', 'ripley']],
  ['citi', ['citibank', 'citi']],
  ['santander', ['santander']],
  ['yape', ['yape']],
  ['cash', ['efectivo', 'cash', 'billetera', 'sencillo']]
];
export function bankOf(account: any): string {
  if (!account) return 'wallet';
  if (account.brand && LIGHT[account.brand]) return account.brand;
  const hay = ' ' + clean((account.institution || '') + ' ' + (account.name || '')) + ' ';
  for (const [key, names] of BANK_ALIASES) {
    for (const n of names) { if (hay.includes(' ' + n + ' ')) return key; }
  }
  return 'wallet';
}
export const BANK_KEYS = Object.keys(LIGHT).filter((k) => k !== 'wallet');
export function bankName(key: string) { return (LIGHT[key] || {}).n || 'Otra'; }

// Mezcla dos colores hex (t = peso de b).
function mixHex(a: string, b: string, t: number) {
  const h = (x: string) => [0, 2, 4].map((i) => parseInt(x.replace('#', '').slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  if (A.some(isNaN) || B.some(isNaN)) return a;
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function palette(key: string, dark: boolean): Palette { return (dark ? DARK : LIGHT)[key] || (dark ? DARK : LIGHT).wallet; }
export function markSrc(key: string) { return LIGHT[key] && LIGHT[key].hasMark ? '/brands/' + key + '.png' : ''; }
export function tileSrc(key: string) { return LIGHT[key] && LIGHT[key].hasMark ? '/brands/tile_' + key + '.png' : ''; }
export function markAspect(key: string) { return (LIGHT[key] || {}).ma || 's'; }
export function cardColors(key: string, dark: boolean) { const p = palette(key, dark); return { cb: p.cb, ci: p.ci }; }

const VARS = ['pg', 'sf', 's2', 'ln', 'tx', 't2', 'hb', 'hi', 'hm', 'pa', 'pi', 'ac', 'rd', 'r2', 'nv', 'dot', 'pc', 'pci', 'pl', 'pli', 'hv', 'hvi', 'tb', 'ti', 'wb', 'wt', 'dg', 'inc', 'bk', 'peb1', 'peb2', 'peb3', 'adv1', 'adv2', 'advt'];
export function cssVars(p: Palette): Record<string, string> {
  const out: Record<string, string> = {};
  VARS.forEach((k) => { if (p[k] != null) out['--' + k] = String(p[k]); });
  return out;
}

export function mixHexPub(a: string, b: string, t: number) { return mixHex(a, b, t); }
function lumHex(h: string) { const c = h.replace('#', '').match(/../g)!.map((x) => parseInt(x, 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
export function contrastHex(a: string, b: string) { const x = lumHex(a), y = lumHex(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

// Tarjeta del día: una paleta para cualquier color de banco. Fondo hondo, texto que pase 4.5:1, medidor neutro.
export function palFor(c: string | null, dark: boolean) {
  if (!c || !/^#[0-9a-f]{6}$/i.test(c)) return dark ? { b1: '#252320', b2: '#1C1B19', t: '#F3F1EC' } : { b1: '#24221F', b2: '#191816', t: '#F5F1E9' };
  let b1 = dark ? mixHex(c, '#0E0E0D', 0.38) : c, b2 = dark ? mixHex(c, '#0E0E0D', 0.6) : mixHex(c, '#000000', 0.22);
  if (!dark && lumHex(c) > 0.42) { b1 = mixHex(c, '#FFFFFF', 0.08); b2 = mixHex(c, '#000000', 0.08); }
  const t = contrastHex('#FFFFFF', b1) >= contrastHex('#15140F', b1) ? '#FFFFFF' : '#15140F';
  if (contrastHex(t, b1) < 4.5 || contrastHex(t, b2) < 4.5) { const k = t === '#FFFFFF' ? '#000000' : '#FFFFFF'; b1 = mixHex(b1, k, 0.3); b2 = mixHex(b2, k, 0.3); }
  return { b1, b2, t };
}

// La piel: siempre la mesa de Wallet. Un banco elegido solo tiñe un poco la mesa, las formas del fondo y la tarjeta del día.
export function skinFor(bank: string, dark: boolean, _look?: any): Palette {
  const base = palette('wallet', dark);
  const p: Palette = Object.assign({}, base);
  const bp = bank !== 'wallet' ? palette(bank, dark) : null;
  const tint = bp && /^#[0-9a-f]{6}$/i.test(String(bp.cb)) ? String(bp.cb) : null;
  const pebs = dark ? ['#1B1A17', '#17181B', '#1D1A16'] : ['#ECE5D7', '#E5E8EC', '#EFE3D5'];
  p.peb1 = tint ? mixHex(pebs[0], tint, dark ? 0.18 : 0.09) : pebs[0];
  p.peb2 = pebs[1];
  p.peb3 = tint ? mixHex(pebs[2], tint, dark ? 0.18 : 0.09) : pebs[2];
  if (tint && !dark) p.pg = mixHex(base.pg, tint, 0.035);
  p.bk = tint || (dark ? '#2A2824' : '#2A2824');
  const a = palFor(tint, dark); p.adv1 = a.b1; p.adv2 = a.b2; p.advt = a.t;
  p.tb = p.pg; p.ti = p.tx; p.rd = '26px'; p.r2 = '16px';
  return p;
}

// ---------------------------------------------------------------------------
// Logos de comercios: Simple Icons (CC0) + monogramas de marcas peruanas (v19)
// ---------------------------------------------------------------------------
const LOCAL: [string, string, string[]][] = [
  ['WON', '#D6001C', ['wong']], ['TOT', '#005DAA', ['tottus']], ['MET', '#005CB9', ['metro', 'supermercado metro']], ['PVE', '#E20613', ['plaza vea']], ['VIV', '#8DC63F', ['vivanda']], ['MAK', '#005DAA', ['makro']],
  ['INK', '#F58220', ['inkafarma']], ['MIF', '#E4002B', ['mifarma', 'boticas']], ['RAP', '#FF441F', ['rappi']], ['PYA', '#FA0050', ['pedidosya', 'pedidos ya']], ['DID', '#FF7A45', ['didi', 'didi food']], ['CBY', '#7145D6', ['cabify']],
  ['SGA', '#62B346', ['saga falabella', 'saga']], ['OEC', '#E4002B', ['oechsle']], ['PRO', '#F26522', ['promart']], ['SOD', '#004B8D', ['sodimac']],
  ['CLA', '#DA291C', ['claro']], ['ENT', '#0033A0', ['entel']], ['BIT', '#00A0DF', ['bitel']], ['WIN', '#6D2077', ['win internet']], ['LAT', '#E60C2D', ['latam', 'latam airlines']], ['CDS', '#003DA5', ['cruz del sur']],
  ['MTR', '#E4002B', ['metropolitano', 'corredor']], ['SUN', '#8B1A1A', ['sunat']], ['SED', '#0072BC', ['sedapal']], ['LUZ', '#FDB913', ['luz del sur', 'enel', 'distriluz']], ['CAL', '#009EE3', ['calidda', 'gas natural']],
  ['PLN', '#00B5B8', ['plin']], ['IZI', '#2E3192', ['izipay']], ['PPE', '#FF6900', ['pago efectivo', 'pagoefectivo']]
];
export type Brand = { kind: 'icon'; hex: string; path: string; title: string } | { kind: 'mark'; mark: string; hex: string; title: string } | { kind: 'bank'; key: string; title: string };
const index = new Map<string, Brand>();
Object.keys(ICONS as any).forEach((slug) => {
  const ic = (ICONS as any)[slug];
  const b: Brand = { kind: 'icon', hex: '#' + ic.h, path: ic.d, title: ic.t };
  index.set(clean(ic.t), b); index.set(clean(ic.t).replace(/ /g, ''), b);
});
Object.keys(ALIASES as any).forEach((slug) => {
  const ic = (ICONS as any)[slug]; if (!ic) return;
  ((ALIASES as any)[slug] || []).forEach((a: string) => index.set(clean(a), { kind: 'icon', hex: '#' + ic.h, path: ic.d, title: ic.t }));
});
LOCAL.forEach(([mark, hex, names]) => names.forEach((n) => index.set(clean(n), { kind: 'mark', mark, hex, title: names[0] })));
BANK_ALIASES.forEach(([key, names]) => { if (key === 'cash') return; if (!LIGHT[key] || !LIGHT[key].hasMark) return; names.forEach((n) => { if (n.length > 2) index.set(clean(n), { kind: 'bank', key, title: n }); }); });
const multi: [string, Brand][] = []; const single = new Map<string, Brand>();
index.forEach((v, k) => { if (!k) return; if (k.includes(' ')) multi.push([k, v]); else single.set(k, v); });
multi.sort((a, b) => b[0].length - a[0].length);
const cache = new Map<string, Brand | null>();
export function brandFor(text: string): Brand | null {
  const q = clean(text);
  if (!q || q.length < 2) return null;
  if (cache.has(q)) return cache.get(q) || null;
  let found: Brand | null = index.get(q) || null;
  if (!found) for (const [k, v] of multi) { if (q.includes(k)) { found = v; break; } }
  if (!found) for (const w of q.split(' ')) { if (w.length < 3) continue; const h = single.get(w); if (h) { found = h; break; } }
  cache.set(q, found);
  return found;
}

export const LOOK_DEFAULTS = { style: 'bank', accent: '#1D4ED8', corner: 'bank', size: 'm', dens: 'n', big: 'liq', cents: true, hide: false, motion: 'full', greet: 'fecha', name: '', naip: 'naipes', sound: false, tilt: true, blocks: [['naipes', true], ['hoy', true], ['animo', true], ['acc', true], ['deuda', false], ['prox', false]] };
export function lookOf(settings: any) {
  const l = Object.assign({}, LOOK_DEFAULTS, settings.look || {});
  // Wallet 25 simplificó Personaliza: estilo, esquinas, tamaño y densidad quedan fijos (lo guardado no se borra).
  l.style = 'bank'; l.corner = 'bank'; l.size = 'm'; l.dens = 'n';
  // El bloque de ánimo es nuevo: a quien ya ordenó sus bloques se le suma, visible, antes de «Lo último».
  if (Array.isArray(l.blocks) && !l.blocks.some((b: any) => b[0] === 'animo')) { const i = l.blocks.findIndex((b: any) => b[0] === 'acc'); l.blocks = l.blocks.slice(); l.blocks.splice(i < 0 ? l.blocks.length : i, 0, ['animo', true]); }
  return l;
}
