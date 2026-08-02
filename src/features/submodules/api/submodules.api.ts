import { http } from '@/services/http/http.client'
import type {
  Submodule,
  CreateSubmoduleCommand,
  UpdateSubmoduleCommand,
} from '../types/submodules.types'

export const submodulesApi = {
  list: () => http.get<Submodule[]>('/sub-modules'),
  getById: (id: number) => http.get<Submodule>(`/sub-modules/${id}`),
  create: (payload: CreateSubmoduleCommand) => http.post<Submodule>('/sub-modules', payload),
  update: (id: number, payload: UpdateSubmoduleCommand) =>
    http.put<Submodule>(`/sub-modules/${id}`, payload),
  remove: (id: number) => http.delete(`/sub-modules/${id}`),
}
