/*
  predict — capa 1 del autocompletado: índice local, 0ms, sin red.

  Sección 5:

    puntaje = frecuencia × recencia × coincidencia_horaria × calidad_prefijo

    frecuencia         veces registrado, log-escalado
    recencia           decaimiento exponencial, vida media 30 días
    coincidencia_hor.  1.6 si la hora actual está a ±2h de la hora típica
    calidad_prefijo    3.0 exacto · 2.0 inicio de palabra · 1.0 subcadena

  Máximo 5 resultados. Cubre alrededor del 85% de los casos.

  El debounce de 120ms vive en la interfaz, no aquí: esta función es
  pura y se puede llamar tantas veces como haga falta.

  La capa 3 (modelo) no existe todavía. Llega en la fase 6.
*/

import { prefixQuality, normalize } from './text.js';
import { SEED_CONCEPTS } from './seed.js';
import { upsertConcept } from '../state/store.js';

/* Vida media de la recencia, en días. */
export const HALF_LIFE_DAYS = 30;

/* Un concepto sin fecha de uso —los del catálogo semilla— no puede
   tener recencia 0, o su puntaje sería 0 y nunca aparecería. Se le da
   el equivalente a unos setenta días sin usar: presente, pero al
   final de la cola. */
export const UNUSED_RECENCY = 0.2;

/* Ventana de la coincidencia horaria, en horas, y su premio. */
export const HOUR_WINDOW = 2;
export const HOUR_BONUS = 1.6;

/* Cuántas sugerencias se muestran. */
export const MAX_SUGGESTIONS = 5;

/* Caché de la última cuenta usada por concepto, indexado por la
   identidad del arreglo de operaciones: al mutar operations el
   arreglo cambia y el caché falla solo. */
const accountCache = new WeakMap();

/* ------------------------------------------------------------------
   Factores
   ------------------------------------------------------------------ */

/* Veces registrado, log-escalado: la diferencia entre 1 y 3 registros
   pesa mucho más que entre 40 y 42, que es como funciona el hábito. */
export function frequencyFactor(count) {
  return Math.log(1 + Math.max(0, count || 0));
}

/* Decaimiento exponencial con vida media de 30 días. Lo de hace un
   mes vale la mitad; lo de hace tres, un octavo. */
export function recencyFactor(lastUsed, now) {
  if (!lastUsed) return UNUSED_RECENCY;
  const then = Date.parse(lastUsed);
  if (!Number.isFinite(then)) return UNUSED_RECENCY;
  const days = (now.getTime() - then) / 86400000;
  if (days <= 0) return 1;
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

/* La hora típica de un concepto es la de mayor peso en su histograma.
   Un almuerzo vive a la una; a la una vale más que a medianoche. */
export function typicalHour(histogram) {
  if (!Array.isArray(histogram) || histogram.length !== 24) return null;
  let best = -1;
  let bestHour = null;
  for (let hour = 0; hour < 24; hour += 1) {
    if (histogram[hour] > best) {
      best = histogram[hour];
      bestHour = hour;
    }
  }
  return best > 0 ? bestHour : null;
}

/* 1.6 si la hora actual está a ±2h de la típica. La distancia es
   circular: las 23:00 están a dos horas de la 1:00. */
export function hourFactor(histogram, now) {
  const typical = typicalHour(histogram);
  if (typical === null) return 1;
  const current = now.getHours();
  const raw = Math.abs(current - typical);
  const distance = Math.min(raw, 24 - raw);
  return distance <= HOUR_WINDOW ? HOUR_BONUS : 1;
}

/* El puntaje completo. 0 significa que no calza y no debe mostrarse. */
export function scoreConcept(concept, query, now) {
  const quality = prefixQuality(query, concept.text);
  if (quality === 0) return 0;
  return frequencyFactor(concept.count)
    * recencyFactor(concept.lastUsed, now)
    * hourFactor(concept.hourHistogram, now)
    * quality;
}

/* ------------------------------------------------------------------
   Sugerencias
   ------------------------------------------------------------------ */

/* Los conceptos del usuario y los del catálogo semilla, en una sola
   lista. Si el usuario ya registró un concepto que también está en el
   catálogo, gana el suyo: el catálogo solo rellena huecos. */
export function mergedConcepts(state) {
  const own = state.concepts || [];
  const seen = new Set(own.map((concept) => normalize(concept.text)));
  const merged = [...own];
  for (const seed of SEED_CONCEPTS) {
    if (seen.has(normalize(seed.text))) continue;
    merged.push(seed);
  }
  return merged;
}

/* Última cuenta usada por concepto. El modelo de la sección 6 no
   guarda la cuenta dentro de concepts, así que se deriva del
   historial en vez de añadir un campo que la especificación no tiene. */
export function lastAccountByConcept(state) {
  const cached = accountCache.get(state.operations);
  if (cached) return cached;

  const map = new Map();
  /* De la más antigua a la más nueva: la última escritura gana. */
  for (const operation of state.operations) {
    if (operation.voided || !operation.accountId || !operation.concept) continue;
    map.set(normalize(operation.concept), operation.accountId);
  }

  const frozen = Object.freeze(map);
  accountCache.set(state.operations, frozen);
  return frozen;
}

/* Hasta cinco sugerencias para lo escrito, ya ordenadas.

   query vacía devuelve lo más frecuente y reciente, que es lo que
   convierte el registro en dos taps: abrir la hoja y tocar una fila.

   Cada sugerencia trae ya resuelto lo que la fila necesita pintar:
   concepto, categoría, monto probable y cuenta. */
export function suggest(state, query, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const limit = options.limit || MAX_SUGGESTIONS;
  const accounts = lastAccountByConcept(state);
  const accountById = new Map((state.accounts || []).map((account) => [account.id, account]));

  const scored = [];
  for (const concept of mergedConcepts(state)) {
    const score = scoreConcept(concept, query, now);
    if (score <= 0) continue;

    const accountId = accounts.get(normalize(concept.text)) || null;
    const account = accountId ? accountById.get(accountId) : null;

    scored.push({
      text: concept.text,
      category: concept.category || '',
      currency: concept.currency || (account ? account.currency : null),
      amountMinor: concept.lastAmountMinor || null,
      accountId: account && !account.archived ? accountId : null,
      accountName: account && !account.archived ? account.name : '',
      seed: Boolean(concept.seed),
      score,
    });
  }

  scored.sort((left, right) => (
    right.score - left.score || left.text.localeCompare(right.text, 'es')
  ));

  return scored.slice(0, limit);
}

/* ------------------------------------------------------------------
   Aprendizaje
   ------------------------------------------------------------------ */

/* Registra que un concepto se usó. Sin pantalla de configuración y
   sin confirmación: si el sistema sugirió una categoría y el usuario
   la cambió antes de guardar, lo que se guarda es la del usuario, y
   esa corrección gana peso permanente para ese concepto.

   Se llama después de guardar la operación, con la operación ya
   normalizada. */
export function recordUsage(store, operation) {
  const text = String(operation.concept || '').trim();
  if (!text) return null;

  /* Solo se aprende de gastos e ingresos. Una transferencia o un
     cambio de divisa no son un concepto que el usuario vaya a volver
     a escribir, y además no tienen amountMinor: recordarlos como
     "monto 0" envenenaría la sugerencia. */
  if (operation.type !== 'expense' && operation.type !== 'income') return null;

  const hour = hourOf(operation.date);
  return upsertConcept(store, {
    text,
    category: operation.category || '',
    currency: operation.currency || null,
    lastUsed: operation.date || '',
    lastAmountMinor: operation.amountMinor || 0,
    hour,
  });
}

/* La hora de una fecha ISO local, sin construir un Date: la cadena
   ya la lleva escrita y parsearla solo invita a husos horarios. */
export function hourOf(isoLocal) {
  const match = /T(\d{2}):/.exec(String(isoLocal || ''));
  return match ? Number(match[1]) : null;
}

/* La compleción para el texto fantasma: el resto de la mejor
   sugerencia que empiece por lo escrito.

   Solo completa desde el principio. Que "sofia" sugiera "Almacén
   Sofía" en la lista está bien; que se lo escriba dentro del campo,
   no. */
export function ghostCompletion(state, query, options = {}) {
  const typed = String(query || '');
  if (!typed.trim()) return '';

  const needle = normalize(typed);
  for (const suggestion of suggest(state, typed, { ...options, limit: MAX_SUGGESTIONS })) {
    const candidate = normalize(suggestion.text);
    if (candidate.length > needle.length && candidate.startsWith(needle)) {
      return suggestion.text.slice(typed.length);
    }
  }
  return '';
}
