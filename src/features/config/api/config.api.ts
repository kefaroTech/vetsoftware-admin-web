import { http } from '@/services/http/http.client'
import type { SetSystemConfigurationRequest, SystemConfigurationDto } from '../types/config.types'

export const configApi = {
  async listAll(): Promise<SystemConfigurationDto[]> {
    const { data } = await http.get<SystemConfigurationDto[]>('/system-configurations')
    return data
  },
  async set(payload: SetSystemConfigurationRequest): Promise<SystemConfigurationDto> {
    const { data } = await http.put<SystemConfigurationDto>('/system-configurations', payload)
    return data
  },
}
