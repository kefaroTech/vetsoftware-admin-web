import { createCatalogStore } from '@/stores/createCatalogStore'
import type { VaccinationType } from '../types/vaccination-types.types'

export const useVaccinationTypesStore = createCatalogStore<VaccinationType>('vaccinationTypes')
