export interface LaboratoryTestTypeCompanySummary {
  id: number
  name: string
}

export interface LaboratoryTestTypeResponse {
  id: number
  name: string
  description: string
  company: LaboratoryTestTypeCompanySummary | null
  general: boolean
  createdDate: string
}

export interface CreateLaboratoryTestTypeRequest {
  name: string
  description: string
  general: boolean
}

export type UpdateLaboratoryTestTypeRequest = CreateLaboratoryTestTypeRequest
