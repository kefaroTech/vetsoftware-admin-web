<script setup lang="ts">
import { computed, useSlots } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import type { AppTableHeader } from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { formatAmount, formatDate } from '@/composables/format'
import { ICONS } from '@/constants/icons'
import { DOCUMENT_KIND_LABEL } from '@/features/billing-documents/types/billing-documents.types'
import type { IssueStatus } from '../types/billing-operations.types'
import { BILLING_DOCUMENT_ROUTE_NAMES } from '@/router/routes/billing-documents.routes'
import { agingText, agingTitle, daysSince } from '../composables/billingFormat'
import type { BillingDocumentResponse } from '../types/billing-operations.types'

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
  /**
   * Convierte el número de documento en un enlace a su detalle
   * (`/documentos/:companyId/:id`).
   *
   * <p>Es <b>opcional y arranca apagado</b> a propósito: mientras la ruta no esté
   * registrada en el router, un `RouterLink` con un nombre que no existe revienta
   * al pintar. Las pantallas de `/cobranza` no lo piden y siguen igual; lo enciende
   * la lista del circuito, que es la que vive junto a esa ruta.
   */
  detailLink?: boolean
  /**
   * A partir de cuántos días de antigüedad la fila deja de ser «reciente» y se
   * señala como atascada. Sin valor, no se señala ninguna.
   */
  stalledAfterDays?: number
}>()

defineEmits<{ retry: []; 'update:page': [page: number] }>()

const slots = useSlots()

/**
 * <b>Los rótulos del circuito se quedan aquí, literales, y no se mudan.</b>
 *
 * <p>Se intentó centralizarlos en `features/billing-documents` —son el mismo
 * vocabulario en tres pantallas— y <b>no se puede sin romper una guarda</b>:
 * `tests/unit/subscription-money.spec.ts` lee el TEXTO de este fichero y exige que
 * contenga `DRAFT: 'Borrador'` y su tono, uno por uno, para que la copia de
 * `subscription-money.types.ts` (`ISSUE_STATUS_LABEL` / `ISSUE_STATUS_VARIANT`) no
 * se separe de esta sin que nadie se entere. Consolidar de verdad exige tocar a la
 * vez este fichero, el de `subscriptions-admin` y esa prueba — tres áreas
 * distintas—, así que queda declarado como pendiente en vez de hacerse a medias.
 *
 * <p>Consecuencia práctica: `features/billing-documents` <b>deriva</b> sus rótulos
 * de `ISSUE_STATUS_LABEL` en vez de escribir una tercera copia, para que la guarda
 * siga cubriendo todo lo que hay.
 */
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

function stalled(document: BillingDocumentResponse) {
  if (props.stalledAfterDays == null) return false
  const days = daysSince(props.agingFrom === 'dueDate' ? document.dueDate : document.createdDate)
  return days != null && days > props.stalledAfterDays
}

const headers = computed<AppTableHeader[]>(() => {
  const base: AppTableHeader[] = [
    'Documento',
    'Empresa',
    'Tipo',
    'Suscripción',
    'Periodo',
    'Estado',
    'Vencimiento',
    props.agingHeader,
    { label: 'Total', align: 'num' },
    { label: 'Saldo', align: 'num' },
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
      caption="Documentos de cobro"
      money
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
          <RouterLink
            v-if="detailLink"
            :to="{
              name: BILLING_DOCUMENT_ROUTE_NAMES.DETAIL,
              params: { companyId: document.companyId, id: document.id },
            }"
            :aria-label="`Abrir el documento ${document.documentNumber}`"
          >
            {{ document.documentNumber }}
          </RouterLink>
          <template v-else>{{ document.documentNumber }}</template>
          <!-- La cadena de corrección, visible: un documento no se edita, se
               corrige con otro y los dos quedan. Solo se puede pintar la IDA —
               el contrato no expone la vuelta (`correctedByDocumentId`). -->
          <span v-if="document.correctsDocumentId" class="ds-meta corrige">
            Corrige al documento #{{ document.correctsDocumentId }}
          </span>
        </td>
        <td><CompanyRef :company-id="document.companyId" /></td>
        <td>{{ DOCUMENT_KIND_LABEL[document.documentKind] ?? '—' }}</td>
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
          <!-- El atasco se dice con PALABRAS, no con un fondo: se lee en voz alta,
               se copia en un correo y sobrevive a la escala de grises (§5.2). -->
          <span v-if="stalled(document)" class="ds-meta atasco">
            <component :is="ICONS.WARNING" :size="13" aria-hidden="true" />
            Atascado más de {{ stalledAfterDays }} días
          </span>
        </td>
        <td class="ds-num">{{ formatAmount(document.totalAmount) }}</td>
        <td class="ds-num">{{ formatAmount(document.balanceAmount) }}</td>
        <td v-if="slots['row-actions']" class="accion">
          <slot name="row-actions" :document="document" />
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
/* La referencia al documento corregido va bajo el número, no en otra columna:
   pertenece al documento, no es un dato independiente. */
.corrige {
  display: block;
}

/* El aviso de atasco va bajo la antigüedad, no en otra columna: es una lectura
   de ese mismo dato. Sin ancho fijo, para que no parta la celda. */
.atasco {
  display: block;
  white-space: nowrap;
}

/* NO usa `.ds-col-actions` (88px, pensada para iconos): aquí la acción es un
   verbo escrito —«Registrar factura externa»— y comprimirla lo partiría en tres
   líneas. */
.accion {
  white-space: nowrap;
}
</style>
