/* eslint-disable @typescript-eslint/no-explicit-any */
import { getLab } from './mode';

// Direcciones artísticas del laboratorio. La geometría vive en lab.css; aquí,
// el color de cada una. Solo actúan en Inicio, Movimientos y Análisis.

export const VARIANTS = [
  { id: 'orig', name: 'Original', thesis: 'Control: la app de hoy, con Bóveda, sin tocar.' },
  { id: 'a', name: 'A', thesis: 'Un solo calibre: radios de una escala, número calibrado y una esquina de anclaje en las dos superficies principales.' },
  { id: 'b', name: 'B', thesis: 'La superficie fluye: el color del banco sube hasta el borde y lo demás emerge sobre su labio.' },
  { id: 'c', name: 'C', thesis: 'Mazo y libro mayor: las cuentas son un mazo de color; todo lo demás es tinta sobre papel, sin cajas.' },
  { id: 'bc', name: 'B+C', thesis: 'El banco fluye arriba y el mazo emerge de su labio; debajo, el libro mayor: tinta sobre papel, sin cajas.' }
] as const;

const WALLET: Record<string, { light: any; dark: any }> = {
  a: {
    light: { pg: '#ECEEF2', sf: '#FFFFFF', s2: '#FFFFFF', ln: 'rgba(16,23,42,.08)', tx: '#10172A', t2: '#4F586B', hb: '#192645', hi: '#FFFFFF', pa: '#2A3C8E', pi: '#FFFFFF', ac: '#2A3C8E', pl: '#2A3C8E', pli: '#FFFFFF', pc: 'rgba(255,255,255,.18)', pci: '#FFFFFF', hv: '#3247AC', hvi: '#FFFFFF', dot: '#7F93EE', nv: 'rgba(255,255,255,.94)', cb: '#192645', ci: '#FFFFFF' },
    dark: { pg: '#090D16', sf: '#131A29', s2: '#131A29', ln: 'rgba(236,239,246,.09)', tx: '#ECEFF6', t2: '#A1A9BB', hb: '#1C2950', hi: '#FFFFFF', pa: '#A9B8FF', pi: '#090D16', ac: '#A9B8FF', pl: '#A9B8FF', pli: '#090D16', pc: 'rgba(9,13,22,.14)', pci: '#090D16', hv: '#A9B8FF', hvi: '#090D16', dot: '#A9B8FF', nv: '#131A29EE', cb: '#1C2950', ci: '#FFFFFF' }
  },
  b: {
    light: { pg: '#F2EFE8', sf: '#FFFDF8', s2: '#FFFDF8', ln: 'rgba(19,32,29,.09)', tx: '#13201D', t2: '#525D59', hb: '#173F37', hi: '#F5F2EA', pa: '#1D5247', pi: '#FFFFFF', ac: '#9C4322', pl: '#B4532E', pli: '#FFFFFF', pc: 'rgba(255,255,255,.18)', pci: '#FFFFFF', hv: '#2C7A68', hvi: '#FFFFFF', dot: '#E08A5B', nv: 'rgba(255,253,248,.92)', cb: '#173F37', ci: '#F5F2EA' },
    dark: { pg: '#0C1614', sf: '#14211E', s2: '#14211E', ln: 'rgba(236,233,225,.09)', tx: '#ECE9E1', t2: '#A9B2AD', hb: '#1B4239', hi: '#F5F2EA', pa: '#8ED2BE', pi: '#0C1614', ac: '#F2A784', pl: '#F2A784', pli: '#1E0F07', pc: 'rgba(12,22,20,.14)', pci: '#0C1614', hv: '#8ED2BE', hvi: '#0C1614', dot: '#F2A784', nv: '#14211EEB', cb: '#1B4239', ci: '#F5F2EA' }
  },
  c: {
    light: { pg: '#F3F1EA', sf: '#FBFAF6', s2: '#FBFAF6', ln: 'rgba(18,18,18,.13)', tx: '#121212', t2: '#55565A', hb: '#0F4A3D', hi: '#F3F1EA', pa: '#121212', pi: '#F3F1EA', ac: '#0E6650', pl: '#E3A23A', pli: '#121212', pc: 'rgba(243,241,234,.16)', pci: '#F3F1EA', hv: '#0E6650', hvi: '#FFFFFF', dot: '#E3A23A', nv: 'rgba(243,241,234,.96)', cb: '#0F4A3D', ci: '#F3F1EA' },
    dark: { pg: '#0D0D0E', sf: '#171718', s2: '#171718', ln: 'rgba(238,236,230,.13)', tx: '#EEECE6', t2: '#A6A6A2', hb: '#11493C', hi: '#F3F1EA', pa: '#EEECE6', pi: '#0D0D0E', ac: '#73D3B5', pl: '#E8A845', pli: '#121212', pc: 'rgba(13,13,14,.14)', pci: '#0D0D0E', hv: '#73D3B5', hvi: '#0D0D0E', dot: '#E8A845', nv: '#171718F0', cb: '#11493C', ci: '#F3F1EA' }
  },
  // B+C: banda de abeto y cobre (B) sobre el papel y la tinta de C.
  bc: {
    light: { pg: '#F3F1EA', sf: '#FBFAF6', s2: '#FBFAF6', ln: 'rgba(18,18,18,.13)', tx: '#121212', t2: '#55565A', hb: '#173F37', hi: '#F5F2EA', pa: '#173F37', pi: '#F5F2EA', ac: '#9C4322', pl: '#B4532E', pli: '#FFFFFF', pc: 'rgba(245,242,234,.16)', pci: '#F5F2EA', hv: '#2C7A68', hvi: '#FFFFFF', dot: '#E08A5B', nv: 'rgba(243,241,234,.96)', cb: '#173F37', ci: '#F5F2EA' },
    dark: { pg: '#0D0D0E', sf: '#171718', s2: '#171718', ln: 'rgba(238,236,230,.13)', tx: '#EEECE6', t2: '#A6A6A2', hb: '#1B4239', hi: '#F5F2EA', pa: '#8ED2BE', pi: '#0C1614', ac: '#F2A784', pl: '#F2A784', pli: '#1E0F07', pc: 'rgba(13,13,14,.14)', pci: '#0D0D0E', hv: '#8ED2BE', hvi: '#0C1614', dot: '#F2A784', nv: '#171718F0', cb: '#1B4239', ci: '#F5F2EA' }
  }
};
const PAPER = ['pg', 'sf', 's2', 'ln', 'tx', 't2', 'nv'];

// Gancho de piel: Original no cambia nada; A, B y C solo en las 3 pantallas.
export function variantSkin(p: any, bank: string, dark: boolean, view: string) {
  const v = getLab().variant;
  if (v === 'orig' || !['home', 'movs', 'ana'].includes(view)) return p;
  const w = WALLET[v][dark ? 'dark' : 'light'];
  const mono = p.tb === p.sf;
  if (bank === 'wallet') {
    const out = { ...p, ...w };
    if (mono) { out.tb = out.sf; out.ti = out.tx; } else { out.tb = out.hb; out.ti = out.hi; }
    return out;
  }
  // Con banco: el banco conserva su color. B tiñe la página con él; C la deja en papel.
  if (v === 'b') return { ...p, pg: `color-mix(in srgb, ${p.hb} ${dark ? 12 : 7}%, ${dark ? '#0E0F11' : '#F5F3EE'})` };
  if (v === 'c' || v === 'bc') { const out = { ...p }; PAPER.forEach((k) => { out[k] = w[k]; }); return out; }
  return p;
}
