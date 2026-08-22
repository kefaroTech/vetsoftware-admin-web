<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import { MEMBERSHIP_STATUS_LABELS } from '../types/memberships.types'
import type { MembershipStatus } from '@/types/common.types'

defineProps<{ status: MembershipStatus }>()

function getVariant(status: MembershipStatus) {
  if (status === 'ACTIVE') return 'success'
  if (status === 'DEPRECATED') return 'warning'
  return 'neutral'
}
</script>

<template>
  <AppBadge :label="MEMBERSHIP_STATUS_LABELS[status]" :variant="getVariant(status)" />
</template>
