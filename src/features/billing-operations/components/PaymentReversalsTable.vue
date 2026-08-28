<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { daysUntil, deadlineText, formatDocumentAmount } from '../composables/billingFormat'
import {
  CONSUMER_DETERMINATION_LABEL,
  REVERSAL_CAUSAL_LABEL,
  REVERSAL_ORIGIN_LABEL,
  REVERSAL_OUTCOME_LABEL,
  REVERSAL_OUTCOME_VARIANT,
  REVERSAL_URGENT_DAYS,
  type PaymentReversalRequestResponse,
} from '../types/payment-reversals.types'

/**
 * <b>Las solicitudes de reversión, con su plazo y su fase.</b>
 *
 * <p><b>La columna de fechas son tres fechas, no una.</b> Cuándo tuvo conocimiento
 * el consumidor, cuándo llegó la queja y cuándo se notificó al emisor son cosas
 * distintas y la tabla las nombra. La primera es la que arranca el reloj del
 * cliente: tomar la segunda por la primera regala días de plazo, y es lo que hace
 * perder una reversión que se podía haber contestado.
 *
 * <p><b>El plazo se dice en texto y con signo</b>: «vence en 2 días» y «venció hace
 * 2 días» caen uno al lado del otro cuando se ordena por urgencia, y distinguirlos
 * por un tono sería pedir que se distinga un color (§5.2 · WCAG §1.4.1).
 *
 * <p><b>Ni un botón de eliminar.</b> Una solicitud es un expediente: se abre, se
 * acusa, se opone y se resuelve, y todas sus fases quedan. El día que llegue al
 * regulador lo que importa es la secuencia entera, no el estado final.
 */
defineProps<{
  rows: PaymentReversalRequestResponse[]
  page: number
  pageSize: number
  total: number
  pageCount: number
  loading: boolean
  error: string | null
  errorTraceId: string | null
  busy?: boolean
}>()

defineEmits<{
  retry: []
  'update:page': [page: number]
  acknowledge: [row: PaymentReversalRequestResponse]
  oppose: [row: PaymentReversalRequestResponse]
  resolve: [row: PaymentReversalRequestResponse]
}>()

const HEADERS = ['Solicitud', 'Empresa', 'Origen y causal', 'Fechas', 'Plazo', 'Estado', '']

/** Urgente cuando el plazo entra en la franja en la que ya no da tiempo a reunir prueba. */
function isUrgent(row: PaymentReversalRequestResponse): boolean {
  const days = daysUntil(row.deadlineAt)
  return days !== null && days <= REVERSAL_URGENT_DAYS
}
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <AppTable
      :headers="HEADERS"
      :empty="rows.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="$emit('retry')"
    >
      <template #empty>
        <slot name="empty" />
      </template>

      <tr v-for="row in rows" :key="row.id" class="ds-row-hover">
        <td>
          <span class="ds-text-strong">#{{ row.id }}</span>
          <span class="ds-meta linea">pago #{{ row.paymentId }}</span>
        </td>
        <td><CompanyRef :company-id="row.companyId" /></td>

        <td>
          <span class="ds-text-strong">{{ REVERSAL_ORIGIN_LABEL[row.origin] }}</span>
          <span v-if="row.causal" class="ds-meta linea">
            {{ REVERSAL_CAUSAL_LABEL[row.causal] }}
          </span>
          <!-- Sin causal no procede: la ley las enumera y la lista es cerrada. -->
          <span v-else class="ds-meta linea">Sin causal: la reversión no puede proceder así.</span>
          <span class="ds-meta linea">
            {{ CONSUMER_DETERMINATION_LABEL[row.consumerDetermination] }}
          </span>
        </td>

        <td>
          <span class="ds-meta linea">
            Conocimiento: {{ formatDate(row.consumerBecameAwareAt, 'sin fecha') }}
          </span>
          <span class="ds-meta linea">Queja: {{ formatDate(row.claimReceivedAt) }}</span>
          <span class="ds-meta linea">
            Emisor: {{ formatDate(row.issuerNotifiedAt, 'sin notificar') }}
          </span>
        </td>

        <td>
          <span class="ds-text-strong">{{ deadlineText(daysUntil(row.deadlineAt)) }}</span>
          <span class="ds-meta linea">{{ formatDate(row.deadlineAt) }}</span>
          <span v-if="isUrgent(row) && !row.outcome" class="linea">
            <AppBadge variant="danger" :label="`Quedan ${REVERSAL_URGENT_DAYS} días o menos`" />
          </span>
        </td>

        <td>
          <AppBadge
            v-if="row.outcome"
            :variant="REVERSAL_OUTCOME_VARIANT[row.outcome]"
            :label="REVERSAL_OUTCOME_LABEL[row.outcome]"
          />
          <AppBadge v-else-if="row.opposedAt" variant="warning" label="Opuesta" />
          <AppBadge v-else-if="row.acknowledgedAt" variant="neutral" label="Acusada" />
          <AppBadge v-else variant="warning" label="Sin acusar" />
          <span v-if="row.appliedAmount !== null" class="ds-meta linea">
            revertido {{ formatDocumentAmount(row.appliedAmount) }}
          </span>
          <span v-if="row.resultingRefundId" class="ds-meta linea">
            devolución #{{ row.resultingRefundId }}
          </span>
        </td>

        <td class="ds-col-actions">
          <!-- Las tres fases, cada una donde tiene sentido. Una solicitud resuelta
               no vuelve a abrirse: sus botones no están. -->
          <div v-if="!row.outcome" class="acciones ds-flex-row">
            <button
              v-if="!row.acknowledgedAt"
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--sm"
              :disabled="busy"
              :aria-label="`Registrar el acuse de la solicitud #${row.id}`"
              @click="$emit('acknowledge', row)"
            >
              <component :is="ICONS.CHECK" :size="14" />
              Acusar
            </button>
            <button
              v-if="!row.opposedAt"
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--sm"
              :disabled="busy"
              :aria-label="`Oponerse a la solicitud #${row.id}`"
              @click="$emit('oppose', row)"
            >
              <component :is="ICONS.WARNING" :size="14" />
              Oponerse
            </button>
            <button
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--sm"
              :disabled="busy"
              :aria-label="`Resolver la solicitud #${row.id}`"
              @click="$emit('resolve', row)"
            >
              <component :is="ICONS.CHECKED" :size="14" />
              Resolver
            </button>
          </div>
          <span v-else class="ds-meta">Cerrada</span>
        </td>
      </tr>
    </AppTable>

    <AppPagination
      v-if="!loading && !error && total > 0"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :page-count="pageCount"
      @update:page="$emit('update:page', $event)"
    />
  </div>
</template>

<style scoped>
.linea {
  display: block;
}

/* Las tres acciones envuelven en pantallas estrechas en vez de recortarse: ninguna
   de las tres se puede perder (WCAG 2.2 §1.4.10). */
.acciones {
  flex-wrap: wrap;
}
</style>
