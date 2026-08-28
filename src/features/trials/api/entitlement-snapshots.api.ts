import { http } from '@/services/http/http.client'
import type { CompanyEntitlementSnapshotResponse } from '@/features/company-limits/types/company-limits.types'

/**
 * <b>Las fotos de permisos: qué veía una empresa el día X.</b>
 *
 * <p>Un único endpoint —`GET /system/company-entitlement-snapshots/companies/
 * {companyId}?at=`— y cuelga de `/system/**`, así que la empresa viaja en la
 * <b>ruta</b> y no en la cabecera `X-Company-Id`. No se pasa la opción
 * `companyId` de axios: este controlador no la lee, y mandar una cabecera que
 * nadie mira es sembrar el día en que alguien la mire y decida sobre la empresa
 * equivocada. Es la misma nota que llevan `trials.api.ts` y
 * `company-limits.api.ts`.
 *
 * <p><b>El tipo se importa de `company-limits` y no se redeclara.</b>
 * `CompanyEntitlementSnapshotResponse` ya está escrito y —lo que importa— ya
 * está atado al contrato. Una interfaz homónima en `trials/types/` dejaría una
 * de las dos copias sin atar, que es exactamente el fallo TR-01 que la atadura
 * existe para impedir.
 *
 * <p><b>Por qué esta lectura vive en `trials/` habiendo una igual en
 * `company-limits/`.</b> No son la misma pregunta. Allí la foto se pide para
 * saber <b>si el proceso de recálculo está vivo</b> —se mira `recalculatedAt` y
 * se ignora el `payload`—; aquí se pide para saber <b>qué veía el cliente el día
 * que llamó</b>, y entonces el `payload` es toda la respuesta. Compartir el
 * cliente obligaría a una de las dos pantallas a cargar lo que no usa, y a la
 * otra a explicar por qué su store guarda un campo que nunca pinta.
 *
 * <p><b>No hay escritura, y no puede haberla.</b> El contrato no publica ninguna
 * sobre las fotos: son el registro de lo que se calculó, y un registro que se
 * puede editar no prueba nada. La única forma de que aparezca una foto nueva es
 * que se recalculen los permisos.
 */
export const entitlementSnapshotsApi = {
  /**
   * La <b>última</b> foto tomada en o antes de ese instante — el endpoint se
   * llama `latestAsOf` y eso es literal.
   *
   * <p>Consecuencia que la pantalla tiene que decir y no dar por sabida: lo que
   * vuelve casi nunca lleva la fecha que se pidió. Si se pregunta por el 14 de
   * marzo y el último recálculo fue el 2, se devuelve el del 2 — y esa <b>es</b>
   * la respuesta correcta, porque entre el 2 y el 14 no cambió nada y el cliente
   * seguía viendo lo del 2. Pintarlo como «la foto del 14» sería mentir sobre
   * qué día se calculó; callarlo dejaría creer que no hubo respuesta.
   *
   * <p>`at` es un `LocalDateTime` obligatorio (`yyyy-MM-ddTHH:mm:ss`), sin zona.
   * Lo compone la pantalla en la zona del negocio, nunca con el reloj del
   * navegador.
   */
  async findLatestAsOf(
    companyId: number,
    at: string,
    signal?: AbortSignal,
  ): Promise<CompanyEntitlementSnapshotResponse> {
    const { data } = await http.get<CompanyEntitlementSnapshotResponse>(
      `/system/company-entitlement-snapshots/companies/${companyId}`,
      { params: { at }, signal },
    )
    return data
  },
}
