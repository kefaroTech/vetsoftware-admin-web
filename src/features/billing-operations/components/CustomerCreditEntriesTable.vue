<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import type { AppTableHeader } from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { formatAmount, formatDate } from '@/composables/format'
import { daysUntil, deadlineText } from '../composables/billingFormat'
import {
  CREDIT_ENTRY_LABEL,
  CREDIT_ENTRY_MEANING,
  CREDIT_ENTRY_VARIANT,
  CREDIT_ORIGIN_LABEL,
  type CustomerCreditEntryResponse,
} from '../types/customer-credit.types'
/**
 * <b>Los movimientos de la pila de lotes.</b> Sirve para las dos listas de la
 * pestaña —el histórico y los lotes por caducar— porque son la misma fila mirada
 * con dos cortes distintos; duplicar la tabla dejaría dos sitios donde arreglar el
 * mismo rótulo.
 *
 * <p><b>El lote se ve, y no solo el importe.</b> `lotEntryId` dice de qué lote salió
 * cada consumo: es lo que permite leer un consumo repartido en tres lotes como
 * <b>un</b> consumo y no como tres, que es exactamente lo que un operador va a tener
 * que explicarle al cliente.
 *
 * <p><b>La caducidad es el único movimiento que le quita plata al cliente sin que
 * nadie decida nada</b>, y por eso lleva su propio tono y su propia frase. Pintarla
 * igual que un consumo escondería el único caso en el que hay algo que hacer antes
 * de que ocurra.
 */
defineProps<{
  rows: CustomerCreditEntryResponse[]
  page: number
  pageSize: number
  total: number
  pageCount: number
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: []; 'update:page': [page: number] }>()

const HEADERS: AppTableHeader[] = [
  'Movimiento',
  'Empresa',
  { label: 'Importe', align: 'num' },
  'Origen',
  'Cuándo',
  'Caduca',
]
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <AppTable
      caption="Movimientos del saldo a favor"
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
        <td>
          <AppBadge
            :variant="CREDIT_ENTRY_VARIANT[row.entryKind]"
            :label="CREDIT_ENTRY_LABEL[row.entryKind]"
          />
          <span class="ds-meta linea">{{ CREDIT_ENTRY_MEANING[row.entryKind] }}</span>
          <span v-if="row.lotEntryId && row.lotEntryId !== row.id" class="ds-meta linea">
            del lote #{{ row.lotEntryId }}
          </span>
        </td>

        <td><CompanyRef :company-id="row.companyId" /></td>
        <td class="ds-num">{{ formatAmount(row.amount) }}</td>

        <td>
          <span>{{ CREDIT_ORIGIN_LABEL[row.originKind] }}</span>
          <span v-if="row.originDocumentId" class="ds-meta linea">
            documento #{{ row.originDocumentId }}
          </span>
          <span v-if="row.originPaymentId" class="ds-meta linea">
            pago #{{ row.originPaymentId }}
          </span>
          <span v-if="row.originSubscriptionId" class="ds-meta linea">
            contrato #{{ row.originSubscriptionId }}
          </span>
        </td>

        <td>
          {{ formatDate(row.occurredAt) }}
          <span class="ds-meta linea">valor {{ formatDate(row.valueDate) }}</span>
        </td>

        <td>
          <template v-if="row.expiresOn">
            <span>{{ formatDate(row.expiresOn) }}</span>
            <span class="ds-meta linea">{{ deadlineText(daysUntil(row.expiresOn)) }}</span>
          </template>
          <span v-else class="ds-meta">Sin fecha</span>
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
</style>
