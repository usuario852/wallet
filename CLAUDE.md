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

## Estado (29 oct 2026)
Wallet 22 publicada. Funciona. El usuario pide mejorar el estilo: hoy se ve "simple y monse",
sobre todo al inicio (sin cuentas todo queda gris/blanco/negro; el color solo aparece con las marcas de banco).

### Errores visuales pendientes
- Inicio vacío: la tarjeta de patrimonio tiene mucho espacio muerto y no invita a nada.
- Análisis vacío: tooltip con S/ 0.00 siempre visible, línea vertical suelta, "↓ Igual que el mes pasado" con flecha cuando no hay cambio.
- Textos cortados con "…": "1 vencido, 2 …" (tile Por salir), "Vencido hace 3 dí" (Próximo y Agenda), "Próxima cuota el 28 oct" (Lo que debes), placeholder "Buscar por nombre, categoría o mont".
- Fila de filtros de Movimientos corta "Transf" sin pista de que se desplaza.

### Siguiente paso
Rediseño visual (color, carácter del modo Wallet sin banco, estados vacíos) explorado primero en un artefacto de diseño, luego implementado aquí.
