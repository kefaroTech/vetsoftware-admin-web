import { createCatalogStore } from '@/stores/createCatalogStore'
import type { Submodule } from '../types/submodules.types'

export const useSubmodulesStore = createCatalogStore<Submodule>('submodules')
