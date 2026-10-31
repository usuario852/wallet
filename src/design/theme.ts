/* eslint-disable @typescript-eslint/no-explicit-any */
import BR from './brands.json';
import { ICONS, ALIASES } from './brandIcons.js';

export type Palette = Record<string, any>;
const LIGHT: Record<string, Palette> = (BR as any).light;
const DARK: Record<string, Palette> = (BR as any).dark;

// Piel Wallet (sin banco), dirección Bóveda: índigo profundo sobre papel tibio.
// Nada es blanco puro: el fondo y las superficies tienen temperatura de papel.
// Las pieles de banco no cambian. hvi = tinta sobre el color de los gráficos.
Object.assign(LIGHT.wallet, {
  pg: '#F3F0E9', sf: '#FAF8F3', s2: '#FAF8F3', ln: 'rgba(28,27,40,.10)', tx: '#17182A', t2: '#5F5D66',
  hb: '#1E2B4A', hi: '#FFFFFF', pa: '#2C3E8C', pi: '#FFFFFF', ac: '#2C3E8C', nv: 'rgba(250,248,243,.92)',
  cb: '#1E2B4A', ci: '#FFFFFF', pc: 'rgba(255,255,255,.2)', pci: '#FFFFFF', pl: '#2C3E8C', pli: '#FFFFFF',
  dot: '#6F86E8', hv: '#2C3E8C', hvi: '#FFFFFF', wb: '#FCEBD3', wt: '#7A4A0B'
});
Object.assign(DARK.wallet, {
  pg: '#0E0F17', sf: '#1A1B26', s2: '#1A1B26', ln: 'rgba(240,238,232,.09)', tx: '#F0EEE8', t2: '#ABA8B4',
  hb: '#22315A', hi: '#FFFFFF', pa: '#9DB0FF', pi: '#0B0F18', ac: '#9DB0FF', nv: '#161C2AEB',
  cb: '#22315A', ci: '#FFFFFF', pc: 'rgba(11,15,24,.14)', pci: '#0B0F18', pl: '#9DB0FF', pli: '#0B0F18',
  dot: '#9DB0FF', hv: '#9DB0FF', hvi: '#0B0F18', wb: '#3A2C12', wt: '#F5CF8A'
});

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

const VARS = ['pg', 'sf', 's2', 'ln', 'tx', 't2', 'hb', 'hi', 'hm', 'pa', 'pi', 'ac', 'rd', 'r2', 'nv', 'dot', 'pc', 'pci', 'pl', 'pli', 'hv', 'hvi', 'tb', 'ti', 'wb', 'wt', 'dg'];
export function cssVars(p: Palette): Record<string, string> {
  const out: Record<string, string> = {};
  VARS.forEach((k) => { if (p[k] != null) out['--' + k] = String(p[k]); });
  return out;
}

// Personalización: un color o sin color reemplazan la piel del banco.
export function skinFor(bank: string, dark: boolean, look: any): Palette {
  const base = palette('wallet', dark);
  let p: Palette = Object.assign({}, bank === 'wallet' ? base : palette(bank, dark));
  if (look && look.style === 'one') {
    const a = look.accent || '#1D4ED8';
    p = Object.assign({}, base, { hb: a, hi: '#FFFFFF', pa: a, pi: '#FFFFFF', pl: a, pli: '#FFFFFF', pc: 'rgba(255,255,255,.2)', pci: '#FFFFFF', dot: a, hv: a, ac: dark ? base.ac : a, hm: 'none' });
  } else if (look && look.style === 'mono') {
    // Sin color: la base Bóveda sin su índigo; tinta y superficie neutras.
    const ink = base.tx, paper = dark ? base.pg : base.sf;
    p = Object.assign({}, base, { hm: 'none', hb: ink, hi: paper, pa: ink, pi: paper, ac: ink, pl: ink, pli: paper, pc: dark ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.2)', pci: paper, dot: ink, hv: ink, hvi: paper });
  }
  // Papel, no blanco: en claro, una superficie blanca toma un poco del fondo de su piel.
  if (!dark && /^#fff(fff)?$/i.test(String(p.sf)) && /^#[0-9a-f]{6}$/i.test(String(p.pg)) && !/^#fff(fff)?$/i.test(String(p.pg))) p.sf = mixHex(p.pg, '#FFFFFF', 0.55);
  // Tarjeta del total (tb/ti).
  // Por defecto y en "Sin color" la tarjeta del total es papel; con un color propio, un bloque de ese color.
  if (look && look.style === 'one') { p.tb = p.hb; p.ti = p.hi; }
  else { p.tb = p.sf; p.ti = p.tx; }
  const R: any = { r: ['26px', '16px'], m: ['16px', '10px'], s: ['6px', '4px'] };
  if (look && look.corner && look.corner !== 'bank' && R[look.corner]) { p.rd = R[look.corner][0]; p.r2 = R[look.corner][1]; }
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

export const LOOK_DEFAULTS = { style: 'bank', accent: '#1D4ED8', corner: 'bank', size: 'm', dens: 'n', big: 'liq', cents: true, hide: false, motion: 'full', greet: 'fecha', name: '', naip: 'naipes', sound: false, blocks: [['naipes', true], ['hoy', true], ['acc', true], ['deuda', true], ['prox', true]] };
export function lookOf(settings: any) { return Object.assign({}, LOOK_DEFAULTS, settings.look || {}); }
