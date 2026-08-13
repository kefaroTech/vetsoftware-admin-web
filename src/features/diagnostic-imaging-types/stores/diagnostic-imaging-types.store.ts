import { createCatalogStore } from '@/stores/createCatalogStore'
import type { DiagnosticImagingType } from '../types/diagnostic-imaging-types.types'

export const useDiagnosticImagingTypesStore =
  createCatalogStore<DiagnosticImagingType>('diagnosticImagingTypes')
