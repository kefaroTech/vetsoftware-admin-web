import { http } from '@/services/http/http.client'
import type {
  CompanyTrialGrantResponse,
  CompanyTrialWindowResponse,
  ConsumeTrialGrantRequest,
  GrantTrialRequest,
  OpenTrialWindowRequest,
} from '../types/trials.types'

/**
 * Los cinco endpoints de plataforma de la prueba (§I5 / §C2).
 *
 * <p><b>La empresa viaja en la RUTA, no en la cabecera.</b> Es la diferencia con
 * `entitlements.api.ts`, y conviene no copiarla mal:
 * `SystemCompanyTrialWindowController` y `SystemCompanyTrialGrantController`
 * cuelgan de `/system/**` y reciben `companyId` como `@PathVariable`, porque «un
 * usuario de plataforma no tiene empresa». No se pasa aquí la opción `companyId`
 * de axios —la que pone `X-Company-Id`— porque estos endpoints no la leen: quien
 * la mandara estaría añadiendo una cabecera invisible que no decide nada, y el
 * día que alguien la leyera decidiría sobre la empresa equivocada.
 *
 * <p><b>No hay `remove`, y su ausencia es una regla de negocio.</b> Una concesión
 * de prueba no se desconcede: el contrato no publica borrado ni revocación, y
 * este cliente no inventa ninguno. Lo mismo con ampliar la ventana — no existe
 * `update`, y por eso la pantalla no puede ofrecerlo ni por descuido.
 *
 * <p><b>Las dos escrituras que se añaden aquí son las dos mitades del ciclo de
 * una concesión, y solo hay dos porque solo hay dos.</b> `grant` la crea con
 * fecha de caducidad obligatoria; `consume` le escribe el desenlace cuando
 * vence. En medio no hay nada: ni editar, ni prorrogar, ni revocar. Quien busque
 * una tercera operación no la va a encontrar, y ese es el diseño.
 */
export const trialsApi = {
  /**
   * La ventana vigente de una empresa.
   *
   * <p>Devuelve el cuerpo, no el `AxiosResponse`. Una empresa que nunca ha
   * estado en prueba <b>no es un error</b>: el 404 lo traduce el composable a
   * «no hay ventana», que es la verdad, y no a un banner rojo.
   */
  async findCurrentWindow(
    companyId: number,
    signal?: AbortSignal,
  ): Promise<CompanyTrialWindowResponse> {
    const { data } = await http.get<CompanyTrialWindowResponse>(
      `/system/company-trial-windows/companies/${companyId}/current`,
      { signal },
    )
    return data
  },

  /**
   * Abre la ventana. <b>Es irrepetible en la práctica</b>: no hay endpoint que
   * le añada días después, así que `windowDays` es la única oportunidad de
   * acertar con la duración.
   */
  async openWindow(
    companyId: number,
    body: OpenTrialWindowRequest,
  ): Promise<CompanyTrialWindowResponse> {
    const { data } = await http.post<CompanyTrialWindowResponse>(
      `/system/company-trial-windows/companies/${companyId}`,
      body,
    )
    return data
  },

  /**
   * Cierra la ventana antes de tiempo.
   *
   * <p>No lleva cuerpo. El `undefined` es el `data` de axios: sin él, el objeto
   * de configuración se leería como el cuerpo del POST.
   */
  async closeWindow(companyId: number): Promise<CompanyTrialWindowResponse> {
    const { data } = await http.post<CompanyTrialWindowResponse>(
      `/system/company-trial-windows/companies/${companyId}/closures`,
      undefined,
    )
    return data
  },

  /** Las concesiones de una empresa, vivas y vencidas. */
  async listByCompany(
    companyId: number,
    signal?: AbortSignal,
  ): Promise<CompanyTrialGrantResponse[]> {
    const { data } = await http.get<CompanyTrialGrantResponse[]>(
      `/system/company-trial-grants/companies/${companyId}`,
      { signal },
    )
    return data
  },

  /**
   * El barrido: <b>todas</b> las concesiones de la plataforma que vencen ese
   * día, de todas las empresas.
   *
   * <p>`day` es un `LocalDate` (`yyyy-MM-dd`) y se resuelve en la zona del
   * negocio, nunca con el reloj del navegador — ver `trialWindowText.ts`.
   */
  async listExpiringOn(day: string, signal?: AbortSignal): Promise<CompanyTrialGrantResponse[]> {
    const { data } = await http.get<CompanyTrialGrantResponse[]>(
      '/system/company-trial-grants/expirations',
      { params: { day }, signal },
    )
    return data
  },

  /**
   * <b>Concede un artículo a mano.</b> La operación de mayor privilegio de este
   * slice: entrega acceso sin contrato y sin cargo.
   *
   * <p><b>`daysGranted` viaja siempre y nunca es 0.</b> Lo garantiza el tipo
   * —es obligatorio en `GrantTrialRequest`— y lo vuelve a garantizar el
   * validador del modal, porque un `@NotNull` del borde acepta el cero y una
   * concesión de cero días es una concesión que no caduca en la práctica: no la
   * cierra ningún vencimiento y sobrevive a todos los recálculos.
   *
   * <p>Devuelve la concesión tal y como quedó guardada — con sus
   * `effectiveDays` ya recortados contra la ventana, que casi nunca son los
   * `daysGranted` que se pidieron.
   */
  async grant(companyId: number, body: GrantTrialRequest): Promise<CompanyTrialGrantResponse> {
    const { data } = await http.post<CompanyTrialGrantResponse>(
      `/system/company-trial-grants/companies/${companyId}`,
      body,
    )
    return data
  },

  /**
   * <b>Escribe el desenlace de una concesión</b> al vencer: qué pasó de verdad.
   *
   * <p>La concesión se identifica por el <b>artículo</b>, no por su `id`: la ruta
   * es `.../catalog-items/{catalogItemId}/consumptions`. No es un capricho del
   * cliente, es la ruta que publica el contrato.
   *
   * <p><b>No borra nada.</b> La concesión sigue existiendo después, y sigue
   * probando que esta empresa tuvo ese artículo en esas fechas. Lo único que
   * cambia es que deja de estar en blanco.
   */
  async consume(
    companyId: number,
    catalogItemId: number,
    body: ConsumeTrialGrantRequest,
  ): Promise<CompanyTrialGrantResponse> {
    const { data } = await http.post<CompanyTrialGrantResponse>(
      `/system/company-trial-grants/companies/${companyId}/catalog-items/${catalogItemId}/consumptions`,
      body,
    )
    return data
  },
}
