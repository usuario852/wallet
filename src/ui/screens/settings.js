import './settings.css';

import { ico } from '../components/ico.js';
import { showToast } from '../toast-host.js';
import { t } from '../../copy.js';
import {
  exportState, exportFilename, parseImport, applyImport, summarize,
} from '../../state/transfer.js';

/*
  settings — Ajustes.

  Provisional y a propósito: por ahora solo lleva lo único que hace
  falta ya, que es sacar los datos de un navegador y meterlos en otro.
  El resto de ajustes de la sección 6 —tema, idioma, monedas,
  presupuesto— llega en la fase 7.

  Importar reemplaza todo, así que va en dos pasos: primero se lee el
  archivo y se enseña qué trae, y solo después se reemplaza. Nunca se
  reemplaza a ciegas.

  Dos caminos para cada dirección, porque en un iPhone conectado a un
  servidor local no siempre hay portapapeles ni descargas fiables:
  archivo, y texto a mano.
*/

export function renderSettings(options = {}) {
  const { store, language = 'es', onBack } = options;

  const el = document.createElement('section');
  el.className = 'settings';

  el.appendChild(renderHeader(language, onBack));

  const block = document.createElement('div');
  block.className = 'settings__block';

  const title = document.createElement('h2');
  title.className = 'settings__section-title';
  title.textContent = t(language, 'dataSection');
  block.appendChild(title);

  const help = document.createElement('p');
  help.className = 'settings__note';
  help.textContent = t(language, 'dataHelp');
  block.appendChild(help);

  block.appendChild(renderExport(store, language));
  block.appendChild(renderImport(store, language));

  el.appendChild(block);
  return el;
}

/* ------------------------------------------------------------------
   Cabecera
   ------------------------------------------------------------------ */

function renderHeader(language, onBack) {
  const header = document.createElement('header');
  header.className = 'settings__header';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'settings__back';
  back.setAttribute('aria-label', t(language, 'back'));
  back.appendChild(ico('volver'));
  back.addEventListener('click', () => {
    if (typeof onBack === 'function') onBack();
  });

  const title = document.createElement('h1');
  title.className = 'settings__title';
  title.textContent = t(language, 'settings');

  header.appendChild(title);
  header.appendChild(back);
  return header;
}

/* ------------------------------------------------------------------
   Exportar
   ------------------------------------------------------------------ */

function renderExport(store, language) {
  const group = document.createElement('div');
  group.className = 'settings__group';

  group.appendChild(heading(t(language, 'exportTitle')));
  group.appendChild(note(t(language, 'exportHelp')));

  const actions = document.createElement('div');
  actions.className = 'settings__actions';

  const download = button(t(language, 'download'), 'settings__button');
  const toggle = button(t(language, 'showText'), 'settings__button settings__button--quiet');

  actions.appendChild(download);
  actions.appendChild(toggle);
  group.appendChild(actions);

  const textHelp = note(t(language, 'copyHelp'));
  textHelp.hidden = true;

  const area = document.createElement('textarea');
  area.className = 'settings__textarea';
  area.readOnly = true;
  area.rows = 8;
  area.hidden = true;

  group.appendChild(textHelp);
  group.appendChild(area);

  download.addEventListener('click', () => {
    const text = exportState(store.getState());
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    /* Se libera tarde a propósito: Safari revoca demasiado pronto si
       se hace en el mismo cuadro y la descarga sale vacía. */
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });

  toggle.addEventListener('click', () => {
    const showing = !area.hidden;
    if (showing) {
      area.hidden = true;
      textHelp.hidden = true;
      toggle.textContent = t(language, 'showText');
      return;
    }
    area.value = exportState(store.getState());
    area.hidden = false;
    textHelp.hidden = false;
    toggle.textContent = t(language, 'hideText');
    area.focus();
    area.select();
  });

  return group;
}

/* ------------------------------------------------------------------
   Importar
   ------------------------------------------------------------------ */

function renderImport(store, language) {
  const group = document.createElement('div');
  group.className = 'settings__group';

  group.appendChild(heading(t(language, 'importTitle')));
  group.appendChild(note(t(language, 'importHelp')));

  /* El input de archivo va oculto tras un botón: el control nativo no
     se puede vestir y desentona con todo lo demás. */
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'application/json,.json';
  file.className = 'settings__file';

  const pick = button(t(language, 'chooseFile'), 'settings__button settings__button--quiet');
  pick.addEventListener('click', () => file.click());

  const area = document.createElement('textarea');
  area.className = 'settings__textarea';
  area.rows = 5;
  area.placeholder = t(language, 'pastePlaceholder');

  const review = button(t(language, 'review'), 'settings__button settings__button--quiet');

  const actions = document.createElement('div');
  actions.className = 'settings__actions';
  actions.appendChild(pick);
  actions.appendChild(review);

  const status = document.createElement('p');
  status.className = 'settings__status';
  status.setAttribute('role', 'status');

  const detail = document.createElement('p');
  detail.className = 'settings__note';
  detail.hidden = true;

  const warning = note(t(language, 'replaceWarning'));
  warning.hidden = true;

  const replace = button(t(language, 'replace'), 'settings__button settings__button--danger');
  replace.hidden = true;

  group.appendChild(file);
  group.appendChild(area);
  group.appendChild(actions);
  group.appendChild(status);
  group.appendChild(detail);
  group.appendChild(warning);
  group.appendChild(replace);

  /* Lo leído y validado, a la espera de que se confirme. */
  let pending = null;

  function clearPending() {
    pending = null;
    replace.hidden = true;
    warning.hidden = true;
    detail.hidden = true;
  }

  function inspect(text) {
    const result = parseImport(text);

    if (!result.ok) {
      clearPending();
      status.textContent = t(language, messageFor(result.reason));
      return;
    }

    pending = result.state;
    const summary = result.summary;
    status.textContent = t(language, 'importSummary',
      summary.accounts, summary.operations, summary.upcoming);
    detail.textContent = summary.lastDate
      ? t(language, 'importLastDate', summary.lastDate.slice(0, 10))
      : '';
    detail.hidden = !summary.lastDate;
    warning.hidden = false;
    replace.hidden = false;
  }

  file.addEventListener('change', async () => {
    const chosen = file.files && file.files[0];
    if (!chosen) return;
    const text = await chosen.text();
    area.value = text;
    inspect(text);
  });

  area.addEventListener('input', clearPending);
  review.addEventListener('click', () => inspect(area.value));

  replace.addEventListener('click', () => {
    if (!pending) return;
    const result = applyImport(store, pending);
    if (!result.ok) {
      showToast({ message: t(language, 'importFailed'), duration: 4000 });
      return;
    }
    const summary = summarize(pending);
    clearPending();
    area.value = '';
    status.textContent = t(language, 'importSummary',
      summary.accounts, summary.operations, summary.upcoming);
    showToast({ message: t(language, 'importDone'), duration: 4000 });
    if (result.backupKey) console.info('[wallet] ' + t(language, 'importBackup', result.backupKey));
  });

  return group;
}

function messageFor(reason) {
  if (reason === 'vacio') return 'importEmpty';
  if (reason === 'no-es-json') return 'importNotJson';
  return 'importNotWallet';
}

/* ------------------------------------------------------------------
   Piezas
   ------------------------------------------------------------------ */

function heading(text) {
  const el = document.createElement('h3');
  el.className = 'settings__group-title';
  el.textContent = text;
  return el;
}

function note(text) {
  const el = document.createElement('p');
  el.className = 'settings__note';
  el.textContent = text;
  return el;
}

function button(label, className) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  return el;
}
