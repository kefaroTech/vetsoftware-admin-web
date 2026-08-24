export type ItemType = 'MODULE' | 'CAPACITY' | 'ONE_TIME' | 'BUNDLE'
export type CapacityUnit = 'USER' | 'BRANCH' | 'TERMINAL' | 'STORAGE_GB'
export type CatalogItemStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED'
export type PriceListStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type BillingCycle = 'MONTHLY' | 'ANNUAL'
export type TaxTreatment = 'TAXED' | 'EXEMPT' | 'EXCLUDED'

/**
 * Qué hizo de verdad el alta de un puente de catálogo (incidencia #465).
 *
 * <p>`REACTIVATED` no es un adorno: los puentes tienen clave única sobre el par de artículos y una
 * fila dada de baja <b>sigue ocupándola</b>, así que volver a añadir la misma pareja no inserta,
 * revive. Sin este dato la pantalla tenía que adivinar cuál de las dos cosas pasó comparando
 * `id`/`createdDate` contra lo que ya tenía en memoria, y se equivoca en cuanto dos operadores
 * trabajan a la vez. Llega informado <b>solo en la respuesta del alta</b>; en las lecturas es
 * `null`, y es deliberado.
 */
export type LinkOutcome = 'CREATED' | 'REACTIVATED'

export interface CatalogItemResponse {
  id: number
  code: string
  name: string
  shortDescription: string | null
  longDescription: string | null
  itemType: ItemType
  capacityUnit: CapacityUnit | null
  core: boolean
  minQuantity: number
  maxQuantity: number | null
  sortOrder: number
  status: CatalogItemStatus
  createdDate: string
  enabled: boolean
}

export interface CreateCatalogItemRequest {
  code: string
  name: string
  shortDescription: string | null
  longDescription: string | null
  itemType: ItemType
  capacityUnit: CapacityUnit | null
  core: boolean
  minQuantity: number
  maxQuantity: number | null
  sortOrder: number
  status: CatalogItemStatus
}

export type UpdateCatalogItemRequest = Omit<CreateCatalogItemRequest, 'code'>

export interface PriceListResponse {
  id: number
  code: string
  name: string
  currency: string
  validFrom: string
  validTo: string | null
  status: PriceListStatus
  publishedAt: string | null
  publishedBySystemUserId: number | null
  createdDate: string
  enabled: boolean
}

export interface CreatePriceListRequest {
  code: string
  name: string
  currency: string
  validFrom: string
  validTo: string | null
}

export type UpdatePriceListRequest = Omit<CreatePriceListRequest, 'code'>

export interface CatalogPriceResponse {
  id: number
  priceListId: number
  catalogItemId: number
  billingCycle: BillingCycle
  tierMin: number
  tierMax: number | null
  includedQuantity: number
  unitAmount: number
  setupAmount: number
  taxRate: number
  taxTreatment: TaxTreatment
  createdDate: string
  enabled: boolean
  /**
   * El artículo al que pertenece el precio, resuelto por el servidor en los cuatro verbos de
   * `/catalog-prices` (incidencia #379). Vacío solo si el artículo se retiró del catálogo.
   */
  catalogItem: CatalogItemSummary | null
}

/** Lo justo para nombrar el artículo en la rejilla de precios sin una segunda llamada. */
export interface CatalogItemSummary {
  id: number
  code: string
  name: string
}

export interface CreateCatalogPriceRequest {
  priceListId: number
  catalogItemId: number
  billingCycle: BillingCycle
  tierMin: number
  tierMax: number | null
  includedQuantity: number
  unitAmount: number
  setupAmount: number
  taxRate: number
  taxTreatment: TaxTreatment
}

export type UpdateCatalogPriceRequest = Omit<
  CreateCatalogPriceRequest,
  'priceListId' | 'catalogItemId'
>

export const ITEM_TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'MODULE', label: 'Módulo' },
  { value: 'CAPACITY', label: 'Capacidad' },
  { value: 'ONE_TIME', label: 'Pago único' },
  { value: 'BUNDLE', label: 'Paquete' },
]

export const CAPACITY_UNIT_OPTIONS: { value: CapacityUnit | ''; label: string }[] = [
  { value: '', label: 'No aplica' },
  { value: 'USER', label: 'Usuario' },
  { value: 'BRANCH', label: 'Sede' },
  { value: 'TERMINAL', label: 'Terminal' },
  { value: 'STORAGE_GB', label: 'Almacenamiento (GB)' },
]

export const CATALOG_ITEM_STATUS_OPTIONS: { value: CatalogItemStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'DEPRECATED', label: 'Obsoleto' },
]

export const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'ANNUAL', label: 'Anual' },
]

export const TAX_TREATMENT_OPTIONS: { value: TaxTreatment; label: string }[] = [
  { value: 'TAXED', label: 'Gravado' },
  { value: 'EXEMPT', label: 'Exento' },
  { value: 'EXCLUDED', label: 'Excluido' },
]

// ───────────────────────────────────────────────────────────────────────────
// Los tres puentes del catálogo comercial (§4.1, tarea W3-A)
//
// Nueve rutas del contrato que hasta ahora no tenía ningún consumidor. Las tres
// tablas responden tres preguntas distintas sobre el MISMO artículo:
//
//   · `catalog_item_sub_modules` — qué pantallas abre. Es «el puente entre
//     vender y funcionar»: sin una fila aquí, vender «Historia clínica» a una
//     clínica no le abre ninguna pantalla en su aplicación. El artículo se cobra
//     y no concede nada.
//   · `catalog_item_dependencies` — las reglas del configurador.
//   · `bundle_components`        — qué trae un paquete y en qué cantidad.
//
// `CatalogItemSubModuleResponse` y `SubModuleSummary` se importan de
// `platform-setup` y NO se redeclaran aquí, aunque su pantalla ya exista y el
// comentario de aquel módulo prometiera mudarlos: `SubModuleSummary` lo consume
// también `features/subscriptions-admin/types/entitlements.types.ts`, y mover el
// tipo obligaría a editar esa feature. Declararlo en dos sitios dejaría dos
// interfaces homónimas y `api-contract.spec.ts` agrupa por nombre: solo una
// quedaría atada al contrato. Ver el issue de seguimiento.
// ───────────────────────────────────────────────────────────────────────────

/**
 * El tipo de regla entre dos artículos.
 *
 * **En inglés, y no traducido.** Hubo un choque entre el español de la interfaz
 * y el valor que viaja por el cable; se resolvió dejando el enum del contrato
 * intacto (`chk_catalog_item_dependencies_relation`) y traduciendo solo el
 * rótulo. Traducir el valor rompería el `CHECK` con un 400 y el operador
 * delante.
 */
export type RelationType = 'REQUIRES' | 'RECOMMENDS' | 'EXCLUDES'

/** `POST /catalog-items/{catalogItemId}/sub-modules`. El puente no tiene `PUT`. */
export interface CreateCatalogItemSubModuleRequest {
  subModuleId: number
}

export interface CatalogItemDependencyResponse {
  id: number
  catalogItemId: number
  relatedItemId: number
  relationType: RelationType
  /**
   * El mensaje que se le enseña al cliente —«Facturar electrónicamente necesita
   * el módulo de Caja»—, no un comentario técnico. El esquema lo admite vacío;
   * la interfaz lo exige (ver `CatalogItemDependencyForm.vue`).
   */
  note: string | null
  createdDate: string
  enabled: boolean
  /** Ver `LinkOutcome`. Solo viene informado al dar de alta; en las lecturas es `null`. */
  outcome: LinkOutcome | null
}

export interface CreateCatalogItemDependencyRequest {
  relatedItemId: number
  relationType: RelationType
  note: string
}

/** El artículo relacionado no se puede cambiar: eso es otra regla, no la misma. */
export type UpdateCatalogItemDependencyRequest = Omit<
  CreateCatalogItemDependencyRequest,
  'relatedItemId'
>

export interface BundleComponentResponse {
  id: number
  bundleItemId: number
  componentItemId: number
  quantity: number
  createdDate: string
  enabled: boolean
  /** Ver `LinkOutcome`. Solo viene informado al dar de alta; en las lecturas es `null`. */
  outcome: LinkOutcome | null
}

export interface CreateBundleComponentRequest {
  componentItemId: number
  quantity: number
}

/** Solo la cantidad. Cambiar la pieza es quitar una y poner otra. */
export type UpdateBundleComponentRequest = Omit<CreateBundleComponentRequest, 'componentItemId'>

export const RELATION_TYPE_OPTIONS: { value: RelationType; label: string }[] = [
  { value: 'REQUIRES', label: 'Requiere' },
  { value: 'RECOMMENDS', label: 'Recomienda' },
  { value: 'EXCLUDES', label: 'Excluye' },
]

/**
 * Qué significa cada tipo, con las palabras de §4.1. Va junto al rótulo en la
 * tabla y en el formulario: «Requiere» a secas no dice si bloquea la venta o
 * solo la sugiere, y esa es justo la diferencia que decide el configurador.
 */
export const RELATION_TYPE_MEANING: Record<RelationType, string> = {
  REQUIRES: 'no se puede vender sin',
  RECOMMENDS: 'el configurador lo sugiere',
  EXCLUDES: 'no pueden coexistir',
}

export const RELATION_TYPE_LABEL: Record<RelationType, string> = {
  REQUIRES: 'Requiere',
  RECOMMENDS: 'Recomienda',
  EXCLUDES: 'Excluye',
}
