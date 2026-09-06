# Especificación de producto y diseño

Versión 1.0 · Documento base para reconstrucción

---

# 1. Fundamento

## Propósito

La mayoría de las apps de finanzas te dicen cuánto gastaste. Ninguna te dice por qué.

Esta app existe para cerrar la distancia entre el número y la persona: no solo registrar el gasto, sino capturar el estado en que lo hiciste, para que con el tiempo puedas verte a ti mismo gastando.

## Misión

Hacer que registrar un gasto sea tan rápido que no exista la excusa de la flojera, y convertir ese registro acumulado en una comprensión honesta de la conducta de consumo. Accesible para quien nunca hizo un presupuesto, profunda para quien estudió finanzas.

## Principios

Estos no son valores decorativos. Son reglas de decisión: cuando dudes si agregar algo, consúltalos.

**1. El registro es sagrado.**
Si una función hace que registrar sea un tap más lento, la función se va. Sin excepción.

**2. Dos segundos o no sirve.**
El enemigo real no es la falta de funciones, es la flojera de las 11pm.

**3. Nunca juzgar.**
Nada de rojo alarmante, nada de "te pasaste". La culpa hace que la gente deje de registrar, y una app sin datos no sirve de nada. El tono es el de un espejo, no el de un profesor.

**4. Progresivo en profundidad.**
La superficie tiene 3 cosas. Debajo hay 10. Más abajo hay 40. El usuario común nunca baja del primer nivel. El usuario exigente vive en el tercero. Misma app.

**5. La IA interpreta, la app calcula.**
Ningún número que ve el usuario sale de un modelo de lenguaje. Los modelos redactan, categorizan y explican. Las sumas las hace el código.

**6. Los datos son tuyos y se van contigo.**
Local por defecto, exportables a CSV en un tap, sin cuenta obligatoria.

## Fuera de alcance (v1)

Escrito explícitamente para poder decir que no:

- Conexión bancaria automática. No existe infraestructura de open banking accesible en Perú.
- Sincronización entre dispositivos.
- Cuentas de usuario / login.
- Inversiones, patrimonio neto, cripto.
- Compartir con pareja o familia.
- Tarjetas de crédito con ciclo de facturación (queda para v2).

---

# 2. Alcance funcional

## Se construye

| Módulo | Descripción |
|---|---|
| Registro | Campo único con autocompletado predictivo. Meta: 2 taps. |
| Cuentas | Saldo derivado, sin saldos almacenados. Cuentas normales y de reserva. |
| Movimientos | Dos pestañas: Pasado y Por venir. |
| Marca de estado | Una fila de chips opcional al guardar un gasto. |
| Análisis | Tendencia, por categoría, comparación con periodo anterior. |
| Presupuesto | Mensual global. Por categoría queda en avanzado. |
| Multimoneda | PEN, USD y las que el usuario active. Cambio de divisa con tasa manual o de referencia. |
| Asistente | Panel conversacional con acceso a los datos reales. |
| Exportar | CSV y JSON. |
| Deshacer | Ventana de 4 segundos tras cualquier acción destructiva. |

## Se elimina de la versión anterior

- Check-ins emocionales programados (4 al día). Reemplazados por la marca de estado en el momento del gasto.
- Mapa de valencia / energía / tensión.
- Heatmap de calendario.
- Scatter emocional. Vuelve cuando existan 200+ registros con marca de estado.
- Insights proactivos. Vuelven en v2.
- Catálogo de productos personales como pantalla. Pasa a ser memoria invisible del sistema.
- Swipe horizontal entre pestañas.
- Todo el sistema de Web Push y las Netlify Functions.
- El archivo `_smoke.html`.

## Se fusiona

Gastos fijos, compromisos, deudas y suscripciones eran cuatro conceptos para lo mismo: dinero con fecha y nombre que aún no se movió. Se unifican en **Por venir**.

---

# 3. Sistema visual

## Dirección: "Garúa"

La referencia es la luz de la costa de Lima. Gris luminoso, sin sol directo, sin contraste agresivo. Es una decisión local y específica, no un estilo tomado de un catálogo.

Esto sustituye deliberadamente la combinación crema + terracota de la versión anterior, que es el patrón cromático más reconocible de interfaces generadas automáticamente y que un ojo entrenado detecta de inmediato.

## Color

El acento no decora: **marca lo que se puede tocar**. El ámbar no alarma: **marca lo que ya está comprometido**. Ningún color existe sin un trabajo asignado.

### Claro

```
--paper        #EDEEEA   fondo de la app
--surface      #F6F7F4   tarjetas y hojas
--ink          #1C1F1D   texto principal
--ink-soft     #5B615D   texto secundario
--line         #D8DBD4   bordes y separadores
--accent       #2F5D52   verde petróleo — acción, selección, foco
--accent-soft  #DCE6E2   fondo de estado seleccionado
--pledge       #9A7B3F   ámbar — dinero comprometido o por cobrar
--positive     #3F6B4A   solo para el signo de un ingreso
--negative     #8A4038   solo para el signo de un gasto
```

### Oscuro

No es una inversión. Es una paleta propia, con el mismo verde y el mismo ámbar.

```
--paper        #141715
--surface      #1D211F
--ink          #E8EAE6
--ink-soft     #949A95
--line         #2C312E
--accent       #6FA394
--accent-soft  #22302C
--pledge       #C4A268
--positive     #7BA987
--negative     #C08379
```

### Reglas de color

- Verde y ámbar son los únicos colores de la interfaz. Todo lo demás es gris.
- Positivo y negativo se usan **solo en el signo y el monto de un movimiento**. Nunca como fondo de fila, nunca como estado de alerta.
- No existe el rojo de advertencia. Ver principio 3.
- No hay gradientes en ninguna parte.

## Tipografía

Dos familias con roles claramente distintos.

**Interfaz:** pila del sistema.
```css
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```
Carga instantánea, y es la razón principal por la que algo se siente nativo en vez de portado.

**Cifras de dinero:** Archivo (variable, Google Fonts, cifras tabulares reales).

Solo se carga para montos. Un peso, un archivo, subconjunto de caracteres a `0123456789.,-+/S$€ ` para que pese menos de 8 KB.

```css
.money {
  font-family: 'Archivo', system-ui;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  letter-spacing: -0.02em;
}
```

Las cifras tabulares son obligatorias en toda la app. Sin ellas los dígitos bailan al actualizarse y todo se siente amateur.

### Escala

```
display   44 / 48   700   solo el saldo del inicio
title     22 / 28   600   títulos de hoja y de sección
body      16 / 24   400   texto general
amount    17 / 24   600   montos en listas
label     14 / 20   500   etiquetas de chip, botones
caption   13 / 18   400   metadatos, fechas, cuentas
```

Seis tamaños. Ninguno más. Nada en mayúsculas.

## Espaciado

Todo múltiplo de 4. El ritmo importa más que el valor:

```
4    dentro de un elemento
8    entre elementos hermanos muy relacionados
12   dentro de una tarjeta
16   entre filas de una lista
24   entre bloques
32   entre secciones
48   respiro superior del inicio
```

La regla que hace que se lea la estructura: **el espacio entre grupos siempre es al menos el doble que dentro del grupo.**

## Forma

Una escala, no un radio único. Esto es lo que separa un sistema pensado de una plantilla.

```
píldora   9999px   chips, botones, segmentos
tarjeta   14px
hoja      24px arriba, 0 abajo
input     10px
avatar     6px
```

## Elevación

No hay sombras en tarjetas. La separación se hace con `--surface` sobre `--paper` y una línea de 1px.

Solo dos elementos proyectan sombra, porque solo ellos flotan de verdad:

```
hoja inferior   0 -8px 32px rgba(0,0,0,.10)
toast           0  4px 20px rgba(0,0,0,.14)
```

## Iconografía

**No se usan emojis en ninguna parte de la interfaz.**

Se dibuja a mano un set propio de 16 glifos en Figma. Todos con el mismo grosor de trazo (1.75px), extremos redondeados, caja de 24×24, y una irregularidad deliberada y consistente. El trazo hecho a mano es la señal de autoría más fuerte que existe, porque lleva una imperfección que nadie genera por accidente.

Set mínimo:

```
alimentación · transporte · servicios · salud
educación · ocio · hogar · compras
cuenta · reserva · entrante · saliente
buscar · ajustes · cerrar · deshacer
```

Se exportan como un sprite SVG único.

## Movimiento

Dos capas con propósitos distintos.

### Capa funcional (invisible)

Nada aparece de golpe. El usuario no lo nota; solo siente solidez. Resortes para lo que responde al dedo, duración fija para lo que solo aparece.

```
hoja que sube        spring  rigidez 300  amortiguación 30
chip al seleccionar  spring  rigidez 400  amortiguación 25   +4px de ancho
fila nueva           180ms   ease-out     desplaza a las de abajo
cambio de pestaña    140ms   cruce de opacidad
presión de botón     escala 0.97          instantáneo
```

### El momento firmado

Un solo detalle existe para ser recordado: **ocultar el saldo**.

```
Al tocar el saldo
  blur(0) → blur(14px)
  400ms  cubic-bezier(.16,1,.3,1)
  opacidad 1 → .55 simultáneo
  navigator.vibrate(10)

Al volver a tocar
  blur(14px) → blur(0)
  520ms
```

El regreso tarda más que la salida. Ocultar es defensivo y debe ser inmediato; revelar es un pequeño acto de confianza y merece asentarse. Nadie lo nota conscientemente; todos lo sienten.

El estado persiste entre sesiones.

**Solo hay un momento firmado.** Si tres cosas buscan ser memorables, ninguna lo es.

### Accesibilidad del movimiento

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

---

# 4. Pantallas

Tres pestañas. Nada más.

```
Inicio          Movimientos          Análisis
```

## 4.1 Inicio

```
┌─────────────────────────────────────┐
│                                     │
│  PEN  USD                     ⚙     │   monedas activas · ajustes
│                                     │
│                                     │
│         S/ 4,130.00                 │   display 44px, tocable
│         saldo total                 │   caption
│                                     │
│    3,240 disponible                 │   ámbar
│    – 890 comprometido               │   ámbar
│    + 1,500 por cobrar               │   ámbar
│                                     │
│                                     │
│  Hoy                                │   title
│  ─────────────────────────────      │
│   Almuerzo            − S/ 18.00    │
│   Alimentación · BBVA               │
│                                     │
│   Uber                − S/ 12.50    │
│   Transporte · BBVA                 │
│                                     │
│   Ver todo                          │   texto, no botón
│                                     │
│                                     │
│         ┌───────────────┐           │
│         │   Registrar   │           │   fijo, alcanzable con pulgar
│         └───────────────┘           │
├─────────────────────────────────────┤
│   Inicio   Movimientos   Análisis   │
└─────────────────────────────────────┘
```

Notas:

- El número grande es el **saldo total**: la suma de las cuentas normales de la moneda activa. Las cuentas de reserva quedan fuera; para eso están apartadas. Es el número que se oculta con el momento firmado.
- **"Disponible" es saldo menos comprometido.** Sigue siendo el número que cambia decisiones, pero vive en la línea secundaria, junto a comprometido y por cobrar. Los tres van en ámbar: describen dinero que ya tiene dueño, y esa es exactamente la función del ámbar.
- Cuando el disponible es negativo se muestra en `--pledge`, **nunca** en `--negative`. Un disponible bajo cero no es un error del usuario: significa que lo comprometido supera al saldo, que es justo lo que el ámbar ya cuenta. El rojo juzga. Ver principio 3.
- Máximo 3 movimientos del día. Si no hay ninguno: *"Todavía no registras nada hoy"*.
- El botón Registrar nunca se desplaza al hacer scroll.

**Ningún número negativo se muestra en 44px. La jerarquía tipográfica no amplifica malas noticias.**

## 4.2 Registrar

Se abre como hoja inferior con el teclado numérico ya visible. Sin animación de entrada del teclado; ya está ahí.

```
┌─────────────────────────────────────┐
│                                     │
│   Gasto        Ingreso              │   segmento
│                                     │
│   ┌───────────────────────────┐     │
│   │  alm|                     │     │   texto + fantasma gris
│   └───────────────────────────┘     │
│                                     │
│   Almuerzo             S/ 18.00     │
│   Alimentación · BBVA               │
│                                     │
│   Almuerzo con equipo  S/ 45.00     │
│   Alimentación · Efectivo           │
│                                     │
│   Almacén Sofía        S/ 12.50     │
│   Hogar · BBVA                      │
│                                     │
│  ┌─────┬─────┬─────┐                │
│  │  1  │  2  │  3  │                │
│  ├─────┼─────┼─────┤                │
│  │  4  │  5  │  6  │                │
│  ├─────┼─────┼─────┤                │
│  │  7  │  8  │  9  │                │
│  ├─────┼─────┼─────┤                │
│  │  .  │  0  │  ⌫  │                │
│  └─────┴─────┴─────┘                │
│                                     │
│         ┌───────────────┐           │
│         │   Guardar     │           │
│         └───────────────┘           │
└─────────────────────────────────────┘
```

Notas:

- Teclado propio, no el nativo. Permite poner Guardar junto al pulgar y soporta aritmética: `18+25` se resuelve al guardar.
- Tocar una sugerencia guarda directamente. Ese es el camino de 2 taps.
- Cuenta, fecha y categoría se rellenan solos y son editables después. Nada es obligatorio antes de guardar.
- El campo nunca bloquea: cualquier texto + Guardar produce un movimiento válido.

### Marca de estado

Aparece **después** de guardar un gasto, dentro del toast de confirmación. Un tap, opcional, se ignora deslizando o esperando.

```
┌─────────────────────────────────────┐
│  Guardado · S/ 18.00      Deshacer  │
│                                     │
│  ┌────────┐┌───────┐┌────────┐      │
│  │ normal ││ apuro ││ antojo │  →   │
│  └────────┘└───────┘└────────┘      │
└─────────────────────────────────────┘
```

Etiquetas completas, deslizables horizontalmente:

```
normal · apuro · antojo · social · aburrido · celebrando · necesario
```

Sin íconos, sin emojis, sin números. Solo tipografía. Chip sin seleccionar: borde 1px `--line`, texto `--ink-soft`. Seleccionado: fondo `--accent-soft`, texto `--accent`, ensanchamiento de 4px con resorte.

Estas palabras son deliberadamente coloquiales, no clínicas. "Antojo" es específico y honesto; "ansiedad" es un formulario médico.

## 4.3 Movimientos

```
┌─────────────────────────────────────┐
│   Pasado          Por venir         │   segmento
│                                     │
│   ┌───────────────────────────┐     │
│   │  Buscar                   │     │
│   └───────────────────────────┘     │
│                                     │
│   Marzo 2026            S/ 2,140    │
│   ─────────────────────────────     │
│                                     │
│   Jueves 12                         │
│    Almuerzo           − S/ 18.00    │
│    Alimentación · BBVA · antojo     │
│                                     │
│    Netflix            − S/ 34.90    │
│    Servicios · BBVA                 │
│                                     │
│   Miércoles 11                      │
│    ...                              │
└─────────────────────────────────────┘
```

Deslizar una fila hacia la izquierda revela Editar y Eliminar. Este es el único swipe de la app.

### Por venir

```
┌─────────────────────────────────────┐
│   Pasado          Por venir         │
│                                     │
│   Comprometido    Por cobrar        │
│   S/ 890          S/ 1,500          │   ámbar
│                                     │
│   Marzo                             │
│   ─────────────────────────────     │
│    Netflix              S/ 34.90    │
│    15 mar · cada mes    Confirmar   │
│                                     │
│    Préstamo laptop      S/ 250.00   │
│    20 mar · cuota 3/12  Confirmar   │
│                                     │
│    Sueldo             + S/ 3,500    │
│    30 mar · cada mes    Confirmar   │
│                                     │
│    Carlos             + S/ 200.00   │
│    Sin fecha            Confirmar   │
└─────────────────────────────────────┘
```

Un solo modelo de datos para sueldos, suscripciones, deudas y préstamos. Al confirmar se convierte en movimiento real y, si es recurrente, se genera la siguiente ocurrencia.

## 4.4 Análisis

Aquí vive el usuario exigente. Densidad permitida.

```
┌─────────────────────────────────────┐
│   Semana  Mes  3M  Año              │
│                                     │
│   S/ 2,140                          │
│   12% menos que febrero             │
│                                     │
│   [ gráfico de línea, 1px, sin      │
│     relleno, sin puntos, sin ejes ] │
│                                     │
│   Por categoría                     │
│   ─────────────────────────────     │
│   Alimentación   S/ 780      36%    │
│   ████████████░░░░░░░░░░░░░░        │
│   Transporte     S/ 420      20%    │
│   ███████░░░░░░░░░░░░░░░░░░░        │
│                                     │
│   Por estado                        │
│   ─────────────────────────────     │
│   normal    S/ 1,340   62%          │
│   antojo    S/   420   20%          │
│   social    S/   380   18%          │
│                                     │
│   Ritmo del mes                     │
│   Vas 12% arriba de tu ritmo        │
│   habitual para el día 18.          │
│                                     │
│   Preguntar sobre estos datos  →    │
└─────────────────────────────────────┘
```

El bloque "Por estado" solo aparece con 30+ gastos marcados. Antes de eso muestra: *"Marca cómo te sientes al registrar y aquí verás el patrón. Faltan 18 registros."*

Progreso visible, sin bloqueo.

---

# 5. Autocompletado predictivo

El corazón del producto.

## Tres capas

**Capa 1 — Índice local, 0ms, sin red.**

```
puntaje = frecuencia × recencia × coincidencia_horaria × calidad_prefijo

frecuencia         veces registrado, log-escalado
recencia           decaimiento exponencial, vida media 30 días
coincidencia_hor.  1.6 si la hora actual está a ±2h de la hora típica
calidad_prefijo    3.0 exacto · 2.0 inicio de palabra · 1.0 subcadena
```

Debounce de 120ms. Máximo 5 resultados. Cubre alrededor del 85% de los casos.

**Capa 2 — Parseo de expresión, 0ms.**

Reconoce, en el mismo campo:

```
uber 18                  concepto + monto
18 uber                  monto + concepto
ayer almuerzo 28         fecha relativa
almuerzo 18+25           aritmética
netflix 34.90 bbva       cuenta explícita
me pagaron 800 dolares   tipo + moneda
```

**Capa 3 — Modelo, solo cuando la capa 1 no tiene confianza.**

Se activa únicamente si: hay 4+ caracteres, cero coincidencias locales con puntaje sobre umbral, y han pasado 600ms sin escribir.

Devuelve JSON estricto: `{concepto, categoria, monto?, tipo}`. Se muestra marcado visualmente como sugerencia del asistente, no como historial.

Con esta arquitectura el uso diario esperado es de 10 a 25 llamadas, dentro del nivel gratuito.

## Catálogo semilla

Los usuarios nuevos no arrancan con la lista vacía. Puntaje inicial bajo, de modo que los conceptos propios lo desplazan tras 2 o 3 registros.

```
Alimentación   almuerzo · desayuno · cena · café · delivery ·
               mercado · supermercado · pollo · menú · chifa

Transporte     uber · indrive · didi · taxi · combi ·
               metropolitano · gasolina · pasaje · estacionamiento

Servicios      netflix · spotify · internet · luz · agua ·
               celular · icloud · recibo · youtube

Salud          farmacia · inkafarma · doctor · dentista ·
               gimnasio · terapia · medicinas

Educación      curso · libro · universidad · materiales · certificación

Ocio           cine · bar · concierto · videojuego · salida · hobby

Hogar          limpieza · ferretería · mueble · reparación · gas

Compras        ropa · zapatillas · tecnología · regalo · audífonos
```

## Aprendizaje

Si el sistema sugiere una categoría y el usuario la corrige, esa corrección gana peso permanente para ese concepto. Sin pantalla de configuración, sin confirmación.

## Texto fantasma

```
Campo:  alm
Muestra: alm[uerzo]     ← el resto en --ink-soft

Aceptar con: flecha derecha, tecla Tab, o tocar el texto gris
```

---

# 6. Modelo de datos

```js
{
  version: 1,
  settings: {
    activeCurrency, enabledCurrencies[], theme: 'system'|'light'|'dark',
    language: 'es'|'en', balanceHidden: bool, onboardingComplete: bool
  },

  accounts: [{
    id, name, institution, currency,
    kind: 'regular'|'reserve',
    openingMinor, goalMinor?, archived
  }],

  operations: [{
    id, type: 'expense'|'income'|'transfer'|'fx'|'adjustment',
    date,                    // ISO local
    amountMinor, currency,
    accountId,               // o fromAccountId / toAccountId
    concept, category,
    state?,                  // 'normal'|'apuro'|'antojo'|...
    note?, voided
  }],

  upcoming: [{
    id, name, direction: 'out'|'in',
    amountMinor, currency, dueDate,
    recurrence: null | 'monthly' | 'weekly' | 'yearly',
    installments?: { total, current },
    category, countAsFlow, archived
  }],

  concepts: [{                // aprendido, invisible
    text, category, currency,
    count, lastUsed, lastAmountMinor,
    hourHistogram: [24]
  }],

  categories: { expense: [], income: [] },
  budgets: { PEN: { monthlyMinor }, ... },
  rates: {}
}
```

Reglas:

- Todo el dinero en unidades menores, como entero. Nunca decimales flotantes.
- Los saldos jamás se almacenan. Se derivan y se cachean en memoria, invalidando el caché al mutar `operations`.
- `upcoming` sustituye por completo a `fixed` y `debts` de la versión anterior.

## Migración

Se lee `wallet_data_v8` si existe:

```
accounts      → directo
operations    → directo, se descarta el campo mood
fixed         → upcoming con recurrence: 'monthly'
debts         → upcoming con installments
moodCheckins  → se descartan (no eran contemporáneos al gasto)
customProducts→ concepts con count inicial 3
```

Antes de migrar se ofrece descargar un backup JSON.

---

# 7. Voz de la interfaz

Todos los textos viven en un solo archivo, `copy.js`, con claves en español e inglés.

| Situación | Texto |
|---|---|
| Sin movimientos hoy | Todavía no registras nada hoy |
| Sin movimientos nunca | Registra tu primer gasto y esto empieza a tener sentido |
| Error al guardar | No pude guardar eso. Sigue aquí, inténtalo de nuevo |
| Sin conexión | Sin internet. Todo lo que registres se guarda igual |
| Por encima del ritmo | Vas 12% arriba de tu ritmo habitual |
| Por debajo del ritmo | Vas 8% abajo de tu ritmo habitual |
| Sin presupuesto | Define un presupuesto si quieres comparar tu ritmo |
| Guardado | Guardado · S/ 18.00 |
| Deshecho | Listo, revertido |
| Datos insuficientes | Faltan 18 registros para ver este patrón |

Reglas de escritura:

- Sentence case siempre. Nunca mayúsculas.
- Los errores no piden disculpas y nunca son vagos sobre qué pasó.
- Una acción conserva su nombre en todo el flujo: el botón que dice Guardar produce un toast que dice Guardado.
- Ningún signo de exclamación en toda la app.
- Las pantallas vacías son una invitación a actuar, no un estado de ánimo.

---

# 8. Arquitectura técnica

## Stack

```
Vite + JavaScript puro (sin framework)
CSS con variables nativas, un solo archivo de tokens
Sin dependencias de runtime salvo la fuente
```

Motivo: la app tiene menos de 20 pantallas y debe arrancar en menos de 300ms en un teléfono de gama media. Un framework aquí cuesta más de lo que aporta.

## Estructura

```
src/
  main.js
  state/
    store.js          estado + suscripción
    derive.js         saldos, totales, series
    migrate.js
    persist.js
  ui/
    render.js
    screens/          home · movements · analysis · settings
    sheets/           register · account · upcoming · confirm
    components/       keypad · chips · list-row · sheet · toast
  logic/
    predict.js        el motor de las 3 capas
    parse.js          expresiones de texto
    seed.js           catálogo semilla
  ai/
    client.js
    tools.js
  design/
    tokens.css
    icons.svg
  copy.js
```

## Regla que evita el problema anterior

**Cada función se define exactamente una vez.** Está prohibido reasignar funciones globales desde otro archivo. La versión anterior redefinía `renderRegisterSheet` tres veces y `handleAction` tres veces, y de ahí venía la fragilidad.

## Rendimiento

- Los saldos se cachean con invalidación al mutar `operations`.
- Las listas de más de 100 filas se virtualizan.
- La fuente se subconjunta a los caracteres numéricos.
- Presupuesto: menos de 60 KB de JS comprimido.

## PWA

- Service worker con nombre de caché versionado por build. Todos los assets en el manifiesto de precarga, no solo algunos.
- Manifest con `id`, `shortcuts` (Registrar gasto, Ver análisis) y `display: standalone`.
- Ícono maskable con zona segura propia, distinto del ícono normal.

---

# 9. Plan de construcción

| Fase | Contenido | Dónde |
|---|---|---|
| 0 | 16 glifos + pantalla de Registrar | Figma, a mano |
| 1 | Repositorio, tokens, componentes base | Claude Code |
| 2 | Estado, migración, derivación de saldos | Claude Code |
| 3 | Inicio + Registrar + teclado + predicción capas 1 y 2 | Claude Code |
| 4 | Movimientos, Pasado y Por venir | Claude Code |
| 5 | Marca de estado + Análisis | Claude Code |
| 6 | Asistente + predicción capa 3 | Claude Code |
| 7 | PWA, revisión de accesibilidad, exportar | Claude Code |
| 8 | Capacitor para Android | Claude Code |

Fase 3 es la que decide si el producto funciona. Si al terminarla registrar toma 2 taps y se siente instantáneo, todo lo demás es acabado.

---

# 10. Criterios de aceptación

La v1 está lista cuando:

1. Registrar un gasto conocido toma 2 taps y menos de 3 segundos.
2. Las sugerencias aparecen en menos de 150ms sin conexión.
3. La app arranca en menos de 300ms con 1,000 movimientos cargados.
4. Todo funciona completamente sin conexión salvo la capa 3 de predicción.
5. Ninguna pantalla usa emojis.
6. Existe un estado vacío escrito para cada lista de la app.
7. `prefers-reduced-motion` desactiva todo el movimiento.
8. El foco de teclado es visible en cada elemento interactivo.
9. Los datos de la versión anterior migran sin pérdida.
10. Ninguna cifra mostrada al usuario proviene de un modelo de lenguaje.
