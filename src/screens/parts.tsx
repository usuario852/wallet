/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useWallet, retryStorage, startFresh, getState } from '../store';
import * as C from '../domain/core';
import { useUI } from '../ui/ctx';
import { IBack } from '../ui/icons';

export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 800);
}
export function exportJson() { download('wallet_backup_' + C.todayLocal() + '.json', JSON.stringify(getState(), null, 2), 'application/json'); }
export function exportCsv() {
  const s = getState();
  const q = (v: any) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  let csv = 'OPERACIONES\n' + ['id', 'tipo', 'fecha', 'moneda', 'monto', 'concepto', 'categoria', 'cuenta_origen', 'cuenta_destino', 'tasa'].map(q).join(',') + '\n';
  s.operations.forEach((o: any) => {
    const currency = o.currency || o.fromCurrency || '';
    const amount = o.amountMinor != null ? C.fromMinor(o.amountMinor, currency) : o.fromAmountMinor != null ? C.fromMinor(o.fromAmountMinor, o.fromCurrency) : '';
    csv += [o.id, o.type, o.date, currency, amount, o.concept || '', o.category || '', o.accountId ? C.accountName(s, o.accountId) : o.fromAccountId ? C.accountName(s, o.fromAccountId) : '', o.toAccountId ? C.accountName(s, o.toAccountId) : '', o.displayRate || ''].map(q).join(',') + '\n';
  });
  csv += '\nCUENTAS\n' + ['id', 'nombre', 'moneda', 'tipo', 'saldo_actual', 'entidad'].map(q).join(',') + '\n';
  s.accounts.forEach((a: any) => { csv += [a.id, a.name, a.currency, a.kind, C.fromMinor(C.balanceOf(s, a), a.currency), a.institution || ''].map(q).join(',') + '\n'; });
  download('wallet_' + C.todayLocal() + '.csv', '﻿' + csv, 'text/csv;charset=utf-8');
}
function downloadQuarantined() {
  let raw = ''; try { raw = localStorage.getItem(C.QUARANTINE_KEY) || ''; } catch { /* */ }
  if (raw) download('wallet-datos-corruptos-' + C.todayLocal() + '.json', raw, 'application/json');
}

// Un problema de almacenamiento se queda delante hasta que se resuelve.
export function Banner() {
  const { health } = useWallet();
  const { open } = useUI();
  if (health.mode === 'ok') return null;
  if (health.mode === 'recovery_required') return (
    <div className="banner" role="alert">
      <b>No pude leer tus datos</b>
      <p>{health.reason} {health.quarantined ? 'Guardé una copia intacta del archivo y no voy a escribir nada encima hasta que decidas.' : 'No pude poner a salvo una copia del archivo.'}</p>
      <div className="btns">
        {health.quarantined && <button onClick={downloadQuarantined}>Descargar la copia</button>}
        <button onClick={retryStorage}>Reintentar</button>
        <button onClick={() => open('confirm', { title: 'Empezar de cero', text: 'Wallet arrancará vacía. La copia del archivo que no se pudo leer se conserva.', ok: 'Empezar de cero', danger: true, onOk: startFresh })}>Empezar de cero</button>
      </div>
    </div>
  );
  if (health.mode === 'failed') return (
    <div className="banner" role="alert">
      <b>Tus últimos cambios no se guardaron</b>
      <p>{health.reason} Lo que ves está solo en memoria. Exporta un respaldo antes de seguir.</p>
      <div className="btns"><button onClick={exportJson}>Exportar respaldo</button><button onClick={retryStorage}>Reintentar</button></div>
    </div>
  );
  return <div className="banner" role="alert"><b>Almacenamiento no disponible</b><p>{health.reason}</p></div>;
}

export function BackHeader({ label = 'Inicio', right }: { label?: string; right?: React.ReactNode }) {
  const { back } = useUI();
  return (
    <div className="hdr plain">
      <button className="bk" onClick={back}><IBack /><span>{label}</span></button>
      {right || <span />}
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="sec phd">
      <span className="pht"><b>{title}</b>{sub && <small>{sub}</small>}</span>
      {right}
    </div>
  );
}
