# Laboratorio de diseño — notas (31 oct 2026)

Abrir con `npm run dev` y `http://localhost:5173/?lab=1`. Referencia: `marea-v21` leída en `Documents/wallet-personal-vercel-marea-v21/public` (solo lectura).
Leyenda: **[H]** hecho verificado · **[O]** hipótesis óptica · **[P]** preferencia artística.

## Tipografía
- [H] v21 cargaba Familjen Grotesk y Schibsted Grotesk, pero el `body` las declaraba en cascada (`"Familjen Grotesk","Schibsted Grotesk"`), así que Schibsted casi nunca se veía: la v21 era Familjen en todo.
- ~~[H] v21: saldo 620–680, −.06em, `ss01`~~ **Corregido el 31 oct**: eso salía de leer el CSS, no la cascada. Renderizada con datos inventados, la v21 pinta el saldo en Familjen **700, 44.85 px, −.055em**, `lnum tnum`: el mismo peso y tracking que hoy (700, −.055em, 52 px). La hipótesis de S2 queda sin fundamento.
- [H] Medido en pantalla (390 px), lo que sí difiere es la **escala y la tinta**: en la v21, el símbolo `S/` va a 0.38 del saldo con 64 % de opacidad y los decimales a 0.48 con peso 500 y 50 %. Las etiquetas van en mayúsculas de 8.5–9 px con tracking +.07em y 44 % de tinta; los nombres de fila a 12.5 px y los detalles a 9.5 px, con 50 % de tinta del mismo verde. Hoy todo va de 13 a 15 px, con grises sólidos.
- [O] El carácter «de autor» de la v21 viene del contraste extremo de escala (cifras grandes frente a texto diminuto) y de una sola tinta en varias opacidades, más que de la familia. Pero sus tamaños de 8.5–9.5 px y sus tintas al 44–50 % (unos 2.6–3:1) no pasan AA: hay que traducir el principio, no copiar los valores.
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

## B+C (31 oct 2026)
- [P] Toma de B la banda de color hasta el borde con su labio asimétrico, y de C el mazo vertical, el libro mayor (reglas, sin cajas), las fechas fijas y la barra anclada. El mazo ahora emerge del labio, como los naipes de B.
- [H] Paleta Wallet: abeto `#173F37` y cobre de B sobre el papel y la tinta de C. Contraste mínimo 4.98:1 (blanco sobre cobre en el `+`). Con banco, la banda toma el color del banco y la página queda en papel.
- [H] Las reglas de C cubren B+C con `:is([data-lab-variant=c],[data-lab-variant=bc])`; el bloque B+C de `lab.css` solo añade la banda y lo que se monta sobre ella. En la banda, las pestañas son subrayadas en la tinta de la banda.
- [H] Corregido de paso en C (y B+C): «Preguntar» se salía de su botón; las columnas pasan a 1.3 / 1 / 1.12 y caben de 375 a 430 px con S1, S2, S6 y S7.
- [H] Mazo compacto en B+C: cada naipe deja 44 px visibles (antes 48), el elegido mide 72 (antes 88), «+N» 44 y el mazo sube 12 px más sobre el labio. Los recuadros de Inicio suben unos 40 px.

## Auditoría frente a los briefs (31 oct 2026)
Fuentes: `marea_prompt_maestro_definitivo`, `MAREA_PROMPT_MAESTRO_CLAUDE_CODE.md` y `gemini-code-…md`. Evidencia: `wallet-qa/v21cmp/` (v21, Original y B+C lado a lado) y `wallet-qa/gris/` (las 5 direcciones en escala de grises).
- **Cumple:** rama aislada; `api/`, `.env` y Vercel sin tocar; aislamiento del store con 6 pruebas negativas; fixtures peruanos; Original como control exacto; `--hm` y `<Mark />` intactos; `.tiles` cohesionado; HUD oculto y restablecer; 8 sistemas cargados bajo demanda; saldo cohesivo; 375–430 px, oscuro y movimiento reducido.
- **Parcial:** A se distingue poco del Original (en gris son casi iguales); falta una interacción por pantalla en B (Movimientos) y en C (Movimientos solo tiene fechas fijas); el saldo cohesivo no se probó al cambiar de moneda; la cobertura de glifos no se verificó por fuente; la paridad con la v21 se salta sin `QA_DIR`; push de la rama, autorizado por el usuario para la vista previa.
- **No cumple:** (1) geometría: B se reconoce en gris solo por la banda; en Movimientos y Análisis sigue la gramática de tarjetas del Original. C y B+C conservan el selector de moneda en píldora; (2) C y B+C sustituyen el abanico de naipes por un mazo vertical; el usuario quiere el abanico horizontal; (3) los sistemas tipográficos no son arquitecturas completas: no definen escala, interlineado, jerarquía de títulos y etiquetas ni reglas de numerales; (4) no se usan `public/brands/*.png` ni `tile_*.png`, y los bancos no modulan la geometría; (5) la v21 no se había renderizado antes de redactar las notas, lo que llevó a una conclusión falsa sobre el peso del saldo.

## Pestaña C · Rasgos de la v21 (31 oct 2026)
Un interruptor por cada diferencia con la v21, sobre el Original (`?lab=1&tab=c&r=tsenvif`; cada letra enciende un rasgo): **t** una sola tinta (petróleo `#123331` sobre papel `#F4EFE6`, coral `#B5482F` solo en las acciones; en oscuro, verde hondo `#0F2422`), **s** superficies tonales, **e** contraste de escala, **n** el número como una pieza, **v** voz propia, **i** iconos suaves y **f** formas blandas.
- [H] Todos los pares pasan AA: el mínimo es 5.03:1 en el texto y 4.40:1 en las siglas de los iconos, en el peor caso (marca blanca). Los iconos mezclan solo un 27 % del color de la marca con la tinta: con más color, marcas como Spotify o Inkafarma bajaban a ~3.5:1.
- [H] La voz se pone con CSS (`content`): un lector de pantalla sigue leyendo el título real. Solo sirve para comparar, no para producción.
- [H] Ya existía en el Original y no se toca: con BCP y saldo extremo a 375 px, «S/ 1,222,800.95» se corta en los recuadros.

## Selección del usuario y la duda de la tinta (31 oct 2026)
Original + S3 (Bricolage + Geist), saldo cohesivo con numerales tabulares y rasgos **e**, **v** y **f**. Le gusta «Una sola tinta» pero duda.
- Para separar las dos cosas que cambia «Una sola tinta» (el papel cálido y el verde petróleo), se añadió **w · Papel cálido**: solo el papel de la v21, con la tinta índigo de Bóveda. Excluye a **t**. Comparación: `wallet-qa/eleccion/tinta_*.png` (sin tinta · papel cálido · petróleo).
- [H] Con S3, las cifras de Geist cortaban «S/ 23,556.92» en los recuadros a 375 px, incluso sin rasgos. Se corrigió con tracking −.05em y un tamaño de `min(17px, 4.1vw)`.
- El usuario eligió **papel cálido con índigo** (`r=wevf`). Con «voz propia», Movimientos deja de titularse «Movimientos en <cuenta>»: el título es «Movimientos» y la cuenta se ve en su filtro, con la ✕. Es el único cambio en una pantalla (`Movements.tsx`) y solo actúa con `?lab=1` y el rasgo **v**.
- [P] El usuario detectó que lo que más le falta a la letra es **jerarquía de intensidad**: no todo el texto debe pesar igual. Se añadió **j · Intensidades**: el número manda; `S/` pequeño y en alto; decimales en alto a 0.4 y 78 %; la etiqueta a 600 y 70 %; las comparaciones de Análisis a 500, con la flecha en un círculo; detalles a 450. Con «voz propia», la comparación nombra el mes («que setiembre a esta altura») y cabe en una línea a 375 px. Combinación actual: `r=wevfj`.
- [O] Con un saldo negativo, el signo va dentro de `.cu` y se atenúa con el símbolo (70 %). Sigue visible, pero al llevarlo a producción conviene separar el signo para que tenga la intensidad del número.
