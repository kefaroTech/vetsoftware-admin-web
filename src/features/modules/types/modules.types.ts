export interface AppModule {
  id: number
  name: string
  code: string
  createdDate: string
}

export interface CreateModuleCommand {
  name: string
  code: string
}

export type UpdateModuleCommand = CreateModuleCommand
