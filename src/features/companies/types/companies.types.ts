/** Resumen de ciudad que devuelve el backend dentro de la empresa. */
export interface CompanyCitySummary {
  id: number
  name: string
}

export interface CompanyResponse {
  id: number
  name: string
  identifier: string
  /** TR-01: la columna permite nulos; se declaraba garantizado. */
  address: string | null
  /** TR-01: la columna permite nulos; se declaraba garantizado. */
  contactNumber: string | null
  /** TR-01: el backend los devuelve y este repositorio no los declaraba. */
  city: CompanyCitySummary
  createdDate: string
  enabled: boolean
}

export interface CreateCompanyRequest {
  name: string
  identifier: string
  address: string
  contactNumber: string
  cityId: number
}

export type UpdateCompanyRequest = CreateCompanyRequest
