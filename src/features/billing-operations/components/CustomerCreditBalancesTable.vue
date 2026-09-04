<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import type { AppTableHeader } from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { ICONS } from '@/constants/icons'
import { formatAmount, formatDate } from '@/composables/format'
import { daysUntil, deadlineText } from '../composables/billingFormat'
import {
  CREDIT_EXPIRY_WARNING_DAYS,
  type CustomerCreditBalanceResponse,
} from '../types/customer-credit.types'
/**
 * <b>El saldo a favor de cada empresa, con la fecha del primer lote que caduca.</b>
 *
 * <p><b>Un saldo sin su caducidad es medio dato.</b> Cuatrocientos mil pesos que
 * vencen el mes que viene y cuatrocientos mil sin fecha se leen igual en una columna
 * de importes, y son cosas distintas: uno hay que gastarlo y el otro no corre
 * prisa. Por eso `nextExpiryOn` va al lado del importe y no en una pantalla de
 * detalle.
 *
 * <p><b>El aviso se pinta con su umbral escrito</b> —{@code CREDIT_EXPIRY_WARNING_DAYS}
 * días— y no solo con un tono: un cliente que va a perder saldo tiene derecho a que
 * alguien pueda decírselo por teléfono, y un color no se lee por teléfono (§5.2 ·
 * WCAG §1.4.1).
 */
defineProps<{
  rows: CustomerCreditBalanceResponse[]
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
  consume: [row: CustomerCreditBalanceResponse]
  expire: [row: CustomerCreditBalanceResponse]
}>()

const HEADERS: AppTableHeader[] = [
  'Empresa',
  { label: 'Saldo a favor', align: 'num' },
  'Primer lote que caduca',
  'Recalculado',
  { label: '', align: 'actions' },
]

function expiresSoon(row: CustomerCreditBalanceResponse): boolean {
  const days = daysUntil(row.nextExpiryOn)
  return days !== null && days <= CREDIT_EXPIRY_WARNING_DAYS
}
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <AppTable
      caption="Saldos a favor por empresa"
      money
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
        <td><CompanyRef :company-id="row.companyId" /></td>
        <td class="ds-num ds-text-strong">{{ formatAmount(row.balanceAmount) }}</td>

        <td>
          <template v-if="row.nextExpiryOn">
            <span>{{ formatDate(row.nextExpiryOn) }}</span>
            <span class="ds-meta linea">{{ deadlineText(daysUntil(row.nextExpiryOn)) }}</span>
            <span v-if="expiresSoon(row)" class="linea">
              <AppBadge variant="danger" label="Por vencer: el cliente lo pierde" />
            </span>
          </template>
          <!-- Vacío significa «ningún lote tiene fecha», no «no caduca nunca». -->
          <span v-else class="ds-meta">Ningún lote con fecha</span>
        </td>

        <td>{{ formatDate(row.recalculatedAt) }}</td>

        <td class="ds-col-actions">
          <div class="acciones ds-flex-row">
            <button
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--sm"
              :disabled="busy"
              :aria-label="`Aplicar saldo a favor de la empresa ${row.companyId}`"
              @click="$emit('consume', row)"
            >
              <component :is="ICONS.ARROW_RIGHT" :size="14" />
              Aplicar
            </button>
            <button
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--sm"
              :disabled="busy"
              :aria-label="`Cerrar los lotes vencidos de la empresa ${row.companyId}`"
              @click="$emit('expire', row)"
            >
              <component :is="ICONS.HISTORY" :size="14" />
              Cerrar vencidos
            </button>
          </div>
        </td>
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
.linea {
  display: block;
}

.acciones {
  flex-wrap: wrap;
}
</style>
