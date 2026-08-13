import { createCatalogStore } from '@/stores/createCatalogStore'
import type { SpaType } from '../types/spa-types.types'

export const useSpaTypesStore = createCatalogStore<SpaType>('spaTypes')
