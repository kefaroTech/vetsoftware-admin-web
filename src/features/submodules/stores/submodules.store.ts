import { createCatalogStore } from '@/stores/createCatalogStore'
import type { SubModuleResponse } from '../types/submodules.types'

export const useSubmodulesStore = createCatalogStore<SubModuleResponse>('submodules')
