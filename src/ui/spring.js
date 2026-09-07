/*
  spring — un resorte de un solo grado de libertad, sin dependencias.

  Existe porque un gesto no se puede animar con una transición. Una
  transición tiene duración fija y no sabe nada de la velocidad con la
  que el dedo la soltó; si se interrumpe, se corta. Un resorte parte
  siempre del valor actual y de la velocidad actual, así que agarrar
  algo a medio moverse es natural y no hay que hacer nada especial.

  Los parámetros son los de Apple, no los de la física: amortiguación
  y respuesta.

    damping   1.0 asienta sin rebote. Por debajo, rebota.
    response  en segundos, lo rápido que alcanza el destino. No es
              una duración: un resorte no tiene duración, el reposo
              emerge de los parámetros.

  La conversión a rigidez y rozamiento es la estándar:

    ω = 2π / response      k = ω²      c = 2 · damping · ω
*/

/* Un cuadro nunca vale más que esto. Si la pestaña estuvo en segundo
   plano, dt sería enorme y el resorte explotaría. */
const MAX_FRAME = 1 / 30;

/* Paso interno de integración, en segundos.

   Un cuadro de 60Hz son 16ms, y a esa resolución el método de Euler
   introduce amortiguación numérica: se come los rebotes pequeños. Con
   amortiguación 0.8 el sobrepaso teórico es del 1.5%, y a 16ms
   desaparecía entero, así que la hoja se asentaba sin rebote aunque
   se pidiera rebote.

   Subdividiendo a 4ms el resultado deja de depender de la frecuencia
   de refresco: se ve igual a 60Hz que a 120Hz. */
const SUB_STEP = 1 / 240;

/* Cuándo se considera en reposo: cerca del destino y casi parado. */
const REST_DISTANCE = 0.5;
const REST_VELOCITY = 0.5;

export function createSpring(options = {}) {
  const {
    from = 0,
    to = 0,
    velocity = 0,
    damping = 1,
    response = 0.3,
    onUpdate,
    onRest,
  } = options;

  let value = from;
  let target = to;
  let speed = velocity;
  let frame = 0;
  let last = 0;
  let running = false;

  const omega = (2 * Math.PI) / response;
  const stiffness = omega * omega;
  const friction = 2 * damping * omega;

  function step(now) {
    if (!running) return;

    let dt = (now - last) / 1000;
    last = now;
    if (dt <= 0) dt = 1 / 60;
    if (dt > MAX_FRAME) dt = MAX_FRAME;

    /* Euler semi-implícito, en pasos pequeños. */
    let remaining = dt;
    while (remaining > 0) {
      const h = remaining > SUB_STEP ? SUB_STEP : remaining;
      const acceleration = -stiffness * (value - target) - friction * speed;
      speed += acceleration * h;
      value += speed * h;
      remaining -= h;
    }

    if (Math.abs(value - target) < REST_DISTANCE && Math.abs(speed) < REST_VELOCITY) {
      value = target;
      speed = 0;
      running = false;
      if (onUpdate) onUpdate(value);
      if (onRest) onRest(value);
      return;
    }

    if (onUpdate) onUpdate(value);
    frame = requestAnimationFrame(step);
  }

  const api = {
    get value() {
      return value;
    },
    get velocity() {
      return speed;
    },
    get running() {
      return running;
    },

    start() {
      if (running) return api;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(step);
      return api;
    },

    /* Cambiar el destino no reinicia nada: la velocidad actual se
       conserva y el movimiento sigue siendo continuo. Esto es lo que
       hace que invertir un gesto no choque contra un muro. */
    retarget(next, nextVelocity) {
      target = next;
      if (typeof nextVelocity === 'number') speed = nextVelocity;
      return api.start();
    },

    /* Para tomar el control desde un gesto: se detiene donde está y
       devuelve el valor y la velocidad que llevaba, para que quien
       agarre continúe desde ahí. */
    stop() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      return { value, velocity: speed };
    },

    /* Colocar sin animar. Lo usa prefers-reduced-motion. */
    set(next) {
      api.stop();
      value = next;
      target = next;
      speed = 0;
      if (onUpdate) onUpdate(value);
      return api;
    },
  };

  return api;
}

/* Dónde acabaría algo soltado a esta velocidad, con la deceleración
   exponencial que usa iOS. No es la fórmula de libro v²/2a: es la que
   hace que un lanzamiento se sienta como un lanzamiento.

   Sirve para decidir el destino mirando a dónde va el gesto, no dónde
   estaba el dedo al soltar. */
export function project(velocity, decelerationRate = 0.998) {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/* Resistencia en el borde. Cuanto más se pasa, menos sigue al dedo:
   las cosas reales frenan antes de parar, no se congelan.

   overshoot   cuánto se ha pasado del límite
   dimension   el tamaño contra el que se mide la resistencia */
export function rubberband(overshoot, dimension, constant = 0.55) {
  if (!dimension) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/* Historial corto de posiciones para calcular la velocidad al soltar.
   Con un solo punto la velocidad salta; con una ventana de unos 100ms
   sale estable y sigue siendo instantánea. */
export function createVelocityTracker(windowMs = 100) {
  const points = [];

  return {
    add(position, time) {
      points.push({ position, time });
      while (points.length > 2 && time - points[0].time > windowMs) points.shift();
    },
    /* px por segundo. Cero si no hay con qué comparar. */
    velocity() {
      if (points.length < 2) return 0;
      const first = points[0];
      const last = points[points.length - 1];
      const dt = last.time - first.time;
      if (dt <= 0) return 0;
      return ((last.position - first.position) / dt) * 1000;
    },
    reset() {
      points.length = 0;
    },
  };
}
