/**
 * El cuerpo crudo de un webhook de Wompi es texto en el contrato (`rawBody:
 * String`), pero lo que llegó de la pasarela es JSON. Formatearlo aquí, aparte
 * del componente, es lo que permite probarlo sin montar el modal.
 */
export function prettyWompiBody(raw: string | null): string {
  if (!raw) return '—'
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    // No todo evento que Wompi manda es JSON válido de un lado a otro: si el
    // parseo falla, se muestra el texto tal como llegó en vez de esconderlo.
    return raw
  }
}
