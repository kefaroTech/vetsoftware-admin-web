export interface SpaTypeResponse {
  id: number
  name: string
  description: string
  createdDate: string
}

export interface CreateSpaTypeRequest {
  name: string
  description: string
}

export type UpdateSpaTypeRequest = CreateSpaTypeRequest
