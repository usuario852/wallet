/*
  Contraste WCAG de la paleta.

    npm run contrast

  Comprueba cada par texto/superficie que la app usa de verdad, no
  todas las combinaciones posibles. AA pide 4.5:1 para texto normal y
  3:1 para texto grande (>=24px, o >=18.66px en negrita) y para los
  bordes de un control.

  Sin dependencias: la fórmula de luminancia relativa está en la
  propia norma.
*/

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

const LIGHT = {
  paper: '#F4F2EC',
  surface: '#FBFAF6',
  ink: '#161915',
  'ink-soft': '#6B706A',
  line: '#E3E0D6',
  accent: '#1E4436',
  'accent-soft': '#E7EDE9',
  pledge: '#9E5334',
  positive: process.env.POSITIVE_LIGHT || '#2C6B4A',
  negative: process.env.NEGATIVE_LIGHT || '#8C3B33',
};

const DARK = {
  paper: '#141613',
  surface: '#1D211E',
  ink: '#E9E7E0',
  'ink-soft': '#91968E',
  line: '#2C302B',
  accent: '#7BAE9C',
  'accent-soft': '#22302C',
  pledge: '#C89268',
  positive: process.env.POSITIVE_DARK || '#8FBE9B',
  negative: process.env.NEGATIVE_DARK || '#D28C80',
};

/* Los pares que la interfaz usa de verdad, con el mínimo que les
   toca según su tamaño. */
function pairs(p) {
  return [
    ['ink', 'paper', 4.5, 'texto principal sobre el fondo'],
    ['ink', 'surface', 4.5, 'texto principal sobre tarjeta u hoja'],
    ['ink-soft', 'paper', 4.5, 'texto secundario sobre el fondo'],
    ['ink-soft', 'surface', 4.5, 'texto secundario sobre tarjeta'],
    ['accent', 'paper', 4.5, 'texto de acción sobre el fondo'],
    ['accent', 'surface', 4.5, 'texto de acción sobre tarjeta'],
    ['accent', 'accent-soft', 4.5, 'chip y segmento seleccionados'],
    ['pledge', 'paper', 4.5, 'comprometido, por cobrar, disponible bajo cero'],
    ['pledge', 'surface', 4.5, 'lo mismo sobre tarjeta'],
    ['positive', 'paper', 3, 'monto de ingreso, 17px semibold'],
    ['positive', 'surface', 3, 'monto de ingreso sobre tarjeta'],
    ['negative', 'paper', 3, 'monto de gasto, 17px semibold'],
    ['negative', 'surface', 3, 'monto de gasto sobre tarjeta'],
    ['surface', 'accent', 4.5, 'texto del botón Registrar y Guardar'],
    ['ink', 'accent-soft', 4.5, 'texto sobre estado seleccionado'],
    ['line', 'paper', 3, 'separadores y bordes de control'],
    ['line', 'surface', 3, 'bordes sobre tarjeta'],
  ].map(([fg, bg, min, use]) => ({
    fg, bg, min, use, ratio: contrast(p[fg], p[bg]),
  }));
}

/* Distancia de tono, para que dos señales distintas no se confundan.
   No es WCAG: es la regla de la sección 10 de filosofia.md, que pide
   que el color nunca sea la única señal y que cada uno tenga trabajo
   propio. */
function hue(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
}

function report(name, palette) {
  console.log('\n' + name);
  console.log('─'.repeat(name.length));
  let fails = 0;

  for (const row of pairs(palette)) {
    const ok = row.ratio >= row.min;
    if (!ok) fails += 1;
    console.log(
      (ok ? '  ok    ' : '  FALLA ')
      + (row.fg + ' / ' + row.bg).padEnd(24)
      + row.ratio.toFixed(2).padStart(6) + ':1'
      + '  (min ' + row.min + ')  '
      + row.use,
    );
  }

  console.log('\n  tonos: '
    + ['accent', 'pledge', 'positive', 'negative']
      .map((k) => k + ' ' + hue(palette[k]) + '°').join('  ·  '));

  const separacion = Math.min(
    Math.abs(hue(palette.pledge) - hue(palette.negative)),
    Math.abs(hue(palette.accent) - hue(palette.positive)),
  );
  console.log('  separación mínima entre señales: ' + separacion + '°');

  return fails;
}

/* El informe solo corre al ejecutar el archivo. Importarlo desde otro
   sitio da las funciones y nada más. */
if (process.argv[1] && process.argv[1].endsWith('contrast.mjs')) {
  const fallos = report('Claro', LIGHT) + report('Oscuro', DARK);
  console.log('\n' + '═'.repeat(46));
  console.log(fallos === 0
    ? 'Todos los pares de texto llegan a AA.'
    : fallos + ' pares no llegan.');
  if (fallos) process.exitCode = 1;
}
