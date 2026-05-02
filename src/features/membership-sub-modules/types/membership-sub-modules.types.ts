export interface MembershipSummary {
  id: number
  name: string
}

export interface MembershipSubModuleSubModuleSummary {
  id: number
  name: string
  code: string
}

export interface MembershipSubModule {
  id: number
  membership: MembershipSummary
  subModule: MembershipSubModuleSubModuleSummary
  createdDate: string
}

export interface CreateMembershipSubModuleCommand {
  membershipId: number
  subModuleId: number
}

export type UpdateMembershipSubModuleCommand = CreateMembershipSubModuleCommand
