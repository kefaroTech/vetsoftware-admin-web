import { createCatalogStore } from '@/stores/createCatalogStore'
import type { SpecieResponse } from '../types/species.types'

export const useSpeciesStore = createCatalogStore<SpecieResponse>('species')
