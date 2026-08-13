import { createCatalogStore } from '@/stores/createCatalogStore'
import type { SurgeryType } from '../types/surgery-types.types'

export const useSurgeryTypesStore = createCatalogStore<SurgeryType>('surgeryTypes')
