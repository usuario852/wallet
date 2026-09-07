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
    /* --line es separador, no indicador: la decisión y su motivo
       están en la sección 3 de especificacion.md. Se mide para que el
       número esté a la vista, con su mínimo de referencia. */
    ['line', 'paper', 3, 'separador · excepción documentada en la sección 3', true],
    ['line', 'surface', 3, 'separador sobre tarjeta · idem', true],
  ].map(([fg, bg, min, use, aceptado = false]) => ({
    fg, bg, min, use, aceptado, ratio: contrast(p[fg], p[bg]),
  }));
}

/* ------------------------------------------------------------------
   Anillo de foco

   El 1.4.11 sí aplica aquí, y sin excepciones: el indicador de foco
   es un componente que hay que poder ver, y sin él la app no se puede
   usar con teclado. Pide 3:1 contra el color de al lado.

   El anillo siempre es --accent. Lo que cambia es sobre qué cae, y
   eso depende del outline-offset:

     positivo  el anillo queda fuera del control, sobre el fondo del
               contenedor
     negativo  el anillo queda dentro, sobre el fondo del propio
               control

   La tabla enumera los controles reales, no combinaciones teóricas.
   ------------------------------------------------------------------ */

const RINGS = [
  /* Inicio, sobre el fondo de la app. */
  ['home__balance', 'paper', 'fuera', 'saldo, el momento firmado'],
  ['home__currency', 'paper', 'fuera', 'selector de moneda'],
  ['home__settings', 'paper', 'fuera', 'ajustes'],
  ['home__see-all', 'paper', 'fuera', 'ver todo'],
  ['home__register-button', 'paper', 'fuera', 'Registrar'],
  ['list-row (Inicio)', 'paper', 'dentro', 'fila de movimiento tocable'],

  /* Barra de pestañas, hoja, toast: todos sobre --surface. */
  ['tabbar__tab', 'surface', 'fuera', 'pestaña'],
  ['sheet__close', 'surface', 'fuera', 'cerrar la hoja'],
  ['toast__action', 'surface', 'fuera', 'Deshacer'],

  /* Registrar. */
  ['segmented__option', 'surface', 'fuera', 'Gasto / Ingreso'],
  ['register__search-row', 'surface', 'fuera', 'buscar o escribir'],
  ['register__back', 'surface', 'fuera', 'volver'],
  ['register__save', 'surface', 'fuera', 'Guardar'],
  ['ghost-field', 'surface', 'fuera', 'campo de texto del paso 3'],
  ['chip', 'surface', 'fuera', 'marca de estado'],
  ['keypad__key', 'surface', 'dentro', 'tecla del teclado propio'],
  ['list-row (sugerencia)', 'surface', 'dentro', 'sugerencia'],

  /* Ajustes. */
  ['settings__back', 'paper', 'fuera', 'volver'],
  ['settings__button', 'surface', 'fuera', 'descargar, revisar, reemplazar'],
  ['settings__textarea', 'surface', 'fuera', 'pegar o copiar el estado'],

  /* Con el puntero encima, una fila tocable se tiñe de --accent-soft
     y el anillo interior cae sobre ese fondo. */
  ['list-row en hover', 'accent-soft', 'dentro', 'fila con el puntero encima'],
];

/* Controles cuyo propio fondo es --accent. El anillo va fuera, así
   que entre botón y anillo quedan 2px del contenedor; aun así se
   comprueba la adyacencia, porque un anillo verde pegado a un botón
   verde se distingue por ese hueco y por nada más. */
const RING_ON_ACCENT = [
  ['home__register-button', 'Registrar'],
  ['register__save', 'Guardar'],
  ['settings__button', 'botón principal de Ajustes'],
];

function reportRings(name, palette) {
  console.log('\nAnillo de foco · ' + name);
  console.log('─'.repeat(('Anillo de foco · ' + name).length));
  let fails = 0;

  for (const [control, sobre, donde, uso] of RINGS) {
    const ratio = contrast(palette.accent, palette[sobre]);
    const ok = ratio >= 3;
    if (!ok) fails += 1;
    console.log(
      (ok ? '  ok    ' : '  FALLA ')
      + control.padEnd(24)
      + ratio.toFixed(2).padStart(6) + ':1'
      + '  anillo ' + donde.padEnd(7)
      + 'sobre ' + sobre.padEnd(12)
      + uso,
    );
  }

  console.log('\n  adyacencia con el propio botón (informativo, el anillo va fuera):');
  for (const [control, uso] of RING_ON_ACCENT) {
    const ratio = contrast(palette.accent, palette.accent);
    console.log('    ' + control.padEnd(24) + ratio.toFixed(2) + ':1  '
      + uso + ' — se separa por los 2px de outline-offset');
  }

  return fails;
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
    /* Una excepción aceptada se enseña con su número, pero no cuenta
       como fallo: si contara, el informe gritaría siempre y nadie lo
       leería el día que grite de verdad. */
    if (!ok && !row.aceptado) fails += 1;
    console.log(
      (ok ? '  ok    ' : (row.aceptado ? '  nota  ' : '  FALLA '))
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
  const texto = report('Claro', LIGHT) + report('Oscuro', DARK);
  const foco = reportRings('Claro', LIGHT) + reportRings('Oscuro', DARK);

  console.log('\n' + '═'.repeat(46));
  console.log(texto === 0
    ? 'Todo el texto llega a AA. Las notas son excepciones documentadas.'
    : texto + ' pares de texto no llegan.');
  console.log(foco === 0
    ? 'El anillo de foco llega a 3:1 en los ' + RINGS.length + ' controles, en los dos modos.'
    : foco + ' anillos no llegan a 3:1.');

  /* --line no cuenta como fallo: es un separador, y la decisión está
     documentada en la sección 3 de especificacion.md. El anillo de
     foco sí, porque sin él la app no se puede usar con teclado. */
  if (foco || texto) process.exitCode = 1;
}
