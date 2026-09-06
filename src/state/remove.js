/*
  remove — borrado seguro de operaciones.

  Existe por un incidente real: un filtro de consola que buscaba
  movimientos "sin monto" con `!op.amountMinor` se llevó por delante
  dos cambios de divisa, porque un fx no tiene amountMinor —tiene
  fromAmountMinor y toAmountMinor— y el saldo saltó 649.60.

  De ahí las tres reglas de este archivo:

  1. Se borra por id explícito. Nunca por filtro, y menos por un
     filtro sobre el monto: la forma de una operación depende de su
     tipo, y cualquier regla escrita a mano se olvida de un tipo.
  2. Se comprueba que cada id existe antes de tocar nada. Si falta
     uno, no se borra ninguno.
  3. Se verifica el resultado antes de confirmarlo: el saldo de cada
     cuenta tiene que moverse exactamente lo que aportaban las
     operaciones borradas, ni un céntimo más. Si no cuadra, no se
     escribe y se devuelve el descuadre.

  La tercera regla es la que importa. Deshace el propio borrado si el
  efecto no es el previsto, sea cual sea la causa.
*/

import { balancesByAccount, operationDeltas } from './derive.js';

/* Borra operaciones por id.

   Devuelve siempre un informe, nunca lanza:

     { ok, reason, removed, missing, expected, mismatch }

     ok        si se borró
     reason    'borrado' | 'sin-ids' | 'no-existen' | 'descuadre'
     removed   las operaciones borradas, enteras
     missing   los ids que no existían
     expected  cuánto debía moverse cada cuenta, por id de cuenta
     mismatch  las cuentas donde no cuadró, si es que no cuadró

   Cuando ok es false no se ha escrito nada. */
export function removeOperations(target, ids) {
  const lista = Array.isArray(ids) ? ids.filter(Boolean).map(String) : [];
  const vacio = { removed: [], missing: [], expected: {}, mismatch: [] };

  if (lista.length === 0) {
    return { ok: false, reason: 'sin-ids', ...vacio };
  }

  const state = target.getState();
  const porId = new Map(state.operations.map((operation) => [operation.id, operation]));

  /* Regla 2: o están todas, o no se toca ninguna. */
  const missing = [...new Set(lista)].filter((id) => !porId.has(id));
  if (missing.length) {
    return { ok: false, reason: 'no-existen', ...vacio, missing };
  }

  const aBorrar = new Set(lista);
  const removed = [...aBorrar].map((id) => porId.get(id));

  /* Lo que estas operaciones aportan a cada cuenta. Se usa
     operationDeltas, la misma función que calcula los saldos, para
     que no exista una segunda interpretación de qué mueve un fx. */
  const aporte = new Map();
  for (const operation of removed) {
    for (const delta of operationDeltas(operation)) {
      aporte.set(delta.accountId, (aporte.get(delta.accountId) || 0) + delta.deltaMinor);
    }
  }

  const antes = balancesByAccount(state);
  const siguiente = {
    ...state,
    operations: state.operations.filter((operation) => !aBorrar.has(operation.id)),
  };
  const despues = balancesByAccount(siguiente);

  /* Regla 3: el saldo de cada cuenta baja exactamente lo que aportaba
     lo borrado. Se revisan todas las cuentas, no solo las tocadas:
     así también se detecta que se haya movido una que no debía. */
  const mismatch = [];
  const expected = {};
  for (const cuenta of state.accounts) {
    const esperado = (antes.get(cuenta.id) || 0) - (aporte.get(cuenta.id) || 0);
    const obtenido = despues.get(cuenta.id) || 0;
    expected[cuenta.id] = esperado;
    if (obtenido !== esperado) {
      mismatch.push({
        accountId: cuenta.id,
        name: cuenta.name,
        antes: antes.get(cuenta.id) || 0,
        esperado,
        obtenido,
      });
    }
  }

  if (mismatch.length) {
    return { ok: false, reason: 'descuadre', removed: [], missing: [], expected, mismatch };
  }

  target.commit('operations', siguiente);
  return { ok: true, reason: 'borrado', removed, missing: [], expected, mismatch: [] };
}

/* Operaciones cuyo importe es cero, con la forma correcta según el
   tipo. No borra nada: solo las nombra, para que quien decida borrar
   lo haga por id y viendo lo que se lleva.

   Un fx con los dos importes en cero también es un movimiento vacío,
   pero uno con importes distintos de cero no lo es aunque no tenga
   amountMinor. Esa es exactamente la distinción que se perdió. */
export function findEmptyOperations(state) {
  return state.operations.filter((operation) => {
    if (operation.type === 'fx') {
      return !operation.fromAmountMinor && !operation.toAmountMinor;
    }
    if (operation.type === 'transfer') return !operation.amountMinor;
    return !operation.amountMinor;
  });
}
