// Sistemas tipográficos del laboratorio. Las hojas se cargan solo al elegirlas.
// Licencias: Google Fonts (OFL) y Fontshare (licencia gratuita de ITF, uso comercial permitido).

const G = (f: string) => 'https://fonts.googleapis.com/css2?' + f + '&display=swap';
const FS = (f: string) => 'https://api.fontshare.com/v2/css?' + f + '&display=swap';

export type FontSystem = {
  id: string; name: string; why: string; href: string[];
  disp: string; ui: string; fig: string; // display/saldos · interfaz · cifras de filas
  dw: number; ls: string; feat: string; uw: number;
};

export const FONTS: FontSystem[] = [
  { id: 's1', name: 'S1 · Control actual', why: 'Familjen Grotesk tal como está hoy: 700 en el saldo, −0.055em.', href: [], disp: "'Familjen Grotesk'", ui: "'Familjen Grotesk'", fig: "'Familjen Grotesk'", dw: 700, ls: '-.055em', feat: 'normal', uw: 400 },
  { id: 's2', name: 'S2 · Herencia Marea', why: 'Hipótesis de la v21: Familjen más contenida (640, ss01) y Schibsted para leer.', href: [G('family=Familjen+Grotesk:wght@400..700&family=Schibsted+Grotesk:wght@400..800')], disp: "'Familjen Grotesk'", ui: "'Schibsted Grotesk'", fig: "'Schibsted Grotesk'", dw: 640, ls: '-.062em', feat: '"ss01" 1, "lnum" 1', uw: 400 },
  { id: 's3', name: 'S3 · Grotesca expresiva', why: 'Bricolage con eje óptico para el saldo; Geist técnica y limpia en la interfaz.', href: [G('family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Geist:wght@400..700')], disp: "'Bricolage Grotesque'", ui: "'Geist'", fig: "'Geist'", dw: 660, ls: '-.045em', feat: '"lnum" 1', uw: 400 },
  { id: 's4', name: 'S4 · Precisión suiza', why: 'General Sans en cifras grandes, Instrument Sans neutra y nítida en todo lo demás.', href: [FS('f[]=general-sans@500,600,700'), G('family=Instrument+Sans:wght@400..700')], disp: "'General Sans'", ui: "'Instrument Sans'", fig: "'General Sans'", dw: 600, ls: '-.045em', feat: 'normal', uw: 400 },
  { id: 's5', name: 'S5 · Instrumento técnico', why: 'Space Grotesk dibuja cifras de instrumento; Satoshi da una interfaz cristalina.', href: [G('family=Space+Grotesk:wght@400..700'), FS('f[]=satoshi@400,500,700')], disp: "'Space Grotesk'", ui: "'Satoshi'", fig: "'Space Grotesk'", dw: 600, ls: '-.05em', feat: 'normal', uw: 500 },
  { id: 's6', name: 'S6 · Humanista moderna', why: 'Epilogue cálida en titulares y saldo; Onest muy legible en cuerpos pequeños.', href: [G('family=Epilogue:wght@400..800&family=Onest:wght@400..700')], disp: "'Epilogue'", ui: "'Onest'", fig: "'Onest'", dw: 650, ls: '-.05em', feat: 'normal', uw: 400 },
  { id: 's7', name: 'S7 · Autor: Cabinet + Switzer', why: 'Cabinet Grotesk tiene ceros y treses con carácter; Switzer, una suiza tranquila, sostiene la lectura.', href: [FS('f[]=cabinet-grotesk@500,700,800&f[]=switzer@400,500,600,700')], disp: "'Cabinet Grotesk'", ui: "'Switzer'", fig: "'Switzer'", dw: 800, ls: '-.04em', feat: 'normal', uw: 400 },
  { id: 's8', name: 'S8 · Autor: Funnel', why: 'Una sola familia con dos cortes: Display para el saldo, Sans para leer. Unidad sin monotonía.', href: [G('family=Funnel+Display:wght@400..800&family=Funnel+Sans:wght@400..800')], disp: "'Funnel Display'", ui: "'Funnel Sans'", fig: "'Funnel Sans'", dw: 620, ls: '-.04em', feat: 'normal', uw: 400 }
];

const loaded = new Set<string>();
export function loadFont(sys: FontSystem) {
  sys.href.forEach((h) => {
    if (loaded.has(h)) return;
    loaded.add(h);
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = h; l.dataset.lab = '1';
    document.head.appendChild(l);
  });
}
export function fontVars(sys: FontSystem): Record<string, string> {
  const stack = ', system-ui, sans-serif';
  return { '--lab-disp': sys.disp + stack, '--lab-ui': sys.ui + stack, '--lab-fig': sys.fig + stack, '--lab-dw': String(sys.dw), '--lab-ls': sys.ls, '--lab-feat': sys.feat, '--lab-uw': String(sys.uw) };
}
