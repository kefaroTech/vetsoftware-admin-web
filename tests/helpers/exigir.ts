/**
 * Afirmaciones de existencia para las pruebas, en lugar de `!`.
 *
 * Con `noUncheckedIndexedAccess`, `filas[0]` y `mapa.get(k)` son `T | undefined`.
 * La salida fácil es `filas[0]!`, pero eso no comprueba nada: si el elemento no
 * está, la prueba muere con «Cannot read properties of undefined» y el informe
 * no dice qué faltaba ni dónde. Y sobre todo, `!` es una afirmación del autor
 * —«esto existe»— que nadie verifica: exactamente la clase de mentira que estas
 * pruebas tienen que dejar de contener.
 *
 * `exigir` comprueba de verdad, falla con el motivo escrito y estrecha el tipo.
 * No silencia al compilador: convierte una suposición en una comprobación.
 */
export function exigir<T>(valor: T | null | undefined, que: string): T {
  if (valor === null || valor === undefined) {
    throw new Error(`Se esperaba ${que}, pero llegó ${valor === null ? 'null' : 'undefined'}.`)
  }
  return valor
}

/** `exigir` para un índice de array, con el índice ya en el mensaje. */
export function elemento<T>(lista: readonly T[], indice: number, que = 'la lista'): T {
  return exigir(
    lista[indice],
    `${que} con al menos ${indice + 1} elemento(s) (tiene ${lista.length})`,
  )
}
