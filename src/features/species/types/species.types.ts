export interface Specie {
  id: number
  name: string
  createdDate: string
}

export interface CreateSpecieCommand {
  name: string
}

export type UpdateSpecieCommand = CreateSpecieCommand
