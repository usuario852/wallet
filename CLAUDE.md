# Wallet — contexto para Claude

App personal de finanzas (PWA) del usuario. Peruana: soles y dólares. Hay otros usuarios: nada de datos personales en valores por defecto.
Responde siempre en español. Avisa antes de cambios grandes.

## Stack
- React 18.3.1 + Vite 5 + TypeScript. Tests con vitest (`npm test`). Build: `npm run build`.
- Deploy: Vercel, proyecto `wallet` (team `team_WRGEM9A6WZPaumsozpoqK7he`), producción en wallet-one-rust.vercel.app.
- APIs en `api/` (copiadas tal cual de la v21): ai, cron, markets, news, push-*, symbol-search. No tocarlas sin motivo.

## Reglas que no se rompen
- No cambiar lo que la app hace ni calcula. Los cálculos viven en `src/domain/core.ts` y `src/domain/derive.ts`; `test/parity.test.ts` los compara con la v21.
- Datos locales en `localStorage` clave `wallet_data_v8` (mismo esquema que v21). Preservar campos desconocidos. Migraciones v7/v6/v5 se mantienen.
- Las monedas nunca se mezclan. Siempre hay Deshacer. La IA es opcional.
- Rojo/verde nunca es la única señal. WCAG AA, toques de 44px o más, respetar reduced motion.
- Formato de números: coma para miles, punto para decimales (S/ 1,234.56).
- Sin fuentes serif.

## Mapa del código
- `src/store.ts`: estado global, `commit()` guarda y verifica; toasts con deshacer.
- `src/design/theme.ts` + `brands.json`: paletas por banco (claro/oscuro), piel según cuenta elegida. `settings.look` = Personaliza.
- `src/styles.css`: todo el CSS.
- `src/screens/`: Home, Movements, Plan, Analysis, Settings, Personalize, AccountDetail, Investments, News, Onboarding.
- `src/sheets/`: Register (registrar gasto/ingreso/mover) y Host (resto de hojas).
- `src/ui/bits.tsx`: piezas comunes (Money, Odometer, CardFace, Keypad, Seg…).

## Estado (30 oct 2026)
Wallet 22 publicada, con estilo **Bóveda** en el modo Wallet (sin banco): gris frío, índigo profundo (#1E2B4A tarjeta, #2C3E8C acento); en oscuro, índigo claro #9DB0FF.
- La paleta Bóveda vive en `src/design/theme.ts` (sobrescribe `wallet` de `brands.json`; las pieles de banco no cambian).
- Variables propias: `tb`/`ti` (tarjeta del total: índigo; con "Sin color" queda neutra) y `hvi` (tinta sobre el color de gráficos).
- "Sin color" en Personaliza es neutro (tinta y superficie), no índigo.
- Errores visuales de la fase 1 resueltos: estados vacíos de Inicio/Análisis, textos cortados (pasan a 2 líneas), filtros de Movimientos en 2 filas, contraste en oscuro.
- `npm test`: sin `QA_DIR` (con `seed.json` y `old.json` de la v21) la paridad se salta; con ellos, se corre.
- Diseño explorado en un lienzo de Claude (3 direcciones: Libreta, Bóveda, Marea); se eligió Bóveda.

## Rama marea-sensibilidad (31 oct 2026, sin publicar)
Lo que hacía "real" a Marea, aplicado a Bóveda sin cambiar el índigo (bloque `Wallet 23 · Sensibilidad` al final de `styles.css`):
- Papel, no blanco: Bóveda pasa a neutros tibios (`#F3F0E9` fondo, `#FAF8F3` superficie); en claro, una superficie blanca de cualquier piel toma un poco de su fondo (`skinFor`).
- Etiquetas editoriales (mayúscula espaciada) sobre títulos, números y secciones; títulos 38px/700.
- Movimientos e Inicio como libro contable: filetes en vez de cajas; conteos por día; hora en cada fila; separadores ·.
- Íconos genéricos delineados; los logos de marca conservan su color.
- Un corte firma (esquina más cerrada) solo en tarjeta principal, Registrar, toasts y vacíos.
- Forma y materia: manchas irregulares de fondo y dentro de la tarjeta, cabecera translúcida, grano fino.
