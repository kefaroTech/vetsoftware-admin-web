<script setup lang="ts">
import { computed, useSlots } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { formatDate } from '@/composables/format'
import CompanyRef from './CompanyRef.vue'
import {
  agingText,
  agingTitle,
  daysSince,
  formatDocumentAmount,
} from '../composables/billingFormat'
import type {
  BillingDocumentResponse,
  DocumentKind,
  IssueStatus,
} from '../types/billing-operations.types'

/**
 * La tabla de documentos de cobro. Se usa en «Pendiente de facturar» y en
 * «Vencidos», que son la misma forma con dos criterios de urgencia distintos.
 *
 * <p><b>Es una lista de DOCUMENTOS, y se nota en lo que NO tiene:</b> ni un
 * lápiz atenuado en la columna de acciones, ni un «Editar» deshabilitado, ni un
 * `<input readonly>` con el importe. La operación de editar no existe en el
 * contrato, así que tampoco existe en el marcado (§3.2). El único repertorio
 * posible son verbos de añadir, y llegan por el slot `row-actions`.
 *
 * <p><b>La antigüedad es la columna que convierte la tabla en trabajo.</b> Va en
 * texto («hace 14 días»), con la fecha exacta en el `title`: un ISO obliga a
 * calcular y una lista de trabajo no se lee calculando. ⚠️ El endpoint **no
 * admite orden**, así que la tabla no ordena: ordenar en cliente 20 filas de 300
 * mentiría sobre cuál es el documento más viejo (issue B-3).
 */
const props = defineProps<{
  documents: BillingDocumentResponse[]
  /** «Esperando desde» o «Vencido desde»: la fecha desde la que se cuenta la urgencia. */
  agingHeader: string
  agingFrom: 'createdDate' | 'dueDate'
  page: number
  pageSize: number
  total: number
  pageCount: number
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: []; 'update:page': [page: number] }>()

const slots = useSlots()

const documentKindLabels: Record<DocumentKind, string> = {
  INVOICE: 'Cuenta de cobro',
  CREDIT_NOTE: 'Nota crédito',
  DEBIT_NOTE: 'Nota débito',
}

const issueStatusLabels: Record<IssueStatus, string> = {
  DRAFT: 'Borrador',
  AWAITING_EXTERNAL: 'Pendiente de factura externa',
  EXTERNAL_REGISTERED: 'Factura externa registrada',
  VOIDED: 'Anulado',
}

const issueStatusVariants: Record<IssueStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  AWAITING_EXTERNAL: 'warning',
  EXTERNAL_REGISTERED: 'success',
  VOIDED: 'danger',
}

const headers = computed(() => {
  const base = [
    'Documento',
    'Empresa',
    'Tipo',
    'Suscripción',
    'Periodo',
    'Estado',
    'Vencimiento',
    props.agingHeader,
    'Total',
    'Saldo',
  ]
  return slots['row-actions'] ? [...base, 'Acciones'] : base
})

function agingSource(document: BillingDocumentResponse) {
  return props.agingFrom === 'dueDate' ? document.dueDate : document.createdDate
}

function formatPeriod(document: BillingDocumentResponse) {
  return `${formatDate(document.periodStart)} – ${formatDate(document.periodEnd)}`
}
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <AppTable
      :headers="headers"
      :empty="documents.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="$emit('retry')"
    >
      <template #empty>
        <slot name="empty" />
      </template>

      <tr v-for="document in documents" :key="document.id" class="ds-row-hover">
        <td class="ds-text-strong">
          {{ document.documentNumber }}
          <!-- La cadena de corrección, visible: un documento no se edita, se
               corrige con otro y los dos quedan. Solo se puede pintar la IDA —
               el contrato no expone la vuelta (`correctedByDocumentId`). -->
          <span v-if="document.correctsDocumentId" class="ds-meta corrige">
            Corrige al documento #{{ document.correctsDocumentId }}
          </span>
        </td>
        <td><CompanyRef :company-id="document.companyId" /></td>
        <td>{{ documentKindLabels[document.documentKind] }}</td>
        <td>#{{ document.subscriptionId }}</td>
        <td>{{ formatPeriod(document) }}</td>
        <td>
          <AppBadge
            :variant="issueStatusVariants[document.issueStatus]"
            :label="issueStatusLabels[document.issueStatus]"
          />
        </td>
        <td>{{ formatDate(document.dueDate) }}</td>
        <td :title="agingTitle(agingSource(document)) || undefined">
          {{ agingText(daysSince(agingSource(document))) }}
        </td>
        <td class="ds-num">{{ formatDocumentAmount(document.totalAmount) }}</td>
        <td class="ds-num">{{ formatDocumentAmount(document.balanceAmount) }}</td>
        <td v-if="slots['row-actions']" class="accion">
          <slot name="row-actions" :document="document" />
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
/* La referencia al documento corregido va bajo el número, no en otra columna:
   pertenece al documento, no es un dato independiente. */
.corrige {
  display: block;
}

/* NO usa `.ds-col-actions` (88px, pensada para iconos): aquí la acción es un
   verbo escrito —«Registrar factura externa»— y comprimirla lo partiría en tres
   líneas. */
.accion {
  white-space: nowrap;
}
</style>
