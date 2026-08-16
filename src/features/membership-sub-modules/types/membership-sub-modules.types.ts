export interface MembershipSummary {
  id: number
  name: string
}

export interface MembershipSubModuleSubModuleSummary {
  id: number
  name: string
  code: string
}

export interface MembershipSubModuleResponse {
  id: number
  membership: MembershipSummary
  subModule: MembershipSubModuleSubModuleSummary
  createdDate: string
}

export interface CreateMembershipSubModuleRequest {
  membershipId: number
  subModuleId: number
}

export type UpdateMembershipSubModuleRequest = CreateMembershipSubModuleRequest
