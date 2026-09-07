/*
  drag-sheet — arrastrar la hoja hacia abajo para cerrarla.

  Las reglas que sigue, de la skill apple-design:

  · Seguimiento 1:1 respetando dónde se agarró. Saltar al centro del
    elemento al agarrarlo rompe la ilusión en el primer cuadro.
  · setPointerCapture, para que el seguimiento no se pierda cuando el
    dedo sale de la hoja.
  · Historial de velocidad, no el último punto: con un solo punto la
    velocidad da saltos.
  · Al soltar se proyecta hacia dónde va el gesto y se decide; la
    animación arranca con la velocidad exacta del dedo, sin costura
    entre arrastrar y animar.
  · Interrumpible: agarrar la hoja a medio cerrar la engancha donde
    está, con la velocidad que llevaba.
  · Resorte, no transición. Una transición no sabe de velocidad y no
    se puede agarrar a medio camino.
  · Rubber-banding hacia arriba: resistencia progresiva, no tope seco.

  Nada de esto anima nada por su cuenta: es respuesta directa al dedo.
*/

import { createSpring, project, rubberband, createVelocityTracker } from './spring.js';

/* Se cierra si el gesto supera cualquiera de los dos umbrales. La
   velocidad manda sobre la distancia: un golpe corto y rápido cierra
   aunque apenas se haya movido, que es lo que espera el pulgar. */
export const CLOSE_VELOCITY = 500;   /* px/s hacia abajo */
export const CLOSE_FRACTION = 0.4;   /* del alto de la hoja */

/* Antes de comprometerse a arrastrar. Sin esto, un toque con un
   temblor de dos píxeles cancelaría el clic del botón que hay debajo. */
export const DRAG_THRESHOLD = 10;

/* Resorte de cajón: la tabla de apple-design da 0.8 y 0.3. El rebote
   solo aparece cuando el gesto traía impulso. */
const SPRING_RESPONSE = 0.3;
const SPRING_DAMPING_FLICK = 0.8;
const SPRING_DAMPING_SETTLE = 1;

/* ¿Cierra o vuelve?

   Se decide mirando a dónde va el gesto, no dónde estaba el dedo al
   soltar: un golpe corto y rápido cierra aunque apenas se haya
   movido, y eso es lo que espera el pulgar.

   Función aparte y pura para poder probarla: el resto del gesto
   necesita un dedo de verdad, esto no. */
export function shouldClose(options = {}) {
  const { offset = 0, velocity = 0, height = 1 } = options;

  /* Un lanzamiento hacia arriba cancela, aunque se hubiera arrastrado
     más de la mitad: manda la intención, no la posición. */
  if (velocity < -CLOSE_VELOCITY) return false;

  if (velocity > CLOSE_VELOCITY) return true;

  const projected = offset + project(velocity);
  return projected > height * CLOSE_FRACTION;
}

function reducedMotion() {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Engancha el arrastre a una hoja.

     panel    el elemento que se mueve
     onClose  se llama cuando el gesto decide cerrar
     canDrag  opcional; devuelve false para dejar pasar el gesto
              (por ejemplo si el contenido está desplazado)

   Devuelve { destroy, isDragging }. */
export function attachSheetDrag(options = {}) {
  const { panel, onClose, canDrag } = options;
  if (!panel) return { destroy() {}, isDragging: () => false };

  const tracker = createVelocityTracker();

  let dragging = false;      /* el dedo está abajo y ya pasó el umbral */
  let pointerDown = false;   /* el dedo está abajo, aún sin decidir */
  let pointerId = null;
  let startY = 0;            /* dónde se agarró, en coordenadas de página */
  let startOffset = 0;       /* dónde estaba la hoja al agarrarla */
  let offset = 0;            /* desplazamiento actual, en píxeles */
  let spring = null;
  let restCallback = null;

  function height() {
    return panel.getBoundingClientRect().height || 1;
  }

  function paint(value) {
    offset = value;
    /* translate3d y no top: transform no toca layout ni pintado. */
    panel.style.transform = 'translate3d(0, ' + value + 'px, 0)';
  }

  function releaseSpring() {
    if (!spring) return { value: offset, velocity: 0 };
    const state = spring.stop();
    spring = null;
    return state;
  }

  /* Lleva la hoja a una posición con la física del gesto.

     onRest se llama al llegar, tanto si hubo resorte como si se
     colocó de golpe por prefers-reduced-motion. Quien llama no tiene
     que saber cuál de los dos caminos se tomó. */
  function settleTo(target, velocity, onRest) {
    if (reducedMotion()) {
      /* Sin movimiento: se coloca y ya. El arrastre en sí sigue
         funcionando, porque no es una animación sino respuesta
         directa; lo que se quita es la parte que se mueve sola. */
      releaseSpring();
      paint(target);
      if (onRest) onRest();
      return;
    }

    /* No se crea un resorte nuevo: si ya hay uno corriendo se le
       cambia el destino, y así conserva la velocidad que llevaba. Eso
       es lo que permite agarrar la hoja mientras sube. */
    if (spring) {
      spring.retarget(target, velocity || spring.velocity);
      restCallback = onRest || null;
      return;
    }

    restCallback = onRest || null;
    spring = createSpring({
      from: offset,
      to: target,
      velocity,
      /* Rebote solo si el gesto traía impulso. Volver a su sitio
         asienta sin rebotar; un lanzamiento sí lo lleva. */
      damping: Math.abs(velocity) > 100 ? SPRING_DAMPING_FLICK : SPRING_DAMPING_SETTLE,
      response: SPRING_RESPONSE,
      onUpdate: paint,
      onRest: () => {
        spring = null;
        const done = restCallback;
        restCallback = null;
        if (done) done();
      },
    });
    spring.start();
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (typeof canDrag === 'function' && !canDrag(event)) return;

    pointerDown = true;
    pointerId = event.pointerId;
    startY = event.clientY;

    /* Si venía animándose, se detiene y el gesto continúa desde donde
       esté: eso es lo que hace que agarrarla a medio cerrar la siga
       en vez de terminar y reabrir. */
    const state = releaseSpring();
    startOffset = state.value;
    offset = state.value;

    tracker.reset();
    tracker.add(event.clientY, event.timeStamp);
  }

  function onPointerMove(event) {
    if (!pointerDown || event.pointerId !== pointerId) return;

    const delta = event.clientY - startY;
    tracker.add(event.clientY, event.timeStamp);

    if (!dragging) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      dragging = true;
      /* Se captura al comprometerse, no antes: así un toque normal
         no se convierte en gesto y el botón de debajo recibe su
         clic.

         Si la captura falla —puntero ya soltado, o un navegador que
         no la ofrece— el arrastre sigue funcionando; solo se pierde
         el seguimiento cuando el dedo sale de la hoja. */
      try {
        panel.setPointerCapture(pointerId);
      } catch (error) {
        /* sin captura, pero con gesto */
      }
      panel.classList.add('sheet--dragging');
    }

    /* Dónde estaría la hoja siguiendo el dedo 1:1, respetando el
       punto de agarre. */
    const raw = startOffset + delta;

    if (raw >= 0) {
      paint(raw);
      return;
    }

    /* Hacia arriba no hay a dónde ir: resistencia progresiva en vez
       de tope seco. Se congela si se para, y eso se lee como
       "responde, pero aquí no hay más". */
    paint(rubberband(raw, height()));
  }

  function onPointerUp(event) {
    if (!pointerDown || event.pointerId !== pointerId) return;
    pointerDown = false;

    if (!dragging) {
      pointerId = null;
      return;
    }

    dragging = false;
    panel.classList.remove('sheet--dragging');
    try {
      if (panel.hasPointerCapture && panel.hasPointerCapture(pointerId)) {
        panel.releasePointerCapture(pointerId);
      }
    } catch (error) {
      /* ya estaba suelto */
    }
    pointerId = null;

    const velocity = tracker.velocity();
    const alto = height();

    if (shouldClose({ offset, velocity, height: alto })) {
      settleTo(alto, velocity, onClose);
    } else {
      settleTo(0, velocity, null);
    }
  }

  panel.addEventListener('pointerdown', onPointerDown);
  panel.addEventListener('pointermove', onPointerMove);
  panel.addEventListener('pointerup', onPointerUp);
  panel.addEventListener('pointercancel', onPointerUp);

  return {
    isDragging: () => dragging,

    /* Cuánto hay que desplazar la hoja para sacarla de pantalla. */
    height,

    /* Deja la hoja fuera de pantalla, sin animar. Es de donde parte
       la apertura.

       Se desplaza el alto de la ventana y no el de la hoja a
       propósito: al montar, el alto de la hoja todavía no está
       asentado —depende de su contenido y del tope de 92dvh— y
       medirlo ahí daba 52px de menos, con lo que la hoja aparecía ya
       medio dentro. El alto de la ventana siempre la saca entera,
       porque la hoja está anclada abajo y nunca es más alta que
       ella. El resorte tarda lo mismo: no tiene duración, y desde
       algo más lejos solo arranca con un poco más de brío. */
    placeOffscreen() {
      releaseSpring();
      restCallback = null;
      paint(typeof window === 'undefined' ? height() : window.innerHeight);
    },

    /* Llevar la hoja a una posición con la misma física que el gesto.

       Aquí es donde entrar y salir dejan de ser cosas distintas: la
       hoja sube con el mismo resorte con el que vuelve cuando la
       sueltas a medias. Agarrarla mientras todavía sube la engancha
       donde esté, con la velocidad que lleve. Con una transición al
       abrir y un resorte al volver eso no era posible. */
    animateTo(target, options = {}) {
      settleTo(target, options.velocity || 0, options.onRest || null);
    },

    destroy() {
      releaseSpring();
      panel.removeEventListener('pointerdown', onPointerDown);
      panel.removeEventListener('pointermove', onPointerMove);
      panel.removeEventListener('pointerup', onPointerUp);
      panel.removeEventListener('pointercancel', onPointerUp);
      panel.style.transform = '';
    },
  };
}
