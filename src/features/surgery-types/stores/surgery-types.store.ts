import { createCatalogStore } from '@/stores/createCatalogStore'
import type { SurgeryTypeResponse } from '../types/surgery-types.types'

export const useSurgeryTypesStore = createCatalogStore<SurgeryTypeResponse>('surgeryTypes')
