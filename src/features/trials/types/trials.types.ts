import type { MatchesContract } from '@/types/api.contract'

/**
 * <b>La ventana de prueba de una empresa y las concesiones que viven dentro de
 * ella</b> (§I5 del expediente de empresa, que es la misma pantalla que §C2).
 *
 * <p>Los nombres son los del contrato —`CompanyTrialWindowResponse`,
 * `CompanyTrialGrantResponse`, `OpenTrialWindowRequest`— para que la atadura de
 * abajo se lea igual aquí que en el backend.
 *
 * <p><b>Por qué la atadura vive en este fichero y no en
 * `src/types/api.contract.ts`.</b> Ese fichero es el punto de serialización de
 * todo el repositorio: cinco features escribiendo a la vez en la misma lista de
 * importaciones es la colisión que el reparto de esta campaña prohíbe. Lo que se
 * comprueba es exactamente lo mismo —`MatchesContract` está exportado y es el
 * mismo tipo—, y el fallo se ve igual: un campo que el backend renombre deja de
 * compilar aquí en vez de llegar al navegador como `undefined`.
 */

/** Rompe la compilación si el tipo no encaja; el error nombra los campos culpables. */
type Expect<T extends true> = T

/**
 * Lo que la <b>política</b> del artículo dice que debe pasar cuando la prueba
 * termine. Es una intención escrita el día que se concede, no un resultado.
 */
export type TrialPolicyOutcome = 'CONVERT_TO_PAID' | 'LIMITED' | 'READ_ONLY'

/**
 * Lo que <b>de verdad pasó</b> al vencer. Es el desenlace, y es nulo mientras la
 * prueba siga viva o mientras nadie lo haya cerrado: un desenlace en blanco es
 * un dato honesto, no un `ABANDONED` que nadie decidió.
 */
export type TrialOutcome = 'CONVERTED' | 'LIMITED' | 'READ_ONLY' | 'ABANDONED'

/**
 * La ventana de prueba de una empresa.
 *
 * <p><b>`endDate` es el último día en prueba, incluido.</b> Lo dice el propio
 * contrato («Último día en prueba, incluido») y es la regla que decide si un
 * cliente entra hoy a trabajar o se encuentra la puerta cerrada un día antes de
 * tiempo. Toda la comparación de fechas de esta feature vive en
 * `composables/trialWindowText.ts` justamente para que esa regla esté escrita
 * una sola vez.
 *
 * <p><b>No hay operación que la amplíe, y su ausencia es la defensa.</b> El
 * contrato publica abrir y cerrar, y nada más: no existe un `PATCH` de días. Una
 * pantalla que ofreciera «ampliar» tendría que inventarse el endpoint o cerrar y
 * reabrir, que son dos ventanas y no una más larga.
 */
export interface CompanyTrialWindowResponse {
  id: number
  companyId: number
  startDate: string
  /** Último día en prueba, <b>incluido</b>. */
  endDate: string
  windowDays: number
  sourceQuoteId: number
  /** Cuándo se cerró a mano. Nulo mientras nadie la haya cerrado. */
  closedAt: string | null
  /** Lo dice el servidor. No sustituye a la comparación de fechas: la completa. */
  open: boolean
}

/**
 * Una concesión de prueba: un artículo del catálogo que esta empresa puede usar
 * durante la ventana.
 *
 * <p><b>Una concesión no se desconcede.</b> El contrato no publica ningún
 * `DELETE` ni ninguna revocación, y esta feature no pinta ningún botón que lo
 * sugiera. Lo único que se le puede hacer a una concesión es que le llegue su
 * desenlace.
 *
 * <p>`daysGranted` es lo que se pidió; `effectiveDays` es lo que quedó tras
 * recortar contra la ventana. Cuando no coinciden hay que decirlo: es la
 * diferencia entre lo que alguien vendió y lo que el cliente va a tener.
 */
export interface CompanyTrialGrantResponse {
  id: number
  companyId: number
  catalogItemId: number
  trialWindowId: number
  grantedOn: string
  daysGranted: number
  /** Días reales tras el recorte de la ventana. */
  effectiveDays: number
  /** Último día de esta concesión, incluido, igual que el de la ventana. */
  trialEndDate: string
  policyTrialDays: number
  policyTrialOutcome: TrialPolicyOutcome
  sourceQuoteId: number | null
  grantingAmendmentId: number | null
  /** Cuándo se le puso desenlace. Nulo = todavía no se ha cerrado. */
  consumedAt: string | null
  /** El desenlace. Nulo = no lo hay todavía; nunca se rellena por defecto. */
  outcome: TrialOutcome | null
  live: boolean
}

/**
 * `POST /system/company-trial-windows/companies/{companyId}`.
 *
 * <p><b>Los tres campos son obligatorios y `sourceQuoteId` es la firma.</b> No
 * hay campo de motivo en este cuerpo, y no es un olvido del contrato: lo que
 * justifica una ventana de prueba es la cotización que la vendió, no una frase.
 * Por eso esta pantalla no usa `SignedActionModal` para abrirla —ver
 * `components/OpenTrialWindowModal.vue`—: pedir un motivo que el borde descarta
 * es peor que no pedirlo, porque el operador creería que queda registrado.
 */
export interface OpenTrialWindowRequest {
  startDate: string
  windowDays: number
  sourceQuoteId: number
}

/**
 * `POST /system/company-trial-grants/companies/{companyId}` — <b>conceder un
 * artículo a mano</b>.
 *
 * <p><b>Es la operación de mayor privilegio de este modelo</b>, y conviene decir
 * por qué con precisión: entrega acceso a un artículo del catálogo <b>sin
 * contrato y sin cargo</b>. Todo lo demás que da acceso —una línea de contrato,
 * una enmienda— nace de algo que alguien firmó y que factura; esto no.
 *
 * <p><b>`daysGranted` es obligatorio en el contrato, y esa obligación es la
 * defensa entera.</b> No existe forma de pedir una concesión sin fin. Una
 * concesión sin fecha de fin no la caza ningún recálculo —el recálculo mira la
 * ventana y la fecha, no la intención de quien la escribió—, así que sobreviviría
 * a todos, para siempre, sin contrato y sin cargo, hasta que alguien la
 * encontrara a mano. El validador de esta pantalla exige además que sea ≥ 1: un
 * cero pasaría el `@NotNull` del borde y produciría una concesión que ni caduca
 * ni sirve.
 *
 * <p><b>Y no se desconcede.</b> El contrato no publica `DELETE` ni revocación
 * sobre las concesiones. Lo único que se le puede hacer a una es escribirle su
 * desenlace cuando venza, con {@link ConsumeTrialGrantRequest}.
 *
 * <p>⚠️ <b>El motivo de lista cerrada NO viaja en este cuerpo.</b> No hay campo
 * donde ponerlo — compárese con `AdjustCompanyUsageRequest`, que sí lleva
 * `reasonCode` y `reason`. Lo que sí puede quedar escrito es a qué apunta la
 * concesión: `sourceQuoteId` (la cotización que la vendió) o `grantingAmendmentId`
 * (la enmienda que la ordenó). Por eso el modal no pide un motivo decorativo:
 * pide uno que <b>decide qué campo del cuerpo pasa a ser obligatorio</b>, de modo
 * que la elección del operador acaba dejando rastro en el servidor en vez de
 * morir en el navegador. Ver `components/GrantTrialModal.vue`.
 */
export interface GrantTrialRequest {
  catalogItemId: number
  grantedOn: string
  /** Obligatorio. Es lo que hace que la concesión caduque. Nunca 0. */
  daysGranted: number
  policyTrialDays: number
  policyTrialOutcome: TrialPolicyOutcome
  sourceQuoteId?: number
  grantingAmendmentId?: number
}

/**
 * `POST /system/company-trial-grants/companies/{companyId}/catalog-items/
 * {catalogItemId}/consumptions` — <b>escribir el desenlace</b>.
 *
 * <p>Es lo que cierra una prueba: qué pasó de verdad cuando venció. No es un
 * borrado disfrazado —la concesión sigue existiendo y sigue probando que en marzo
 * esta empresa sí tenía ese artículo—, es el hecho que le falta.
 *
 * <p><b>`outcome` es opcional en el contrato y esta pantalla lo exige igual.</b>
 * Consumir sin desenlace deja la fila cerrada y muda: se pierde la única
 * diferencia que importa, la que hay entre «se convirtió» y «se perdió». Enviar
 * el campo vacío sería escribir el cierre y tirar el dato por el que se hace.
 */
export interface ConsumeTrialGrantRequest {
  outcome: TrialOutcome
}

/**
 * La atadura al contrato (TR-01). Si el backend renombra `endDate` o deja de
 * mandar `effectiveDays`, esto deja de compilar.
 */
export type TrialsContractCheck = [
  Expect<MatchesContract<CompanyTrialWindowResponse, 'CompanyTrialWindowResponse'>>,
  Expect<MatchesContract<CompanyTrialGrantResponse, 'CompanyTrialGrantResponse'>>,
  Expect<MatchesContract<OpenTrialWindowRequest, 'OpenTrialWindowRequest'>>,
  Expect<MatchesContract<GrantTrialRequest, 'GrantTrialRequest'>>,
  Expect<MatchesContract<ConsumeTrialGrantRequest, 'ConsumeTrialGrantRequest'>>,
]
