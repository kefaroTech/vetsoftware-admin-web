<script setup lang="ts">
import { computed } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import type { SubscriptionItemOverlapResponse } from '../types/subscriptions-admin.types'

const props = defineProps<{
  items: SubscriptionItemOverlapResponse[]
  loading: boolean
  error: string | null
  traceId: string | null
}>()

defineEmits<{ retry: [] }>()

const health = computed(() => {
  if (props.error) return { label: 'Sin datos', variant: 'danger' as const }
  if (props.loading) return { label: 'Verificando', variant: 'neutral' as const }
  if (props.items.length === 0) return { label: 'Sano', variant: 'success' as const }
  return {
    label: `${props.items.length} ${props.items.length === 1 ? 'solape' : 'solapes'}`,
    variant: 'danger' as const,
  }
})

function formatDate(value: string | null): string {
  return value ?? 'Sin límite'
}
</script>

<template>
  <section class="ds-stack ds-stack--10" aria-labelledby="overlaps-title">
    <div class="ds-block-head">
      <div class="ds-stack ds-stack--8">
        <h2 id="overlaps-title" class="ds-title">Vigilancia de solapes</h2>
        <p class="ds-meta">
          Detecta artículos cobrados dos veces durante un mismo tramo del contrato.
        </p>
      </div>
      <AppBadge :label="health.label" :variant="health.variant" />
    </div>

    <AppTable
      :headers="['Empresa', 'Contrato', 'Artículo', 'Primera línea', 'Segunda línea']"
      :empty="items.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="traceId"
      :skeleton-rows="3"
      @retry="$emit('retry')"
    >
      <template #empty>
        <AppEmptyState
          title="Sin solapes detectados"
          description="La lista vacía confirma que no hay tramos de un mismo artículo facturados dos veces."
        />
      </template>

      <tr v-for="overlap in items" :key="`${overlap.firstItemId}-${overlap.secondItemId}`">
        <td class="ds-text-strong">#{{ overlap.companyId }}</td>
        <td>#{{ overlap.subscriptionId }}</td>
        <td>
          <span class="ds-text-strong">{{ overlap.itemCode }}</span>
          <span class="ds-meta"> · #{{ overlap.catalogItemId }}</span>
        </td>
        <td>
          #{{ overlap.firstItemId }} · {{ overlap.firstFrom }} → {{ formatDate(overlap.firstTo) }}
        </td>
        <td>
          #{{ overlap.secondItemId }} · {{ overlap.secondFrom }} →
          {{ formatDate(overlap.secondTo) }}
        </td>
      </tr>
    </AppTable>
  </section>
</template>
