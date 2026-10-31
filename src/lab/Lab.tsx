/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
import * as C from '../domain/core';
import App from '../App';
import { useWallet, replaceState, commit, addOperation, deleteOperation, getState } from '../store';
import { useLab, setLab, getLab, bridge, labHooks, labBlocked, labGuarded, LabState } from './mode';
import { labFixture } from './fixtures';
import { VARIANTS, variantSkin } from './variants';
import { FONTS, loadFont, fontVars } from './fonts';
import './lab.css';

// Arranque: datos inventados en memoria antes del primer render.
const theme0 = new URLSearchParams(location.search).get('tema') === 'dark' ? 'dark' : 'light';
replaceState(labFixture(getLab().stress, theme0));
labHooks.skin = variantSkin;

const BANKS: [string, string][] = [['', 'Total'], ['bcp', 'BCP'], ['bbva', 'BBVA'], ['interbank', 'Interbank'], ['scotiabank', 'Scotiabank'], ['yape', 'Yape']];
const SCREENS: [string, string][] = [['home', 'Inicio'], ['movs', 'Movimientos'], ['ana', 'Análisis']];
const URLMAP: [keyof LabState, string][] = [['variant', 'v'], ['font', 'f'], ['saldo', 'saldo'], ['num', 'num'], ['stress', 'esc'], ['motion', 'mov'], ['hud', 'hud'], ['tab', 'tab'], ['rasgos', 'r']];
// Pestaña C: cada diferencia con la v21, por separado, sobre el Original.
const RASGOS: [string, string, string][] = [
  ['t', 'Una sola tinta', 'Verde petróleo sobre papel cálido; el coral, solo en las acciones.'],
  ['w', 'Papel cálido', 'Solo el papel de la v21; la tinta índigo de hoy se queda. Excluye a «Una sola tinta».'],
  ['s', 'Superficies tonales', 'Las tarjetas son el mismo papel un tono más hondo: sin blanco ni sombra.'],
  ['e', 'Contraste de escala', 'Etiquetas en mayúsculas pequeñas y espaciadas; mandan las cifras.'],
  ['n', 'El número como una pieza', 'S/ y decimales pequeños y tenues: se lee «35,323».'],
  ['v', 'Voz propia', 'Títulos y subtítulos que hablan, como en la v21.'],
  ['i', 'Iconos suaves', 'Comercios en un tinte claro de su color, no en bloque saturado.'],
  ['f', 'Formas blandas', 'Esquina propia en el saldo, píldoras amplias y un + redondo.']
];
// Rasgos que no pueden ir juntos: los dos cambian el papel.
const EXCL: Record<string, string> = { t: 'w', w: 't' };
let probe: string | null = null;

function Opt<T extends string>({ items, value, onPick, label, wide = false }: { items: [T, string][]; value: T; onPick: (v: T) => void; label: string; wide?: boolean }) {
  return (
    <div className={'lseg' + (wide ? ' wide' : '')} role="group" aria-label={label}>
      {items.map(([k, t]) => <button key={k} aria-pressed={value === k} className={value === k ? 'on' : ''} onClick={() => onPick(k)}>{t}</button>)}
    </div>
  );
}

export function Lab() {
  const lab = useLab();
  const { s } = useWallet();
  const sys = FONTS.find((f) => f.id === lab.font) || FONTS[0];
  const dark = s.settings.theme === 'dark';
  const cur = s.settings.activeCurrency;

  useEffect(() => { loadFont(sys); }, [sys]);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    URLMAP.forEach(([k, p]) => q.set(p, String(lab[k])));
    q.set('lab', '1'); q.set('tema', dark ? 'dark' : 'light');
    history.replaceState(null, '', location.pathname + '?' + q.toString());
  }, [lab, dark]);
  useEffect(() => { commit((x) => { x.settings.look = { ...(x.settings.look || {}), motion: lab.motion === 'reduced' ? 'none' : 'full' }; }, { silent: true }); }, [lab.motion]);
  // Arranque reproducible para capturas: ?pant=movs&banco=bcp
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const p = q.get('pant'); const b = q.get('banco');
    if (p && ['home', 'movs', 'ana'].includes(p)) bridge.go?.(p);
    if (b) { const a = getState().accounts.find((x: any) => x.brand === b && x.currency === getState().settings.activeCurrency); if (a) bridge.setSel?.(a.id); }
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'l' && !(e.target as HTMLElement)?.closest('input,textarea,select')) setLab({ hud: getLab().hud === 'hidden' ? 'open' : 'hidden' }); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const view = bridge.view || 'home';
  const selBrand = bridge.sel ? (C.accountById(s, bridge.sel) || {}).brand || '' : '';
  const pickBank = (b: string) => {
    if (!b) { bridge.setSel?.(null); return; }
    const a = s.accounts.find((x: any) => x.brand === b && x.currency === cur && !x.archived);
    if (!a) return;
    if (!['home', 'movs', 'ana'].includes(view)) bridge.go?.('home');
    bridge.setSel?.(a.id);
  };
  const reset = (stress = lab.stress) => { probe = null; bridge.setSel?.(null); replaceState(labFixture(stress, dark ? 'dark' : 'light')); };
  const tryChange = () => {
    if (probe && getState().operations.some((o: any) => o.id === probe)) { deleteOperation(probe, true); probe = null; return; }
    const acc = s.accounts.find((a: any) => a.currency === cur && a.kind !== 'reserve' && !a.archived);
    if (!acc) return;
    const op = addOperation({ type: 'expense', accountId: acc.id, currency: cur, amountMinor: C.toMinor(1287.45, cur), concept: 'Wong', category: 'Alimentacion' }, 'Gasto de prueba en memoria');
    probe = op ? op.id : null;
  };

  const hud = lab.hud === 'hidden' ? (
    <button className="lab-hot" aria-label="Mostrar el laboratorio" onClick={() => setLab({ hud: 'open' })} />
  ) : lab.hud === 'min' ? (
    <button className="lab-chip" onClick={() => setLab({ hud: 'open' })} aria-label="Abrir el laboratorio">
      <b>Lab</b><span>{VARIANTS.find((v) => v.id === lab.variant)?.name} · {sys.id.toUpperCase()}</span>
    </button>
  ) : (
    <aside className="lab-hud" aria-label="Laboratorio visual">
      <header>
        <b>Laboratorio</b>
        <span className="lab-iso" title={labBlocked.join('\n')}>{labGuarded ? 'Datos inventados en memoria' : 'Aislamiento incompleto'} · red bloqueada{labBlocked.length ? ' (' + labBlocked.length + ')' : ''}</span>
        <span className="lab-hb">
          <button onClick={() => setLab({ hud: 'min' })}>Plegar</button>
          <button onClick={() => setLab({ hud: 'hidden' })}>Ocultar</button>
        </span>
      </header>
      <Opt label="Pestaña" wide items={[['a', 'A · Dirección'], ['b', 'B · Tipografía'], ['c', 'C · Rasgos v21']]} value={lab.tab} onPick={(tab) => setLab({ tab })} />
      {lab.tab === 'c' ? (
        <div className="lab-body">
          <p className="lab-th">Cada interruptor enciende una diferencia con la v21 sobre el Original. Combínalos para ver cuáles te importan.</p>
          {RASGOS.map(([k, t, d]) => {
            const on = lab.rasgos.includes(k);
            return (
              <button key={k} role="switch" aria-checked={on} className={'lab-font' + (on ? ' on' : '')} onClick={() => setLab({ variant: 'orig', rasgos: on ? lab.rasgos.replace(k, '') : RASGOS.map((x) => x[0]).filter((x) => x === k || (lab.rasgos.includes(x) && !EXCL[k]?.includes(x))).join('') })}>
                <b>{on ? '● ' : '○ '}{t}</b><small>{d}</small>
              </button>
            );
          })}
          <div className="lseg">
            <button onClick={() => setLab({ variant: 'orig', rasgos: RASGOS.map((x) => x[0]).filter((x) => x !== 'w').join('') })}>Todos</button>
            <button onClick={() => setLab({ rasgos: '' })}>Ninguno</button>
          </div>
          <span className="lab-l">Pantalla</span>
          <Opt label="Pantalla" items={SCREENS} value={view} onPick={(v) => bridge.go?.(v)} />
          <span className="lab-l">Tema</span>
          <Opt label="Tema" items={[['light', 'Claro'], ['dark', 'Oscuro']]} value={dark ? 'dark' : 'light'} onPick={(t) => commit((x) => { x.settings.theme = t; }, { silent: true })} />
        </div>
      ) : lab.tab === 'a' ? (
        <div className="lab-body">
          <Opt label="Dirección" items={VARIANTS.map((v) => [v.id, v.name] as [LabState['variant'], string])} value={lab.variant} onPick={(variant) => setLab({ variant, rasgos: '' })} />
          <p className="lab-th">{VARIANTS.find((v) => v.id === lab.variant)?.thesis}</p>
          <span className="lab-l">Pantalla</span>
          <Opt label="Pantalla" items={SCREENS} value={view} onPick={(v) => bridge.go?.(v)} />
          <span className="lab-l">Cuenta</span>
          <div className="lseg wrap" role="group" aria-label="Cuenta">
            {BANKS.map(([b, t]) => {
              const has = !b || s.accounts.some((x: any) => x.brand === b && x.currency === cur && !x.archived);
              return <button key={t} disabled={!has} aria-pressed={selBrand === b} className={selBrand === b ? 'on' : ''} onClick={() => pickBank(b)}>{t}</button>;
            })}
          </div>
          <span className="lab-l">Tema</span>
          <Opt label="Tema" items={[['light', 'Claro'], ['dark', 'Oscuro']]} value={dark ? 'dark' : 'light'} onPick={(t) => commit((x) => { x.settings.theme = t; }, { silent: true })} />
          <details className="lab-adv">
            <summary>Avanzado</summary>
            <span className="lab-l">Escenario</span>
            <Opt label="Escenario" items={[['normal', 'Normal'], ['extreme', 'S/ 1,234,567.89'], ['empty', 'Vacío']]} value={lab.stress} onPick={(stress) => { setLab({ stress }); reset(stress); }} />
            <span className="lab-l">Movimiento</span>
            <Opt label="Movimiento" items={[['normal', 'Normal'], ['reduced', 'Reducido']]} value={lab.motion} onPick={(motion) => setLab({ motion })} />
            <button className="lab-btn" onClick={() => reset()}>Restablecer fixtures</button>
          </details>
        </div>
      ) : (
        <div className="lab-body">
          <div className="lab-fonts" role="radiogroup" aria-label="Sistema tipográfico">
            {FONTS.map((f) => (
              <button key={f.id} role="radio" aria-checked={lab.font === f.id} className={'lab-font' + (lab.font === f.id ? ' on' : '')} onClick={() => setLab({ font: f.id as LabState['font'] })} onPointerEnter={() => loadFont(f)}>
                <span className="lab-spec" style={{ fontFamily: f.disp + ', system-ui', fontWeight: f.dw, letterSpacing: f.ls, fontFeatureSettings: f.feat }}>S/ 4,872.<small>35</small></span>
                <b>{f.name}</b><small>{f.why}</small>
              </button>
            ))}
          </div>
          <span className="lab-l">Saldo</span>
          <Opt label="Saldo" items={[['odo', 'Modo 1 · Odómetro'], ['coh', 'Modo 2 · Cohesivo']]} value={lab.saldo} onPick={(saldo) => setLab({ saldo })} />
          <span className="lab-l">Numerales del saldo cohesivo</span>
          <Opt label="Numerales" items={[['tnum', 'Tabulares'], ['pnum', 'Proporcionales']]} value={lab.num} onPick={(num) => setLab({ num })} />
          <button className="lab-btn" onClick={tryChange}>{probe ? 'Deshacer el gasto de prueba' : 'Probar un cambio de saldo (S/ 1,287.45)'}</button>
          <p className="lab-glyphs" style={{ fontFamily: sys.ui + ', system-ui' }}>áéíóúñ ÁÉÍÓÚÑ ¿¡ S/ $ € 0123456789.,−</p>
        </div>
      )}
    </aside>
  );

  return (
    <div className="labroot" data-lab-variant={lab.variant} data-lab-font={lab.font} data-lab-saldo={lab.saldo} data-lab-num={lab.num} data-lab-stress={lab.stress} data-lab-motion={lab.motion} data-lab-hud={lab.hud} data-lab-r={lab.variant === 'orig' ? lab.rasgos : ''} style={fontVars(sys) as any}>
      <App />
      {hud}
    </div>
  );
}
