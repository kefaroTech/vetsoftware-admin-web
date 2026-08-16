import { createCatalogStore } from '@/stores/createCatalogStore'
import type { SpaTypeResponse } from '../types/spa-types.types'

export const useSpaTypesStore = createCatalogStore<SpaTypeResponse>('spaTypes')
