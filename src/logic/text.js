/*
  text — normalización compartida por el parseo y la predicción.

  Un usuario que escribe "cafe" tiene que encontrar "café", y uno que
  escribe "Almuerzo" tiene que encontrar "almuerzo". Todo lo que
  compara texto en la app pasa por aquí, para que las reglas de
  comparación sean una sola y no tres parecidas.
*/

/* Marcas diacríticas combinantes, que aparecen al descomponer en NFD. */
const DIACRITICS = /[̀-ͯ]/g;

/* La eñe se descompone en n + tilde combinante, pero en español no es
   una n acentuada sino otra letra. Se aparta antes de limpiar y se
   devuelve después. El centinela es un carácter de uso privado, que no
   aparece en ningún texto real. */
const ENYE = /ñ/g;
const ENYE_TOKEN = '';

/* Minúsculas y sin tildes, conservando la eñe. */
export function normalize(value) {
  return String(value === null || value === undefined ? '' : value)
    .toLowerCase()
    .replace(ENYE, ENYE_TOKEN)
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .split(ENYE_TOKEN)
    .join('ñ')
    .trim();
}

/* Palabras de una cadena, ya normalizadas. */
export function words(value) {
  const clean = normalize(value);
  return clean ? clean.split(/\s+/) : [];
}

/* Calidad del calce entre lo escrito y un candidato.

     3.0  coincidencia exacta
     2.0  inicio de palabra
     1.0  subcadena en cualquier posición
     0    no calza

   Sección 5, capa 1. Con la consulta vacía todo calza con 1.0, que es
   lo que hace útil la lista antes de escribir nada: el orden lo
   deciden entonces frecuencia, recencia y hora. */
export function prefixQuality(query, candidate) {
  const needle = normalize(query);
  const hay = normalize(candidate);
  if (!needle) return 1;
  if (!hay) return 0;

  if (hay === needle) return 3;
  if (hay.startsWith(needle)) return 2;

  /* Inicio de cualquier palabra, no solo de la primera: "sofia"
     encuentra "almacén sofía". */
  for (const word of hay.split(/\s+/)) {
    if (word.startsWith(needle)) return 2;
  }

  return hay.includes(needle) ? 1 : 0;
}
