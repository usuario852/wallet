/*
  press — respuesta en pointerdown, no en click.

  El feedback llegaba tarde porque estaba en :active, y :active en
  Safari de iOS no se activa de forma fiable en elementos que no son
  enlaces: llega con retraso, o no llega. La sensación es de interfaz
  muerta, y es justo el instante en que el usuario está mirando.

  Un solo escucha en el documento, en fase de captura, marca el
  control pulsado con una clase. Delegación en vez de un escucha por
  botón: los controles se crean y se destruyen en cada repintado, y
  engancharlos uno a uno sería una fuga.

  La clase se quita al soltar, al cancelar el puntero y al salir de la
  ventana. Cancelar arrastrando fuera es parte del gesto: el usuario
  puede echarse atrás sin levantar el dedo.
*/

/* Todo lo que responde a un toque. */
const PRESSABLE = 'button, [role="button"], [role="radio"], [role="tab"], a[href]';

export const PRESSED_CLASS = 'is-pressed';

let current = null;

function clear() {
  if (!current) return;
  current.classList.remove(PRESSED_CLASS);
  current = null;
}

function onPointerDown(event) {
  /* Solo el botón principal, y nada de botones deshabilitados o
     marcados como pendientes: encenderlos prometería algo que no va
     a pasar. */
  if (event.button !== undefined && event.button !== 0) return;
  const target = event.target.closest ? event.target.closest(PRESSABLE) : null;
  if (!target) return;
  if (target.disabled || target.getAttribute('aria-disabled') === 'true') return;

  clear();
  current = target;
  target.classList.add(PRESSED_CLASS);
}

/* Al arrastrar fuera del control se suelta la marca; al volver, se
   vuelve a poner. Es lo que permite echarse atrás sin levantar el
   dedo, y lo que espera cualquiera que haya usado un iPhone. */
function onPointerMove(event) {
  if (!current) return;
  const over = event.target.closest ? event.target.closest(PRESSABLE) : null;
  if (over === current) current.classList.add(PRESSED_CLASS);
  else current.classList.remove(PRESSED_CLASS);
}

export function attachPressFeedback(root = document) {
  root.addEventListener('pointerdown', onPointerDown, true);
  root.addEventListener('pointerup', clear, true);
  root.addEventListener('pointercancel', clear, true);
  root.addEventListener('dragstart', clear, true);
  window.addEventListener('blur', clear);
  root.addEventListener('pointermove', onPointerMove, true);

  return function detach() {
    clear();
    root.removeEventListener('pointerdown', onPointerDown, true);
    root.removeEventListener('pointerup', clear, true);
    root.removeEventListener('pointercancel', clear, true);
    root.removeEventListener('dragstart', clear, true);
    window.removeEventListener('blur', clear);
    root.removeEventListener('pointermove', onPointerMove, true);
  };
}

/* Vibración breve. Una sola función, dos sitios en toda la app:

   · al guardar un movimiento, en el instante en que entra al estado
   · al ocultar el saldo, que es el momento firmado de la sección 3

   Y en ningún otro. La regla de utilidad de apple-design es que el
   háptico se reserva para momentos con significado; si vibra cada
   tecla, deja de querer decir nada y se acaba ignorando. Los dos que
   quedan lo tienen: uno confirma que el dinero quedó registrado, el
   otro acompaña el único gesto que la app quiere que se recuerde.

   La causalidad importa: se dispara en el mismo instante que la causa
   —la operación entrando al estado, el saldo desenfocándose—, no
   cuando aparece lo que viene después. */
export function hapticTap() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  /* Quien pidió menos movimiento tampoco quiere que el teléfono se
     mueva en la mano. */
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  navigator.vibrate(10);
}
