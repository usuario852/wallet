/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useWallet, commit } from '../store';
import { useUI } from '../ui/ctx';
import { Seg, Switch } from '../ui/bits';
import { lookOf, LOOK_DEFAULTS } from '../design/theme';
import { BackHeader } from './parts';

import { feel } from '../ui/feel';
const BL: Record<string, string> = { naipes: 'Tus cuentas', hoy: 'Hasta fin de mes', animo: '¿Cómo estás?', acc: 'Lo último', deuda: 'Lo que debes', prox: 'Próximo' };

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
        <div className="sec phd" style={{ paddingTop: 8 }}><span className="pht"><b>Personaliza</b></span></div>
        <div className="sec">
          <G t="Tema"><Seg items={[['system', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']]} value={(s.settings.theme || 'system') as any} onChange={(v) => commit((x) => { x.settings.theme = v; })} label="Tema" className="n3" /></G>
          <G t="El número grande">
            <Seg items={[['liq', 'Patrimonio'], ['disp', 'Disponible'], ['hoy', 'Lo de hoy']]} value={look.big} onChange={(v) => set({ big: v })} label="Número grande" className="n3" />
            <div className="srow"><span className="sc"><b>Céntimos</b><small>Mostrar los decimales en el número grande.</small></span><Switch on={look.cents} onChange={(v) => set({ cents: v })} label="Céntimos" /></div>
            <div className="srow"><span className="sc"><b>Ocultar montos al abrir</b><small>Se muestran tocando el ojo.</small></span><Switch on={look.hide} onChange={(v) => set({ hide: v })} label="Ocultar montos" /></div>
          </G>
          <G t="Arriba del Inicio">
            <Seg items={[['fecha', 'Fecha'], ['wallet', 'Wallet']]} value={look.greet === 'wallet' ? 'wallet' : 'fecha'} onChange={(v) => set({ greet: v })} label="Arriba del Inicio" />
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
          <G t="Sensaciones">
            <div className="srow"><span className="sc"><b>Sonidos</b><small>Un clic suave al registrar y deshacer.</small></span><Switch on={!!look.sound} onChange={(v) => { set({ sound: v }); if (v) setTimeout(() => feel('success'), 50); }} label="Sonidos" /></div>
            <div className="srow"><span className="sc"><b>Inclinación</b><small>Las formas y el vidrio siguen al teléfono.</small></span><Switch on={look.tilt !== false} onChange={(v) => set({ tilt: v })} label="Inclinación" /></div>
          </G>
          <G t="Movimiento"><Seg items={[['full', 'Completo'], ['less', 'Suave'], ['none', 'Sin movimiento']]} value={look.motion} onChange={(v) => set({ motion: v })} label="Movimiento" className="n3" /></G>
          <span className="glab">Restablecer</span>
          <div className="card"><button className="srow" onClick={() => open('confirm', { title: 'Volver al diseño original', text: 'Se restablecen el número grande, los bloques del Inicio y las sensaciones. Tus datos no cambian.', ok: 'Restablecer', onOk: () => set(Object.assign({}, LOOK_DEFAULTS, { defaultAccount: look.defaultAccount })) })}><span className="sc"><b>Volver al diseño original</b></span></button></div>
        </div>
        <div className="endpad" />
      </div>
    </>
  );
}
