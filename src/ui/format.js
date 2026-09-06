/*
  format — cómo se escribe el dinero en pantalla.

  Una sola función para toda la app: si el formato cambia, cambia en
  un sitio. Las cifras se pintan siempre con la clase .money, que
  aporta las tabulares; aquí solo se decide el texto.

  Todo entra en unidades menores, como entero. Nada de esto redondea
  dinero: los céntimos se muestran o no, pero nunca se pierden.
*/

const SYMBOLS = new Map([
  ['PEN', 'S/'],
  ['USD', '$'],
  ['EUR', '€'],
]);

/* El símbolo de una moneda, o su código si no tiene uno propio. */
export function currencySymbol(currency) {
  if (!currency) return '';
  return SYMBOLS.get(currency) || currency;
}

/* Formatea un importe.

     minor     entero en unidades menores
     currency  'PEN' | 'USD' | ... | null para no poner símbolo

   opciones:
     cents   'always' (por defecto) fuerza los dos decimales
             'auto' los omite cuando el importe es redondo
     sign    null      sin signo, el valor se muestra en absoluto
             'auto'    − si es negativo, + si es positivo
             'expense' siempre −
             'income'  siempre +

   El signo va separado del número por un espacio fino de lectura,
   como en la especificación: "− S/ 18.00". */
export function money(minor, currency = null, options = {}) {
  const { cents = 'always', sign = null } = options;
  const value = Math.trunc(Number(minor) || 0);
  const absolute = Math.abs(value);

  const units = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const showCents = cents === 'always' || remainder !== 0;

  const digits = units.toLocaleString('es-PE')
    + (showCents ? '.' + String(remainder).padStart(2, '0') : '');

  const symbol = currency ? currencySymbol(currency) + ' ' : '';

  let prefix = '';
  if (sign === 'expense') prefix = '− ';
  else if (sign === 'income') prefix = '+ ';
  else if (sign === 'auto') prefix = value < 0 ? '− ' : (value > 0 ? '+ ' : '');

  return prefix + symbol + digits;
}

/* Cómo se pinta el monto de una operación, sea del tipo que sea.

   Existe para que ninguna pantalla vuelva a escribir
   money(operation.amountMinor, operation.currency). Un cambio de
   divisa no tiene amountMinor ni currency: tiene un importe de salida
   y otro de entrada, en monedas distintas. Esa fórmula lo pintaba
   como un gasto de 0.00.

   Devuelve { text, kind }:

     expense      − importe, en --negative
     income       + importe, en --positive
     transfer     el importe que se mueve, sin signo: el dinero no
                  entra ni sale, cambia de sitio
     fx           el importe que sale, en su moneda, sin signo, por
                  la misma razón
     adjustment   el signo lo pone el valor, y el color no juzga

   Positivo y negativo siguen tiñendo solo el monto, nunca el fondo. */
export function operationAmount(operation) {
  if (!operation) return { text: '', kind: 'muted' };

  if (operation.type === 'fx') {
    const salida = operation.fromAmountMinor || 0;
    const entrada = operation.toAmountMinor || 0;
    if (!salida && !entrada) return { text: '—', kind: 'muted' };
    return { text: money(salida, operation.fromCurrency || null), kind: 'neutral' };
  }

  if (operation.type === 'transfer') {
    return { text: money(operation.amountMinor || 0, operation.currency || null), kind: 'neutral' };
  }

  if (operation.type === 'income') {
    return {
      text: money(operation.amountMinor || 0, operation.currency || null, { sign: 'income' }),
      kind: 'positive',
    };
  }

  if (operation.type === 'expense') {
    return {
      text: money(operation.amountMinor || 0, operation.currency || null, { sign: 'expense' }),
      kind: 'negative',
    };
  }

  return {
    text: money(operation.amountMinor || 0, operation.currency || null, { sign: 'auto' }),
    kind: 'neutral',
  };
}

/* La moneda en la que vive una operación. Un fx vive en dos; se
   devuelve la de salida, que es la que se muestra. */
export function operationCurrency(operation) {
  if (!operation) return null;
  if (operation.type === 'fx') return operation.fromCurrency || null;
  return operation.currency || null;
}
