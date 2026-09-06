/*
  mark — lo que devuelve marcar cómo te sentías.

  La marca de estado se dejaba sin usar, y el motivo no era que no se
  viera: era que no devolvía nada. Pedir un dato sin dar nada a cambio
  es un formulario, y la gente no rellena formularios a las 11pm.

  Así que al marcar se responde con algo, calculado de lo que ya está
  guardado, desde la primera vez. Nada de esperar a los treinta
  registros: el primero también tiene respuesta, y es la más honesta
  de todas.

  Principio 5: ningún número que ve el usuario sale de un modelo. Esto
  es contar.

  Devuelve { key, mark, count } o null. La frase la arma copy.js:
  aquí solo se cuenta.
*/

import { periodBounds, operationDay } from '../state/derive.js';

export function markInsight(state, operation) {
  if (!operation || !operation.state) return null;

  const mark = operation.state;
  const day = operationDay(operation);
  if (!day) return null;

  const week = periodBounds('week', day);

  let total = 0;      /* con esta marca, alguna vez */
  let thisWeek = 0;   /* con esta marca, en la semana del gasto */

  for (const other of state.operations) {
    if (other.voided || other.state !== mark) continue;
    total += 1;
    const otherDay = operationDay(other);
    if (otherDay >= week.from && otherDay <= week.to) thisWeek += 1;
  }

  /* La operación recién guardada ya está dentro de las cuentas, así
     que total 1 significa que es la primera de su clase. */
  if (total <= 1) return { key: 'firstEver', mark, count: 1 };
  if (thisWeek <= 1) return { key: 'firstThisWeek', mark, count: 1 };
  return { key: 'nthThisWeek', mark, count: thisWeek };
}

/* Qué proporción de los gastos lleva marca.

   Existe para poder decidir si la función se queda. La sección 4.2
   dice que si tras dos semanas de uso menos de un tercio de los
   gastos quedan marcados, se elimina; esto es lo que hay que mirar
   para saberlo, en vez de opinar. */
export function markCoverage(state, options = {}) {
  const from = options.from || null;
  const to = options.to || null;

  let expenses = 0;
  let marked = 0;

  for (const operation of state.operations) {
    if (operation.voided || operation.type !== 'expense') continue;
    const day = operationDay(operation);
    if (from && day < from) continue;
    if (to && day > to) continue;
    expenses += 1;
    if (operation.state) marked += 1;
  }

  return {
    expenses,
    marked,
    /* Sin gastos no hay proporción que dar: 0 sería mentir. */
    ratio: expenses ? marked / expenses : null,
  };
}
