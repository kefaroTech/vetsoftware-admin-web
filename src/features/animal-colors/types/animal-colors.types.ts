export interface AnimalColor {
  id: number
  name: string
  createdDate: string
}

export interface CreateAnimalColorCommand {
  name: string
}

export type UpdateAnimalColorCommand = CreateAnimalColorCommand
