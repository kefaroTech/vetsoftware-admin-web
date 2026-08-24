export interface SubmoduleModuleSummary {
  id: number
  name: string
  code: string
}

export interface SubModuleResponse {
  id: number
  name: string
  code: string
  module: SubmoduleModuleSummary
  /** Si el submodulo se puede vender como linea de una suscripcion. */
  sellable: boolean
  /** Si el submodulo admite concederse en modo solo lectura. */
  readOnlyCapable: boolean
  createdDate: string
}

export interface CreateSubModuleRequest {
  name: string
  code: string
  moduleId: number
  /**
   * Si el submodulo se puede vender como linea de una suscripcion.
   *
   * No es `required` en el contrato, pero en el `record` de Java es un `boolean`
   * primitivo: un cuerpo sin el campo no significa «dejalo como esta», significa
   * `false`. Por eso se declara y se envia siempre.
   */
  sellable: boolean
  /** Si el submodulo admite concederse en modo solo lectura. Mismo motivo que `sellable`. */
  readOnlyCapable: boolean
}

export type UpdateSubModuleRequest = CreateSubModuleRequest
