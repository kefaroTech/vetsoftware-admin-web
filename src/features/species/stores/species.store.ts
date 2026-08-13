import { createCatalogStore } from '@/stores/createCatalogStore'
import type { Specie } from '../types/species.types'

export const useSpeciesStore = createCatalogStore<Specie>('species')
