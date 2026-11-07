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

## Wallet 23 · Sensibilidad (publicada el 31 oct 2026, rama marea-sensibilidad)
Lo que hacía "real" a Marea, aplicado a Bóveda sin cambiar el índigo (bloque `Wallet 23 · Sensibilidad` al final de `styles.css`):
- Papel, no blanco: Bóveda pasa a neutros tibios (`#F3F0E9` fondo, `#FAF8F3` superficie); en claro, una superficie blanca de cualquier piel toma un poco de su fondo (`skinFor`).
- Etiquetas editoriales (mayúscula espaciada) sobre títulos, números y secciones; títulos 38px/700.
- Movimientos e Inicio como libro contable: filetes en vez de cajas; conteos por día; hora en cada fila; separadores ·.
- Íconos genéricos delineados; los logos de marca conservan su color.
- Un corte firma (esquina más cerrada) solo en tarjeta principal, Registrar, toasts y vacíos.
- Forma y materia: manchas irregulares de fondo y dentro de la tarjeta, cabecera translúcida, grano fino.
- La tarjeta del total (Inicio y Análisis) es papel (`.hero.paper`, tb=sf/ti=tx): número en tinta, etiqueta en índigo, arcos tenues. Con color propio en Personaliza vuelve a ser bloque; al elegir una cuenta sigue la piel del banco.
- Barra de vidrio líquido con temperatura de papel: brillo tibio, lente de tinta (no lila), + con el corte de Registrar; se tiñe con la piel del banco.
- Vacíos con una "piedra" orgánica; filas y recuadros ceden al tocarlos (respeta reducir movimiento).

## Wallet 24 · Papel (publicada el 31 oct 2026, rama redisenio-estuche)
Rediseño con el skill app-designer-pro tras rechazar el Estuche, el cielo y la pila tipo Apple Wallet. Bloque `Wallet 24 · Papel` al final de `styles.css` (los bloques Sensibilidad y Estuche ya no aplican):
- Fondo papel #F7F5F1 / #0E0E10, tinta #16171A / #F2F1EE, índigo #2C3E8C / #9DB0FF solo para la acción. Fuente Geist.
- El total (Inicio y Análisis) y la cuenta elegida son tinta sobre papel: nunca un bloque de color (`tb=pg`, `ti=tx` en `skinFor`).
- Naipes: la fila plana y superpuesta de siempre (el usuario la quiere así); el + es un contorno.
- Barra: 4 pestañas de vidrio + Registrar en su propio círculo de vidrio (`.addb`), sin + centrado.
- Registrar usa el teclado nativo: `open('register')` enfoca un campo oculto (`.kbprime`) dentro del toque y la hoja pasa el foco al monto (`AmountField`, `cleanAmount` en bits.tsx: coma o punto, 2 decimales, 9 cifras). `--kb` (visualViewport) apoya la hoja sobre el teclado. "Siguiente" salta a "¿Qué fue?".
- Movimientos y Planifica sin sellos de fecha: el día es una línea de texto ("Jueves 29"); cuenta filtrada = línea con logo y saldo.

## Wallet 25 · La mesa (publicada el 2 nov 2026, rama wallet-25)
Diseño hecho en un lienzo de Claude (prototipos interactivos) y llevado a la app. Bloque `Wallet 25 · La mesa` al final de `styles.css` (los bloques anteriores quedan debajo como base; manda el último):
- Papel #F7F5F0 / grafito #0E0E0D, tinta #17171A / #F3F1EC. Mona Sans ancha (font-stretch 112–118%, 720) para números grandes y títulos; Geist para el resto. Sin frases explicativas en pantallas principales: filas etiqueta/valor (`.lv`).
- Naipes: fila plana y superpuesta con el saldo grabado (`CardFace` con `balance`/`full`); el elegido sube recto y muestra céntimos; los de después se corren 20px.
- Tarjeta del día (`.adv`): única oscura; su paleta sale del color del banco elegido con `palFor` (4.5:1). Medidor neutro con rayado si te pasas.
- Piedras (`Pebbles` en App.tsx) que respiran 19/23/29 s y se mueven con la inclinación (`ui/feel.ts`: háptica, sonidos WebAudio apagados por defecto, inclinación con permiso en el primer toque).
- Barra de vidrio líquido (`GlassBar`): 4 pestañas, lente arrastrable con lupa, gota + al centro. Registrar nace de la gota (clip-path) y vuelve a ella; el monto vuela a su naipe (evento `wallet:landed`).
- Ánimo en todas partes: bloque de un toque en Inicio (5 formas, `MoodQuick`), opcional al registrar, mapa en la hoja de ánimo, pestaña Ánimo en Análisis. Horarios: Ajustes › Avisos › «Cada 4 horas» (`moodScheduleEvery4h`, desde levantarse+30 min hasta dormir−30 min).
- Análisis a fondo con sub-pestañas Resumen / Flujo / Hábitos / Ánimo / Metas. Todo derivado en `src/domain/insights.ts` (no toca core/derive). 50/30/20: la persona clasifica cada categoría (`settings.needsWants`).
- IA con control total (borrar, editar, pagar cuotas, ajustes, borrar todo, restaurar copia previa) sin confirmaciones: cada cambio deja Deshacer (`withUndo` en ai.ts guarda el estado completo).
- Onboarding: tour de 4 escenas que se tocan; todos tienen cuenta Efectivo en soles (`ensureCash`, también usuarios existentes).
- Personaliza simplificado: tema, número grande, céntimos, ocultar, arriba del Inicio, naipes/fila, bloques, sonidos, inclinación, movimiento.
- Avisos cada 15 min con GitHub Actions (`.github/workflows/cron.yml`, secreto `CRON_SECRET` del repo igual al de Vercel).

## Wallet 26 · Pulido (publicada el 2 nov 2026, rama wallet-26)
Ajustes tras probar la 25 en el iPhone. Bloques `Wallet 26 · …` al final de `styles.css`:
- Pantalla completa: `apple-mobile-web-app-status-bar-style` = `black-translucent` (en iPhone la hora y la batería quedan blancas; Apple no deja cambiarlo). La cabecera va dentro del scroll (`.scr.hin`), sin franja fija.
- Letra del sistema (SF Pro en iPhone, Geist fuera): clase `ty-s` en `.ph`; `.w25.ty-s *` hereda la familia y anula `font-stretch`. Mona Sans ya no se carga. S/ y céntimos sobre la misma línea base.
- Sin falso 3D: vidrio plano con desenfoque real, gota sólida, naipes y tarjeta del día sin degradados.
- Barra reescrita: la lente se mueve con `transform` en rAF (sin re-render por movimiento), se estira según la velocidad, lupa continua en los íconos, toque háptico al cruzar pestañas, captura del puntero solo tras 7px horizontales.
- Ánimos: clases `mk1..mk5` (no `k1`, choca con leyendas viejas) con color (`--m1..--m5`), forma (picos, cojín desinflado, cuadro suave, flor, destello) y movimiento propio del elegido.
- Movimiento: secciones entran escalonadas, naipes desde la derecha, número con desenfoque corto; las hojas se cierran arrastrando la cabecera (`SheetFrame` → `.shtop`).

## Wallet 27 · Toda la pantalla (publicada el 7 nov 2026, rama wallet-27)
- iPhone instalado + barra translúcida: el sistema reporta un alto menor y la app no llegaba abajo. `main.tsx` fija `--app-h` con el alto real de la pantalla (instalada: `screen` según orientación; en Safari: `innerHeight`); `.ph` usa `height:var(--app-h)`. `--kb` se calcula contra `--app-h`.
- `.ph` es contenedor (`container-type:inline-size`, nombre `app`): hojas, aviso y velo (`position:fixed`) quedan dentro de la app; tamaños con `cqi` y `@container app` para ≤380px, ≤350px y ≥520px.
- La barra se apoya sobre la línea de inicio: `bottom:max(10px, safe-b − 12px)`.

## Wallet 28 · Pestañas como Inicio (publicada el 7 nov 2026)
- `PageTitle`: título grande (34/700) en una línea con el selector de moneda; ya no hay etiqueta pequeña encima (`eyebrow` se ignora). Subtítulo 15 gris debajo.
- Escala única: secciones 17/600, filas 15/550 con detalle 13 en una línea (puntos suspensivos), montos 15/600, íconos en cuadro de 40px.
- Movimientos: barras finas (entró en verde, salió en tinta), «Te queda / Salió de más» como fila etiqueta/valor; sin conteos por día; el conteo solo aparece al filtrar.
- Planifica: el límite usa filas etiqueta/valor en vez de párrafo; la agenda usa la hoja de fecha de Inicio y la fila entera abre Pagar/Cobrar.

## Wallet 29 · Revisión final (publicada el 7 nov 2026)
- `api/cron.js` fallaba siempre (`window` fuera de alcance → ReferenceError): ningún aviso salía. Ahora un aviso vale desde 5 min antes hasta `CRON_WINDOW_MINUTES` (60 por defecto) después; `sent` evita repetir. El cron diario de Vercel pasó a las 12:00 UTC (7:00 Lima).
- GitHub Actions no respeta «cada 15 min» (corre cada 4–8 h): queda de respaldo y ya no falla sin el secreto. El disparador recomendado es cron-job.org cada 15 min con `Authorization: Bearer CRON_SECRET`.
- IA: `findOp` prefiere el nombre exacto, luego el que empieza igual, luego el más reciente (antes «Taxi» tomaba «Mototaxi»). Tasa de cambio con 4 decimales. En desarrollo `window.__aiExec(nombre, args)` prueba cada acción sin modelo.
- Bienvenida: la regla vieja `.stack{height:12px}` aplastaba los botones; `.onb .stack` la anula y queda fija abajo.
