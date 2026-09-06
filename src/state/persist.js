/*
  persist — lectura y escritura en localStorage.

  Clave nueva, distinta de la anterior: la migración necesita poder
  distinguir "no hay nada" de "ya migré".

  Un JSON roto nunca tumba el arranque. Se guarda el texto corrupto
  aparte, se deja constancia y se arranca con el estado por defecto.
  Perder los datos en silencio sería peor que no arrancar.
*/

import { createDefaultState } from './store.js';

export const STATE_KEY = 'wallet_state_v1';

/* Donde va a parar un JSON que no se pudo leer. Lleva marca de tiempo
   para no pisar un rescate anterior. */
export const CORRUPT_KEY_PREFIX = 'wallet_state_v1__corrupto';

/* Cuánto se espera desde la última mutación antes de escribir. */
export const WRITE_DELAY_MS = 400;

/* localStorage, o null si no existe o está bloqueado. Safari en
   privado lanza al tocarlo, así que se prueba de verdad. */
export function resolveStorage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__wallet_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch (error) {
    report('localStorage no está disponible; la sesión no se guardará.', error);
    return null;
  }
}

/* Almacenamiento en memoria con la misma interfaz. Lo usan las pruebas
   y sirve de red si el navegador no deja escribir. */
export function createMemoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    get length() { return map.size; },
    key: (index) => [...map.keys()][index] ?? null,
  };
}

/* Deja constancia sin lanzar. Un aviso en consola es suficiente
   registro para v1; cuando exista telemetría, se engancha aquí. */
export function report(message, error) {
  if (typeof console !== 'undefined' && console.warn) {
    if (error) console.warn('[wallet] ' + message, error);
    else console.warn('[wallet] ' + message);
  }
}

/* Lee el estado guardado. Nunca lanza.

   Devuelve { state, status, detail }:
     status 'empty'   no había nada guardado
     status 'ok'      se leyó bien
     status 'corrupt' no se pudo leer; el texto original queda a salvo
                      bajo una clave aparte y se arranca por defecto */
export function loadState(storage = resolveStorage()) {
  if (!storage) {
    return { state: createDefaultState(), status: 'empty', detail: 'sin almacenamiento' };
  }

  let raw = null;
  try {
    raw = storage.getItem(STATE_KEY);
  } catch (error) {
    report('No se pudo leer el estado guardado.', error);
    return { state: createDefaultState(), status: 'corrupt', detail: 'lectura fallida' };
  }

  if (raw === null || raw === '') {
    return { state: createDefaultState(), status: 'empty', detail: 'sin datos previos' };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { state: createDefaultState(), status: 'corrupt', detail: quarantine(storage, raw, error) };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      state: createDefaultState(),
      status: 'corrupt',
      detail: quarantine(storage, raw, new Error('el JSON no es un objeto de estado')),
    };
  }

  return { state: hydrate(parsed), status: 'ok', detail: '' };
}

/* Aparta el texto ilegible y devuelve la descripción del problema. */
function quarantine(storage, raw, error) {
  const key = CORRUPT_KEY_PREFIX + '_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  try {
    storage.setItem(key, raw);
    report('El estado guardado no se pudo leer. Se apartó una copia en ' + key + ' y se arranca en limpio.', error);
    return 'apartado en ' + key;
  } catch (writeError) {
    report('El estado guardado no se pudo leer y tampoco se pudo apartar una copia.', writeError);
    return 'no se pudo apartar';
  }
}

/* Completa lo que falte con la forma por defecto. Un estado guardado
   por una versión anterior de v1 puede no tener todas las claves. */
export function hydrate(parsed) {
  const base = createDefaultState();
  return {
    version: 1,
    settings: { ...base.settings, ...(parsed.settings || {}) },
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts : base.accounts,
    operations: Array.isArray(parsed.operations) ? parsed.operations : base.operations,
    upcoming: Array.isArray(parsed.upcoming) ? parsed.upcoming : base.upcoming,
    concepts: Array.isArray(parsed.concepts) ? parsed.concepts : base.concepts,
    categories: {
      expense: Array.isArray(parsed.categories && parsed.categories.expense) ? parsed.categories.expense : [],
      income: Array.isArray(parsed.categories && parsed.categories.income) ? parsed.categories.income : [],
    },
    budgets: isPlainObject(parsed.budgets) ? parsed.budgets : base.budgets,
    rates: isPlainObject(parsed.rates) ? parsed.rates : base.rates,
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/* Escribe de inmediato. Devuelve true si se guardó. */
export function saveState(state, storage = resolveStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(STATE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    report('No se pudo guardar el estado.', error);
    return false;
  }
}

/* Conecta un store al almacenamiento: escribe con retardo tras cada
   mutación, agrupando ráfagas en una sola escritura.

   Devuelve { flush, detach }. flush escribe lo pendiente ahora mismo;
   sirve para el evento de cierre de la página. */
export function attachPersistence(target, options = {}) {
  const storage = options.storage === undefined ? resolveStorage() : options.storage;
  const delay = options.delay === undefined ? WRITE_DELAY_MS : options.delay;

  let timer = null;
  let pending = null;

  function write() {
    timer = null;
    if (pending === null) return;
    const state = pending;
    pending = null;
    saveState(state, storage);
  }

  function flush() {
    if (timer !== null) clearTimeout(timer);
    write();
  }

  const unsubscribe = target.subscribe((state) => {
    pending = state;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(write, delay);
  });

  function detach() {
    unsubscribe();
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = null;
  }

  return { flush, detach };
}
