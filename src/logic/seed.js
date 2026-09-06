/*
  seed — catálogo semilla y correspondencia categoría → glifo.

  Los usuarios nuevos no arrancan con la lista vacía. Estos conceptos
  entran con puntaje inicial bajo, de modo que los propios los
  desplazan tras dos o tres registros.

  No se guardan en el estado. Viven aquí, en el código, y la
  predicción los mezcla al consultar. Así el catálogo no ensucia los
  datos del usuario ni se persiste ni se exporta: un usuario que nunca
  registró nada tiene concepts vacío, como debe ser.
*/

import { normalize } from './text.js';

/* Sección 5. Ocho categorías, las mismas ocho que tienen glifo. */
const CATALOG = {
  'Alimentación': [
    'almuerzo', 'desayuno', 'cena', 'café', 'delivery',
    'mercado', 'supermercado', 'pollo', 'menú', 'chifa',
  ],
  'Transporte': [
    'uber', 'indrive', 'didi', 'taxi', 'combi',
    'metropolitano', 'gasolina', 'pasaje', 'estacionamiento',
  ],
  'Servicios': [
    'netflix', 'spotify', 'internet', 'luz', 'agua',
    'celular', 'icloud', 'recibo', 'youtube',
  ],
  'Salud': [
    'farmacia', 'inkafarma', 'doctor', 'dentista',
    'gimnasio', 'terapia', 'medicinas',
  ],
  'Educación': ['curso', 'libro', 'universidad', 'materiales', 'certificación'],
  'Ocio': ['cine', 'bar', 'concierto', 'videojuego', 'salida', 'hobby'],
  'Hogar': ['limpieza', 'ferretería', 'mueble', 'reparación', 'gas'],
  'Compras': ['ropa', 'zapatillas', 'tecnología', 'regalo', 'audífonos'],
};

/* Peso de arranque de un concepto semilla. Un concepto propio con dos
   registros recientes ya lo supera; con tres lo entierra. */
export const SEED_COUNT = 1;

/* El catálogo aplanado, con la forma de un concepto del modelo.
   lastUsed vacío: nunca se usó, y la recencia lo penaliza por eso. */
export const SEED_CONCEPTS = Object.freeze(
  Object.entries(CATALOG).flatMap(([category, texts]) => texts.map((text) => Object.freeze({
    text,
    category,
    currency: null,
    count: SEED_COUNT,
    lastUsed: '',
    lastAmountMinor: 0,
    hourHistogram: null,
    seed: true,
  }))),
);

/* Categoría → glifo. Las ocho del catálogo tienen el suyo; el resto
   cae en el glifo de cuenta, que es el neutro.

   Las claves van normalizadas porque los datos migrados traen
   "Alimentacion" sin tilde y "Vivienda", que el catálogo no nombra. */
const ICON_BY_CATEGORY = new Map(Object.entries({
  alimentacion: 'alimentacion',
  transporte: 'transporte',
  servicios: 'servicios',
  salud: 'salud',
  educacion: 'educacion',
  ocio: 'ocio',
  hogar: 'hogar',
  compras: 'compras',

  /* Categorías que traen los datos de v8 y no están en el catálogo
     nuevo. Se mapean a mano en vez de dejarlas todas en el neutro. */
  vivienda: 'hogar',
  familia: 'hogar',
  mascotas: 'hogar',
  viajes: 'transporte',
  finanzas: 'cuenta',
  sueldo: 'entrante',
  independiente: 'entrante',
  rendimientos: 'entrante',
  reembolso: 'entrante',
  venta: 'entrante',
  bonos: 'entrante',
  'otros ingresos': 'entrante',
}));

/* El glifo de una categoría. Nunca devuelve vacío: toda fila lleva
   glifo, y sin categoría el neutro es el de cuenta. */
export function iconForCategory(category) {
  return ICON_BY_CATEGORY.get(normalize(category)) || 'cuenta';
}

/* Categorías del catálogo semilla, en su forma escrita. Sirven para
   ofrecerlas cuando el usuario todavía no tiene ninguna propia. */
export function seedCategories() {
  return Object.keys(CATALOG);
}
