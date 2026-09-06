/*
  toast-host — el único sitio donde se montan los toasts.

  createToast construye el nodo pero no decide dónde vive. Esa
  decisión se toma aquí, una sola vez, para que no haya dos capas de
  toasts compitiendo por el mismo rincón de la pantalla.

  Solo hay un toast a la vez: si llega uno nuevo, el anterior se va.
  Dos avisos apilados son dos avisos que nadie lee.
*/

import { createToast } from './components/toast.js';

let host = null;
let current = null;

/* La capa de toasts. Se crea la primera vez que hace falta. */
export function toastHost() {
  if (host && host.isConnected) return host;
  host = document.getElementById('toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    document.body.appendChild(host);
  }
  host.className = 'toast-layer';
  return host;
}

/* Muestra un toast y devuelve su api. */
export function showToast(options = {}) {
  if (current) current.dismiss();

  const toast = createToast({
    ...options,
    onDismiss: (reason) => {
      if (current === toast) current = null;
      if (typeof options.onDismiss === 'function') options.onDismiss(reason);
    },
  });

  current = toast;
  toastHost().appendChild(toast.el);
  return toast;
}

/* Cierra el toast que haya, si hay alguno. */
export function dismissToast() {
  if (current) current.dismiss();
}
