/**
 * Normalización de texto para buscar en cliente.
 *
 * Existe porque `toLowerCase().includes()` NO sirve en español: «cirugia» no
 * encuentra «Cirugía» y «radiografia» no encuentra «Radiografía». En los
 * catálogos clínicos de esta consola casi todos los nombres llevan tilde, así
 * que un buscador sin plegado de acentos falla justo con el usuario al que
 * pretende servir: el que teclea rápido y sin tildes.
 *
 * **No lo simplifiques de vuelta a `includes()`.** El `normalize('NFD')`
 * descompone cada letra acentuada en su letra base más un diacrítico
 * combinante, y el `replace` borra esos diacríticos: es lo que hace que «í» y
 * «i» sean el mismo carácter a efectos de comparación. Sin ese paso, la única
 * alternativa es una tabla de sustituciones a mano, que se olvida de la «ü» o
 * de la «ñ» a la primera.
 *
 * La `ñ` se pliega a `n` como efecto del mismo mecanismo, y es lo que se
 * quiere: quien busca «peque» debe encontrar «Pequeño».
 *
 * El colapso de espacios cubre el otro caso corriente: el término pegado desde
 * otra pantalla, que llega con espacios de más o con un salto de línea dentro.
 *
 * Vive aquí, en un solo sitio, y no copiado en las diecisiete vistas de
 * listado: dieciséis copias de la normalización serían exactamente la deuda que
 * este trabajo vino a retirar.
 */
export function normalizarBusqueda(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * `true` si alguno de los campos contiene el término, plegando acentos,
 * mayúsculas y espacios en los dos lados de la comparación.
 *
 * Los campos nulos se ignoran: la mitad de los catálogos tienen descripción
 * opcional y comparar contra `'null'` daría coincidencias falsas.
 */
export function coincide(term: string, ...fields: (string | null | undefined)[]): boolean {
  const buscado = normalizarBusqueda(term)
  if (!buscado) return true
  return fields.some((f) => (f ? normalizarBusqueda(f).includes(buscado) : false))
}
