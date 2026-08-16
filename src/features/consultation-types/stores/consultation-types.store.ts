import { createCatalogStore } from '@/stores/createCatalogStore'
import type { ConsultationTypeResponse } from '../types/consultation-types.types'

export const useConsultationTypesStore =
  createCatalogStore<ConsultationTypeResponse>('consultationTypes')
