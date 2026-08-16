import { createCatalogStore } from '@/stores/createCatalogStore'
import type { AnimalColorResponse } from '../types/animal-colors.types'

export const useAnimalColorsStore = createCatalogStore<AnimalColorResponse>('animal-colors')
