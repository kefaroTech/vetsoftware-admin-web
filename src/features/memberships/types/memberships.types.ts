import type { MembershipStatus } from '@/types/common.types'

export interface MembershipResponse {
  id: number
  name: string
  status: MembershipStatus
  createdDate: string
}

export interface CreateMembershipRequest {
  name: string
  status: MembershipStatus
}

export type UpdateMembershipRequest = CreateMembershipRequest
