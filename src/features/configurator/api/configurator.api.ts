import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  ConfiguratorEffectResponse,
  ConfiguratorOptionResponse,
  ConfiguratorQuestionResponse,
  ConfiguratorSelectionResponse,
  CreateConfiguratorEffectRequest,
  CreateConfiguratorOptionRequest,
  CreateConfiguratorQuestionRequest,
  QuestionnaireQuestionResponse,
  ResolveConfiguratorSelectionRequest,
  ReorderConfiguratorEffectsRequest,
  UpdateConfiguratorEffectRequest,
  UpdateConfiguratorOptionRequest,
  UpdateConfiguratorQuestionRequest,
} from '../types/configurator.types'

/**
 * Las nueve rutas del configurador.
 *
 * **Ninguna necesita `X-Company-Id`**: son globales de plataforma
 * (especificación §1.1, fila «Global»). Las dos últimas —`/questionnaire` y
 * `/resolve`— son además **anónimas** (`PublicRoutes.BUSINESS` del backend),
 * porque el asistente lo usa un prospecto que todavía no es cliente.
 */
export const configuratorQuestionsApi = {
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<ConfiguratorQuestionResponse>> {
    const { data } = await http.get<PageResponse<ConfiguratorQuestionResponse>>(
      '/configurator/questions',
      { params: { page, pageSize }, signal },
    )
    return data
  },
  async findById(id: number): Promise<ConfiguratorQuestionResponse> {
    const { data } = await http.get<ConfiguratorQuestionResponse>(`/configurator/questions/${id}`)
    return data
  },
  async create(payload: CreateConfiguratorQuestionRequest): Promise<ConfiguratorQuestionResponse> {
    const { data } = await http.post<ConfiguratorQuestionResponse>(
      '/configurator/questions',
      payload,
    )
    return data
  },
  async update(
    id: number,
    payload: UpdateConfiguratorQuestionRequest,
  ): Promise<ConfiguratorQuestionResponse> {
    const { data } = await http.put<ConfiguratorQuestionResponse>(
      `/configurator/questions/${id}`,
      payload,
    )
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/configurator/questions/${id}`)
  },
}

export const configuratorOptionsApi = {
  /** Devuelve un array plano, no una página: es el único listado del configurador sin paginar. */
  async listByQuestion(
    questionId: number,
    signal?: AbortSignal,
  ): Promise<ConfiguratorOptionResponse[]> {
    const { data } = await http.get<ConfiguratorOptionResponse[]>(
      `/configurator/questions/${questionId}/options`,
      { signal },
    )
    return data
  },
  async create(payload: CreateConfiguratorOptionRequest): Promise<ConfiguratorOptionResponse> {
    const { data } = await http.post<ConfiguratorOptionResponse>('/configurator/options', payload)
    return data
  },
  async update(
    id: number,
    payload: UpdateConfiguratorOptionRequest,
  ): Promise<ConfiguratorOptionResponse> {
    const { data } = await http.put<ConfiguratorOptionResponse>(
      `/configurator/options/${id}`,
      payload,
    )
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/configurator/options/${id}`)
  },
}

export const configuratorEffectsApi = {
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<ConfiguratorEffectResponse>> {
    const { data } = await http.get<PageResponse<ConfiguratorEffectResponse>>(
      '/configurator/effects',
      { params: { page, pageSize }, signal },
    )
    return data
  },
  async create(payload: CreateConfiguratorEffectRequest): Promise<ConfiguratorEffectResponse> {
    const { data } = await http.post<ConfiguratorEffectResponse>('/configurator/effects', payload)
    return data
  },
  async update(
    id: number,
    payload: UpdateConfiguratorEffectRequest,
  ): Promise<ConfiguratorEffectResponse> {
    const { data } = await http.put<ConfiguratorEffectResponse>(
      `/configurator/effects/${id}`,
      payload,
    )
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/configurator/effects/${id}`)
  },
  /**
   * Reordena la aplicacion de los efectos: `PUT /configurator/effects/priorities`.
   *
   * <p>Devuelve la lista **completa y ya reordenada**, no solo las filas que
   * viajaron. Se aprovecha: la pantalla se queda con lo que dice el servidor en
   * vez de reconstruir el orden a partir de lo que creia haber mandado, que es
   * como se acaba pintando un orden que el backend no guardo.
   */
  async reorder(payload: ReorderConfiguratorEffectsRequest): Promise<ConfiguratorEffectResponse[]> {
    const { data } = await http.put<ConfiguratorEffectResponse[]>(
      '/configurator/effects/priorities',
      payload,
    )
    return data
  },
}

export const configuratorPublicApi = {
  async questionnaire(signal?: AbortSignal): Promise<QuestionnaireQuestionResponse[]> {
    const { data } = await http.get<QuestionnaireQuestionResponse[]>(
      '/configurator/questionnaire',
      { signal },
    )
    return data
  },
  /**
   * ⚠️ **60 peticiones por minuto y por IP** (`CONFIGURATOR_RESOLVE_LIMIT` en
   * `LoginRateLimitFilter`). Es anónima, así que el límite es la única
   * protección que tiene, y lo paga toda la oficina detrás de la misma IP
   * pública. Por eso esta llamada NO se dispara en cada pulsación: la lanza el
   * botón «Ver el resultado» y las dos instantáneas de la comparación
   * antes/después. Ver `useConfiguratorTester`.
   */
  async resolve(
    payload: ResolveConfiguratorSelectionRequest,
    signal?: AbortSignal,
  ): Promise<ConfiguratorSelectionResponse> {
    const { data } = await http.post<ConfiguratorSelectionResponse>(
      '/configurator/resolve',
      payload,
      { signal },
    )
    return data
  },
}
