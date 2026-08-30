/**
 * Facturación de plataforma — §4.6 de
 * `docs/ux/suscripciones-consola-especificacion.md`, tarea W1-F.
 *
 * <p><b>Recurso singular, no colección.</b> `platform_billing_config` tiene
 * exactamente una fila garantizada por el esquema y su ruta no lleva `/{id}` ni
 * listado: dos verbos y nada más, `GET` para leerla y `PUT` para reemplazarla.
 * No hay `POST` —la fila la siembra el changeset que crea la tabla, no un alta
 * desde la interfaz— y por eso aquí no existe ningún `CreatePlatform…Request`.
 * El propio controller lo deja escrito
 * (`PlatformBillingConfigController.java:24-28`).
 *
 * <p><b>De dónde vienen estos tipos.</b> `PriceListSummary`,
 * `PlatformBillingConfigResponse` y `BillingDocumentSequenceResponse` los
 * declaró provisionalmente `features/platform-setup/types/platform-setup.types.ts`
 * (tarea W1-B) porque la lista de puesta en marcha necesitaba sus pasos 5 y 6
 * antes de que esta pantalla existiera, y su propia cabecera dejó escrito que
 * debían **mudarse** a la feature dueña en cuanto aterrizara. Esto es esa mudanza:
 * el tipo vive una sola vez, aquí, y `platform-setup` lo importa. Duplicarlos
 * dejaría dos interfaces homónimas en el repositorio y `api-contract.spec.ts`
 * agrupa por nombre: solo una de las dos quedaría atada al contrato y la otra se
 * pudriría en silencio, que es justo lo que TR-01 existe para impedir.
 */

/** Resumen de tarifa que `PlatformBillingConfigResponse` trae anidado. */
export interface PriceListSummary {
  id: number
  code: string
  name: string
}

/**
 * `GET /platform-billing-config` — las políticas del negocio, en un sitio.
 *
 * <p>El punto entero de que esta tabla exista es que cambiar los días de gracia
 * o el día de emisión sea editar un formulario y no desplegar una versión.
 */
export interface PlatformBillingConfigResponse {
  id: number
  /** `null` mientras nadie haya elegido la tarifa por defecto: es el paso 5 de §3.7. */
  defaultPriceList: PriceListSummary | null
  defaultGraceDays: number
  defaultTrialDays: number
  invoiceDayOfMonth: number
  defaultPaymentTermDays: number
  externalBillingProvider: string | null
  createdDate: string
}

/**
 * `PUT /platform-billing-config` — reemplaza la fila entera, no parchea campos.
 *
 * <p>`defaultPriceListId` es nulable **a propósito**: la columna lo es y quitar
 * la tarifa por defecto es una decisión válida
 * (`UpdatePlatformBillingConfigService.java:52-56`). Lo que el servidor rechaza
 * es apuntar a una lista que no existe.
 *
 * <p>Los cuatro contadores de días son obligatorios en el contrato
 * (`required: [defaultGraceDays, defaultPaymentTermDays, defaultTrialDays,
 * invoiceDayOfMonth]`) y sus límites —`@Min(0)` en los tres primeros, `1..28` en
 * el día de emisión— son los del propio DTO, no una convención del front.
 */
export interface UpdatePlatformBillingConfigRequest {
  defaultPriceListId: number | null
  defaultGraceDays: number
  defaultTrialDays: number
  invoiceDayOfMonth: number
  defaultPaymentTermDays: number
  externalBillingProvider: string | null
}

/** `GET /system/billing-document-sequences` — el consecutivo lo lleva la base. */
export interface BillingDocumentSequenceResponse {
  id: number
  prefix: string
  nextValue: number
  createdDate: string
}

/**
 * `POST /system/billing-document-sequences` — solo alta.
 *
 * <p>No hay `PUT`, y con razón: `nextValue` lo lleva la base de datos y un salto
 * a mano crea un hueco en la numeración. El único campo es el prefijo.
 */
export interface CreateBillingDocumentSequenceRequest {
  prefix: string
}

/**
 * El `code` del `ProblemDetail` con el que el backend dice que la fila única no
 * existe (`GlobalExceptionHandler.java:1861-1868`, **503**).
 *
 * <p>Se compara el **código**, nunca la prosa: el mensaje es exactamente lo que
 * hay que enseñarle al operador sin tocar, así que atarse a él para decidir sería
 * atarse a un texto que el backend puede reescribir mañana. Es la misma constante
 * que usa la sonda del paso 5 en `usePlatformSetup`.
 */
export const PLATFORM_BILLING_CONFIG_NOT_CONFIGURED = 'PLATFORM_BILLING_CONFIG_NOT_CONFIGURED'

/** `@Min(1) @Max(28)` de `UpdatePlatformBillingConfigRequest.invoiceDayOfMonth`. */
export const INVOICE_DAY_MIN = 1
export const INVOICE_DAY_MAX = 28

/** `@Size(max = 40)` de `externalBillingProvider`. */
export const EXTERNAL_PROVIDER_MAX_LENGTH = 40

/** `@Pattern("[A-Z]{1,10}")` de `CreateBillingDocumentSequenceRequest.prefix`. */
export const SEQUENCE_PREFIX_PATTERN = /^[A-Z]{1,10}$/
export const SEQUENCE_PREFIX_MAX_LENGTH = 10

/**
 * El prefijo de las cuentas de cobro de suscripción. Es el que comprueba el paso
 * 6 de la puesta en marcha (`usePlatformSetup`), y por eso se ofrece precargado.
 */
export const DOCUMENT_SEQUENCE_PREFIX = 'DC'
