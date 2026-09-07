/**
 * El cuerpo crudo de cada webhook que Wompi entrega, con su checksum y su
 * resultado de procesamiento. Es lo que hace falta para contestar «¿qué mandó
 * realmente la pasarela?» ante una disputa con el banco o con Wompi, y hasta
 * ahora solo se podía sacar con una consulta SQL directa.
 */
export interface WompiWebhookEventResponse {
  id: number
  gateway: string
  eventType: string
  gatewayReference: string | null
  eventChecksum: string
  processingOutcome: string | null
  receivedAt: string
  processedAt: string | null
  createdDate: string
  /** El cuerpo tal como llegó de Wompi. Se pinta como JSON formateado en el panel de detalle. */
  rawBody: string | null
}

/** Espejo de los parámetros de `GET /system/payment-gateway/wompi/events`. */
export interface WompiEventsQuery {
  reference?: string
  companyId?: number
  from?: string
  to?: string
}
