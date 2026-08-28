import { http } from '@/services/http/http.client'
import type {
  CompanyLimitEventResponse,
  CompanyLimitOverrideResponse,
  CreateLimitDimensionRequest,
  EffectiveLimitResponse,
  GrantCompanyLimitOverrideRequest,
  LimitDimensionResponse,
  RevokeCompanyLimitOverrideRequest,
  UpdateLimitDimensionRequest,
} from '../types/limits.types'

/**
 * Los tres clientes de cupo, con una regla común: **la empresa nunca es
 * implícita**.
 *
 * <p>El contrato expone cada familia por duplicado — una ruta de tenant
 * (`GET /company-limit-overrides`, `GET /company-limit-events`) y una de
 * plataforma (`/system/**`). Las de tenant resuelven la empresa con
 * `Authz.currentCompanyId()`, es decir, con la cabecera `X-Company-Id` del
 * `EmployeeContext`. **Un operador de esta consola es un `SystemUserContext` y
 * no tiene empresa**, así que esas rutas aquí no devolverían «lo mío»:
 * devolverían un error o, peor, algo que no es de nadie. Por eso este fichero
 * consume **solo** las de `/system/**`, donde `companyId` viaja en la URL y se
 * ve en la propia petición.
 *
 * <p>La excepción son los ejes: `/limit-dimensions` es global de plataforma y no
 * tiene contraparte de empresa, porque un eje no pertenece a ningún cliente.
 *
 * <p>Todos los métodos devuelven **el cuerpo**, no el `AxiosResponse`. Ningún
 * consumidor desestructura `{ data }`.
 */

const DIMENSIONS = '/limit-dimensions'
const SYSTEM_OVERRIDES = '/system/company-limit-overrides'
const SYSTEM_EVENTS = '/system/company-limit-events'

/** Los ejes de cupo de la plataforma: mascotas, citas, usuarios, sedes, facturas… */
export const limitDimensionsApi = {
  async listAll(signal?: AbortSignal): Promise<LimitDimensionResponse[]> {
    const { data } = await http.get<LimitDimensionResponse[]>(DIMENSIONS, { signal })
    return data
  },

  async findById(id: number, signal?: AbortSignal): Promise<LimitDimensionResponse> {
    const { data } = await http.get<LimitDimensionResponse>(`${DIMENSIONS}/${id}`, { signal })
    return data
  },

  async create(payload: CreateLimitDimensionRequest): Promise<LimitDimensionResponse> {
    const { data } = await http.post<LimitDimensionResponse>(DIMENSIONS, payload)
    return data
  },

  /**
   * Edita **solo** nombre, submódulo y días de gracia.
   *
   * <p>El código, el tipo de medida y la fecha de disponibilidad no se pueden
   * enviar: `UpdateLimitDimensionRequest` no los declara. El formulario los
   * enseña en solo lectura en vez de mandarlos y confiar en que el servidor los
   * ignore — un campo que se deja escribir y luego no viaja es la forma
   * silenciosa de que alguien crea haber cambiado algo que sigue igual.
   */
  async update(id: number, payload: UpdateLimitDimensionRequest): Promise<LimitDimensionResponse> {
    const { data } = await http.put<LimitDimensionResponse>(`${DIMENSIONS}/${id}`, payload)
    return data
  },
}

/** Las excepciones de techo negociadas, vistas desde la plataforma. */
export const limitOverridesApi = {
  /**
   * Las excepciones de **una** empresa, vivas e históricas.
   *
   * <p>⚠️ No existe un barrido de todas las empresas a la vez: el contrato solo
   * expone `/system/company-limit-overrides/companies/{companyId}`. Por eso la
   * pantalla pide la empresa antes de listar nada, en vez de enseñar una tabla
   * vacía que parecería decir «no hay ninguna excepción en la plataforma».
   */
  async listByCompany(
    companyId: number,
    signal?: AbortSignal,
  ): Promise<CompanyLimitOverrideResponse[]> {
    const { data } = await http.get<CompanyLimitOverrideResponse[]>(
      `${SYSTEM_OVERRIDES}/companies/${companyId}`,
      { signal },
    )
    return data
  },

  /** Negocia una excepción. Exige firma: el motivo es de lista cerrada. */
  async grant(
    companyId: number,
    payload: GrantCompanyLimitOverrideRequest,
  ): Promise<CompanyLimitOverrideResponse> {
    const { data } = await http.post<CompanyLimitOverrideResponse>(
      `${SYSTEM_OVERRIDES}/companies/${companyId}`,
      payload,
    )
    return data
  },

  /**
   * Revoca la excepción viva de una empresa sobre un eje.
   *
   * <p>La ruta se dirige por **eje**, no por identificador de excepción: solo
   * puede haber una viva por eje, y esa es la que se retira.
   */
  async revoke(
    companyId: number,
    limitDimensionId: number,
    payload: RevokeCompanyLimitOverrideRequest,
  ): Promise<CompanyLimitOverrideResponse> {
    const { data } = await http.post<CompanyLimitOverrideResponse>(
      `${SYSTEM_OVERRIDES}/companies/${companyId}/dimensions/${limitDimensionId}/revocations`,
      payload,
    )
    return data
  },

  /**
   * **El techo efectivo y de dónde sale.** Lo resuelve el servidor.
   *
   * <p>Esta consola no reconstruye la precedencia
   * `COMPANY_OVERRIDE > SUBSCRIPTION > CATALOG_DEFAULT > NONE` cruzando la
   * excepción con el contrato y con el catálogo: la pregunta. Replicar el orden
   * aquí significaría que el día que el backend añada un origen la pantalla
   * seguiría contestando, con total seguridad, una cifra equivocada.
   */
  async findEffectiveLimit(
    companyId: number,
    limitDimensionId: number,
    signal?: AbortSignal,
  ): Promise<EffectiveLimitResponse> {
    const { data } = await http.get<EffectiveLimitResponse>(
      `${SYSTEM_OVERRIDES}/companies/${companyId}/effective-limits/${limitDimensionId}`,
      { signal },
    )
    return data
  },
}

/** La bitácora de cupo: avisos, portazos, ampliaciones y reconciliaciones. */
export const limitEventsApi = {
  /**
   * Los hechos de cupo de **una** empresa dentro de una ventana de fechas.
   *
   * <p>`from` y `to` son fechas ISO (`aaaa-mm-dd`) y las exige el servidor: la
   * bitácora no se pide entera.
   *
   * <p>⚠️ Tampoco aquí hay barrido de plataforma: `/company-limit-events` sin
   * `/system` es la ruta del tenant y resuelve la empresa por la cabecera, que
   * un operador de consola no lleva.
   */
  async listByCompany(
    companyId: number,
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<CompanyLimitEventResponse[]> {
    const { data } = await http.get<CompanyLimitEventResponse[]>(
      `${SYSTEM_EVENTS}/companies/${companyId}`,
      { params: { from, to }, signal },
    )
    return data
  },
}
