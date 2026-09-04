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

/**
 * Un estado que la consola no conoce —un valor nuevo del enum, o el campo ausente
 * en la respuesta— indexa el mapa a `undefined`, y `.label` sobre eso derriba el
 * árbol entero: el expediente desaparece por culpa de un distintivo. El tipo no
 * avisa, porque un `Record` de claves finitas se resuelve como `string`.
 *
 * <p>Un hueco honesto antes que una pantalla en blanco, igual que
 * `billingCycleLabel()`. Tono neutro a propósito: inventar «vencida» o «activa»
 * sobre un estado desconocido es peor que no decir nada.
 */
const UNKNOWN_STATUS = { label: '—', variant: 'neutral' } as const

const presentation = computed(() => STATUS_PRESENTATION[props.status] ?? UNKNOWN_STATUS)
</script>

<template>
  <AppBadge :label="presentation.label" :variant="presentation.variant" />
</template>
