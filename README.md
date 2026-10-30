# Wallet

Finanzas personales, local-first, como PWA para iPhone. Versión 22 (rediseño «Naipes»).

- **Tus datos viven en el teléfono** (`localStorage`, clave `wallet_data_v8`), en el mismo formato que la v21: actualizar no pierde nada.
- **Nada se mezcla:** cada moneda lleva sus cuentas y sus totales.
- **La IA es opcional:** todo funciona sin ella.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas de paridad y de almacenamiento
npm run build    # genera dist/
```

Para comparar con la app anterior: `QA_DIR=/ruta/con/seed.json+old.json npm test`.

## Estructura

- `src/domain/core.ts`: modelo de datos, migraciones y cálculos (mismos que la v21).
- `src/domain/derive.ts`: cálculos de pantalla (por día, por salir, acumulados).
- `src/store.ts`: estado, guardado verificado, deshacer y avisos.
- `src/screens/`, `src/sheets/`: pantallas y hojas.
- `src/design/`: colores por banco, marcas y logos de comercios.
- `api/`: funciones de Vercel (IA, mercados, noticias, avisos, cron).

## Variables de entorno (Vercel)

| Variable | Para qué | ¿Obligatoria? |
|---|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Guardar suscripciones de avisos | Para avisos |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Avisos web | Para avisos |
| `CRON_SECRET` | Proteger el cron de avisos | Para avisos |
| `OPENAI_API_KEY` | IA para todos sin pegar clave | Opcional |
| `FRED_API_KEY` | Datos de EE. UU. en mercados | Opcional |
