/** Resumen de ciudad y de plan que devuelve el backend dentro de la empresa. */
export interface CompanyCitySummary {
  id: number
  name: string
}

export interface CompanyMembershipSummary {
  id: number
  name: string
}

export interface Company {
  id: number
  name: string
  identifier: string
  /** TR-01: la columna permite nulos; se declaraba garantizado. */
  address: string | null
  /** TR-01: la columna permite nulos; se declaraba garantizado. */
  contactNumber: string | null
  /** TR-01: el backend los devuelve y este repositorio no los declaraba. */
  city: CompanyCitySummary
  membership: CompanyMembershipSummary
  createdDate: string
  enabled: boolean
}

export interface CreateCompanyCommand {
  name: string
  identifier: string
  address: string
  contactNumber: string
}

export type UpdateCompanyCommand = CreateCompanyCommand
