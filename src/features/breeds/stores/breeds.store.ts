import { createCatalogStore } from '@/stores/createCatalogStore'
import type { BreedResponse } from '../types/breeds.types'

export const useBreedsStore = createCatalogStore<BreedResponse>('breeds')
