/*
  Verificación de la física de los gestos.

    npm run verify:gestures

  Las partes que no necesitan un dedo: el resorte, la proyección de
  impulso, la resistencia del borde, el historial de velocidad y la
  decisión de cerrar o volver. El seguimiento 1:1 y la captura del
  puntero se comprueban en el navegador, porque necesitan uno.
*/

import { createSpring, project, rubberband, createVelocityTracker } from '../src/ui/spring.js';
import { shouldClose, CLOSE_VELOCITY, CLOSE_FRACTION } from '../src/ui/drag-sheet.js';

let passed = 0;
let failed = 0;
const failures = [];

function group(title) {
  console.log('\n' + title);
  console.log('─'.repeat(title.length));
}

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log('  ok    ' + label);
  } else {
    failed += 1;
    failures.push(label);
    console.log('  FALLA ' + label);
    console.log('        esperado: ' + JSON.stringify(expected));
    console.log('        obtenido: ' + JSON.stringify(actual));
  }
}

function checkTrue(label, value) {
  check(label, Boolean(value), true);
}

/* ------------------------------------------------------------------
   1. La decisión al soltar
   ------------------------------------------------------------------ */

function testDecision() {
  group('1 · Cerrar o volver');

  const alto = 600;
  const umbral = alto * CLOSE_FRACTION;

  check('quieto y apenas movido, vuelve',
    shouldClose({ offset: 20, velocity: 0, height: alto }), false);
  check('quieto y pasado el umbral, cierra',
    shouldClose({ offset: umbral + 1, velocity: 0, height: alto }), true);
  check('justo en el umbral, vuelve',
    shouldClose({ offset: umbral, velocity: 0, height: alto }), false);

  /* Lo que hace que el gesto se sienta vivo: un golpe corto y rápido
     cierra aunque la hoja apenas se haya movido. */
  check('golpe rápido hacia abajo desde muy arriba, cierra',
    shouldClose({ offset: 12, velocity: CLOSE_VELOCITY + 50, height: alto }), true);
  check('el mismo recorrido sin velocidad, vuelve',
    shouldClose({ offset: 12, velocity: 0, height: alto }), false);

  /* Y lo contrario: un lanzamiento hacia arriba cancela aunque se
     hubiera arrastrado más de la mitad. Manda la intención. */
  check('lanzamiento hacia arriba desde abajo del umbral, vuelve',
    shouldClose({ offset: alto * 0.8, velocity: -(CLOSE_VELOCITY + 100), height: alto }), false);

  /* La proyección: una velocidad moderada que por sí sola no llega al
     umbral de velocidad, pero que proyectada sí pasa la distancia. */
  const moderada = 300;
  checkTrue('una velocidad moderada empuja la decisión por proyección',
    shouldClose({ offset: umbral - 100, velocity: moderada, height: alto })
    && !shouldClose({ offset: umbral - 100, velocity: 0, height: alto }));
}

/* ------------------------------------------------------------------
   2. Proyección de impulso
   ------------------------------------------------------------------ */

function testProjection() {
  group('2 · Proyección de impulso');

  check('sin velocidad no proyecta nada', project(0), 0);
  checkTrue('más velocidad, más lejos', project(1000) > project(500));
  checkTrue('la proyección es simétrica en el signo',
    Math.abs(project(-800) + project(800)) < 1e-9);

  /* La forma exponencial de iOS, no v²/2a: a 1000 px/s el reposo cae
     alrededor de medio metro de pantalla, no a dos centímetros. */
  const a1000 = project(1000);
  checkTrue('1000 px/s proyecta cientos de píxeles, no unidades',
    a1000 > 400 && a1000 < 600);
}

/* ------------------------------------------------------------------
   3. Resistencia del borde
   ------------------------------------------------------------------ */

function testRubberband() {
  group('3 · Rubber-banding');

  const alto = 600;
  check('sin desbordamiento no hay resistencia', rubberband(0, alto), 0);

  const r10 = Math.abs(rubberband(-10, alto));
  const r50 = Math.abs(rubberband(-50, alto));
  const r200 = Math.abs(rubberband(-200, alto));

  checkTrue('siempre sigue algo al dedo', r10 > 0 && r50 > 0 && r200 > 0);
  checkTrue('nunca sigue 1:1', r10 < 10 && r50 < 50 && r200 < 200);
  checkTrue('cuanto más se pasa, menos sigue',
    (r10 / 10) > (r50 / 50) && (r50 / 50) > (r200 / 200));
  checkTrue('no se congela: 200px de gesto todavía mueven algo', r200 > 50);
  check('conserva el signo', rubberband(-50, alto) < 0, true);
}

/* ------------------------------------------------------------------
   4. Historial de velocidad
   ------------------------------------------------------------------ */

function testTracker() {
  group('4 · Historial de velocidad');

  const tracker = createVelocityTracker();
  check('sin puntos, sin velocidad', tracker.velocity(), 0);

  tracker.add(0, 0);
  check('con un solo punto tampoco', tracker.velocity(), 0);

  /* 100px en 100ms son 1000 px/s. */
  tracker.add(100, 100);
  check('dos puntos dan px por segundo', Math.round(tracker.velocity()), 1000);

  /* Un dedo que se para: los puntos viejos salen de la ventana y la
     velocidad cae, en vez de quedarse con la del principio. */
  const parado = createVelocityTracker(100);
  parado.add(0, 0);
  parado.add(100, 50);
  const enMovimiento = parado.velocity();
  parado.add(100, 200);
  parado.add(100, 260);
  checkTrue('si el dedo se para, la velocidad baja', Math.abs(parado.velocity()) < Math.abs(enMovimiento));

  tracker.reset();
  check('se puede reiniciar', tracker.velocity(), 0);
}

/* ------------------------------------------------------------------
   5. El resorte
   ------------------------------------------------------------------ */

function testSpring() {
  group('5 · Resorte');

  /* Reloj y cuadros deterministas: en Node no hay requestAnimationFrame,
     y con temporizadores reales la prueba dependería de lo cargada que
     esté la máquina. Aquí se bombean cuadros de 16ms a mano. */
  let ahora = 0;
  const cola = [];
  const rafOriginal = globalThis.requestAnimationFrame;
  const perfOriginal = globalThis.performance;

  globalThis.performance = { now: () => ahora };
  globalThis.requestAnimationFrame = (fn) => { cola.push(fn); return cola.length; };
  globalThis.cancelAnimationFrame = () => {};

  const bombear = (cuadros) => {
    for (let i = 0; i < cuadros; i += 1) {
      const pendientes = cola.splice(0, cola.length);
      if (!pendientes.length) return;
      ahora += 16;
      for (const fn of pendientes) fn(ahora);
    }
  };

  const valores = [];
  let descansado = false;
  const spring = createSpring({
    from: 0, to: 100, damping: 1, response: 0.3,
    onUpdate: (v) => valores.push(v),
    onRest: () => { descansado = true; },
  });
  spring.start();
  bombear(120);

  checkTrue('se mueve', valores.length > 5);
  checkTrue('llega al destino', descansado);
  check('y se queda exactamente ahí', spring.value, 100);
  checkTrue('críticamente amortiguado: no se pasa',
    valores.every((v) => v <= 100.01));

  /* Con rebote sí se pasa, y eso es lo que se quiere tras un
     lanzamiento. */
  const conRebote = [];
  const bouncy = createSpring({
    from: 0, to: 100, damping: 0.8, response: 0.3,
    onUpdate: (v) => conRebote.push(v),
  });
  bouncy.start();
  bombear(120);
  checkTrue('con amortiguación 0.8 sí se pasa del destino',
    conRebote.some((v) => v > 100));

  /* Interrupción: parar devuelve dónde está y con qué velocidad, para
     que el gesto continúe desde ahí sin salto. */
  const interrumpible = createSpring({ from: 0, to: 500, damping: 1, response: 0.5, onUpdate: () => {} });
  interrumpible.start();
  bombear(6);
  const estado = interrumpible.stop();
  checkTrue('al interrumpir devuelve una posición intermedia',
    estado.value > 0 && estado.value < 500);
  checkTrue('y la velocidad que llevaba', estado.velocity > 0);
  check('y deja de correr', interrumpible.running, false);

  /* Cambiar el destino no reinicia: conserva la velocidad. Es lo que
     hace que invertir un gesto no choque contra un muro. */
  const retargeted = createSpring({ from: 0, to: 500, damping: 1, response: 0.5, onUpdate: () => {} });
  retargeted.start();
  bombear(5);
  const antes = retargeted.velocity;
  retargeted.retarget(0);
  check('al cambiar de destino conserva la velocidad', retargeted.velocity, antes);
  bombear(120);
  check('y llega al nuevo destino', Math.round(retargeted.value), 0);

  /* set coloca sin animar: es el camino de prefers-reduced-motion. */
  const instantaneo = createSpring({ from: 0, to: 100, onUpdate: () => {} });
  instantaneo.set(250);
  check('set coloca sin animar', [instantaneo.value, instantaneo.running], [250, false]);

  globalThis.requestAnimationFrame = rafOriginal;
  globalThis.performance = perfOriginal;
}

/* ------------------------------------------------------------------ */

function main() {
  console.log('Verificación de gestos · fase 3.5B');

  testDecision();
  testProjection();
  testRubberband();
  testTracker();
  testSpring();

  console.log('\n' + '═'.repeat(46));
  console.log(passed + ' comprobaciones pasan, ' + failed + ' fallan');
  if (failed) {
    console.log('\nFallos:');
    for (const label of failures) console.log('  · ' + label);
    process.exitCode = 1;
  }
}

main();
