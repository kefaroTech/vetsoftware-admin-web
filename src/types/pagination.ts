/**
 * Espejo de `PageResponse<T>` del backend (`infrastructure/web/PageResponse.java`).
 *
 * Todos los listados paginados devuelven esta misma envoltura, así que el tipo vive una sola vez
 * y no se redefine por feature.
 */
export interface PageResponse<T> {
  content: T[]
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

/** Parámetros de consulta que acepta cualquier listado paginado del backend. */
export interface PageQuery {
  page: number
  pageSize: number
}

export const DEFAULT_PAGE_SIZE = 20

/** Página vacía, para inicializar estado sin tener que llamar al servidor. */
export function emptyPage<T>(pageSize = DEFAULT_PAGE_SIZE): PageResponse<T> {
  return { content: [], page: 0, pageSize, totalElements: 0, totalPages: 0 }
}
