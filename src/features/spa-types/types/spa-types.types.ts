export interface SpaType {
  id: number
  name: string
  description: string
  createdDate: string
}

export interface CreateSpaTypeCommand {
  name: string
  description: string
}

export type UpdateSpaTypeCommand = CreateSpaTypeCommand
