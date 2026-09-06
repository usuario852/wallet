import './design/tokens.css';

import { store, replaceState, addAccount } from './state/store.js';
import { loadState, attachPersistence } from './state/persist.js';
import { runMigration } from './state/migrate.js';
import { mountApp } from './ui/render.js';

/*
  main — arranque.

  Orden:

    1. migrar, si hay datos de v8 y no hay estado nuevo
    2. leer el estado del disco
    3. asegurar que hay al menos una cuenta
    4. enganchar la persistencia
    5. montar la app

  La migración escribe en la clave nueva y la lectura la encuentra
  ahí; por eso van en ese orden y no al revés. Si el JSON está roto,
  loadState devuelve el estado por defecto y la app arranca igual.
*/

/* Cuenta con la que arranca alguien que nunca usó la app. Sin
   onboarding y sin formulario: no puede haber una pantalla entre el
   usuario y su primer registro. Se renombra en Ajustes. */
export const FIRST_ACCOUNT = { name: 'Efectivo', kind: 'regular', openingMinor: 0 };

export function boot(root) {
  const migration = runMigration();
  const loaded = loadState();

  replaceState(store, loaded.state);

  if (migration.migrated) {
    console.info('[wallet] migración desde v8:', migration.counts);
    for (const note of migration.notes) {
      if (note.level === 'warn') console.warn('[wallet] ' + note.text);
    }
  }
  if (loaded.status === 'corrupt') {
    console.warn('[wallet] el estado guardado no se pudo leer (' + loaded.detail + ').');
  }

  ensureAccount();

  const persistence = attachPersistence(store);

  /* Al esconder la pestaña se escribe lo pendiente sin esperar al
     debounce: un cierre de app no debe costar el último registro. */
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', persistence.flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persistence.flush();
    });
  }

  return mountApp({ store, root });
}

/* Sin cuentas no hay dónde poner el dinero, y Registrar quedaría
   muerto. Se crea una en la moneda activa. */
export function ensureAccount() {
  const state = store.getState();
  const usable = state.accounts.some((account) => !account.archived && account.kind === 'regular');
  if (usable) return null;
  return addAccount(store, { ...FIRST_ACCOUNT, currency: state.settings.activeCurrency });
}

const root = document.getElementById('app');
if (root) boot(root);
