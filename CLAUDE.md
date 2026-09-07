# Wallet

## Documentos, en orden de autoridad

1. `especificacion.md` — el producto. Qué se construye, cómo
   funciona, criterios de aceptación. Manda sobre todo lo demás.
2. `filosofia.md` — el criterio de diseño y UX. Por qué las
   cosas son como son. Consúltalo antes de decidir nada visual.
3. `.claude/skills/` — animación e interacción. `animate` para
   construir movimiento, `apple-design` para gestos,
   `emil-design-eng` para revisar, `review-animations` para
   criticar un cambio.

Si `filosofia.md` contradice a `especificacion.md`, gana la
especificación y hay que avisar de la contradicción.
`filosofia.md` es anterior a varias decisiones tomadas con la
app ya en uso.

## Reglas del proyecto

- Cada función se define una sola vez. Nunca se reasigna desde
  otro