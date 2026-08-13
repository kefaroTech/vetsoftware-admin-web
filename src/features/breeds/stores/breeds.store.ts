import { createCatalogStore } from '@/stores/createCatalogStore'
import type { Breed } from '../types/breeds.types'

export const useBreedsStore = createCatalogStore<Breed>('breeds')
