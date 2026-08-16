/** Configuración general del sistema (global, clave-valor). Espejo del SystemConfigurationDto del backend. */
export interface SystemConfigurationDto {
  id: number
  /** Clave de la propiedad (p.ej. `uvt`). */
  propertyName: string
  /** Valor en texto; cada consumidor lo interpreta según la propiedad. */
  value: string
  createdDate: string
  enabled: boolean
}

export interface SetSystemConfigurationRequest {
  propertyName: string
  value: string
}

/** Clave de la propiedad que guarda el valor del UVT vigente (COP). */
export const UVT_PROPERTY = 'uvt'
