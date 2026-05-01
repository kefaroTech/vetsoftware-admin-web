import { http } from '@/services/http/http.client'
import type {
  MembershipSubModule,
  CreateMembershipSubModuleCommand,
  UpdateMembershipSubModuleCommand,
} from '../types/membership-sub-modules.types'

export const membershipSubModulesApi = {
  list: () => http.get<MembershipSubModule[]>('/membership-sub-modules'),
  getById: (id: number) => http.get<MembershipSubModule>(`/membership-sub-modules/${id}`),
  create: (payload: CreateMembershipSubModuleCommand) =>
    http.post<MembershipSubModule>('/membership-sub-modules', payload),
  update: (id: number, payload: UpdateMembershipSubModuleCommand) =>
    http.put<MembershipSubModule>(`/membership-sub-modules/${id}`, payload),
  remove: (id: number) => http.delete(`/membership-sub-modules/${id}`),
}
