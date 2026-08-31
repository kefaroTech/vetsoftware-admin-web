/**
 * Las pistas que el asistente lee para decidir qué artículo del catálogo
 * proponerle a un prospecto (`catalog_item_ai_hints`).
 *
 * <p><b>La tabla es historial, no estado.</b> Ni el `PUT` ni el `DELETE` del
 * backend sobrescriben la fila: el primero inserta una revisión nueva y sucede a
 * la anterior, el segundo solo cierra la vigencia. De ahí que aquí no haya
 * ningún `Update…Request` con forma de CRUD y que el vocabulario de la interfaz
 * sea «publicar», «corregir» y «retirar».
 *
 * <p><b>Los cuatro campos nulables lo son a propósito</b>, y el contrato lo dice:
 * `catalogItemCode`, `catalogItemName`, `supersededAt` y
 * `supersededBySystemUserId` NO figuran en el `required` de
 * `CatalogItemAiHintResponse`. Declararlos no nulables aquí dejaría pasar la
 * comprobación `NullableWhereRequired` de `api.contract.ts` y la pantalla se
 * rompería en runtime con `undefined`.
 */
export interface CatalogItemAiHintResponse {
  id: number
  catalogItemId: number
  /** `null` cuando el artículo dejó de estar habilitado en el catálogo. */
  catalogItemCode: string | null
  /** `null` cuando el artículo dejó de estar habilitado en el catálogo. */
  catalogItemName: string | null
  hintRevision: number
  hintText: string
  publishedAt: string
  publishedBySystemUserId: number
  /** `null` si esta revisión es la vigente. */
  supersededAt: string | null
  /**
   * `null` significa «no consta», que NO es lo mismo que «no se ha retirado»: la
   * firma de retirada la añadió el changeset 393 y las sucesiones anteriores no
   * la tienen. La ficha del artículo lo distingue por escrito.
   */
  supersededBySystemUserId: number | null
  current: boolean
  createdDate: string
}

/** `POST /catalog-item-ai-hints` — publica la primera pista de un artículo. */
export interface PublishCatalogItemAiHintRequest {
  catalogItemId: number
  hintText: string
}

/**
 * `PUT /catalog-item-ai-hints/{catalogItemId}` — corrige.
 *
 * <p>Sin `catalogItemId` (viaja en la ruta) y sin firmante (lo pone el servidor
 * desde el principal de la sesión).
 */
export interface ReviseCatalogItemAiHintRequest {
  hintText: string
}
