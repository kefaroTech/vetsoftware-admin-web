export type BillingCycle = 'MONTHLY' | 'ANNUAL'

export type SubscriptionStatus =
  'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'READ_ONLY' | 'CANCELLED' | 'EXPIRED'

/** Contrato de una empresa tal como lo expone la consola de plataforma. */
export interface SubscriptionResponse {
  id: number
  subscriptionNumber: string
  companyId: number
  quoteId: number | null
  priceListId: number
  billingCycle: BillingCycle
  status: SubscriptionStatus
  current: boolean
  startDate: string
  trialEndDate: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  nextBillingDate: string | null
  commitmentEndDate: string | null
  graceDays: number
  pastDueSince: string | null
  autoRenew: boolean
  cancelRequestedAt: string | null
  cancelEffectiveDate: string | null
  cancelReason: string | null
  createdDate: string
  enabled: boolean
}

/** Dos líneas del mismo artículo que se facturan durante un tramo común. */
export interface SubscriptionItemOverlapResponse {
  companyId: number
  subscriptionId: number
  catalogItemId: number
  itemCode: string
  firstItemId: number
  firstFrom: string
  firstTo: string | null
  secondItemId: number
  secondFrom: string
  secondTo: string | null
}
