# Snippets de consola

Herramientas de un solo uso para la consola del navegador, mientras no
existan las pantallas de Cuentas y Ajustes (fase 7). Se pegan con la
app abierta, en la pestaña donde corre.

Todas escriben en `localStorage` y recargan. La app guarda con un
retardo de 400ms tras cada cambio, así que **no toques la app entre
pegar el snippet y la recarga**: el snippet recarga solo, deja que lo
haga.

---

## 1. Ver las cuentas y de dónde sale cada saldo

Solo lee. Muestra la apertura, lo que suman los movimientos y el saldo
que la app está mostrando.

```js
(() => {
  const CLAVE = 'wallet_state_v1';
  const estado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
  if (!estado) return 'No hay estado guardado. Abre la app una vez y repite.';

  const movimientos = new Map(estado.accounts.map((c) => [c.id, 0]));
  const suma = (id, n) => { if (movimientos.has(id)) movimientos.set(id, movimientos.get(id) + n); };
  for (const op of estado.operations) {
    if (op.voided) continue;
    if (op.type === 'transfer') { suma(op.fromAccountId, -op.amountMinor); suma(op.toAccountId, op.amountMinor); }
    else if (op.type === 'fx') { suma(op.fromAccountId, -op.fromAmountMinor); suma(op.toAccountId, op.toAmountMinor); }
    else if (op.type === 'expense') suma(op.accountId, -op.amountMinor);
    else suma(op.accountId, op.amountMinor);
  }

  console.table(estado.accounts.map((c) => ({
    cuenta: c.name,
    moneda: c.currency,
    apertura: (c.openingMinor / 100).toFixed(2),
    movimientos: (movimientos.get(c.id) / 100).toFixed(2),
    'saldo que muestra la app': ((c.openingMinor + movimientos.get(c.id)) / 100).toFixed(2),
  })));
})();
```

---

## 2. Fijar el saldo de apertura

Escribe en `SALDOS_REALES` **lo que cada cuenta tiene hoy de verdad**,
no la apertura. El snippet despeja la apertura solo:

```
apertura = saldo real de hoy − lo que suman los movimientos
```

Las cuentas que no nombres se quedan como están. Los nombres tienen que
coincidir exactos con los de la lista del snippet 1; si uno no calza,
te lo dice en vez de ignorarlo en silencio.

```js
(() => {
  const SALDOS_REALES = {
    'Efectivo': 0,
    'BBVA': 0,
    'BCP / Yape': 0,
    'BBVA Dólares': 0,
  };

  const CLAVE = 'wallet_state_v1';
  const estado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
  if (!estado) return 'No hay estado guardado. Abre la app una vez y repite.';

  const movimientos = new Map(estado.accounts.map((c) => [c.id, 0]));
  const suma = (id, n) => { if (movimientos.has(id)) movimientos.set(id, movimientos.get(id) + n); };
  for (const op of estado.operations) {
    if (op.voided) continue;
    if (op.type === 'transfer') { suma(op.fromAccountId, -op.amountMinor); suma(op.toAccountId, op.amountMinor); }
    else if (op.type === 'fx') { suma(op.fromAccountId, -op.fromAmountMinor); suma(op.toAccountId, op.toAmountMinor); }
    else if (op.type === 'expense') suma(op.accountId, -op.amountMinor);
    else suma(op.accountId, op.amountMinor);
  }

  const nombres = new Set(estado.accounts.map((c) => c.name));
  const desconocidas = Object.keys(SALDOS_REALES).filter((n) => !nombres.has(n));
  if (desconocidas.length) {
    console.warn('Estos nombres no existen y se ignoran:', desconocidas);
  }

  const cambios = [];
  const cuentas = estado.accounts.map((c) => {
    const objetivo = SALDOS_REALES[c.name];
    if (objetivo === undefined) return c;
    const apertura = Math.round(objetivo * 100) - movimientos.get(c.id);
    cambios.push({
      cuenta: c.name,
      'apertura nueva': (apertura / 100).toFixed(2),
      'saldo resultante': ((apertura + movimientos.get(c.id)) / 100).toFixed(2),
    });
    return { ...c, openingMinor: apertura };
  });

  localStorage.setItem(CLAVE, JSON.stringify({ ...estado, accounts: cuentas }));
  console.table(cambios);
  location.reload();
})();
```

---

## 3. Borrar movimientos vacíos

> **Nunca borres operaciones con un filtro escrito a mano, y menos
> sobre el monto.** Un cambio de divisa no tiene `amountMinor`: tiene
> `fromAmountMinor` y `toAmountMinor`. Un filtro `!op.amountMinor` se
> lleva por delante todos los fx. Pasó, y el saldo saltó 649.60.

Estos dos snippets usan `window.wallet`, el puente que la app publica
en la consola. Llaman a las mismas funciones que usa la app, así que
no hay una segunda interpretación de qué mueve cada tipo de
operación.

`wallet.removeOperations` borra **solo por id**, comprueba que cada id
existe antes de tocar nada, y verifica que el saldo de cada cuenta se
mueve exactamente lo que aportaban las operaciones borradas. Si algo
no cuadra, no escribe y devuelve el descuadre.

### 3a. Ver qué hay vacío

```js
(() => {
  const vacios = wallet.findEmptyOperations();
  if (!vacios.length) return 'No hay movimientos vacíos.';
  console.table(vacios.map((op) => ({
    id: op.id, concepto: op.concept, tipo: op.type, fecha: op.date,
    importe: op.type === 'fx'
      ? op.fromAmountMinor + ' -> ' + op.toAmountMinor
      : op.amountMinor,
  })));
  console.log('Copia los ids que quieras borrar y pásalos al snippet 3b.');
})();
```

### 3b. Borrarlos por id

Pega en `IDS` los ids que quieres borrar. Si dejas la lista como está,
borra todos los vacíos que encuentre.

```js
(() => {
  const IDS = wallet.findEmptyOperations().map((op) => op.id);
  if (!IDS.length) return 'No hay nada que borrar.';

  const antes = new Map(wallet.balances());
  const resultado = wallet.removeOperations(IDS);

  if (!resultado.ok) {
    console.warn('No se borró nada. Motivo:', resultado.reason);
    if (resultado.missing.length) console.warn('Ids que no existen:', resultado.missing);
    if (resultado.mismatch.length) console.table(resultado.mismatch);
    return 'Abortado, el estado sigue intacto.';
  }

  console.table(resultado.removed.map((op) => ({
    id: op.id, concepto: op.concept, tipo: op.type,
  })));

  const despues = wallet.balances();
  console.table([...antes].map(([id, saldo]) => ({
    cuenta: id,
    antes: (saldo / 100).toFixed(2),
    despues: ((despues.get(id) || 0) / 100).toFixed(2),
    diferencia: (((despues.get(id) || 0) - saldo) / 100).toFixed(2),
  })));

  wallet.save();
  console.log('Borrados ' + resultado.removed.length + '.');
})();
```

La comprobación del saldo no vive en este snippet: la hace
`removeOperations` por dentro, en `src/state/remove.js`, comparando
contra `operationDeltas`, la misma función que calcula los saldos de
la app. La tabla de arriba solo te la enseña.

---

## 4. Diagnóstico del saldo

Para cuando el saldo no cuadra. Imprime de dónde sale cada sol: la
apertura de cada cuenta, lo que aporta cada operación y los diez
movimientos de mayor importe, que es donde suele estar el intruso.

```js
(() => {
  const estado = JSON.parse(localStorage.getItem('wallet_state_v1') || 'null');
  if (!estado) return 'No hay estado guardado.';

  const saldos = new Map(estado.accounts.map((c) => [c.id, c.openingMinor || 0]));
  const add = (id, n) => { if (saldos.has(id)) saldos.set(id, saldos.get(id) + n); };
  for (const op of estado.operations) {
    if (op.voided) continue;
    if (op.type === 'transfer') { add(op.fromAccountId, -op.amountMinor); add(op.toAccountId, op.amountMinor); }
    else if (op.type === 'fx') { add(op.fromAccountId, -op.fromAmountMinor); add(op.toAccountId, op.toAmountMinor); }
    else if (op.type === 'expense') add(op.accountId, -op.amountMinor);
    else add(op.accountId, op.amountMinor);
  }

  const nombre = new Map(estado.accounts.map((c) => [c.id, c.name]));
  console.log('MONEDA ACTIVA:', estado.settings.activeCurrency,
    '· habilitadas:', estado.settings.enabledCurrencies.join(', '));

  console.table(estado.accounts.map((c) => ({
    cuenta: c.name, moneda: c.currency, tipo: c.kind, archivada: c.archived,
    apertura: (c.openingMinor / 100).toFixed(2),
    saldo: (saldos.get(c.id) / 100).toFixed(2),
  })));

  console.log('POR VENIR (lo que resta al disponible):');
  console.table(estado.upcoming.map((u) => ({
    nombre: u.name, direccion: u.direction, moneda: u.currency,
    importe: (u.amountMinor / 100).toFixed(2),
    archivada: u.archived, cuentaEnFlujo: u.countAsFlow !== false,
  })));

  console.log('LOS 10 MOVIMIENTOS MÁS GRANDES:');
  console.table([...estado.operations]
    .filter((op) => !op.voided)
    .sort((a, b) => (b.amountMinor || b.fromAmountMinor || 0) - (a.amountMinor || a.fromAmountMinor || 0))
    .slice(0, 10)
    .map((op) => ({
      concepto: op.concept, tipo: op.type, fecha: op.date,
      importe: ((op.amountMinor || op.fromAmountMinor || 0) / 100).toFixed(2),
      cuenta: nombre.get(op.accountId || op.fromAccountId) || '(sin cuenta)',
    })));

  console.log('TOTAL de operaciones:', estado.operations.length);
})();
```

---

## 5. Cargar un respaldo de v8 en la app

Solo hace falta una vez, y solo si la app todavía no tiene tus datos.
Con `npm run dev` corriendo, el servidor sirve el respaldo desde la
raíz del proyecto.

La migración no sobrescribe: si ya hay estado nuevo, no hace nada. Para
rehacerla desde cero hay que borrar antes `wallet_state_v1`.

```js
(async () => {
  const respuesta = await fetch('/wallet_backup_2026-09-06.json');
  localStorage.setItem('wallet_data_v8', await respuesta.text());
  localStorage.removeItem('wallet_state_v1');
  location.reload();
})();
```

Tras recargar, la consola imprime el recuento de la migración y los
avisos de lo que no mapea uno a uno. El original queda intacto en
`wallet_data_v8` y con una copia en `wallet_data_v8__respaldo`.
