export interface VaccinationTypeCompanySummary {
  id: number
  name: string
}

export interface VaccinationType {
  id: number
  name: string
  description: string
  company: VaccinationTypeCompanySummary | null
  general: boolean
  createdDate: string
}

export interface CreateVaccinationTypeCommand {
  name: string
  description: string
  general: boolean
}

export type UpdateVaccinationTypeCommand = CreateVaccinationTypeCommand
