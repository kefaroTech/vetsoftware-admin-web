import axios from 'axios'
import { http } from '@/services/http/http.client'
import type {
  CompanyTaxProfileResponse,
  NumberingResolutionResponse,
  WithholdingConfigDto,
} from '../types/company-fiscal.types'

/**
 * Las tres lecturas de la pestaña <b>Fiscal</b> del expediente de empresa (§I7).
 *
 * <p><b>Las tres exigen la cabecera `X-Company-Id`</b> —ninguna recibe la empresa
 * en la ruta ni en el cuerpo: los tres controladores la resuelven con
 * `authz.currentCompanyId()`, que para el operador de esta consola lee esa
 * cabecera— y por eso los tres métodos piden `companyId` como parámetro
 * obligatorio y explícito. `http.client.ts` la manda solo si quien llama la pasa,
 * y deliberadamente no hay ningún interceptor que la adivine de un store. Es la
 * misma decisión que documenta `company-record.api.ts`.
 *
 * <p><b>Ni un método de escritura, y no por falta de endpoints.</b> El contrato
 * ofrece `PUT /company-tax-profile`, `POST /numbering-resolutions` y compañía;
 * esta pantalla no los usa. El motivo está escrito en
 * `companyFiscalText.ts` (`TAX_PROFILE_HISTORY_GAP`) y se resume así: el perfil
 * fiscal no se edita, se cierra el vigente y se abre otro, y hoy el contrato no
 * sabe hacer ni una cosa ni la otra —el `PUT` reescribe la fila en sitio y el
 * `POST` responde 409 si ya hay perfil—. Ofrecer «editar» aquí sería ofrecer que
 * una factura del año pasado cambie de destinatario.
 */
export const companyFiscalApi = {
  /**
   * El perfil fiscal vigente de la empresa.
   *
   * <p><b>Devuelve `null` en un 404, y eso NO es un error.</b> Una clínica que
   * todavía no ha configurado su facturación electrónica no tiene perfil:
   * `FindCompanyTaxProfileService` lanza `CompanyTaxProfileNotFoundException`
   * cuando el repositorio no encuentra ninguno, y eso llega como 404. Es un hecho
   * del negocio, y la pantalla lo dice con palabras. Cualquier otro estado —403,
   * 500, un timeout— sí se propaga: de esos no se sabe si hay perfil o no.
   */
  async findTaxProfile(
    companyId: number,
    signal?: AbortSignal,
  ): Promise<CompanyTaxProfileResponse | null> {
    try {
      const { data } = await http.get<CompanyTaxProfileResponse>('/company-tax-profile', {
        companyId,
        signal,
      })
      return data
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null
      throw err
    }
  },

  /**
   * Las resoluciones de numeración de la empresa.
   *
   * <p>Devuelve solo las vigentes en el sentido de «no retiradas»: la entidad
   * lleva `@SQLRestriction("enabled = true")`. Una lista vacía significa que la
   * clínica no tiene ninguna, no que la carga fallara.
   */
  async listNumberingResolutions(
    companyId: number,
    signal?: AbortSignal,
  ): Promise<NumberingResolutionResponse[]> {
    const { data } = await http.get<NumberingResolutionResponse[]>('/numbering-resolutions', {
      companyId,
      signal,
    })
    return data
  },

  /**
   * Las tarifas de retención que se espera que aplique la empresa.
   *
   * <p>Igual que el perfil: un 404 es «no hay configuración», no un fallo. Una
   * empresa que no es agente de retención no tiene fila, y pintar tres ceros
   * sobre ese hueco diría que retiene al 0 %, que es una afirmación distinta.
   */
  async findWithholdingConfig(
    companyId: number,
    signal?: AbortSignal,
  ): Promise<WithholdingConfigDto | null> {
    try {
      const { data } = await http.get<WithholdingConfigDto>('/withholding-configs', {
        companyId,
        signal,
      })
      return data
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null
      throw err
    }
  },
}
