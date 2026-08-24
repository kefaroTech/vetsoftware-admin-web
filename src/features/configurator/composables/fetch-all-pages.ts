/**
 * Trae TODAS las páginas de un listado paginado, con un techo.
 *
 * <p>Los tres listados del configurador están paginados (`?page=&pageSize=`),
 * pero la pantalla de edición los necesita enteros: una pregunta, sus
 * respuestas y los efectos que cuelgan de ellas viven en tres endpoints
 * distintos, así que paginar las preguntas dejaría efectos sin dueño visible y
 * el árbol partido por la mitad.
 *
 * <p><b>El techo no es decorativo.</b> El cuestionario es de decenas de filas;
 * si algún día deja de serlo, esto devuelve `truncated` y la pantalla lo dice
 * en vez de pintar en silencio una parte y dejar creer que es el todo. Es el
 * mismo criterio con el que `useCommercialCatalog.fetchAllCatalogOptions` trae
 * el catálogo completo para un desplegable.
 */
export const MAX_ROWS = 500
export const FETCH_PAGE_SIZE = 200

export async function fetchAllPages<T>(
  load: (page: number, pageSize: number) => Promise<{ content: T[]; totalPages: number }>,
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages && items.length < MAX_ROWS) {
    const result = await load(page, FETCH_PAGE_SIZE)
    items.push(...result.content)
    totalPages = result.totalPages
    page += 1
  }
  return {
    items: items.slice(0, MAX_ROWS),
    truncated: items.length > MAX_ROWS || page < totalPages,
  }
}
