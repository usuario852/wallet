import React from 'react';

type P = { size?: number };
const S = (size: number, children: React.ReactNode, fill = false, sw = 1.9) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const IHome = ({ size = 24 }: P) => S(size, <path d="M3.5 10.6 12 4l8.5 6.6V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />, true);
export const IList = ({ size = 24 }: P) => S(size, <path d="M4 7h16M4 12h16M4 17h10" />, false, 1.75);
export const ICal = ({ size = 24 }: P) => S(size, <><rect x="3.5" y="5" width="17" height="15.5" rx="3.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>, false, 1.75);
export const IBars = ({ size = 24 }: P) => S(size, <path d="M5 20V12M12 20V4M19 20v-6" />, false, 1.75);
export const IPlus = ({ size = 22 }: P) => S(size, <path d="M12 5v14M5 12h14" />, false, 2.2);
export const IMove = ({ size = 20 }: P) => S(size, <path d="M4 8h14l-3-3M20 16H6l3 3" />);
export const IChat = ({ size = 20 }: P) => S(size, <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" />);
export const INews = ({ size = 20 }: P) => S(size, <><path d="M4 5h13v14H6a2 2 0 0 1-2-2z" /><path d="M17 9h3v8a2 2 0 0 1-2 2" /><path d="M7 9h7M7 12h7M7 15h4" /></>, false, 1.8);
export const IEye = ({ size = 20, off = false }: P & { off?: boolean }) => S(size, <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />{off && <path d="M4 4l16 16" />}</>, false, 1.8);
export const IX = ({ size = 22 }: P) => S(size, <path d="m6 6 12 12M18 6 6 18" />, false, 2.2);
export const IBack = ({ size = 22 }: P) => S(size, <path d="M15 5l-7 7 7 7" />, false, 2.2);
export const IChevR = ({ size = 18 }: P) => S(size, <path d="m9 6 6 6-6 6" />, false, 2.2);
export const IChevD = ({ size = 16 }: P) => S(size, <path d="M6 9l6 6 6-6" />, false, 2.2);
export const ISearch = ({ size = 18 }: P) => S(size, <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></>, false, 2);
export const ISend = ({ size = 20 }: P) => S(size, <><path d="M12 19V5M6 11l6-6 6 6" /></>, false, 2.2);
export const IDel = ({ size = 22 }: P) => S(size, <><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" /><path d="m12 9 6 6M18 9l-6 6" /></>, false, 1.8);
export const IGear = ({ size = 22 }: P) => S(size, <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>, false, 1.7);
export const ISpark = ({ size = 20 }: P) => S(size, <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />, false, 1.8);
export const IArrowUp = ({ size = 14 }: P) => S(size, <path d="M12 19V5M6 11l6-6 6 6" />, false, 2.4);
export const IArrowDown = ({ size = 14 }: P) => S(size, <path d="M12 5v14M6 13l6 6 6-6" />, false, 2.4);
export const IMood = ({ size = 20 }: P) => S(size, <><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8M9 9.5h.01M15 9.5h.01" /></>, false, 1.8);

// Marca de Wallet: una tarjeta que asoma de un bolsillo.
export function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="9" y="3" width="17" height="12" rx="3" fill="var(--pa)" transform="rotate(12 17 9)" />
      <path d="M4 11.5c0-1.4 1.1-2.5 2.5-2.5h19c1.4 0 2.5 1.1 2.5 2.5V26c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3z" fill="var(--tx)" />
      <circle cx="22.5" cy="19.5" r="2" fill="var(--pg)" />
    </svg>
  );
}

// Glifos de categoría: misma familia y trazo que el resto (contorno 1.8).
const CAT: [RegExp, React.ReactNode][] = [
  [/aliment|comida|restaur|menu|cafe|delivery/, <><path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M7 7h4" /><path d="M16 21V3c2 1.5 3 4 3 7v3h-3" /></>],
  [/supermerc|mercado|bodega|compras/, <><path d="M4 5h2l2 10h10l2-7H7" /><circle cx="10" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></>],
  [/transp|movilid|taxi|pasaje|combust|gasolin/, <><rect x="5" y="3.5" width="14" height="13" rx="3" /><path d="M5 10h14M8 19.5v-3M16 19.5v-3" /><circle cx="8.5" cy="13.2" r=".6" /><circle cx="15.5" cy="13.2" r=".6" /></>],
  [/hogar|casa|alquiler|vivienda|servicio/, <path d="M4 10.5 12 4l8 6.5V20H15v-5H9v5H4z" />],
  [/finanz|banco|tarjeta|deuda|credito|prestamo/, <><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><path d="M3.5 10h17M7 14.5h4" /></>],
  [/suscrip|entreten|ocio|stream|musica|cine/, <><rect x="3.5" y="5" width="17" height="14" rx="3" /><path d="m10.5 9.5 4 2.5-4 2.5z" /></>],
  [/salud|farmac|medic|clinica/, <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8.5v7M8.5 12h7" /></>],
  [/educa|curso|libro|estudio/, <path d="M4 5.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4zM20 5.5h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6z" />],
  [/ropa|moda|vestim/, <path d="M8.5 4 4 7l2 3.5 2-1V20h8V9.5l2 1L20 7l-4.5-3a3.5 3.5 0 0 1-7 0z" />],
  [/sueldo|salario|ingreso|honorar|pago recib/, <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19.5h14" /></>],
  [/regalo|donac/, <><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M12 9v11M3.5 9h17M12 9c-1.5-3-5-3-5-1s3.5 1 5 1c1.5 0 5 1 5-1s-3.5-2-5 1" /></>],
  [/viaje|vuelo|hotel/, <path d="M3 13.5 21 6l-3.5 13-5-4.5-3 3v-5z" />]
];
export function catGlyph(category: string, size = 20): React.ReactNode | null {
  const k = String(category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [re, g] of CAT) if (re.test(k)) return S(size, g, false, 1.8);
  return null;
}
