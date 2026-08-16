export interface VaccinationTypeCompanySummary {
  id: number
  name: string
}

export interface VaccinationTypeResponse {
  id: number
  name: string
  description: string
  company: VaccinationTypeCompanySummary | null
  general: boolean
  createdDate: string
}

export interface CreateVaccinationTypeRequest {
  name: string
  description: string
  general: boolean
}

export type UpdateVaccinationTypeRequest = CreateVaccinationTypeRequest
