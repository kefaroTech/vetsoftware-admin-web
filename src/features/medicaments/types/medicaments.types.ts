/**
 * Formas del recurso `medicaments`, espejo literal de los DTO del backend.
 *
 * Los tipos se escriben a mano —y no se derivan de `api.generated.d.ts`— por el
 * motivo que `src/types/api.contract.ts` deja escrito: springdoc no marca la
 * nulabilidad de las respuestas, así que adoptar el esquema generado cambiaría
 * tipos precisos por tipos enteramente opcionales. Lo que ata estas interfaces
 * al servidor es su entrada en `api.contract.ts`, donde un campo inventado o
 * renombrado deja de compilar.
 *
 * **Una sola forma para las dos superficies.** `GlobalMedicamentController`
 * reutiliza el mismo `toResponse` que el controlador del tenant, con el
 * argumento de que «la `MedicamentResponse` es una sola y el front no tiene que
 * aprender dos formas del mismo recurso». Por eso aquí hay UN `MedicamentResponse`
 * y lo consumen las tres pantallas.
 */

/**
 * Empresa dueña de un medicamento privado. Es el esquema `CompanySummary` del
 * contrato, el mismo que reciben las cotizaciones.
 */
export interface MedicamentCompanySummary {
  id: number
  name: string
  /** Identificador fiscal (NIT). Se pinta bajo el nombre en la vista de plataforma. */
  identifier: string
}

/**
 * Invariante de dominio (`Medicament.java`): XOR estricto entre `general` y
 * `company`. `general === true` ⟺ `company === null`. La UI puede confiar en
 * él: no existe la fila «global con empresa».
 *
 * `enabled` viene en la respuesta y **no se pinta en ninguna pantalla**: dentro
 * de cada listado es constante por construcción del endpoint (`@SQLRestriction`
 * deja fuera los pausados, y `/disabled` devuelve solo pausados), así que una
 * columna «Estado» repetiría un dato invariable. Se declara porque el contrato
 * lo garantiza, no porque se lea.
 */
export interface MedicamentResponse {
  id: number
  name: string
  /** `@Size(max = 500)` SIN `@NotBlank` en el backend: puede llegar ausente. */
  description: string | null
  /** `null` ⟺ es global. Siempre `null` en `/admin/medicaments`. */
  company: MedicamentCompanySummary | null
  general: boolean
  /** ISO sin zona (`LocalDateTime`). Se pinta con `formatDate`, nunca crudo. */
  createdDate: string
  enabled: boolean
}

/**
 * Cuerpo de alta de un medicamento global. **Dos campos y no más.**
 *
 * No acepta `companyId` ni `general` a propósito, y el javadoc del backend
 * explica por qué: «aceptarla sería dejar que el cliente eligiera de quién es
 * la fila que crea». El servidor fija `company = null` y `general = true`. Un
 * selector de empresa en el formulario sería un control que el servidor ignora.
 */
export interface CreateGlobalMedicamentRequest {
  /** `@NotBlank` + `@Size(max = 200)`. */
  name: string
  /** `@Size(max = 500)`, opcional en el contrato: se envía cadena vacía. */
  description: string
}

/** Misma forma que el alta: el `PUT` global solo toca `name` y `description`. */
export type UpdateGlobalMedicamentRequest = CreateGlobalMedicamentRequest
