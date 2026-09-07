<script setup lang="ts">
import AppTable from '@/components/ui/AppTable.vue'
import { formatDate } from '@/composables/format'
import { ICONS } from '@/constants/icons'
import type { WompiWebhookEventResponse } from '../types/wompi-events.types'

defineProps<{
  events: WompiWebhookEventResponse[]
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: []; view: [event: WompiWebhookEventResponse] }>()
</script>

<template>
  <AppTable
    caption="Eventos de Wompi"
    :headers="[
      'Recibido',
      'Tipo de evento',
      'Referencia',
      'Resultado',
      'Procesado',
      { label: '', align: 'actions' },
    ]"
    :empty="events.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="errorTraceId"
    @retry="$emit('retry')"
  >
    <template #empty>
      <slot name="empty" />
    </template>

    <tr v-for="event in events" :key="event.id" class="ds-row-hover">
      <td>{{ formatDate(event.receivedAt) }}</td>
      <td class="ds-text-strong">{{ event.eventType }}</td>
      <td class="referencia">{{ event.gatewayReference ?? '—' }}</td>
      <td>{{ event.processingOutcome ?? '—' }}</td>
      <td>{{ event.processedAt ? formatDate(event.processedAt) : 'Todavía no' }}</td>
      <td class="ds-col-actions">
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="$emit('view', event)">
          <component :is="ICONS.EYE" :size="14" />
          Ver detalle
        </button>
      </td>
    </tr>
  </AppTable>
</template>

<style scoped>
.referencia {
  word-break: break-all;
}
</style>
