# Laboratorio de diseño — notas (31 oct 2026)

Abrir con `npm run dev` y `http://localhost:5173/?lab=1`. Referencia: `marea-v21` leída en `Documents/wallet-personal-vercel-marea-v21/public` (solo lectura).
Leyenda: **[H]** hecho verificado · **[O]** hipótesis óptica · **[P]** preferencia artística.

## Tipografía
- [H] v21 cargaba Familjen Grotesk y Schibsted Grotesk, pero el `body` las declaraba en cascada (`"Familjen Grotesk","Schibsted Grotesk"`), así que Schibsted casi nunca se veía: la v21 era Familjen en todo.
- [H] v21: saldo `font-weight:620–680`, `letter-spacing:-.06/-.065em`, `font-feature-settings:"tnum","ss01"` y `tabular-nums lining-nums`. Hoy: 700, −.055em, sin `ss01`.
- [O] La sensación de «más autor» en la v21 viene sobre todo del peso más contenido y del tracking más cerrado del saldo, no de otra familia. S2 lo prueba en vivo.
- [H] El odómetro pone cada dígito en una celda: con familias de tabulares anchas (Cabinet, Schibsted, Onest) el número se ve aireado. El saldo cohesivo (Modo 2) lo resuelve, porque en reposo es texto con kerning.
- [H] Schibsted (S2) y Onest (S6) tienen cifras tan anchas que, a 375 px, «S/ 23,556.92» se corta en los recuadros. El resto de los sistemas cabe.

## Composición y geometría
- [H] El hero de la v21 no era una tarjeta: era texto sobre la página, con la meta a la derecha y una línea degradada debajo. Las tarjetas tenían una esquina más cerrada (`28 28 28 8`, `19 19 19 7`).
- [H] Hoy todo es tarjeta: hero, recuadros, deudas, agenda, cada día de Movimientos y cada bloque de Análisis. La coherencia es alta, pero la jerarquía es plana.
- [O] El «7/10» viene de esa planitud: todas las superficies pesan lo mismo y nada manda después del saldo.
- [P] A unifica los radios y conserva la tarjeta. B hace del color del banco el suelo del que emerge el resto. C quita las cajas a todo lo que no es dinero en cuentas.

## Marca, color y movimiento
- [H] Los patrones `--hm` existen para Wallet y para los 13 bancos (data-URI SVG). Las variantes cambian su escala o posición, nunca los quitan.
- [H] `<Mark />` no se redibuja. B solo le pasa otros colores en la cabecera (`--pa` = `--dot`).
- [H] Los 6 pares de color de cada paleta nueva, en claro y oscuro, pasan AA. El mínimo medido es 4.98:1 (B claro, `+` blanco sobre cobre).
- [O] El naipe ya tiene buena física. En B se inclina y sube; en C, el mazo vertical hace legible el saldo de cada cuenta sin tocar.

## Aislamiento
- [H] `src/lab/mode.ts` se importa primero en `main.tsx`. Con `?lab=1`, cambia `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` y `serviceWorker.register` por versiones en memoria o bloqueadas, antes de que `store.ts` lea nada. `store.ts` y `net.ts` además usan memoria explícitamente.
- [H] `test/lab-isolation.test.ts` fallaba (3 de 6) al desactivar los bloqueos a propósito; con ellos activos pasa.
