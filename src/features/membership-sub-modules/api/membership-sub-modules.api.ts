import { http } from '@/services/http/http.client'
import type {
  MembershipSubModuleResponse,
  CreateMembershipSubModuleRequest,
  UpdateMembershipSubModuleRequest,
} from '../types/membership-sub-modules.types'

export const membershipSubModulesApi = {
  async listAll(): Promise<MembershipSubModuleResponse[]> {
    const { data } = await http.get<MembershipSubModuleResponse[]>('/membership-sub-modules')
    return data
  },
  async findById(id: number): Promise<MembershipSubModuleResponse> {
    const { data } = await http.get<MembershipSubModuleResponse>(`/membership-sub-modules/${id}`)
    return data
  },
  async create(payload: CreateMembershipSubModuleRequest): Promise<MembershipSubModuleResponse> {
    const { data } = await http.post<MembershipSubModuleResponse>(
      '/membership-sub-modules',
      payload,
    )
    return data
  },
  async update(
    id: number,
    payload: UpdateMembershipSubModuleRequest,
  ): Promise<MembershipSubModuleResponse> {
    const { data } = await http.put<MembershipSubModuleResponse>(
      `/membership-sub-modules/${id}`,
      payload,
    )
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/membership-sub-modules/${id}`)
  },
}
