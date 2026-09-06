import './ico.css';

/*
  ico — un glifo del sprite propio.

  No se usan emojis en ninguna parte de la interfaz. Todo icono
  sale de /icons.svg, que se sirve desde public/ y hereda el color
  con currentColor.

    ico('buscar')
    ico('alimentacion', { size: 32, title: 'Alimentación' })
*/

export const GLYPHS = [
  'alimentacion', 'transporte', 'servicios', 'salud',
  'educacion', 'ocio', 'hogar', 'compras',
  'cuenta', 'reserva', 'entrante', 'saliente',
  'buscar', 'ajustes', 'cerrar', 'deshacer',
];

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

export function ico(name, options = {}) {
  const { size = 24, title = '' } = options;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'ico');
  svg.setAttribute('viewBox', '0 0 24 24');
  if (size !== 24) {
    svg.style.width = `${size}px`;
    svg.style.height = `${size}px`;
  }

  if (title) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', title);
    const titleEl = document.createElementNS(SVG_NS, 'title');
    titleEl.textContent = title;
    svg.appendChild(titleEl);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }

  const use = document.createElementNS(SVG_NS, 'use');
  const href = `/icons.svg#i-${name}`;
  use.setAttribute('href', href);
  use.setAttributeNS(XLINK_NS, 'xlink:href', href);
  svg.appendChild(use);

  return svg;
}
