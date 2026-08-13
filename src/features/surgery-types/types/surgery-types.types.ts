export interface SurgeryTypeCompanySummary {
  id: number
  name: string
}

export interface SurgeryType {
  id: number
  name: string
  description: string
  company: SurgeryTypeCompanySummary | null
  general: boolean
  createdDate: string
}

export interface CreateSurgeryTypeCommand {
  name: string
  description: string
  general: boolean
}

export type UpdateSurgeryTypeCommand = CreateSurgeryTypeCommand
