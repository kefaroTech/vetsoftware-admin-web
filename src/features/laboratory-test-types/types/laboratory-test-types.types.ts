export interface LaboratoryTestTypeCompanySummary {
  id: number
  name: string
}

export interface LaboratoryTestType {
  id: number
  name: string
  description: string
  company: LaboratoryTestTypeCompanySummary | null
  general: boolean
  createdDate: string
}

export interface CreateLaboratoryTestTypeCommand {
  name: string
  description: string
  general: boolean
}

export type UpdateLaboratoryTestTypeCommand = CreateLaboratoryTestTypeCommand
