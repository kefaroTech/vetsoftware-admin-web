export interface SpecieSummary {
  id: number
  name: string
}

export interface Breed {
  id: number
  name: string
  specie: SpecieSummary
  createdDate: string
}

export interface CreateBreedCommand {
  name: string
  specieId: number
}

export type UpdateBreedCommand = CreateBreedCommand
