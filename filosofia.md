# MASTER PROMPT — WALLET
## Sistema integral de diseño, UX, UI, interacción, personalidad, IA y evolución del producto — edición 2026

> **Propósito:** este documento define cómo debe diseñarse, evolucionar, implementar y evaluar Wallet. No es solamente una guía visual. Es el criterio de producto que debe utilizar cualquier diseñador, desarrollador o agente de IA que modifique la aplicación en el futuro.
>
> **Regla central:** Wallet debe sentirse como una aplicación financiera personal extraordinariamente cuidada, no como una plantilla de dashboard, no como un “AI SaaS”, no como una copia de una marca existente y tampoco como un producto diseñado únicamente para producir una captura de pantalla bonita.
>
> **Resultado buscado:** cuando alguien vea Wallet, debe percibir precisión, calma, control, personalidad y cuidado. Cuando la utilice, debe sentir que las funciones están exactamente donde las esperaba y que el producto desaparece detrás de la tarea.

---

# 0. CONTEXTO DEL PRODUCTO

Wallet es una aplicación web mobile-first de finanzas personales, concebida para utilizarse principalmente desde un smartphone y, especialmente, como PWA instalada desde Safari en iPhone. El producto es personal-first y local-first: la información financiera debe permanecer principalmente en el dispositivo del usuario. La aplicación puede sincronizar únicamente los datos mínimos necesarios para servicios concretos como Web Push, pero no debe depender de un servidor central para manejar el patrimonio del usuario.

Wallet permite registrar ingresos y gastos, manejar múltiples cuentas y monedas, separar dinero disponible de dinero reservado sin dejar de considerarlo parte del patrimonio líquido, realizar transferencias y cambios de divisa, manejar deudas y cobros, metas, presupuestos, gastos fijos, análisis, estado emocional y una capa de inteligencia artificial basada en Gemini.

La moneda no es simplemente un atributo decorativo. Es un contexto financiero independiente. PEN y USD funcionan como espacios separados. Una cuenta BBVA en PEN y una cuenta BBVA en USD son cuentas diferentes. No se deben sumar como si fueran una única cifra. El cambio entre divisas es una operación explícita con una tasa registrada.

El objetivo del diseño es reducir la fricción de las tareas financieras cotidianas sin reducir la profundidad del producto.

---

# 1. LA VISIÓN EN UNA FRASE

> **Wallet es un espacio tranquilo y preciso para entender dónde está tu dinero, qué estás haciendo con él y cómo se relaciona con tu vida, sin obligarte a pensar en la interfaz.**

La sensación principal que debe producir es:

> **“Todo está exactamente donde debería estar.”**

La segunda sensación es:

> **“Esto está hecho con cuidado.”**

La tercera:

> **“Puedo confiar en lo que estoy viendo.”**

Nunca debe producir:

- ansiedad financiera;
- sensación de culpa;
- saturación;
- infantilización;
- apariencia corporativa genérica;
- apariencia de “AI dashboard”; 
- sensación de plantilla;
- interfaz experimental difícil de entender;
- sensación de que el producto quiere impresionar más de lo que quiere ayudar.

---

# 2. ORIGEN DEL LENGUAJE VISUAL

El lenguaje actual de Wallet no proviene de copiar una interfaz concreta. Nació de una combinación deliberada de principios de varias escuelas y productos.

La inspiración conceptual principal se construyó sobre cinco referencias:

## Vercel / Geist → precisión visual

De Vercel tomamos la obsesión por la consistencia de tipografía, grid, jerarquía y color. El sistema Geist trata tipografía como un conjunto coordinado de tamaño, interlineado, tracking y peso, en lugar de escoger tamaños arbitrarios. Vercel también utiliza un sistema de color con jerarquías claras para fondo, superficie, borde, iconos y texto. Esto inspira la disciplina visual de Wallet, no una copia estética literal.

Referencia:
- Vercel Geist Design System
- Geist Typography
- Geist Colors
- Geist Grid

En Wallet, esta influencia se traduce en: números financieros protagonistas, pocas escalas tipográficas bien definidas, superficies sutilmente diferenciadas, grid predecible, espacios coherentes y color funcional.

## Stripe → arquitectura de producto y claridad

De Stripe tomamos el principio de que un sistema de diseño debe limitar la arbitrariedad para conservar coherencia y accesibilidad. Stripe proporciona tokens y patrones para que diferentes superficies se sientan parte del mismo producto. En Wallet eso se traduce en componentes repetibles, jerarquías consistentes y reglas claras de interacción.

Referencia:
- Stripe Apps Design
- Stripe Apps Styling

La influencia no significa usar el estilo visual de Stripe. Significa diseñar como un sistema.

## Apple → naturalidad, contexto y plataforma

De Apple tomamos la idea de que una interfaz móvil debe aprovechar los comportamientos que el usuario ya conoce. Tap, swipe, drag y navegación contextual no son decoración; forman parte de la gramática del dispositivo. Apple recomienda controles cómodos, feedback inmediato, alternativas a gestos y coherencia con el sistema operativo.

También tomamos la naturalidad del movimiento: una hoja inferior debe parecer continuar el espacio de la aplicación; una navegación debe conservar el contexto; una acción debe sentirse físicamente ligada a lo que acaba de ocurrir.

En Wallet esto justifica:
- bottom navigation móvil;
- hojas desde abajo;
- safe areas;
- gestos sencillos;
- estados pressed/focus;
- animaciones cortas;
- adaptación real al iPhone;
- respeto a reduced motion;
- touch targets adecuados.

## Linear → calma, densidad controlada y poda

Linear es una referencia especialmente importante para la evolución de Wallet. En su refresh de marzo de 2026 describió una idea que coincide con el problema que Wallet ha experimentado durante su evolución: un producto puede degradarse no por una gran mala decisión, sino porque cada nueva función añade “un control más, otro estado, otra excepción” hasta generar ruido e inconsistencia.

Wallet debe seguir esa disciplina: cada función nueva debe justificar su presencia y las mejoras deben podar, agrupar o simplificar cuando corresponda.

Linear demuestra también otra idea importante: una interfaz puede ser densa en información sin sentirse pesada si la jerarquía visual está bajo control y las zonas secundarias retroceden.

## Awwwards → dirección artística, composición y momentos memorables

Awwwards se utiliza como referencia para art direction, ritmo, tipografía, composición, motion, narrativa visual y detalles inesperados. No se debe copiar la navegación experimental o el exceso de animación que puede aparecer en algunos sitios de exhibición.

Wallet puede tomar de Awwwards el nivel de cuidado y no necesariamente los patrones.

La regla es:

> **Awwwards visual quality + product-grade usability.**

---

# 3. REFERENCIAS 2026 QUE INFORMAN LA EVOLUCIÓN ACTUAL

La dirección de Wallet también debe actualizarse según la discusión real de diseño de 2026.

## Apple Design Awards 2026

Los Apple Design Awards 2026 reconocieron 12 apps y juegos entre 36 finalistas en seis categorías. Para Wallet interesan especialmente dos: Interaction y Visuals and Graphics.

Moonlitt: Moon Phase Tracker ganó Interaction y fue descrita por Apple como una experiencia con interfaz elegante, onboarding sencillo e interacción adaptada a la plataforma.

Tide Guide: Charts & Tables ganó Visuals and Graphics y fue destacado por una presentación clara de datos, gráficos a pantalla completa, animación personalizada y una temática coherente.

La lección para Wallet no es “usar Liquid Glass”. La lección es más profunda:

1. la interacción debe sentirse natural para la plataforma;
2. el onboarding debe ser fácil;
3. los gráficos pueden ser visuales sin perder claridad;
4. la animación funciona mejor cuando está integrada con el lenguaje del producto;
5. la calidad no depende de adornar cada superficie.

## Figma State of the Designer 2026

Figma encuestó a 906 diseñadores. En su investigación, 91% indicó que las herramientas de IA mejoran sus diseños, 89% dijo trabajar más rápido y 80% que colabora mejor. Pero la misma investigación destaca que el oficio sigue siendo una dimensión diferencial: los diseñadores relacionan craft con detalle, precisión, resolución de problemas, intuición, emoción y coherencia.

Otra investigación de Figma de junio de 2026, con 8,403 respuestas y 639 entrevistas cualitativas, señala que 90% considera que el diseño es al menos tan importante como antes de la IA y casi seis de cada diez dicen que es más importante.

La consecuencia para Wallet es fundamental:

> **La IA aumenta la velocidad con la que podemos producir interfaces; por eso el criterio para decidir qué merece existir se vuelve más importante, no menos.**

## NN/g — “The Custodial Era of UX”

Nielsen Norman Group describió en agosto de 2026 una “custodial era” en la que la IA permite construir más rápido de lo que UX puede evaluar. Su advertencia central es que la velocidad de producción puede generar UX debt: demasiadas funciones, decisiones poco refinadas y sistemas difíciles de controlar.

Wallet debe combatir exactamente ese fenómeno.

Cada vez que la IA proponga una función, la pregunta no es:

> “¿Podemos construirla?”

sino:

> **“¿Debe existir y mejora realmente la experiencia?”**

## CSS Design Awards 2026 — Agent Inspector

Agent Inspector se presentó como un pattern library editorial para diseñar interfaces de agentes de IA confiables mediante confianza, control y recuperación. Sus etiquetas fueron minimal, responsive y typographic.

Esto es directamente relevante para Wallet Intelligence: la interfaz de IA debe explicar qué está haciendo, permitir intervenir y ofrecer recuperación, no simplemente producir una respuesta impresionante.

## CSS Design Awards 2026 — Hobro Digital

Hobro Digital fue reconocido por una experiencia limpia, mínima y animada. Sus resultados de jurado muestran una buena relación entre UI, UX e innovación. El aprendizaje para Wallet es que minimalismo y motion pueden convivir, pero la puntuación de UX no debe asumirse automáticamente por el hecho de que algo se vea sofisticado.

## Awwwards 2026

Los trabajos destacados de Awwwards y su ecosistema siguen mostrando una evolución hacia combinaciones de:
- composición editorial;
- tipografía con presencia;
- motion selectivo;
- sistemas visuales propios;
- narrativa de datos;
- interacción rica.

Wallet puede aprender de esto sin convertirse en un sitio de showcase.

---

# 4. LA FILOSOFÍA CENTRAL: MINIMALISMO FUNCIONAL

Wallet no practica minimalismo vacío.

No se elimina un elemento simplemente porque “hace la pantalla más bonita”.

La pregunta correcta es:

> **¿Este elemento reduce incertidumbre, facilita una acción, mejora orientación, comunica estado, da contexto, aporta identidad o ayuda a comprender?**

Si la respuesta es no, eliminarlo.

Si la respuesta es sí, mantenerlo aunque aumente ligeramente la densidad.

La regla:

> **Eliminar ruido, no funcionalidad.**

Una interfaz ligeramente más llena pero inmediatamente comprensible es mejor que una interfaz visualmente perfecta que obliga al usuario a buscar.

---

# 5. PERSONALIDAD VISUAL DE WALLET

Wallet debe permanecer entre:

**sobriedad** ←→ **personalidad**

pero no entre:

**sobriedad** ←→ **espectáculo**.

La mayor parte de Wallet debe sentirse:

- calmada;
- precisa;
- armónica;
- silenciosamente premium;
- humana;
- deliberada.

Los momentos especiales pueden tener un poco más de personalidad:
- completar una meta;
- descubrir un patrón;
- terminar una revisión semanal;
- hacer un cambio de divisa;
- descubrir una relación entre emoción y gasto.

La personalidad no debe estar repartida por todas partes. Debe aparecer en 2–4 firmas visuales coherentes.

---

# 6. LA PRIMERA FIRMA DE WALLET: EL DINERO COMO ELEMENTO VISUAL

El dinero no es un número secundario dentro de una tarjeta.

El número es parte central de la identidad visual.

Ejemplo:

**S/ 8,420.50**

Los saldos importantes deben recibir:
- escala tipográfica relevante;
- excelente alineación;
- tabular numerals cuando corresponda;
- espacios limpios;
- contraste alto;
- tratamiento consistente de símbolo, entero y decimales.

No adornar innecesariamente el número.

No poner enormes ilustraciones detrás del saldo.

La cifra ya es el elemento visual.

---

# 7. SEGUNDA FIRMA: GEOMETRÍA FINANCIERA + ORGANICIDAD EMOCIONAL

Wallet tiene una oportunidad de diferenciación propia porque su producto no maneja solamente dinero.

El dinero es:
- preciso;
- cuantificado;
- geométrico;
- ordenado.

La emoción es:
- variable;
- contextual;
- orgánica;
- subjetiva.

Esta tensión debe convertirse en parte de la dirección artística.

Los gráficos financieros pueden utilizar geometría, líneas, barras y números.

Los estados emocionales pueden utilizar:
- gradientes muy sutiles;
- puntos;
- campos de intensidad;
- curvas;
- pequeñas variaciones orgánicas.

No utilizar emojis como sustituto del lenguaje visual principal.

Los emojis pueden aparecer puntualmente en un selector rápido si realmente mejoran la velocidad, pero no deben ser la visualización analítica.

---

# 8. TERCERA FIRMA: CAMBIO DE CONTEXTO

Wallet debe sentirse consciente del contexto actual.

Si el usuario está en PEN, PEN domina la interfaz.

Si está en USD, USD domina.

Si está viendo una cuenta, esa cuenta domina.

Si está analizando agosto, agosto domina.

No hacer que cada pantalla muestre todas las posibilidades al mismo tiempo.

La interfaz debe responder al contexto actual.

Esto reduce carga cognitiva y permite una estructura progresiva.

---

# 9. CUARTA FIRMA: “SMART, BUT QUIET”

La inteligencia de Wallet debe ser perceptible por el resultado, no por adornos de IA.

No:

> ✨ AI Assistant

Sí:

> “Tu gasto en restaurantes está 24% por encima de tu promedio reciente.”
>
> **Entender →**

No:

> “Powered by AI” en cada esquina.

Sí:

> **Wallet entendió lo que quisiste registrar.**

La IA debe sentirse incorporada al producto y no añadida encima.

---

# 10. SISTEMA CROMÁTICO

La base de Wallet es predominantemente neutral.

La jerarquía primaria debe derivarse de:
- fondo;
- superficie;
- superficie elevada;
- borde;
- texto primario;
- texto secundario;
- texto terciario.

Los colores fuertes aparecen cuando comunican algo.

Usos válidos:
- acento;
- selección;
- estados;
- categorías;
- gráficos;
- emoción;
- reserva;
- advertencia;
- peligro;
- éxito.

Nunca depender solamente del color para transmitir significado.

Cada señal cromática debe tener al menos otra señal:
- texto;
- icono;
- posición;
- patrón;
- forma;
- etiqueta.

Wallet debe soportar:
- System;
- Light;
- Dark.

Y temas sutiles:
- Forest;
- Ocean;
- Violet;
- Warm;
- Neutral.

Un tema no es un skin. La arquitectura visual permanece igual y solamente cambia una pequeña parte del acento, foco, highlight, gráficos y estados.

---

# 11. LIGHT MODE

No usar blanco absoluto indiscriminadamente.

La interfaz debe distinguir visualmente entre:

`background`

`surface`

`surface-elevated`

`border`

`text-primary`

`text-secondary`

`text-tertiary`

El contraste debe ser suficiente sin convertir todos los elementos en negro puro.

La profundidad se logra principalmente mediante:
- contraste;
- composición;
- separación;
- superficie;
- borde sutil.

---

# 12. DARK MODE

Dark mode no es “invertir colores”.

Debe diseñarse deliberadamente.

Base:
- negro/casi negro;
- superficies ligeramente diferentes;
- bordes sutiles;
- texto alto contraste;
- color funcional cuidadosamente limitado.

No usar sombras oscuras gigantes para crear profundidad.

La profundidad debe provenir principalmente de relaciones entre superficies.

---

# 13. TIPOGRAFÍA: POR QUÉ SE ELIGIÓ EL SISTEMA DEL IPHONE

Originalmente se consideró Geist Sans por su relación con precisión, claridad y minimalismo. Sin embargo, para una PWA de uso principal en iPhone existe una razón fuerte para priorizar la pila nativa del sistema:

`-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

Esta solución evita inconsistencias cuando una fuente remota no carga, elimina dependencia innecesaria para una app local-first y acerca el tacto tipográfico a iOS.

En la implementación actual de Wallet la pila tipográfica se unificó explícitamente para body, buttons, inputs, selects y textareas; esto se hizo para corregir el problema observado de elementos con apariencia tipográfica dispareja. 

La principal lección es:

> **una fuente correcta no sirve si cada componente utiliza una escala diferente. La coherencia tipográfica proviene del sistema, no solo de la familia.**

La jerarquía debe trabajar con:
- tamaño;
- weight;
- line-height;
- letter-spacing;
- color;
- anchura;
- densidad.

No deben existir títulos grandes arbitrarios.

Los números financieros reciben una jerarquía propia.

Las etiquetas deben ser discretas.

Los textos secundarios nunca deben competir con el dato principal.

---

# 14. ESCALA TIPOGRÁFICA

Establecer una escala pequeña y consistente.

Ejemplo orientativo:

- micro: 9–10px;
- label: 10–12px;
- body: 13–16px;
- body strong: 14–16px;
- section title: 14–18px;
- page title: 24–36px;
- numeric hero: adaptable 40–56px.

Estos valores son orientativos, no dogmas. La regla importante es que cada nivel tenga una función clara.

Evitar mezclar en una misma pantalla:
- labels de 8px;
- descripciones de 10px;
- títulos de 17px;
- botones de 13px;
- subtítulos de 9px;

sin una razón estructural.

La tipografía debe parecer una única voz.

---

# 15. ESPACIADO

El sistema base de Wallet utiliza una progresión aproximadamente basada en:

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`

No colocar márgenes arbitrarios.

El espacio debe comunicar:
- pertenencia;
- separación;
- cambio de nivel;
- descanso;
- prioridad.

Regla:

**menos espacio dentro de una unidad, más espacio entre unidades conceptuales.**

Ejemplo:

Nombre de cuenta + institución = cerca.

Cuenta A + Cuenta B = más separación.

Sección “Cuentas” + “Análisis” = separación mayor.

---

# 16. RADIOS

Wallet usa radios contenidos:

- 4px → microcontroles;
- 6–8px → inputs/botones;
- 8–10px → superficies;
- 12–14px → componentes grandes cuando realmente representan una superficie independiente;
- 999px → elementos que realmente son circulares o pills.

No usar radius gigante por defecto.

Una interfaz financiera se beneficia de precisión geométrica.

---

# 17. CARDS: NO TODO DEBE SER UNA CARD

Una card existe para representar una unidad conceptual independiente.

No convertir:

- cada métrica;
- cada configuración;
- cada movimiento;
- cada insight;
- cada botón;

en una card.

Usar primero:
- composición;
- whitespace;
- alineación;
- tipografía;
- divisores;
- agrupación;
- contraste.

La interfaz actual de Wallet ya utiliza divisores y listas para muchas áreas. Esa dirección debe mantenerse.

---

# 18. POR QUÉ LAS CUENTAS SE VEN COMO LISTAS Y NO COMO TARJETAS GRANDES

Una cuenta es un objeto repetido.

Las listas permiten:
- comparar rápidamente;
- conservar densidad;
- escanear muchos objetos;
- mantener altura compacta;
- evitar exceso de decoración.

La fila de cuenta debe tener:

**identificador visual** → **nombre** → **contexto** → **saldo**

El nombre debe estar claramente separado del contexto.

Nunca producir textos como:

`BBVABBVAPEN · Disponible`

El nombre es una línea.

El contexto es otra línea.

El saldo está alineado al extremo contrario.

---

# 19. CUENTAS Y AHORRO

Una cuenta normal es dinero disponible.

Una reserva/meta es dinero reservado.

Pero ambos forman parte del patrimonio líquido de la moneda.

Ejemplo:

BBVA Soles → S/ 4,000

Yape → S/ 500

Viaje → S/ 1,500 reservado

Patrimonio líquido PEN = S/ 6,000

La UI debe mostrar esto claramente.

No ocultar las reservas del patrimonio.

No contarlas como gasto.

No convertir una transferencia a reserva en un “consumo”.

---

# 20. REGISTRO: LA ACCIÓN MÁS IMPORTANTE DE WALLET

Registrar dinero es una de las funciones nucleares.

El flujo debe ser rápido.

Orden recomendado:

1. monto;
2. gasto/ingreso;
3. concepto;
4. cuenta;
5. categoría automática;
6. detalles opcionales;
7. estado emocional heredado automáticamente.

La interfaz no debe pedir 15 campos al principio.

Debe utilizar progressive disclosure.

---

# 21. REGISTRO POR LENGUAJE NATURAL

Wallet debe permitir algo como:

> `uber 18`

> `ayer almuerzo 28`

> `netflix 34.90`

> `gasté 45 en inkafarma`

> `me pagaron 800 dólares y los puse en BBVA`

Primero:

**parser local → historial → catálogo → reglas personales**

Solo si existe incertidumbre real:

**Gemini**.

Esto reduce latencia y consumo y hace que la IA funcione como ampliación, no como dependencia.

---

# 22. INTELIGENCIA DEL CATÁLOGO

El catálogo no debe ser una lista infinita y rígida.

Debe convertirse progresivamente en un catálogo personal.

Wallet debe aprender:

`Uber → Transporte → Taxi/apps`

`Starbucks → Alimentación → Café`

`Tottus → Alimentación → Supermercado`

`Inkafarma → Salud → Farmacia`

El sistema debe priorizar:

1. historial personal;
2. productos personalizados;
3. catálogo general.

Si el usuario corrige una sugerencia, Wallet debe aprender la corrección localmente.

Gemini puede ayudar a interpretar nuevos conceptos, pero no debe ser llamado para un concepto que Wallet ya conoce con suficiente confianza.

---

# 23. CATÁLOGO: COMPLETITUD SIN RUIDO

El catálogo base debe ser suficientemente completo para no obligar a crear todo manualmente, pero no tan enorme que el buscador se vuelva inútil.

Debe cubrir:

### Alimentación
- supermercado;
- restaurantes;
- delivery;
- café;
- snacks;
- productos básicos;
- comercios recurrentes.

### Transporte
- taxi/apps;
- transporte público;
- combustible;
- estacionamiento;
- peajes;
- mantenimiento;
- seguros y trámites relevantes.

### Servicios
- luz;
- agua;
- internet;
- celular;
- streaming;
- software;
- IA.

### Salud
- farmacia;
- consulta;
- dentista;
- terapia;
- gimnasio;
- seguro.

### Educación
- cursos;
- libros;
- universidad;
- materiales;
- certificaciones.

### Ocio
- cine;
- eventos;
- videojuegos;
- hobbies;
- salidas.

### Compras
- ropa;
- calzado;
- tecnología;
- cuidado personal;
- regalos.

### Viajes
- vuelos;
- hoteles;
- transporte;
- comidas;
- eSIM/roaming;
- seguro;
- equipaje.

### Mascotas, Hogar, Finanzas, Familia y Otros

El catálogo debe admitir nombres generales y comercios concretos.

---

# 24. MOVIMIENTOS

La pantalla Movimientos debe ser una herramienta, no solamente un archivo histórico.

Debe poder filtrar:
- divisa;
- periodo;
- gasto;
- ingreso;
- transferencia;
- cambio de divisa;
- ajustes;
- categoría;
- cuenta;
- texto.

La búsqueda debe aceptar texto normal y, progresivamente, lenguaje natural.

Cada resultado debe llevar al detalle real.

---

# 25. FECHAS

Las fechas deben utilizar componentes nativos o controles visualmente alineados con Wallet, nunca parecer widgets pertenecientes a otra aplicación.

Usar:
- 16px de texto en inputs;
- line-height coherente;
- padding consistente;
- border y surface propios de Wallet;
- focus visible;
- localización en español;
- no depender de un estilo de navegador sin normalizar.

Las fechas deben trabajar en hora local del usuario y no depender de UTC para decidir qué significa “hoy”.

Las fechas históricas deben conservar su contexto original.

---

# 26. CAMBIO DE DIVISAS

PEN y USD no se mezclan.

La aplicación debe mostrar un contexto por moneda.

Un cambio de divisa debe sentirse como un puente entre dos espacios:

`BBVA Soles → BBVA Dólares`

La tasa automática es una referencia.

El usuario puede modificarla.

La operación registra:
- divisa origen;
- monto origen;
- divisa destino;
- monto destino;
- tasa usada;
- tasa referencial si existe;
- cuentas involucradas;
- fecha.

Nunca recalcular movimientos históricos usando la tasa de hoy.

---

# 27. DEUDAS Y COMPROMISOS

Wallet soporta:

**Yo debo**

**Me deben**

Estados:
- pendiente;
- parcial;
- pagada/cobrada;
- vencida.

Debe admitir:
- fecha única;
- cuotas;
- pagos parciales;
- fecha de vencimiento;
- asociación con cuenta;
- historial de pagos.

Una deuda no modifica artificialmente el saldo líquido antes de que el dinero se mueva.

La agenda muestra compromisos futuros.

Cuando se paga realmente, se crea la operación correspondiente.

---

# 28. AGENDA FINANCIERA

Planifica debe mostrar una agenda contextual:

- deudas;
- cuotas;
- gastos fijos;
- ingresos fijos;
- cobros.

No debe ser un calendario lleno de cuadrados si eso no aporta.

Debe priorizar:

**qué viene**

**cuándo**

**cuánto**

**si está pendiente**

Ejemplo:

> 15 sep · Laptop · S/400 · pendiente

---

# 29. SISTEMA EMOCIONAL

No obligar al usuario a evaluar cinco dimensiones en cada compra.

La compra debe heredar automáticamente el estado emocional vigente.

El usuario realiza check-ins de manera independiente.

La medición recomendada para el sistema:

- valencia/bienestar;
- energía/activación;
- tensión;
- etiquetas emocionales opcionales;
- nota opcional.

Un mapa bienestar–energía puede dar la percepción global.

Un control rápido de tensión añade profundidad.

Las etiquetas permiten contexto sin obligar a describirlo todo.

---

# 30. CHECK-INS POR INTERVALOS

El objetivo del sistema emocional no es medir al usuario constantemente.

El objetivo es construir un contexto temporal suficientemente útil para analizar compras.

Horario recomendado inicial:

- mañana;
- mediodía;
- tarde;
- noche.

Los horarios deben adaptarse a las horas habituales de despertar y dormir.

Regla inteligente:

> si el usuario hizo un check-in recientemente, no preguntar de nuevo demasiado pronto.

Regla importante:

> si el usuario no responde, el estado anterior sigue vigente, pero Wallet conoce su antigüedad.

Así una compra puede conservar:

`estado vigente + edad del contexto`

---

# 31. “SIGUE IGUAL”

El botón “Sigo igual que antes” es importante porque reduce el costo cognitivo.

No debe interpretarse como una nueva evaluación subjetiva compleja.

Debe:

1. duplicar el estado anterior;
2. actualizar el timestamp;
3. marcar que fue reconfirmado;
4. no modificar artificialmente valores;
5. crear una nueva observación temporal.

Eso permite decir:

> “Mi estado era parecido a las 09:30 y volvió a confirmarse a las 13:30.”

sin obligar a mover sliders.

---

# 32. NOTIFICACIONES

Las notificaciones reales son un recordatorio externo, no parte del dashboard.

Wallet puede usar Web Push para:
- check-ins;
- vencimientos;
- revisión semanal.

Pero no debe bombardear.

Reglas:

- máximo cuatro check-ins diarios por defecto;
- si hubo check-in reciente, suprimir el siguiente cercano;
- si se ignora una notificación, no perseguir inmediatamente;
- horario silencioso durante la noche;
- posibilidad de editar frecuencia;
- posibilidad de desactivar cada categoría de notificación.

La autorización debe solicitarse después de una acción explícita del usuario.

---

# 33. HOME

La Home no debe ser un dashboard corporativo.

Debe ser una lectura rápida de lo importante.

Orden conceptual:

1. moneda/contexto;
2. patrimonio líquido;
3. estado emocional;
4. acciones rápidas;
5. cuentas;
6. reservas;
7. compromisos próximos;
8. estado del mes;
9. insights relevantes;
10. actividad reciente.

No todas las secciones deben tener el mismo peso visual.

El saldo es dominante.

El resto ayuda a interpretarlo.

---

# 34. NAVEGACIÓN

Móvil:

**Inicio · Movimientos · + · Planifica · Análisis**

Ajustes vive fuera de la barra principal porque es secundario.

La acción de registrar está especialmente accesible.

El gesto horizontal puede cambiar entre las vistas principales, pero no debe ser la única forma de navegación.

Siempre deben existir botones y tabs visibles.

---

# 35. SWIPE Y GESTOS

Apple recomienda ofrecer más de una manera de interactuar y no utilizar un gesto como único camino para una función importante.

Por tanto:

- swipe derecha→izquierda: siguiente sección;
- swipe izquierda→derecha: sección anterior;
- tap en navegación: siempre disponible;
- gestos en elementos internos: solo si no entran en conflicto.

Nunca interceptar swipe cuando el usuario está:
- escribiendo en un textarea;
- moviendo un slider;
- desplazando contenido horizontalmente intencionalmente;
- interactuando con un selector;
- utilizando una hoja modal con scroll interno.

El gesto debe tener una distancia mínima y una velocidad razonable para que pequeños movimientos no cambien de pantalla accidentalmente.

Además, el cambio debe incluir una transición direccional breve.

---

# 36. MOTION SYSTEM

Tres referencias:

### Apple → continuidad

El movimiento explica cómo un objeto llega a su nuevo estado.

### Linear → velocidad

Las interacciones frecuentes deben sentirse casi instantáneas.

### Awwwards → momentos

Las experiencias especiales pueden tener una animación más memorable.

Regla:

> cuanto más frecuente sea una interacción, menos debe estorbar su animación.

Duraciones orientativas:

- micro-feedback: 80–140ms;
- transición simple: 160–220ms;
- sheet/modal: 220–320ms;
- momento especial: hasta 450–600ms solo si tiene sentido.

Respetar `prefers-reduced-motion`.

---

# 37. INTERACCIONES TÁCTILES

Cada control personalizado debe tener:

- estado normal;
- hover cuando corresponda;
- focus;
- pressed;
- disabled;
- success/error cuando corresponda.

La pulsación puede utilizar:

- ligera reducción de escala;
- cambio sutil de superficie;
- cambio de borde;
- feedback de color.

Nunca exagerar.

Apple recomienda un área de interacción de 44×44pt para controles en iOS. Wallet debe usar este tamaño como referencia y, especialmente, cuidar el espacio entre controles, no solamente su tamaño.

---

# 38. FEEDBACK

Nunca dejar al usuario pensando:

> “¿Funcionó?”

Estados apropiados:

`Guardando...`

`Guardado`

`Registrado · Deshacer`

`Cambio preparado`

`Tasa actualizada`

El feedback debe estar cerca de la acción cuando sea posible.

Toast solo para confirmaciones ligeras.

Modal cuando la decisión es realmente importante.

---

# 39. ERRORES

No mostrar:

`HTTP 429`

al usuario final.

Debe decir:

> No pudimos usar Gemini temporalmente. Puedes intentarlo de nuevo en unos segundos.

Y, si corresponde:

> El límite de tu proyecto de Gemini se alcanzó. Wallet sigue funcionando sin IA.

Los errores deben explicar:

**qué ocurrió + qué significa + qué puedo hacer.**

---

# 40. GEMINI: MODELO MENTAL

Gemini no es la interfaz.

Gemini no es la fuente primaria de verdad.

Gemini no sustituye el ledger.

Gemini no sustituye el cálculo local.

Gemini es una capa de inteligencia que ayuda a Wallet a:

- interpretar lenguaje natural;
- clasificar conceptos;
- entender intención;
- explicar patrones;
- realizar acciones mediante herramientas;
- consultar información externa cuando corresponde;
- ayudar al usuario a planificar;
- adaptar la aplicación al lenguaje del usuario.

La regla:

> **Wallet sabe. Gemini interpreta, explica y ayuda a actuar.**

---

# 41. GEMINI NO DEBE SER UN CHATBOT AISLADO

La interfaz principal continúa siendo Wallet.

No añadir una pestaña enorme llamada “AI”.

El asistente conversacional puede existir como puerta explícita:

**Preguntar a Wallet**

Pero la mayor parte de la IA vive detrás de las funciones existentes.

Ejemplos:

### Registro

`uber 18` → clasificación automática.

### Catálogo

`inkafarma` → Salud → Farmacia.

### Deudas

`Juan me debe 300 para el 15.`

### Planificación

`¿Cuánto tengo que ahorrar para llegar a 2000 dólares en diciembre?`

### Análisis

`¿Por qué subieron mis restaurantes?`

### Búsqueda

`gastos de Uber mayores a 20 este mes.`

El usuario no necesita abrir un chat para que la IA exista.

---

# 42. HERRAMIENTAS DE GEMINI

Herramientas de lectura posibles:

- `consultar_saldos`
- `consultar_cuentas`
- `buscar_movimientos`
- `consultar_resumen`
- `comparar_periodos`
- `consultar_presupuesto`
- `consultar_deudas`
- `consultar_agenda`
- `consultar_metas`
- `consultar_contexto_emocional`
- `consultar_tipo_cambio`

Herramientas de acción posibles:

- `registrar_movimiento`
- `crear_cuenta`
- `crear_meta`
- `transferir`
- `cambiar_divisa`
- `crear_deuda`
- `registrar_pago_deuda`
- `crear_categoria`
- `crear_producto`
- `actualizar_presupuesto`
- `registrar_checkin`

El modelo no debe recibir todos los datos indiscriminadamente.

---

# 43. CONTEXTO DINÁMICO DE IA

Cada consulta debe incluir únicamente el contexto necesario.

Ejemplo:

> “¿Cuánto tengo en USD?”

Contexto: cuentas USD.

No enviar deudas ni emociones.

Ejemplo:

> “¿Por qué gasté más en restaurantes?”

Contexto: operaciones relevantes, comparativo y metadatos estadísticos.

Ejemplo:

> “¿Qué debo pagar esta semana?”

Contexto: compromisos de los próximos siete días.

Esto reduce:
- tokens;
- coste;
- latencia;
- exposición de datos;
- posibilidad de confusión.

---

# 44. IA Y CÁLCULOS

Gemini no debe sumar gastos mentalmente cuando Wallet puede hacerlo de forma exacta.

El patrón correcto es:

**Wallet calcula → Gemini explica.**

Ejemplo:

Wallet devuelve:

`gasto_actual = S/ 2,418`

`gasto_anterior = S/ 2,741`

`variación = -11.8%`

Gemini explica:

> Gastaste aproximadamente 12% menos que en el periodo anterior.

La matemática pertenece al sistema financiero.

---

# 45. IA Y BÚSQUEDA WEB

Wallet puede utilizar internet cuando la pregunta realmente requiere información externa y actual.

Ejemplos:

- precio actual de un producto;
- tipo de cambio de referencia;
- condiciones de una suscripción;
- información externa que dé contexto a un gasto.

No usar web para preguntas que Wallet puede contestar localmente.

No incluir datos personales en consultas de búsqueda externas salvo que sea absolutamente necesario y el usuario lo haya solicitado de forma explícita.

Cuando se use la web, mostrar fuentes.

Cuando no se use:

`Basado en tus datos de Wallet`

Esto ayuda a mantener un modelo mental correcto.

---

# 46. IA Y CONFIRMACIÓN

### Consulta

No requiere confirmación.

### Acción reversible y rutinaria

Puede ejecutarse y mostrar `Deshacer`.

### Acción importante o destructiva

Pedir confirmación.

Ejemplos:

- eliminar movimiento;
- cambio de divisa;
- pago de deuda;
- ajuste grande de saldo;
- restaurar datos.

La confirmación debe mostrar exactamente qué ocurrirá.

---

# 47. IA Y CATEGORIZACIÓN

El usuario puede escribir incorrectamente un nombre.

Wallet debe intentar:

1. coincidencia exacta;
2. coincidencia normalizada sin acentos;
3. coincidencia difusa sencilla;
4. historial personal;
5. Gemini solo si sigue sin ser suficiente.

La IA puede responder:

> Parece que “Inkafarma” corresponde a Salud → Farmacia.

No debe convertir una tarea de un segundo en una conversación de diez segundos.

---

# 48. IA CONTEXTUAL EN ANÁLISIS

En lugar de un botón gigante “Preguntar a IA”, usar acciones:

- Entender;
- Comparar;
- Explorar patrón;
- ¿Qué cambió?;
- ¿Cómo llegaste a este número?

La IA debe aparecer junto al dato que explica.

---

# 49. IA COMO CAPA DE NAVEGACIÓN

Si el usuario dice:

> “Muéstrame mis gastos de Uber de agosto.”

Wallet debería poder:

1. entender intención;
2. aplicar filtro;
3. abrir Movimientos;
4. mostrar resultados.

La respuesta no tiene que terminar en un chat.

---

# 50. PERSONALIZACIÓN OPERATIVA

Wallet puede aprender:

- cuenta habitual por concepto;
- categoría habitual;
- producto frecuente;
- nombres que el usuario utiliza;
- relaciones entre concepto y comercio;
- preferencias de moneda.

La memoria debe ser operativa, no psicológica.

No crear un perfil psicológico oculto.

No almacenar inferencias personales que no sean necesarias para la función.

---

# 51. ANÁLISIS: OBJETIVO

Análisis no es un museo de gráficos.

Debe responder:

**¿Qué pasó?**

**¿Cuándo?**

**¿Dónde se fue?**

**¿Cómo va?**

**¿Qué cambió?**

**¿Qué contexto importa?**

**¿Qué puedo entender mejor?**

---

# 52. ESTRUCTURA DEL DASHBOARD DE ANÁLISIS

1. Resumen del periodo.
2. Evolución del gasto.
3. Dónde se fue.
4. Cuándo se concentró.
5. Ritmo del presupuesto.
6. Cómo está distribuido el dinero.
7. Compromisos.
8. Contexto emocional.
9. Insights.

No todos deben tener el mismo peso.

La gráfica principal debe dominar.

---

# 53. GRÁFICA PRINCIPAL

La evolución de gasto debe utilizar una línea o área sobria.

Debe soportar:

- 7D;
- 1M;
- 3M;
- 1A;
- Todo.

Cambiar granularidad:

- día;
- semana;
- mes.

Tocar un punto debe mostrar:

- fecha;
- importe;
- cantidad de movimientos;
- acceso al detalle.

En móvil, la interacción debe ser cómoda. No exigir tocar un círculo diminuto.

---

# 54. COMPARACIÓN DE PERIODOS

Usar una serie principal y una serie secundaria tenue.

No usar dos líneas iguales y saturadas.

El periodo actual debe dominar visualmente.

La comparación existe para ayudar a comprender, no para decorar.

---

# 55. CATEGORÍAS

Preferir barras horizontales para comparación.

Ejemplo:

`Alimentación ███████ S/580`

`Transporte █████ S/370`

`Hogar ████ S/285`

Un pie/donut puede utilizarse cuando la distribución relativa sea lo que importa, pero no debe ser el gráfico por defecto.

---

# 56. HEATMAP

Un mapa diario puede revelar:

- concentración de gasto;
- fines de semana;
- días atípicos;
- periodos de gasto intenso.

Debe ser pequeño, limpio y navegable.

Tocar un día debe abrir el detalle.

---

# 57. PRESUPUESTO

El presupuesto debe mostrar:

- gasto real;
- porcentaje consumido;
- porcentaje de mes transcurrido;
- ritmo real vs ritmo esperado;
- proyección simple.

Ejemplo conceptual:

`A día 26: 84% del mes.`

`Presupuesto consumido: 71%.`

`Si mantienes este ritmo: S/2,180.`

Esto es un cálculo matemático, no una predicción generativa.

---

# 58. DISTRIBUCIÓN DE CUENTAS

El dashboard debe mostrar dónde está el patrimonio líquido.

Ejemplo:

BBVA Soles · S/4,800

Yape · S/520

Ahorro · S/1,300

La visualización puede usar barras proporcionales, no necesariamente cards.

Tocar una cuenta abre su detalle.

---

# 59. CONTEXTO EMOCIONAL EN ANÁLISIS

El mapa bienestar–energía puede mostrar los estados asociados a compras.

Cada punto puede tener un tamaño proporcional al importe.

Una segunda capa puede representar tensión.

Debe ser visualmente tranquila.

No utilizar colores saturados para “dramatizar” emociones.

El lenguaje debe evitar causalidad no demostrada.

Preferir:

> “Tus compras aparecen con mayor frecuencia durante periodos que registraste como de mayor tensión.”

No:

> “El estrés te hace gastar.”

---

# 60. INSIGHTS

Máximo unos pocos.

Si no hay algo relevante, no mostrar nada.

Los insights deben aparecer como oportunidades de comprensión.

Ejemplos:

> Restaurantes +31%. El cambio parece venir de mayor frecuencia, no de mayor ticket promedio.

> 8 de tus 11 pedidos de delivery ocurrieron durante periodos de tensión alta.

> Tu gasto diario está por debajo del ritmo necesario para superar el presupuesto.

Cada insight debe poder conducir a:

**Entender**

**Comparar**

**Ver movimientos**

---

# 61. REVISIÓN SEMANAL

Una revisión semanal debe ser breve y útil.

Estructura:

- cuánto gastaste;
- qué cambió;
- qué viene;
- ahorro/reserva;
- una señal emocional si tiene suficiente información;
- una recomendación descriptiva, no moralista.

La revisión debe poder abrirse desde una notificación.

No debe convertirse en un informe de veinte pantallas.

---

# 62. REVISIÓN MENSUAL

Debe sentirse editorial, no contable.

Ejemplo:

**Agosto**

Gastaste S/2,418.

12% menos que julio.

Lo que cambió:
- restaurantes +31%;
- transporte -6%;
- ocio -18%.

Lo que viene:
- tres compromisos próximos.

Contexto:
- la mayor frecuencia de delivery coincidió con periodos de mayor tensión.

El usuario puede profundizar con IA.

---

# 63. ONBOARDING

El onboarding no debe ser una presentación de marketing.

Debe ser una configuración útil.

Orden recomendado:

1. bienvenida;
2. monedas;
3. cuentas;
4. ahorro/reservas;
5. presupuesto;
6. estado emocional;
7. notificaciones;
8. listo.

Cada paso debe tener “Ahora no”.

El usuario puede comenzar sin configurar absolutamente todo.

---

# 64. ONBOARDING Y PERSONALIZACIÓN

Desde el principio Wallet debe parecer propia.

El usuario debería poder elegir:

- monedas;
- cuentas;
- nombres;
- saldos iniciales;
- reservas;
- presupuesto;
- horario de check-ins;
- estado emocional inicial;
- notificaciones.

No preguntar cosas que pueden inferirse o añadirse después.

---

# 65. ONBOARDING EMOCIONAL

El usuario debe poder comenzar diciendo cómo se siente.

Pero no usar cinco sliders completos.

Usar la misma experiencia que el sistema cotidiano:

- bienestar/valencia;
- energía;
- tensión;
- etiquetas opcionales.

Esto crea continuidad entre onboarding y uso diario.

---

# 66. AJUSTES

Ajustes debe parecer parte del mismo producto que Home.

Cada grupo debe tener:

- título claro;
- descripción corta;
- espacio adecuado;
- control alineado;
- estados fáciles de escanear.

Las secciones deben separarse con líneas y ritmo vertical.

No colocar todo en grandes cards.

No utilizar estilos de formulario nativos sin normalización.

---

# 67. DATOS Y RESTAURACIÓN

Ajustes debe incluir:

- backup JSON;
- exportación CSV;
- restaurar backup;
- borrar datos;
- restaurar a fábrica.

La restauración a fábrica debe tener:

1. advertencia;
2. opción de backup;
3. confirmación explícita;
4. escritura de “BORRAR” o equivalente;
5. eliminación de datos locales;
6. retorno a onboarding.

---

# 68. ACCESIBILIDAD

Objetivo: WCAG 2.2 AA cuando sea compatible con el contexto.

También aplicar principios de iOS:

- targets cómodos;
- focus visible;
- alto contraste;
- soporte de zoom;
- reduced motion;
- lectura de pantalla;
- Voice Control;
- alternativas a gestos;
- no depender únicamente de color.

Apple recomienda 44×44pt como tamaño de control por defecto en iOS y también recalca que el espacio entre controles es tan importante como el tamaño.

La accesibilidad no es una fase posterior.

---

# 69. RESPONSIVE

Diseñar primero alrededor de 390×844.

Comprobar:

- 320px;
- 360px;
- 375px;
- 390px;
- 430px.

Luego:

- tablet;
- laptop;
- desktop;
- pantallas grandes.

No comprimir una interfaz desktop para convertirla en móvil.

La arquitectura cambia según el dispositivo.

---

# 70. WIDTH Y OVERFLOW

Reglas fundamentales:

`min-width: 0`

`max-width: 100%`

`width: 100%`

Los contenidos flexibles deben poder encogerse.

Los SVG deben escalar.

Inputs y selects no deben exceder el viewport.

No permitir overflow horizontal accidental.

El contenido debe utilizar `100dvh` cuando corresponda.

---

# 71. SAFE AREAS

Wallet está diseñada para dispositivos con:

- Dynamic Island;
- Home Indicator;
- notch;
- barras del navegador móviles.

Usar:

`env(safe-area-inset-top)`

`env(safe-area-inset-bottom)`

El contenido nunca debe quedar escondido debajo del sistema.

---

# 72. PWA

La aplicación debe conservar:

- manifest real;
- iconos reales;
- Apple Touch Icon;
- Service Worker real;
- offline básico;
- instalación desde Safari.

No crear Service Workers dinámicos innecesarios mediante Blob si existe un archivo `sw.js` real.

La PWA debe sentirse como un producto instalado, no como una página web abierta dentro de Safari.

---

# 73. PERFORMANCE

Evitar dependencias innecesarias.

Evitar librerías enormes para efectos pequeños.

Priorizar:

- HTML ligero;
- CSS eficiente;
- JavaScript modular o razonablemente dividido;
- SVG;
- lazy loading cuando corresponda;
- sin layout shifts;
- respuesta inmediata.

La belleza que produce lag es un fracaso.

---

# 74. ARQUITECTURA DE CÓDIGO

Aunque el proyecto pueda seguir siendo una carpeta estática para Netlify, internamente debe evitarse la acumulación de parches.

No ideal:

`render = function(...)` redefinido muchas veces.

No ideal:

varias capas de CSS con reglas finales superpuestas sin borrar las anteriores.

No ideal:

múltiples componentes que resuelven el mismo problema con estilos distintos.

Ideal:

- funciones base claras;
- tokens centralizados;
- componentes reutilizables;
- una sola fuente de verdad para datos;
- un único sistema de interacción;
- una escala tipográfica;
- un sistema de espaciado;
- funciones de migración separadas de la UI.

---

# 75. EVOLUCIÓN DEL CÓDIGO ACTUAL

Wallet ha pasado por varias etapas.

### Etapa inicial

Una aplicación financiera rápida, centrada en PEN y con muchas funciones dentro de una sola estructura.

### Etapa multimoneda

Se introdujo el modelo de moneda independiente, cuentas por divisa, tipos de cambio y FX.

### Etapa ledger

Se dejó de depender solamente de saldos mutables y se introdujeron operaciones reales para gastos, ingresos, transferencias, FX y ajustes.

### Etapa emocional

El estado emocional dejó de pertenecer solamente a una transacción y se transformó en contexto temporal.

### Etapa Wallet Intelligence

Gemini pasó de chatbot a capa de interpretación y ejecución.

### Etapa visual

Se redujo el uso indiscriminado de cards, se mejoraron tipografía, spacing, touch targets, safe areas, responsive y motion.

### Etapa actual

El objetivo es consolidar todo esto como un único sistema visual y de interacción, no seguir agregando capas aisladas.

---

# 76. LO QUE YA FUNCIONA BIEN EN EL ESTILO ACTUAL

1. La base neutra evita la apariencia de plantilla.
2. El número financiero tiene protagonismo.
3. La navegación móvil es clara.
4. El uso de listas en cuentas evita un dashboard saturado.
5. PEN/USD como contextos independientes simplifica el registro.
6. La reserva se integra al patrimonio sin mezclarse visualmente con disponible.
7. La interfaz puede utilizar temas cromáticos sin cambiar su arquitectura.
8. El análisis ya combina datos financieros y emocionales.
9. El movimiento es contenido y no protagonista.
10. La IA está mucho más integrada que como un simple chatbot.

---

# 77. COSAS QUE TODAVÍA PUEDEN MEJORAR — CRÍTICA HONESTA

## 77.1 El sistema visual necesita consolidación completa

La evolución rápida ha producido reglas de CSS añadidas por etapas. Aunque la interfaz final puede verse coherente, el código tiene deuda de diseño porque existen varias capas de ajustes que históricamente resolvieron problemas sucesivos.

Próxima mejora:

- unificar tokens;
- eliminar reglas duplicadas;
- consolidar breakpoints;
- eliminar clases temporales;
- consolidar estados.

## 77.2 El onboarding todavía debe convertirse en una experiencia verdaderamente personalizada

No basta con que el onboarding sea limpio. Debe construir una relación inicial con el producto.

Debe recordar lo que el usuario configuró y reflejarlo inmediatamente.

Ejemplo:

si eligió PEN y USD, el resumen final debe mostrar PEN/USD reales.

Si creó BBVA, la siguiente pantalla debe mostrar BBVA.

Si dijo que desea check-ins, debe mostrar su horario real.

La configuración no puede sentirse como una secuencia genérica.

## 77.3 La tipografía puede refinarse aún más

La solución nativa de sistema es apropiada para iPhone, pero se debe probar:

- Dynamic Type;
- accesibilidad de tamaño grande;
- textos largos;
- español;
- inglés si se incorpora;
- símbolos monetarios;
- decimales.

## 77.4 El análisis puede ser todavía más exploratorio

La próxima frontera no es más gráficos.

Es mejores relaciones entre gráficos.

Ejemplo:

seleccionar `Restaurantes` debería actualizar:

- evolución;
- calendario;
- horas;
- emoción;
- cuentas.

El dashboard debe tener profundidad interactiva.

## 77.5 Los gestos necesitan feedback perceptible

Swipe debe ser descubrible y sentirse natural.

Se puede añadir una microseñal inicial, pero nunca una tutorialización invasiva.

## 77.6 La IA puede ser más inteligente sin ser más visible

La meta no es agregar más botones de IA.

La meta es que menos tareas requieran formularios.

---

# 78. TENDENCIAS DE DISEÑO 2026 QUE SÍ ADOPTAR

## Calma visual

Menos ruido, más jerarquía.

## Tipografía como estructura

La tipografía no es decoración; organiza.

## Datos como material visual

Los números y gráficos pueden aportar identidad.

## Motion funcional

Movimiento para continuidad y feedback.

## Interfaces adaptativas

El contexto actual determina qué mostrar.

## IA contextual

La IA aparece donde aporta.

## Sistemas de diseño fuertes

Tokens y componentes coherentes.

## Experiencias editoriales de datos

No todo dashboard tiene que parecer software empresarial.

## Privacidad y local-first

Las experiencias que minimizan la exposición de datos tienen una ventaja de confianza.

## Personalización operativa

La interfaz aprende las preferencias útiles del usuario.

---

# 79. TENDENCIAS 2026 QUE WALLET DEBE EVITAR

- AI slop;
- dashboards bento genéricos;
- gradientes azul/morado de IA;
- glassmorphism en todas partes;
- rounded corners gigantes;
- sparkles constantes;
- badges por todo;
- animaciones que bloquean;
- scrolljacking;
- navegación experimental para funciones básicas;
- tipografía microscópica;
- chat como interfaz principal;
- IA que “hace todo” sin explicar;
- personalización basada en miles de preferencias;
- motion solo para impresionar;
- dark mode como simple inversión;
- copiar a Apple, Vercel o Linear literalmente.

---

# 80. AUTENTICIDAD EN LA ERA DE LA IA

Este principio debe permanecer visible en todas las futuras iteraciones.

Antes, producir una interfaz pulida requería mucho trabajo.

Ahora, la IA puede producir docenas de variantes en minutos.

Por eso la diferenciación pasa a depender más de:

- criterio;
- coherencia;
- investigación;
- contexto;
- detalle;
- continuidad;
- personalidad;
- trade-offs correctos;
- comprensión de usuarios reales.

Figma reporta en 2026 que la mayoría de diseñadores percibe que la IA acelera y mejora su trabajo, mientras que también destaca que el craft humano sigue siendo diferencial.

NN/g advierte que la aceleración de construcción puede ir por delante de la evaluación UX y producir deuda de experiencia.

Por tanto:

> **No utilices IA para generar una interfaz; utiliza IA para acelerar la exploración y el desarrollo, pero utiliza criterio humano para decidir qué debe sobrevivir.**

Wallet debe sentirse diseñada, no generada.

---

# 81. QUÉ SIGNIFICA “NO PARECER GENERADA POR IA”

No significa evitar cualquier elemento moderno.

Significa evitar señales de producción automática:

- componentes repetidos sin motivo;
- misma card con distinto texto;
- espacios idénticos aunque cambie el contenido;
- copy genérico;
- gradientes sin significado;
- iconos decorativos por todas partes;
- exceso de “magic”;
- animación estándar aplicada a todo;
- decisiones visuales que parecen tomadas por una plantilla.

La autenticidad viene de las decisiones específicas de Wallet:

- tratamiento del dinero;
- relación dinero/emoción;
- separación por divisas;
- agenda financiera;
- lenguaje de insights;
- comportamiento de las metas;
- contexto emocional;
- IA silenciosa;
- navegación basada en tareas.

---

# 82. UX: RECONOCITION OVER RECALL

El usuario no debería recordar cómo funciona Wallet.

Debería reconocerlo.

Si ve una cuenta, debe entender dónde tocar.

Si ve un gasto, debe saber cómo editar.

Si ve una deuda, debe saber si está pendiente.

Si quiere cambiar moneda, debe reconocer la acción.

Los iconos ambiguos deben tener label cuando sea necesario.

Los gestos pueden acelerar, pero nunca deben ser la única manera de acceder a algo importante.

---

# 83. PROGRESSIVE DISCLOSURE

Mostrar:

**lo frecuente + importante + contextual**

Mantener accesible:

**lo avanzado + infrecuente**

Ejemplo de registro:

visible:
- monto;
- gasto/ingreso;
- concepto;
- cuenta;
- categoría.

colapsado:
- nota;
- fecha avanzada;
- detalles emocionales;
- otros metadatos.

No esconder acciones frecuentes dentro de “•••”.

---

# 84. EMPTY STATES

Nunca:

> No hay datos.

Preferir:

> Todavía no tienes movimientos.
>
> Añade el primero para empezar a entender cómo utilizas tu dinero.
>
> Registrar movimiento

Los estados vacíos deben enseñar el siguiente paso.

---

# 85. UI WRITING

El lenguaje debe ser:

- concreto;
- tranquilo;
- claro;
- humano;
- directo.

Evitar marketing.

No:

> Unlock your financial potential.

Sí:

> Entiende dónde está tu dinero.

No:

> ¡Estás gastando DEMASIADO!

Sí:

> Tus gastos en restaurantes están 18% por encima de tu promedio reciente.

El producto informa y ayuda.

No juzga.

---

# 86. IA: TONO

La IA debe hablar como una extensión calmada del producto.

No:

> ¡Excelente trabajo! 🎉

No:

> ¡Cuidado! 😱

Sí:

> Reservaste S/300 este mes, S/80 más que tu promedio de los últimos tres meses.

La voz debe transmitir:

- neutralidad;
- confianza;
- precisión;
- utilidad.

---

# 87. RESPUESTAS DE IA COMO UI, NO SOLO TEXTO

Cuando sea útil, una respuesta debe convertirse en un componente:

- número;
- comparación;
- lista;
- gráfico;
- botón;
- filtro;
- timeline;
- confirmación.

La IA debe devolver estructura semántica cuando la UI necesite estructura.

No depender únicamente de Markdown.

---

# 88. IA Y ESTADOS DE CONFIANZA

Cuando Wallet no está segura:

> Parece que te refieres a Uber. ¿Lo registro como Transporte?

No inventar.

Cuando la confianza es alta:

> Uber · Transporte · S/18 · Yape
>
> Registrado.

Cuando una operación es sensible:

> Esto moverá S/500 de BBVA Soles a BBVA Dólares.
>
> Confirmar.

La interfaz debe reflejar distintos grados de certeza.

---

# 89. INVESTIGACIÓN DE USUARIO

No asumir que una mejora es buena porque visualmente se ve mejor.

Cuando Wallet llegue a más usuarios:

- medir tiempo para registrar;
- medir abandono de onboarding;
- medir uso de filtros;
- medir correcciones de categoría;
- medir uso de gestos;
- medir apertura de insights;
- medir frecuencia de uso de Gemini;
- medir desactivación de notificaciones;
- medir errores.

El diseño debe evolucionar con comportamiento real.

---

# 90. MÉTRICAS DE CALIDAD UX

Wallet debe aspirar a:

### Registro

La mayoría de gastos simples deberían poder registrarse en pocos segundos.

### Descubribilidad

Un usuario nuevo debe encontrar “Registrar” sin ayuda.

### Comprensión

El Home debe poder entenderse en 3–5 segundos.

### Errores

La mayoría de errores deben ser recuperables.

### Emoción

El check-in normal debe ser más rápido que un formulario tradicional.

### IA

La IA debe reducir trabajo, no añadir trabajo.

---

# 91. CHECKLIST VISUAL ANTES DE CADA RELEASE

## Tipografía

- ¿Todos los controles utilizan la misma familia?
- ¿La jerarquía es clara?
- ¿Hay textos accidentalmente demasiado pequeños?
- ¿Los números financieros están alineados?

## Espaciado

- ¿Las secciones tienen ritmo?
- ¿Los elementos relacionados están cerca?
- ¿Los elementos diferentes están separados?

## Color

- ¿El color comunica algo?
- ¿Se puede entender sin color?
- ¿Dark mode fue diseñado y no invertido?

## Componentes

- ¿Hay cards innecesarias?
- ¿Hay botones repetidos?
- ¿Hay iconos decorativos sin función?

## Motion

- ¿La animación explica?
- ¿Es suficientemente rápida?
- ¿Respeta reduced motion?

## Mobile

- ¿Se puede usar con una mano?
- ¿Hay al menos targets cómodos?
- ¿No hay overflow?
- ¿No hay elementos detrás del Home Indicator?

## IA

- ¿La IA aparece donde aporta?
- ¿Se entiende qué hizo?
- ¿Puede el usuario recuperar/cancelar?
- ¿Se enviaron solo los datos necesarios?

---

# 92. CHECKLIST DE RESPONSIVE

Probar al menos:

- iPhone pequeño;
- iPhone estándar;
- iPhone grande;
- Android pequeño;
- Android grande;
- tablet vertical;
- tablet horizontal;
- desktop.

En cada uno:

- onboarding;
- Home;
- registrar;
- movimientos;
- cuenta;
- planifica;
- análisis;
- ajustes;
- IA;
- sheets;
- modales.

---

# 93. CHECKLIST DE INTERACCIONES

Probar:

- tap;
- swipe;
- scroll;
- long press si existe;
- teclado;
- focus;
- back del dispositivo;
- cierre de sheet;
- cierre de modal;
- edición;
- undo;
- navegación rápida;
- orientación cuando corresponda.

Ninguna interacción frecuente debe quedar sin feedback.

---

# 94. CHECKLIST DE DATOS

Probar:

- gasto;
- ingreso;
- transferencia;
- FX;
- reserva;
- deuda;
- pago parcial;
- pago total;
- cobro;
- vencido;
- ajuste;
- eliminación;
- restauración.

Confirmar que patrimonio y estadísticas no se rompan.

---

# 95. CHECKLIST DE IA

Probar:

- API key válida;
- API key inválida;
- error 429;
- error de red;
- pregunta simple;
- pregunta con herramienta;
- acción sensible;
- búsqueda web;
- URL Context;
- conversación de seguimiento;
- contexto reducido;
- ausencia de datos emocionales cuando estén desactivados.

---

# 96. PRINCIPIOS DE PRIVACIDAD

Datos financieros personales deben permanecer localmente por defecto.

No enviar a la web:

- saldos personales;
- lista de cuentas;
- nombres privados;
- movimientos;
- deudas;
- estado emocional;

si no es estrictamente necesario.

Para búsquedas externas, utilizar la consulta general mínima necesaria.

Para Gemini, enviar únicamente el contexto relevante.

La API key del usuario se guarda localmente en el modelo BYOK actual.

---

# 97. PREPARACIÓN PARA FUTURO MULTIUSUARIO

Wallet puede ser utilizada por más personas en el futuro, pero no construir desde ahora toda la complejidad de un producto SaaS.

El diseño debe permitir que, posteriormente, cada usuario tenga:

- su propio almacenamiento;
- su propia API key;
- sus preferencias;
- sus datos.

La evolución hacia backend debe ser posible sin obligar a cambiar el lenguaje visual.

---

# 98. NO HACER BACKEND SI NO ES NECESARIO

El hecho de que exista una función avanzada no significa que necesitemos servidor.

Mientras sea razonable:

- finanzas → local;
- análisis → local;
- Gemini → API directa del usuario;
- Search → Gemini cuando corresponda;
- tipos de cambio → API pública simple;
- Push → mínimo servidor necesario.

La complejidad técnica no debe convertirse en complejidad del producto.

---

# 99. FILOSOFÍA DE IMPLEMENTACIÓN

Antes de escribir código:

1. identificar objetivo;
2. identificar usuario/contexto;
3. identificar acción primaria;
4. identificar información esencial;
5. eliminar ruido;
6. definir jerarquía;
7. definir estados;
8. diseñar mobile;
9. diseñar accesibilidad;
10. recién entonces programar.

No comenzar por:

> “¿Qué card ponemos?”

Comenzar por:

> **“¿Qué necesita comprender y hacer el usuario?”**

---

# 100. PRINCIPIO DE TERCERA SOLUCIÓN

Cuando estética y usabilidad parezcan entrar en conflicto, no sacrificar inmediatamente una.

Buscar una tercera solución que conserve:

- claridad;
- belleza;
- velocidad;
- identidad.

Ejemplo:

No elegir entre:

“gráfico simple”

vs

“gráfico espectacular”.

Diseñar:

“gráfico limpio en reposo + información rica al interactuar”.

---

# 101. POR QUÉ WALLET TIENE ESTE ESTILO Y NO OTRO

Wallet no intenta parecer una app bancaria tradicional.

Las apps bancarias suelen priorizar seguridad, operaciones, promociones y productos financieros.

Wallet es diferente.

Es un instrumento de autoconocimiento financiero.

Por eso:

- el saldo tiene protagonismo;
- la emoción tiene un lugar pero no domina;
- el historial es explorable;
- el análisis tiene personalidad;
- los insights son descriptivos;
- la IA sirve para entender y operar;
- el lenguaje es calmado;
- el color es funcional;
- la interfaz es deliberadamente tranquila.

La personalidad surge del propio problema que Wallet resuelve.

---

# 102. NO COPIAR VERCEL, STRIPE, APPLE, LINEAR NI AWWWARDS

Estas referencias son fuentes de principios.

No utilizar:

- logos;
- colores corporativos de forma literal;
- layouts idénticos;
- patrones patentados o distintivos;
- textos copiados;
- navegación copiada.

La meta es obtener:

**precisión de Vercel + claridad de Stripe + naturalidad de Apple + velocidad de Linear + dirección artística de Awwwards + identidad propia de Wallet.**

---

# 103. LA IDENTIDAD PROPIA DE WALLET

La combinación única debe venir de:

1. dinero como material visual;
2. moneda como contexto;
3. patrimonio disponible + reservado en un mismo sistema;
4. agenda de compromisos;
5. emoción como contexto temporal;
6. análisis interactivo;
7. IA silenciosa;
8. lenguaje financiero calmado;
9. diseño mobile-first real;
10. local-first/privacy.

Esta combinación es más importante que cualquier estilo de moda.

---

# 104. ROADMAP DE DISEÑO

### Próxima etapa inmediata

- consolidar CSS;
- test visual en múltiples iPhone;
- refinar onboarding;
- mejorar registro natural;
- fortalecer análisis interactivo;
- ampliar IA contextual;
- validar Web Push real.

### Siguiente etapa

- command palette / búsqueda natural;
- shortcuts/Siri cuando sea viable;
- widgets PWA cuando la plataforma lo permita;
- insights personalizados;
- análisis multi-periodo más rico.

### Etapa futura

- soporte más profundo de voz;
- multimodalidad para recibos;
- sincronización opcional;
- cuenta de usuario si el proyecto realmente lo necesita.

No implementar futuras etapas simplemente porque son posibles.

---

# 105. CRITERIO DE “TERMINADO”

Una pantalla no está terminada porque:

- se vea bonita;
- compile;
- tenga animaciones;
- funcione en un dispositivo.

Está terminada cuando:

- se entiende rápido;
- la acción primaria es evidente;
- los secundarios no estorban;
- funciona en móvil;
- funciona en dark mode;
- es accesible;
- tiene feedback;
- no introduce ruido;
- mantiene la gramática del producto;
- aporta personalidad sin parecer una plantilla;
- la IA, si existe, aporta de verdad;
- no consume recursos innecesariamente.

---

# 106. REGLA FINAL PARA FUTURAS IA/AGENTES DE DESARROLLO

Cuando un agente de IA reciba este documento, no debe interpretar la libertad creativa como permiso para añadir tendencias.

Debe comenzar por entender el sistema.

Debe revisar antes de modificar.

Debe reutilizar patrones.

Debe evitar duplicar componentes.

Debe eliminar deuda de diseño antes de añadir más complejidad.

Debe probar en móvil.

Debe considerar accesibilidad.

Debe conservar el modelo mental del usuario.

Debe tratar los datos financieros como exactos.

Debe tratar la IA como una capacidad subordinada al producto.

Debe explicar qué cambió y por qué.

No debe esconder decisiones de producto importantes dentro de código sin justificación.

---

# 107. REGLA FINAL DE AUTENTICIDAD

En la era de la IA, la pregunta no es:

> “¿Cómo hago que Wallet se vea moderno?”

La pregunta correcta es:

> **“¿Qué decisiones visuales solo tendría sentido tomar para Wallet?”**

Si la respuesta es:

“ninguna”,

entonces Wallet todavía parece una plantilla.

Si la respuesta incluye:

- sus divisas;
- sus números;
- su manera de registrar;
- sus emociones;
- sus compromisos;
- su forma de analizar;
- su IA;
- su relación entre datos y vida;

entonces la identidad está creciendo.

---

# 108. MANTRA DEL PRODUCTO

> **Calma para mirar.**
>
> **Precisión para entender.**
>
> **Velocidad para actuar.**
>
> **Humanidad para acompañar.**
>
> **Inteligencia para descubrir.**
>
> **Diseño para desaparecer.**

---

# 109. REFERENCIAS NOMBRADAS Y CÓMO SE USAN

## Apple

- Apple Human Interface Guidelines — Accessibility
- Apple Human Interface Guidelines — Buttons
- Apple Human Interface Guidelines — Generative AI
- Apple Human Interface Guidelines — Gestures / interaction principles
- Apple Design Awards 2026
- Moonlitt: Moon Phase Tracker
- Tide Guide: Charts & Tables
- Apple Design Awards category principles

**Qué tomamos:** naturalidad, plataforma, interacción, accesibilidad, continuidad, controles cómodos, feedback, onboarding simple, gráficos claros y motion coherente.

## Vercel

- Geist Design System
- Geist Typography
- Geist Colors
- Geist Grid

**Qué tomamos:** precisión visual, sistemas tipográficos, color con jerarquía, grids coherentes y disciplina.

## Stripe

- Stripe Apps Design
- Stripe Apps Style

**Qué tomamos:** design tokens, consistencia, limitar arbitrariedad, arquitectura de producto y claridad.

## Linear

- A calmer interface for a product in motion — March 12, 2026
- Linear UI refresh — March 2026
- Linear product/design philosophy

**Qué tomamos:** calma, densidad controlada, previsibilidad, consistencia y la disciplina de podar una interfaz que ha crecido por acumulación de features.

## Awwwards

- Site of the Day ecosystem 2026
- trabajos editoriales y visuales destacados de 2026
- referencias de art direction, motion, typography y storytelling

**Qué tomamos:** composición, narrativa, dirección artística y momentos memorables, nunca navegación confusa por espectáculo.

## Figma

- State of the Designer 2026
- Figma AI Report 2026
- análisis de diseño y AI 2026

**Qué tomamos:** importancia creciente del criterio de diseño, colaboración con IA, craft humano, velocidad con responsabilidad y diferenciación mediante calidad.

## Nielsen Norman Group

- The Custodial Era of UX: Cleaning Up After AI — August 28, 2026
- Recognition over recall
- Progressive disclosure
- AI/ML UX principles

**Qué tomamos:** evaluar más rápido que construir no significa evaluar bien; evitar UX debt; mantener reconocimiento, contexto, control, transparencia y complejidad progresiva.

## CSS Design Awards

- Agent Inspector — 2026
- Hobro Digital — 2026

**Qué tomamos:** interfaces agentic confiables mediante confianza/control/recuperación y la relación entre minimalismo, animación y UX.

---

# 110. URLs DE REFERENCIA

Apple Design Awards 2026:
https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/

Apple Accessibility HIG:
https://developer.apple.com/design/human-interface-guidelines/accessibility

Apple Buttons HIG:
https://developer.apple.com/design/human-interface-guidelines/buttons

Apple Generative AI HIG:
https://developer.apple.com/design/human-interface-guidelines/generative-ai

Vercel Geist:
https://vercel.com/geist/introduction

Vercel Typography:
https://vercel.com/geist/typography

Vercel Colors:
https://vercel.com/geist/colors

Vercel Grid:
https://vercel.com/geist/grid

Stripe Apps Design:
https://docs.stripe.com/stripe-apps/design

Stripe Apps Style:
https://docs.stripe.com/stripe-apps/style

Linear Design Refresh:
https://linear.app/now/behind-the-latest-design-refresh

Linear UI Refresh:
https://linear.app/changelog/2026-03-12-ui-refresh

Figma State of the Designer 2026:
https://www.figma.com/blog/state-of-the-designer-2026/

Figma AI Report 2026:
https://www.figma.com/blog/2026-ai-report/

Nielsen Norman Group — The Custodial Era of UX:
https://www.nngroup.com/articles/ai-ux-debt/

CSS Design Awards — Agent Inspector:
https://www.cssdesignawards.com/sites/agent-inspector/49563/

CSS Design Awards — Hobro Digital:
https://www.cssdesignawards.com/sites/hobro-digital/49806/

---

# 111. INSTRUCCIÓN FINAL PARA QUIEN MODIFIQUE WALLET

Antes de agregar cualquier cosa, lee este documento.

Antes de diseñar una nueva pantalla, identifica:

1. qué debe comprender el usuario;
2. qué debe hacer;
3. qué información es esencial;
4. qué información puede quedar en segundo plano;
5. qué contexto ya conoce Wallet;
6. qué patrón existente puede reutilizarse;
7. qué estado debe tener la pantalla;
8. cómo funciona en 360–430px;
9. cómo funciona con zoom y reduced motion;
10. cómo se comporta sin internet;
11. cómo se comporta sin IA;
12. cómo evita parecer una plantilla.

Después implementa.

Después prueba.

Después poda.

Después vuelve a probar.

No se considera éxito haber añadido una función.

Se considera éxito que la función se sienta como si siempre hubiera pertenecido a Wallet.

---

# 112. DEFINICIÓN FINAL DEL ESTILO

El estilo de Wallet puede resumirse así:

**Swiss-influenced precision without sterility.**

**Editorial composition without marketing theatrics.**

**Native mobile interaction without blindly copying Apple.**

**Data density without dashboard clutter.**

**AI capability without AI aesthetics.**

**Personalization without configuration overload.**

**Emotion without gamification.**

**Premium feel without visual excess.**

**Minimalism without emptiness.**

**Technology without losing humanity.**

Y la regla más importante:

> **Wallet no debe parecer el resultado de haber seguido una tendencia. Debe parecer el resultado de haber entendido el problema.**

---

# 113. NOTA SOBRE LA EVOLUCIÓN DEL PRESENTE DOCUMENTO

Este master prompt se construye a partir de:

1. la visión y principios originales definidos para Wallet;
2. las iteraciones reales del producto y los problemas detectados durante uso en iPhone;
3. la evolución hacia multimoneda, deudas, emociones, PWA y Wallet Intelligence;
4. la implementación visual y técnica actualmente documentada;
5. referencias contemporáneas de producto, accesibilidad, IA y diseño de 2026.

Debe considerarse un documento vivo: puede ampliarse, pero nuevas reglas solo deben añadirse si mejoran claridad, producto, coherencia o autenticidad.

---

# FIN DEL MASTER PROMPT

**Wallet — diseño con criterio, no con ruido.**
