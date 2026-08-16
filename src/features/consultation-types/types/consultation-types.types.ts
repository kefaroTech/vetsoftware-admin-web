export interface ConsultationTypeResponse {
  id: number
  name: string
  description: string
  createdDate: string
}

export interface CreateConsultationTypeRequest {
  name: string
  description: string
}

export type UpdateConsultationTypeRequest = CreateConsultationTypeRequest
