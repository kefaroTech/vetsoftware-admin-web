export interface SpecieSummary {
  id: number
  name: string
}

export interface AnimalColor {
  id: number
  name: string
  specie: SpecieSummary
  createdDate: string
}

export interface CreateAnimalColorCommand {
  name: string
  specieId: number
}

export type UpdateAnimalColorCommand = CreateAnimalColorCommand
