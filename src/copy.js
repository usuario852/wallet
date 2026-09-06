/*
  copy — todos los textos de la interfaz, en un solo archivo.

  Reglas de escritura (sección 7):
  · Sentence case siempre. Nunca mayúsculas.
  · Los errores no piden disculpas y nunca son vagos sobre qué pasó.
  · Una acción conserva su nombre en todo el flujo: el botón que dice
    Guardar produce un toast que dice Guardado.
  · Ningún signo de exclamación en toda la app.
  · Las pantallas vacías son una invitación a actuar.

  Los valores son cadenas o funciones. Función cuando el texto lleva
  un número dentro, para que la interpolación viva aquí y no repartida
  por las pantallas.
*/

export const COPY = {
  es: {
    /* Pestañas */
    tabHome: 'Inicio',
    tabMovements: 'Movimientos',
    tabAnalysis: 'Análisis',

    /* Inicio */
    balanceLabel: 'saldo total',
    available: 'disponible',
    pledged: 'comprometido',
    receivable: 'por cobrar',
    reserved: 'en reserva',
    today: 'Hoy',
    seeAll: 'Ver todo',
    settings: 'Ajustes',
    hideBalance: 'Ocultar el saldo',
    showBalance: 'Mostrar el saldo',

    /* Registrar */
    register: 'Registrar',
    save: 'Guardar',
    expense: 'Gasto',
    income: 'Ingreso',
    conceptPlaceholder: 'En qué gastaste',
    conceptPlaceholderIncome: 'De dónde vino',
    acceptSuggestion: 'Aceptar sugerencia',

    /* Estados vacíos. Uno por cada lista de la app. */
    emptyToday: 'Todavía no registras nada hoy',
    emptyEver: 'Registra tu primer gasto y esto empieza a tener sentido',
    emptySuggestions: 'Escribe qué fue y guarda. Nada más es obligatorio',
    emptyAccounts: 'Crea una cuenta y podrás registrar movimientos',

    /* Confirmación */
    saved: (amount) => 'Guardado · ' + amount,
    undo: 'Deshacer',
    undone: 'Listo, revertido',
    stateQuestion: 'Cómo te sentías',

    /* Errores. Nunca piden disculpas, nunca son vagos. */
    saveFailed: 'No pude guardar eso. Sigue aquí, inténtalo de nuevo',
    offline: 'Sin internet. Todo lo que registres se guarda igual',
    noAccount: 'No hay ninguna cuenta en esta moneda. Crea una primero',
    amountMissing: 'Falta el monto',
    noAmount: '—',

    /* Análisis. Se usan en la fase 5; viven aquí desde ya. */
    paceAbove: (percent) => 'Vas ' + percent + '% arriba de tu ritmo habitual',
    paceBelow: (percent) => 'Vas ' + percent + '% abajo de tu ritmo habitual',
    noBudget: 'Define un presupuesto si quieres comparar tu ritmo',
    notEnoughData: (missing) => 'Faltan ' + missing + ' registros para ver este patrón',
  },

  en: {
    tabHome: 'Home',
    tabMovements: 'Movements',
    tabAnalysis: 'Analysis',

    balanceLabel: 'total balance',
    available: 'available',
    pledged: 'committed',
    receivable: 'incoming',
    reserved: 'set aside',
    today: 'Today',
    seeAll: 'See all',
    settings: 'Settings',
    hideBalance: 'Hide the balance',
    showBalance: 'Show the balance',

    register: 'Add',
    save: 'Save',
    expense: 'Expense',
    income: 'Income',
    conceptPlaceholder: 'What did you spend on',
    conceptPlaceholderIncome: 'Where did it come from',
    acceptSuggestion: 'Accept suggestion',

    emptyToday: 'Nothing recorded today yet',
    emptyEver: 'Add your first expense and this starts to make sense',
    emptySuggestions: 'Type what it was and save. Nothing else is required',
    emptyAccounts: 'Create an account and you can start recording',

    saved: (amount) => 'Saved · ' + amount,
    undo: 'Undo',
    undone: 'Done, reverted',
    stateQuestion: 'How you felt',

    saveFailed: 'I could not save that. It is still here, try again',
    offline: 'No internet. Everything you record is saved anyway',
    noAccount: 'There is no account in this currency. Create one first',
    amountMissing: 'The amount is missing',
    noAmount: '—',

    paceAbove: (percent) => 'You are ' + percent + '% above your usual pace',
    paceBelow: (percent) => 'You are ' + percent + '% below your usual pace',
    noBudget: 'Set a budget if you want to compare your pace',
    notEnoughData: (missing) => missing + ' more records to see this pattern',
  },
};

/* Las siete palabras de la marca de estado.

   Deliberadamente coloquiales, no clínicas. "Antojo" es específico y
   honesto; "ansiedad" es un formulario médico. No se traducen palabra
   por palabra: se eligen las que suenan igual de naturales. */
export const STATE_LABELS = {
  es: ['normal', 'apuro', 'antojo', 'social', 'aburrido', 'celebrando', 'necesario'],
  en: ['normal', 'rushed', 'craving', 'social', 'bored', 'celebrating', 'needed'],
};

/* Devuelve un texto. Si la entrada es función, se le pasan los
   argumentos; si no existe la clave, devuelve la clave, que en
   pantalla canta lo bastante como para arreglarlo. */
export function t(language, key, ...args) {
  const dictionary = COPY[language] || COPY.es;
  const value = dictionary[key] !== undefined ? dictionary[key] : COPY.es[key];
  if (value === undefined) return key;
  return typeof value === 'function' ? value(...args) : value;
}

export function stateLabels(language) {
  return STATE_LABELS[language] || STATE_LABELS.es;
}
