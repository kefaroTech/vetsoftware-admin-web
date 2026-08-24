import type { LinkOutcome } from '../../commercial-catalog/types/commercial-catalog.types'

/**
 * La puesta en marcha de la plataforma (especificación §3.7, tarea W1-B).
 *
 * El catálogo comercial no está sembrado por decisión de producto: hoy no hay
 * artículos, ni tarifa publicada, ni configuración de facturación. Todas las
 * pantallas de suscripciones arrancan vacías y el alta de una empresa **falla**.
 * La regla de diseño que estos tipos sostienen es una sola:
 *
 * > lista vacía + sin filtro + recurso que es prerrequisito de arranque
 * > → no es «sin resultados», es «falta el paso N de la puesta en marcha».
 *
 * Un «no hay resultados» ahí se lee como «esto está roto» y termina en un
 * ticket de soporte; una lista de pasos dice qué hacer.
 */

/**
 * Los DTO de las rutas que hoy no tiene ningún cliente propio en esta consola.
 *
 * ⚠️ **Frontera de tareas, ya resuelta.** `PriceListSummary`,
 * `PlatformBillingConfigResponse` y `BillingDocumentSequenceResponse` se
 * declararon aquí mientras la pantalla de facturación de plataforma (§4.6, tarea
 * W1-F) no existía, con el compromiso escrito de **mudarlos a ella** en cuanto
 * aterrizara. W1-F ya está, así que viven en
 * `features/platform-billing/types/platform-billing.types.ts` y este módulo los
 * importa — igual que se hizo con `ConfiguratorQuestionResponse` cuando aterrizó
 * W1-C. Declararlos en dos sitios dejaría dos interfaces homónimas y
 * `api-contract.spec.ts` agrupa por nombre: solo una quedaría atada al contrato.
 *
 * `CatalogItemSubModuleResponse` y `SubModuleSummary` **se quedan pese a que su
 * pantalla ya existe** (W3-A aterrizó el editor de los tres puentes en
 * `features/commercial-catalog`, §4.1), y conviene que quede escrito por qué no
 * se cumplió el compromiso de mudarlos: `SubModuleSummary` lo consume también
 * `features/subscriptions-admin/types/entitlements.types.ts`, y moverlo obliga a
 * editar esa feature. `CatalogItemSubModuleResponse` lo tiene anidado, así que
 * mudarlo solo a él dejaría el tipo dueño en un módulo y su parte anidada en
 * otro. `commercial-catalog` los importa de aquí; el cliente HTTP sí se mudó y
 * este módulo lo re-exporta. Ver el issue de seguimiento.
 */

/** Submódulo tal y como lo trae anidado `CatalogItemSubModuleResponse`. */
export interface SubModuleSummary {
  id: number
  code: string
  name: string
}

/**
 * `GET /catalog-items/{catalogItemId}/sub-modules` — el puente entre vender y
 * funcionar. Sin él, vender «Historia clínica» no abre ninguna pantalla en la
 * app del cliente (§1.4).
 */
export interface CatalogItemSubModuleResponse {
  id: number
  catalogItemId: number
  subModule: SubModuleSummary
  createdDate: string
  enabled: boolean
  /** Ver `LinkOutcome`. Solo viene informado al dar de alta; en las lecturas es `null`. */
  outcome: LinkOutcome | null
}

// ---------------------------------------------------------------------------
// El modelo de la lista de comprobación
// ---------------------------------------------------------------------------

/** Los siete pasos de §3.7, en orden de dependencia real. */
export type PlatformSetupStepId =
  | 'catalog-item'
  | 'sub-modules'
  | 'price-list'
  | 'catalog-prices'
  | 'billing-config'
  | 'document-sequence'
  | 'questionnaire'

/**
 * Tres estados y no dos.
 *
 * `unknown` existe porque una sonda puede fallar (un 500, la red caída, un 503
 * de `platform-billing-config`) y pintar eso como `pending` sería mandar al
 * operador a crear algo que quizá ya existe. Es el mismo criterio que el orden
 * de ramas de `AppTable`: el error se pinta antes que el vacío, nunca disfrazado
 * de vacío.
 */
export type PlatformSetupStepState = 'done' | 'pending' | 'unknown'

export interface PlatformSetupStep {
  id: PlatformSetupStepId
  /** 1..7 — el número que el operador lee y con el que se habla del paso. */
  order: number
  /** El rótulo de §3.7. Idéntico en las cuatro pantallas y en el fallo del alta. */
  label: string
  /**
   * Qué exige de verdad el backend, cuando el rótulo se queda corto. No es
   * adorno: el alta no pide «un artículo activo», pide el artículo `CORE`.
   */
  detail: string
  /** Dónde se hace. El rótulo del paso es un enlace a esta ruta. */
  to: string
  /** El paso 7 es «recomendado»: no bloquea el alta. */
  required: boolean
  state: PlatformSetupStepState
  /** Por qué no se pudo comprobar. Solo con `state === 'unknown'`. */
  reason: string | null
}

/**
 * Los textos, fijados en §3.7 «para que sean idénticos en todos los sitios donde
 * aparezcan». Viven en una constante y no repartidos por los templates porque el
 * requisito es literalmente ese: GOV.UK, *Validation pattern* — el mensaje del
 * resumen y el del sitio donde se arregla tienen que ser el mismo texto. Si el
 * servidor enumera lo que falta con otras palabras que la pantalla, el operador
 * cree que son dos problemas distintos.
 */
export const PLATFORM_SETUP_TEXTS = {
  heading: 'Puesta en marcha de la plataforma',
  /** «{n} de 6 pasos obligatorios completados». */
  count: (done: number, total: number) => `${done} de ${total} pasos obligatorios completados`,
  body: 'Todavía no se puede dar de alta una empresa. El alta fallará hasta que los seis pasos obligatorios estén completos.',
  /**
   * La forma compacta de §3.7: «Faltan {n} pasos de la puesta en marcha para
   * poder {cotizar|contratar}». Con un solo paso pendiente concuerda en
   * singular — «Faltan 1 pasos» es la clase de descuido que hace dudar de todo
   * lo demás que dice la pantalla.
   */
  missing: (pending: number, purpose: string) =>
    pending === 1
      ? `Falta 1 paso de la puesta en marcha para poder ${purpose}.`
      : `Faltan ${pending} pasos de la puesta en marcha para poder ${purpose}.`,
  done: 'Listo',
  pending: 'Pendiente',
  recommended: 'Recomendado',
  /** No está en §3.7: §3.7 no contempla que una sonda falle. Ver `PlatformSetupStepState`. */
  unknown: 'Sin comprobar',
} as const
