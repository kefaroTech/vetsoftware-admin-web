import { createCatalogStore } from '@/stores/createCatalogStore'
import type { VaccinationTypeResponse } from '../types/vaccination-types.types'

export const useVaccinationTypesStore =
  createCatalogStore<VaccinationTypeResponse>('vaccinationTypes')
