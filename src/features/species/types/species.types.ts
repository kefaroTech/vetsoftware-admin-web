export interface SpecieResponse {
  id: number
  name: string
  createdDate: string
}

export interface CreateSpecieRequest {
  name: string
}

export type UpdateSpecieRequest = CreateSpecieRequest
