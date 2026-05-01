export interface Submodule {
  id: number
  name: string
  code: string
  moduleId: number
  createdDate: string
}

export interface CreateSubmoduleCommand {
  name: string
  code: string
  moduleId: number
}

export type UpdateSubmoduleCommand = CreateSubmoduleCommand
