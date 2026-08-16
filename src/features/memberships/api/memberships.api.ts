import { http } from '@/services/http/http.client'
import type {
  MembershipResponse,
  CreateMembershipRequest,
  UpdateMembershipRequest,
} from '../types/memberships.types'

export const membershipsApi = {
  async listAll(): Promise<MembershipResponse[]> {
    const { data } = await http.get<MembershipResponse[]>('/memberships')
    return data
  },
  async findById(id: number): Promise<MembershipResponse> {
    const { data } = await http.get<MembershipResponse>(`/memberships/${id}`)
    return data
  },
  async create(payload: CreateMembershipRequest): Promise<MembershipResponse> {
    const { data } = await http.post<MembershipResponse>('/memberships', payload)
    return data
  },
  async update(id: number, payload: UpdateMembershipRequest): Promise<MembershipResponse> {
    const { data } = await http.put<MembershipResponse>(`/memberships/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/memberships/${id}`)
  },
}
