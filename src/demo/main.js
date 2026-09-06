import '../design/tokens.css';
import './demo.css';

import { ico, GLYPHS } from '../ui/components/ico.js';
import { createChip } from '../ui/components/chip.js';
import { createSegmented } from '../ui/components/segmented.js';
import { createListRow } from '../ui/components/list-row.js';
import { createKeypad } from '../ui/components/keypad.js';
import { createToast } from '../ui/components/toast.js';
import { createSheet } from '../ui/components/sheet.js';

/*
  Página de demostración de Fase 1.

  Muestra cada componente base en modo claro y en modo oscuro, y
  los 16 glifos a 24px. No hay pantallas, no hay estado, no hay API.
*/

const STATE_LABELS = [
  'normal', 'apuro', 'antojo', 'social', 'aburrido', 'celebrando', 'necesario',
];

const GLYPH_LABEL = {
  alimentacion: 'alimentación', transporte: 'transporte', servicios: 'servicios',
  salud: 'salud', educacion: 'educación', ocio: 'ocio', hogar: 'hogar',
  compras: 'compras', cuenta: 'cuenta', reserva: 'reserva', entrante: 'entrante',
  saliente: 'saliente', buscar: 'buscar', ajustes: 'ajustes', cerrar: 'cerrar',
  deshacer: 'deshacer',
};

function elem(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) Object.assign(node, props);
  children.forEach((child) => {
    if (child == null) return;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

function section(title, ...children) {
  return elem(
    'section', { className: 'section' },
    elem('h3', { className: 'section__title', textContent: title }),
    ...children,
  );
}

function note(text) {
  return elem('p', { className: 'section__note', textContent: text });
}

function glyphGrid() {
  const grid = elem('div', { className: 'glyphs' });
  GLYPHS.forEach((name) => {
    grid.append(elem(
      'div', { className: 'glyph' },
      ico(name, { size: 24, title: GLYPH_LABEL[name] }),
      elem('span', { textContent: GLYPH_LABEL[name] }),
    ));
  });
  return grid;
}

function icoSection() {
  return section(
    'ico · glifo suelto',
    elem(
      'div', { className: 'row' },
      ico('buscar', { size: 24 }),
      ico('ajustes', { size: 24 }),
      ico('reserva', { size: 32 }),
      ico('deshacer', { size: 32 }),
    ),
    note('Hereda el color con currentColor. 24px es la caja base.'),
  );
}

function segmentedSection() {
  const kind = createSegmented({
    options: [{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }],
    value: 'expense',
  });
  const range = createSegmented({
    options: ['Semana', 'Mes', '3M', 'Año'],
    value: 'Mes',
  });
  return section(
    'segmented · selección única',
    elem('div', { className: 'stack' }, kind.el, range.el),
  );
}

function chipSection() {
  const row = elem('div', { className: 'row' });
  const chips = [];
  STATE_LABELS.forEach((label) => {
    const chip = createChip({
      label,
      onToggle: (selected) => {
        if (!selected) return;
        chips.forEach((other) => {
          if (other !== chip) other.setSelected(false);
        });
      },
    });
    chips.push(chip);
    row.append(chip.el);
  });
  return section(
    'chip · marca de estado',
    row,
    note('Solo tipografía. Seleccionado: fondo --accent-soft, texto --accent, +4px.'),
  );
}

function listRowSection() {
  const card = elem('div', { className: 'card' });
  card.append(
    createListRow({
      icon: 'alimentacion', title: 'Almuerzo',
      subtitle: 'Alimentación · BBVA · antojo',
      amount: '− S/ 18.00', amountKind: 'negative',
    }),
    createListRow({
      icon: 'servicios', title: 'Netflix',
      subtitle: 'Servicios · BBVA',
      amount: '− S/ 34.90', amountKind: 'negative',
    }),
    createListRow({
      icon: 'entrante', title: 'Sueldo',
      subtitle: '30 mar · cada mes',
      amount: '+ S/ 3,500.00', amountKind: 'positive',
    }),
    createListRow({
      title: 'Almuerzo con equipo',
      subtitle: 'Alimentación · Efectivo',
      amount: 'S/ 45.00', amountKind: 'neutral',
      onClick: () => {},
    }),
  );
  return section(
    'list-row · fila de lista',
    card,
    note('El monto llega ya formateado. positive y negative solo tiñen el texto del monto.'),
    note('La última fila no declara categoría: cae al glifo de cuenta para no romper la alineación.'),
  );
}

function keypadSection() {
  const readout = elem('div', { className: 'card money', textContent: '0' });
  let buffer = '';
  const pad = createKeypad({
    onKey: (key) => {
      if (key === 'back') buffer = buffer.slice(0, -1);
      else if (key === '.' && buffer.includes('.')) { /* ignora segundo punto */ }
      else buffer += key;
      readout.textContent = buffer || '0';
    },
  });
  return section(
    'keypad · teclado propio',
    elem('div', { className: 'stack' }, readout, pad.el),
  );
}

function toastSection() {
  const layer = elem('div', { className: 'toast-layer' });
  const trigger = elem('button', {
    className: 'demo-button', type: 'button', textContent: 'Guardar un gasto',
  });
  trigger.addEventListener('click', () => {
    layer.replaceChildren();
    const toast = createToast({
      message: 'Guardado · S/ 18.00',
      actionLabel: 'Deshacer',
      chips: ['normal', 'apuro', 'antojo', 'social', 'aburrido'],
      onChip: () => {},
      onAction: () => {},
    });
    layer.append(toast.el);
  });
  return section(
    'toast · confirmación con deshacer',
    elem('div', { className: 'row' }, trigger),
    layer,
    note('Ventana de deshacer de 4s. Lleva la fila de chips de marca de estado.'),
  );
}

function sheetSection(pane) {
  const trigger = elem('button', {
    className: 'demo-button', type: 'button', textContent: 'Abrir hoja',
  });
  trigger.addEventListener('click', () => {
    const sheet = createSheet({ title: 'Registrar', container: pane });
    const inner = createSegmented({
      options: [{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }],
      value: 'expense',
    });
    const pad = createKeypad({ onKey: () => {} });
    sheet.body.append(
      elem('div', { className: 'stack' }, inner.el, pad.el),
    );
    sheet.open();
  });
  return section(
    'sheet · hoja inferior',
    elem('div', { className: 'row' }, trigger),
    note('Sube con resorte, radio 24px arriba, sombra --shadow-sheet. Cierra con fondo, X o Escape.'),
  );
}

function buildPane(modifier, heading) {
  // El tema sale de data-theme: los mismos bloques que usará el ajuste
  // de la sección 6. La demo no redeclara ninguna paleta.
  const pane = elem('div', { className: 'pane' });
  pane.dataset.theme = modifier;
  pane.append(
    elem('h2', { className: 'pane__heading', textContent: heading }),
    section('16 glifos · 24px', glyphGrid()),
    icoSection(),
    segmentedSection(),
    chipSection(),
    listRowSection(),
    keypadSection(),
    toastSection(),
    sheetSection(pane),
  );
  return pane;
}

function start() {
  const mount = document.getElementById('demo');
  mount.className = 'demo';
  mount.append(
    buildPane('light', 'Modo claro'),
    buildPane('dark', 'Modo oscuro'),
  );
}

start();
