/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useWallet, commit } from '../store';
import { useUI } from '../ui/ctx';
import { Seg, Switch } from '../ui/bits';
import { lookOf, LOOK_DEFAULTS } from '../design/theme';
import { BackHeader } from './parts';

const SW8: [string, string][] = [['#1D4ED8', 'Azul'], ['#047857', 'Verde'], ['#0F766E', 'Petróleo'], ['#B91C1C', 'Rojo'], ['#C2410C', 'Naranja'], ['#A16207', 'Mostaza'], ['#86198F', 'Ciruela'], ['#374151', 'Grafito']];
const BL: Record<string, string> = { naipes: 'Tus cuentas', hoy: 'Resumen del día', acc: 'Acciones', deuda: 'Lo que debes', prox: 'Próximo' };

function G({ t, children }: { t: string; children: React.ReactNode }) { return <><span className="glab">{t}</span><div className="card">{children}</div></>; }

export default function Personalize() {
  const { s } = useWallet();
  const { back, open } = useUI();
  const look = lookOf(s.settings);
  const set = (patch: any) => commit((x) => { x.settings.look = Object.assign({}, lookOf(x.settings), patch); });
  const move = (i: number, d: number) => { const b = look.blocks.map((x: any) => x.slice()); const j = i + d; if (j < 0 || j >= b.length) return; [b[i], b[j]] = [b[j], b[i]]; set({ blocks: b }); };

  return (
    <>
      <BackHeader label="Ajustes" />
      <div className="scr noscr aj">
        <div className="sec phd" style={{ paddingTop: 8 }}><span className="pht"><b>Personaliza</b><small>Cada cambio se ve al instante.</small></span></div>
        <div className="sec">
          <G t="Tema">
            <button className="lrow" onClick={back} aria-label="Volver a Ajustes para cambiar el tema"><span className="sc"><b>{s.settings.theme === 'dark' ? 'Oscuro' : s.settings.theme === 'light' ? 'Claro' : 'Automático'}</b><small>Se cambia en Ajustes, Apariencia.</small></span><span className="lnk">Cambiar en Ajustes ›</span></button>
          </G>
          <G t="Color">
            <Seg items={[['bank', 'Cada banco'], ['one', 'Un color'], ['mono', 'Sin color']]} value={look.style} onChange={(v) => set({ style: v })} label="Color" className="n3" />
            <p className="tsm2">{look.style === 'bank' ? 'Cada cuenta con los colores de su banco.' : look.style === 'one' ? 'Todo con el color que elijas.' : 'Blanco y negro, como una libreta.'}</p>
            {look.style === 'one' && <div className="sw8">{SW8.map(([c, t]) => <button key={c} className={'swc' + (look.accent === c ? ' on' : '')} style={{ ['--c' as any]: c }} onClick={() => set({ accent: c })} aria-label={t} aria-pressed={look.accent === c}><i /><small>{t}</small></button>)}</div>}
          </G>
          <G t="Esquinas"><Seg items={[['bank', 'Del banco'], ['r', 'Redondas'], ['m', 'Medias'], ['s', 'Rectas']]} value={look.corner} onChange={(v) => set({ corner: v })} label="Esquinas" /></G>
          <G t="Letra"><Seg items={[['s', 'Chica'], ['m', 'Normal'], ['l', 'Grande']]} value={look.size} onChange={(v) => set({ size: v })} label="Tamaño de letra" className="n3" /><p className="tsm2">También respeta el tamaño de letra del iPhone.</p></G>
          <G t="Espacio"><Seg items={[['n', 'Cómoda'], ['c', 'Compacta']]} value={look.dens} onChange={(v) => set({ dens: v })} label="Espacio" /></G>
          <G t="El número grande">
            <Seg items={[['liq', 'Patrimonio'], ['disp', 'Disponible'], ['hoy', 'Lo de hoy']]} value={look.big} onChange={(v) => set({ big: v })} label="Número grande" className="n3" />
            <div className="srow"><span className="sc"><b>Céntimos</b><small>Mostrar los decimales en el número grande.</small></span><Switch on={look.cents} onChange={(v) => set({ cents: v })} label="Céntimos" /></div>
            <div className="srow"><span className="sc"><b>Ocultar montos al abrir</b><small>Se muestran tocando el ojo.</small></span><Switch on={look.hide} onChange={(v) => set({ hide: v })} label="Ocultar montos" /></div>
          </G>
          <G t="Arriba del Inicio">
            <Seg items={[['fecha', 'Fecha'], ['saludo', 'Saludo'], ['nombre', 'Tu nombre'], ['wallet', 'Wallet']]} value={look.greet} onChange={(v) => set({ greet: v })} label="Saludo" />
            {look.greet === 'nombre' && <label className="wq" style={{ marginTop: 10 }}>Tu nombre<input value={look.name} maxLength={20} onChange={(e) => set({ name: e.target.value.slice(0, 20) })} placeholder="Cómo te llamamos" /></label>}
          </G>
          <G t="Tus cuentas"><Seg items={[['naipes', 'Naipes'], ['fila', 'Fila con saldo']]} value={look.naip} onChange={(v) => set({ naip: v })} label="Cuentas" /></G>
          <G t="Qué se ve en el Inicio">
            {look.blocks.map((b: any, i: number) => (
              <div className="srow" key={b[0]}>
                <span className="ord"><button className="ob" onClick={() => move(i, -1)} disabled={i === 0} aria-label={'Subir ' + BL[b[0]]}>↑</button><button className="ob" onClick={() => move(i, 1)} disabled={i === look.blocks.length - 1} aria-label={'Bajar ' + BL[b[0]]}>↓</button></span>
                <span className="sc grow"><b>{BL[b[0]]}</b></span>
                <Switch on={b[1]} onChange={(v) => set({ blocks: look.blocks.map((x: any) => (x[0] === b[0] ? [x[0], v] : x)) })} label={BL[b[0]]} />
              </div>
            ))}
          </G>
          <G t="Movimiento"><Seg items={[['full', 'Completo'], ['less', 'Suave'], ['none', 'Sin movimiento']]} value={look.motion} onChange={(v) => set({ motion: v })} label="Movimiento" className="n3" /></G>
          <span className="glab">Restablecer</span>
          <div className="card"><button className="srow" onClick={() => open('confirm', { title: 'Volver al diseño original', text: 'Se restablecen colores, letra, espacio y bloques del Inicio. Tus datos no cambian.', ok: 'Restablecer', onOk: () => set(Object.assign({}, LOOK_DEFAULTS, { defaultAccount: look.defaultAccount })) })}><span className="sc"><b>Volver al diseño original</b></span></button></div>
        </div>
        <div className="endpad" />
      </div>
    </>
  );
}
