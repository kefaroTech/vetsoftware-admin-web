export interface SpecieSummary {
  id: number
  name: string
}

export interface BreedResponse {
  id: number
  name: string
  specie: SpecieSummary
  createdDate: string
}

export interface CreateBreedRequest {
  name: string
  specieId: number
}

export type UpdateBreedRequest = CreateBreedRequest
