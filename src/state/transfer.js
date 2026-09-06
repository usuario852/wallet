/*
  transfer — llevarse los datos de un navegador a otro.

  El estado vive en localStorage, que es de cada navegador. Migrar en
  Chrome no le sirve de nada a Safari del iPhone: son dos almacenes
  distintos y no se hablan. Hasta que exista sincronización —que no
  está en el alcance de v1— la forma de pasar los datos es un archivo.

  Sección 1, principio 6: los datos son tuyos y se van contigo.

  Importar reemplaza todo. Por eso el flujo es en dos pasos: primero
  se lee y se cuenta lo que trae el archivo, y solo después, viéndolo,
  se reemplaza. Y antes de reemplazar se guarda una copia de lo que
  había, igual que hace la migración.
*/

import { createDefaultState, replaceState } from './store.js';
import { STATE_KEY, hydrate, resolveStorage, report as warn } from './persist.js';

/* Prefijo de la copia que se guarda antes de reemplazar. */
export const PRE_IMPORT_KEY_PREFIX = 'wallet_state_v1__antes_de_importar';

/* El estado entero, en texto. Con sangría: el archivo se abre a mano
   más veces de las que se cree, y pesa poco. */
export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

/* wallet-2026-09-06.json */
export function exportFilename(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return 'wallet-' + now.getFullYear()
    + '-' + pad(now.getMonth() + 1)
    + '-' + pad(now.getDate())
    + '.json';
}

/* Lee un texto y dice si sirve, sin aplicar nada.

   Devuelve { ok, reason, state, summary }:

     reason  'vacio' | 'no-es-json' | 'no-es-wallet' | 'listo'
     state   el estado ya completado con la forma por defecto
     summary lo que trae dentro, para poder enseñarlo antes de
             reemplazar nada */
export function parseImport(text) {
  const raw = String(text === null || text === undefined ? '' : text).trim();
  if (!raw) return { ok: false, reason: 'vacio', state: null, summary: null };

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { ok: false, reason: 'no-es-json', state: null, summary: null };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'no-es-wallet', state: null, summary: null };
  }

  /* La prueba de que esto es un estado de Wallet y no cualquier JSON:
     tiene las dos listas que sostienen todo lo demás. Un archivo sin
     ellas reemplazaría los datos por nada. */
  if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.operations)) {
    return { ok: false, reason: 'no-es-wallet', state: null, summary: null };
  }

  const state = hydrate(parsed);
  return { ok: true, reason: 'listo', state, summary: summarize(state) };
}

/* Lo que hay dentro de un estado, para enseñarlo antes de reemplazar. */
export function summarize(state) {
  const base = state || createDefaultState();
  return {
    accounts: base.accounts.length,
    operations: base.operations.length,
    upcoming: base.upcoming.length,
    concepts: base.concepts.length,
    currencies: [...base.settings.enabledCurrencies],
    /* La fecha del movimiento más reciente dice, de un vistazo, si el
       archivo es el que se cree. */
    lastDate: base.operations.reduce(
      (latest, operation) => (String(operation.date) > latest ? String(operation.date) : latest),
      '',
    ),
  };
}

/* Reemplaza el estado con el importado.

   Guarda antes una copia de lo que había, bajo una clave con marca de
   tiempo. Si la copia no se puede escribir, no se reemplaza: perder
   los datos anteriores sin red no es una opción.

   Devuelve { ok, reason, backupKey }. */
export function applyImport(target, incoming, options = {}) {
  const storage = options.storage === undefined ? resolveStorage() : options.storage;
  if (!incoming) return { ok: false, reason: 'sin-estado', backupKey: null };

  let backupKey = null;
  if (storage) {
    const previous = safeGet(storage, STATE_KEY);
    if (previous !== null && previous !== '') {
      backupKey = PRE_IMPORT_KEY_PREFIX + '_' + stamp(options.now);
      try {
        storage.setItem(backupKey, previous);
      } catch (error) {
        warn('No se pudo guardar la copia previa; no se importa nada.', error);
        return { ok: false, reason: 'copia-fallida', backupKey: null };
      }
    }
  }

  replaceState(target, incoming);
  return { ok: true, reason: 'importado', backupKey };
}

function stamp(now) {
  const date = now instanceof Date ? now : new Date();
  return date.toISOString().slice(0, 19).replace(/[:T]/g, '');
}

function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch (error) {
    return null;
  }
}
