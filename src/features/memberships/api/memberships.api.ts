import { http } from '@/services/http/http.client'
import type { Membership, CreateMembershipCommand, UpdateMembershipCommand } from '../types/memberships.types'

export const membershipsApi = {
  list: () => http.get<Membership[]>('/memberships'),
  getById: (id: number) => http.get<Membership>(`/memberships/${id}`),
  create: (payload: CreateMembershipCommand) => http.post<Membership>('/memberships', payload),
  update: (id: number, payload: UpdateMembershipCommand) =>
    http.put<Membership>(`/memberships/${id}`, payload),
  remove: (id: number) => http.delete(`/memberships/${id}`),
}
