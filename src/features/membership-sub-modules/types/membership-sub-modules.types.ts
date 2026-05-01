export interface MembershipSubModule {
  id: number
  membershipId: number
  subModuleId: number
  createdDate: string
}

export interface CreateMembershipSubModuleCommand {
  membershipId: number
  subModuleId: number
}

export type UpdateMembershipSubModuleCommand = CreateMembershipSubModuleCommand
