<script setup lang="ts">
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { formatDateTime } from '@/features/quotes/composables/quoteDateTime'
import {
  actorLabel,
  EVENT_TYPE_MEANING,
  eventTypeLabel,
  eventTypeTone,
  limitSourceLabel,
} from '../composables/limitText'
import type { CompanyLimitEventResponse } from '../types/limits.types'

/**
 * **La bitácora de cupo**: avisos y portazos, uno a uno y en orden.
 *
 * <p><b>Para qué existe.</b> Para lo mismo que la de mora: demostrar que se avisó
 * antes de frenar. Cuando un cliente llama diciendo «me habéis bloqueado sin
 * previo aviso», esta tabla es la respuesta —o la prueba de que tiene razón—.
 * Por eso cada fila se cuenta entera: qué pasó, cuánto había, cuál era el techo,
 * de dónde salía ese techo, quién lo hizo y cuándo.
 *
 * <p><b>El tipo de hecho lleva rótulo Y tono, nunca solo tono.</b> Un portazo no
 * se puede comunicar por color: la tabla se lee por teléfono y se copia en un
 * correo (§5.2).
 *
 * <p><b>El techo de la fila es el del momento del hecho.</b> No es el de ahora, y
 * el encabezado lo dice: cruzarlos sin avisar haría creer que el techo cambió
 * cuando lo que cambió fue la fecha.
 */
defineProps<{
  events: CompanyLimitEventResponse[]
  dimensionName: (id: number) => string
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <AppTable
    :headers="[
      'Cuándo',
      'Empresa',
      'Eje',
      'Qué pasó',
      { label: 'Consumo / techo del momento', align: 'num' },
      'Origen del techo',
      'Quién',
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
      <td class="ds-meta">{{ formatDateTime(event.occurredAt) }}</td>
      <td><CompanyRef :company-id="event.companyId" /></td>
      <td class="ds-text-strong">{{ dimensionName(event.limitDimensionId) }}</td>
      <td>
        <AppBadge
          :variant="eventTypeTone(event.eventType)"
          :label="eventTypeLabel(event.eventType)"
        />
        <p class="linea ds-meta">{{ EVENT_TYPE_MEANING[event.eventType] }}</p>
        <p v-if="event.reason" class="linea ds-meta">Motivo: {{ event.reason }}</p>
      </td>
      <td class="ds-num">
        {{ event.usedQuantity }} / {{ event.limitQuantity }}
        <p v-if="event.requestedDelta !== 0" class="linea ds-meta">
          Se pidió mover {{ event.requestedDelta > 0 ? '+' : '' }}{{ event.requestedDelta }}
        </p>
      </td>
      <td class="ds-meta">{{ limitSourceLabel(event.limitSource) }}</td>
      <td class="ds-meta">{{ actorLabel(event) }}</td>
    </tr>
  </AppTable>
</template>

<style scoped>
.linea {
  margin: 0;
}
</style>
