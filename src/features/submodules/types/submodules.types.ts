export interface SubmoduleModuleSummary {
  id: number
  name: string
  code: string
}

export interface Submodule {
  id: number
  name: string
  code: string
  module: SubmoduleModuleSummary
  createdDate: string
}

export interface CreateSubmoduleCommand {
  name: string
  code: string
  moduleId: number
}

export type UpdateSubmoduleCommand = CreateSubmoduleCommand
