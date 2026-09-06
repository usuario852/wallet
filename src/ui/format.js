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

/* El signo que le toca a una operación, para elegir el color del
   monto. Positivo y negativo solo tiñen el monto, nunca el fondo. */
export function amountKindFor(operation) {
  if (operation.type === 'income') return 'positive';
  if (operation.type === 'expense') return 'negative';
  return 'neutral';
}

/* Cómo se antepone el signo en una fila de movimiento. */
export function signFor(operation) {
  if (operation.type === 'income') return 'income';
  if (operation.type === 'expense') return 'expense';
  return null;
}
