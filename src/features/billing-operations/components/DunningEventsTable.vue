<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { formatAmount, formatDate } from '@/composables/format'
import {
  DUNNING_CHANNEL_LABEL,
  DUNNING_EVENT_LABEL,
  DUNNING_EVENT_VARIANT,
  type DunningEventResponse,
} from '../types/billing-operations.types'
/**
 * **Gestión de mora**: el feed global de avisos.
 *
 * <p>Sirve para lo que dice el modelo — *demostrar que se avisó antes de
 * restringir la cuenta* —, así que el detalle del aviso (`detail`) se pinta
 * entero y no se recorta: es la prueba.
 *
 * <p><b>Vocabulario, que aquí no es cosmética.</b> `READ_ONLY_APPLIED` se rotula
 * «Pasó a solo lectura». No existe ni existirá corte total de acceso: una
 * empresa en mora conserva la consulta y la impresión de toda su información,
 * incluida la historia clínica. Las palabras «bloquear», «suspender el acceso»,
 * «cortar» e «inhabilitar» están prohibidas en toda la consola (§3.4).
 *
 * <p>De solo consulta: `POST /dunning-events` es company-scoped y su alta vive en
 * el expediente del contrato.
 */
defineProps<{
  events: DunningEventResponse[]
  page: number
  pageSize: number
  total: number
  pageCount: number
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: []; 'update:page': [page: number] }>()
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <AppTable
      caption="Hitos de cobranza"
      money
      :headers="[
        'Ocurrió',
        'Empresa',
        'Contrato',
        'Documento',
        'Evento',
        { label: 'Días de mora', align: 'num' },
        'Canal',
        'Detalle',
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
        <td>{{ formatDate(event.occurredAt) }}</td>
        <td><CompanyRef :company-id="event.companyId" /></td>
        <td class="ds-text-strong">
          {{
            event.subscription
              ? (event.subscription.subscriptionNumber ?? `#${event.subscription.id}`)
              : '—'
          }}
        </td>
        <td>
          <template v-if="event.billingDocument">
            {{ event.billingDocument.documentNumber ?? `#${event.billingDocument.id}` }}
            <span v-if="event.billingDocument.balanceAmount !== null" class="ds-meta saldo">
              saldo {{ formatAmount(event.billingDocument.balanceAmount) }}
            </span>
          </template>
          <template v-else>—</template>
        </td>
        <td>
          <AppBadge
            :variant="DUNNING_EVENT_VARIANT[event.eventType]"
            :label="DUNNING_EVENT_LABEL[event.eventType]"
          />
        </td>
        <td class="ds-num">{{ event.daysOverdue ?? '—' }}</td>
        <td>{{ event.channel ? DUNNING_CHANNEL_LABEL[event.channel] : '—' }}</td>
        <td>{{ event.detail ?? '—' }}</td>
      </tr>
    </AppTable>

    <AppPagination
      v-if="!error && total > 0"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :page-count="pageCount"
      @update:page="$emit('update:page', $event)"
    />
  </div>
</template>

<style scoped>
.saldo {
  display: block;
}
</style>
