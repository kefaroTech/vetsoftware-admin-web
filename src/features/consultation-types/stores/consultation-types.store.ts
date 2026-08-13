import { createCatalogStore } from '@/stores/createCatalogStore'
import type { ConsultationType } from '../types/consultation-types.types'

export const useConsultationTypesStore = createCatalogStore<ConsultationType>('consultationTypes')
