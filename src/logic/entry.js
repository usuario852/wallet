/*
  entry — de lo escrito en el campo a una operación guardable.

  Vive aquí y no en la hoja de Registrar por dos razones: porque es
  una regla del producto y no de la interfaz, y porque los dos
  caminos de guardado —tocar una sugerencia y pulsar Guardar— tienen
  que producir exactamente lo mismo. Si esto viviera dentro de la
  hoja, tarde o temprano habría dos versiones ligeramente distintas.

  Sin DOM: se puede probar entera desde Node.
*/

import { parseEntry, nowLocalISO } from './parse.js';
import { mergedConcepts } from './predict.js';
import { normalize } from './text.js';
import { t } from '../copy.js';

/* Construye el borrador de operación.

     raw         el texto del campo, tal cual
     chosenType  'expense' | 'income', lo que diga el segmento
     suggestion  la sugerencia tocada, o null si se pulsó Guardar
     language    para el concepto de reserva cuando no hay texto
     now         referencia temporal

   Precedencias, en orden:
     · el tipo escrito ("me pagaron") gana al segmento
     · el monto escrito gana al recordado
     · la cuenta escrita gana a la de la sugerencia, y las dos a la
       cuenta por defecto de la moneda

   Nada es obligatorio: sin monto guarda 0, sin concepto guarda el
   nombre del tipo. El campo nunca bloquea. */
export function resolveDraft(state, input = {}) {
  const { raw = '', chosenType = 'expense', suggestion = null, language = 'es' } = input;
  const now = input.now instanceof Date ? input.now : new Date();

  const parsed = parseEntry(raw, {
    accounts: state.accounts,
    now,
    enabledCurrencies: state.settings.enabledCurrencies,
  });

  const type = parsed.type || chosenType;
  const concept = suggestion ? suggestion.text : parsed.concept;

  const category = suggestion ? suggestion.category : categoryFor(state, concept);

  const amountMinor = parsed.amountMinor !== null
    ? parsed.amountMinor
    : (suggestion && suggestion.amountMinor ? suggestion.amountMinor : 0);

  const currency = parsed.currency
    || (suggestion && suggestion.currency)
    || state.settings.activeCurrency;

  const accountId = resolveAccount(state, {
    preferred: parsed.accountId || (suggestion && suggestion.accountId) || null,
    currency,
  });

  return {
    type,
    date: parsed.date || nowLocalISO(now),
    concept: concept || t(language, type === 'income' ? 'income' : 'expense'),
    category,
    amountMinor,
    currency,
    accountId,
  };
}

/* La categoría que la app ya conoce para ese concepto, aprendida o
   del catálogo semilla. Vacía la primera vez que se ve. */
export function categoryFor(state, concept) {
  const needle = normalize(concept);
  if (!needle) return '';
  const match = mergedConcepts(state).find((item) => normalize(item.text) === needle);
  return match ? match.category : '';
}

/* La cuenta en la que cae el movimiento.

   La preferida solo vale si existe, no está archivada y es de la
   misma moneda: guardar soles en una cuenta en dólares descuadraría
   el saldo en silencio, que es la peor forma de fallar. */
export function resolveAccount(state, options = {}) {
  const { preferred = null, currency = null } = options;
  const byId = new Map(state.accounts.map((account) => [account.id, account]));

  const candidate = preferred ? byId.get(preferred) : null;
  if (candidate && !candidate.archived && (!currency || candidate.currency === currency)) {
    return candidate.id;
  }

  const usable = state.accounts.filter((account) => !account.archived && account.kind === 'regular');
  const sameCurrency = usable.find((account) => account.currency === currency);
  if (sameCurrency) return sameCurrency.id;

  return usable.length ? usable[0].id : null;
}
