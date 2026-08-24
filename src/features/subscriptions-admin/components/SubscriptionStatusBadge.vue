<script setup lang="ts">
import { computed } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import type { SubscriptionStatus } from '../types/subscriptions-admin.types'

const props = defineProps<{ status: SubscriptionStatus }>()

const STATUS_PRESENTATION = {
  TRIALING: { label: 'En prueba', variant: 'neutral' },
  ACTIVE: { label: 'Activa', variant: 'success' },
  PAST_DUE: { label: 'Pago vencido', variant: 'warning' },
  READ_ONLY: { label: 'Solo lectura', variant: 'danger' },
  CANCELLED: { label: 'Cancelada', variant: 'neutral' },
  EXPIRED: { label: 'Vencida', variant: 'neutral' },
} as const satisfies Record<
  SubscriptionStatus,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }
>

const presentation = computed(() => STATUS_PRESENTATION[props.status])
</script>

<template>
  <AppBadge :label="presentation.label" :variant="presentation.variant" />
</template>
