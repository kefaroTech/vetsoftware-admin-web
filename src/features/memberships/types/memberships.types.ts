import type { MembershipStatus } from '@/types/common.types'

export interface Membership {
  id: number
  name: string
  status: MembershipStatus
  createdDate: string
}

export interface CreateMembershipCommand {
  name: string
}

export interface UpdateMembershipCommand {
  name: string
  status: MembershipStatus
}
