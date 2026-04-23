<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import type { MembershipStatus } from '@/types/common.types'

defineProps<{ status: MembershipStatus }>()

function getVariant(status: MembershipStatus) {
  if (status === 'ACTIVE') return 'success'
  if (status === 'DEPRECATED') return 'warning'
  return 'neutral'
}

function getLabel(status: MembershipStatus) {
  if (status === 'ACTIVE') return 'Activa'
  if (status === 'DEPRECATED') return 'Deprecada'
  return 'Inactiva'
}
</script>

<template>
  <AppBadge :label="getLabel(status)" :variant="getVariant(status)" />
</template>
