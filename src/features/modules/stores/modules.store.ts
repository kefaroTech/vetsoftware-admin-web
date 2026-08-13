import { createCatalogStore } from '@/stores/createCatalogStore'
import type { AppModule } from '../types/modules.types'

export const useModulesStore = createCatalogStore<AppModule>('modules')
