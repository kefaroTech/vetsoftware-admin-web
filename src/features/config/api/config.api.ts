import { http } from '@/services/http/http.client'
import type { SetSystemConfigurationCommand, SystemConfiguration } from '../types/config.types'

export const configApi = {
  get: () => http.get<SystemConfiguration[]>('/system-configurations'),
  set: (payload: SetSystemConfigurationCommand) =>
    http.put<SystemConfiguration>('/system-configurations', payload),
}
