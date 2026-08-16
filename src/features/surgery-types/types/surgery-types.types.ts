export interface SurgeryTypeCompanySummary {
  id: number
  name: string
}

export interface SurgeryTypeResponse {
  id: number
  name: string
  description: string
  company: SurgeryTypeCompanySummary | null
  general: boolean
  createdDate: string
}

export interface CreateSurgeryTypeRequest {
  name: string
  description: string
  general: boolean
}

export type UpdateSurgeryTypeRequest = CreateSurgeryTypeRequest
