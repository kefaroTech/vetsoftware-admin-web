export interface SpecieSummary {
  id: number
  name: string
}

export interface AnimalColorResponse {
  id: number
  name: string
  specie: SpecieSummary
  createdDate: string
}

export interface CreateAnimalColorRequest {
  name: string
  specieId: number
}

export type UpdateAnimalColorRequest = CreateAnimalColorRequest
