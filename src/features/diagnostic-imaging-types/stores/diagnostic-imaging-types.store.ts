import { createCatalogStore } from '@/stores/createCatalogStore'
import type { DiagnosticImagingTypeResponse } from '../types/diagnostic-imaging-types.types'

export const useDiagnosticImagingTypesStore =
  createCatalogStore<DiagnosticImagingTypeResponse>('diagnosticImagingTypes')
