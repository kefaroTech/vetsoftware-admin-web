import { createCatalogStore } from '@/stores/createCatalogStore'
import type { ModuleResponse } from '../types/modules.types'

export const useModulesStore = createCatalogStore<ModuleResponse>('modules')
