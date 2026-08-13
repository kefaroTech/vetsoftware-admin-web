import { createCatalogStore } from '@/stores/createCatalogStore'
import type { AnimalColor } from '../types/animal-colors.types'

export const useAnimalColorsStore = createCatalogStore<AnimalColor>('animal-colors')
