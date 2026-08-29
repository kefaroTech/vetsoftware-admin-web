<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { ICONS } from '@/constants/icons'
import { formatAmount, formatDate } from '@/composables/format'
import type { BillingDocumentResponse } from '@/features/billing-operations/types/billing-operations.types'
import {
  correctionChainText,
  documentBalanceReading,
} from '../../composables/subscriptionMoneyText'
import {
  DOCUMENT_KIND_PRESENTATION,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_VARIANT,
} from '../../types/subscription-money.types'
/**
 * <b>Facturado</b>: se emitió el documento. Una fila por cuenta de cobro, nota
 * crédito o nota débito.
 *
 * <p><b>Emitido no es cobrado</b>, y la tabla lo dice con dos columnas separadas:
 * el total del documento y lo que <b>queda por cobrar</b>. Un documento con
 * `balanceAmount` igual a su total no está pagado por mucho que exista y esté
 * numerado; fundir las dos cifras en un «importe» es cómo una cartera vencida se
 * lee como facturación cumplida.
 *
 * <p><b>El signo lo da el tipo, no un menos.</b> Los importes de un documento son
 * siempre positivos (§3.5): una nota crédito <b>no</b> se pinta en rojo con un
 * signo negativo, se pinta con su badge y su significado. Pintarla como deuda
 * miente sobre la contabilidad en la dirección contraria a la del cargo negativo,
 * y las dos mentiras cuestan lo mismo.
 *
 * <p><b>La cadena de corrección se ve</b> (§3.2): un documento con factura externa
 * registrada no cambia de importe, así que corregirlo exige una nota crédito
 * encadenada al original. ⚠️ El contrato solo trae la <b>ida</b>
 * (`correctsDocumentId`); desde el original no se puede llegar a la nota que lo
 * corrige porque no existe `correctedByDocumentId`. Se hereda de W1-E y no se
 * disimula.
 *
 * <p><b>«Ver los cargos que lo componen» es el primer eslabón de la cadena</b> y
 * es un `<button>`, no un enlace: no navega a ninguna parte, filtra el bloque de
 * arriba y mueve el foco allí. Un `RouterLink` que no cambia de ruta mentiría
 * sobre lo que va a pasar al pulsarlo.
 *
 * <p>El estado de emisión ya venía resuelto con texto en `BillingDocumentsTable`
 * (W1-E) y sus rótulos <b>no se cambian</b>: se reutilizan los del mismo mapa.
 */
defineProps<{
  rows: BillingDocumentResponse[]
  /** El contrato del expediente: sus filas se marcan, para no confundirlas con las de otro. */
  subscriptionId: number
  focusedDocumentId: number | null
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: []; focusDocument: [documentId: number] }>()
</script>

<template>
  <AppTable
    money
    :headers="[
      'Documento',
      'Periodo facturado',
      { label: 'Total', align: 'num' },
      { label: 'Queda por cobrar', align: 'num' },
      'Emisión',
      { label: '', align: 'actions' },
    ]"
    :empty="rows.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="errorTraceId"
    @retry="$emit('retry')"
  >
    <template #empty>
      <p>
        No hay ninguna cuenta de cobro en esta página. Que no haya documento no significa que no
        haya nada devengado: el servicio puede haberse prestado y estar todavía sin facturar.
      </p>
    </template>

    <tr
      v-for="document in rows"
      :key="document.id"
      class="ds-row-hover"
      :class="{ enfocado: document.id === focusedDocumentId }"
    >
      <td>
        <span class="ds-text-strong">{{ document.documentNumber }}</span>
        <span class="ds-meta bloque">
          <AppBadge
            variant="neutral"
            :label="DOCUMENT_KIND_PRESENTATION[document.documentKind].label"
          />
        </span>
        <!-- El contrato al que pertenece, con texto y no con un matiz de fondo:
             la lista es de la EMPRESA y puede traer documentos de otros contratos. -->
        <span class="ds-meta bloque">
          {{
            document.subscriptionId === subscriptionId
              ? 'De este contrato'
              : `Del contrato #${document.subscriptionId}`
          }}
        </span>
        <span v-if="correctionChainText(document)" class="ds-meta bloque">
          {{ correctionChainText(document) }}
        </span>
      </td>

      <td>
        {{ formatDate(document.periodStart) }} → {{ formatDate(document.periodEnd) }}
        <span v-if="document.dueDate" class="ds-meta bloque">
          Vence el {{ formatDate(document.dueDate) }}
        </span>
      </td>

      <td class="ds-num">{{ formatAmount(document.totalAmount) }}</td>

      <td class="ds-num">
        {{ documentBalanceReading(document).amount }}
        <span class="ds-meta bloque lectura">{{ documentBalanceReading(document).sentence }}</span>
      </td>

      <td>
        <AppBadge
          :variant="ISSUE_STATUS_VARIANT[document.issueStatus]"
          :label="ISSUE_STATUS_LABEL[document.issueStatus]"
        />
        <span v-if="document.externalInvoiceNumber" class="ds-meta bloque">
          Factura externa {{ document.externalInvoiceNumber }}
        </span>
      </td>

      <td class="ds-col-actions">
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          :aria-label="`Ver los cargos que componen ${document.documentNumber}`"
          @click="$emit('focusDocument', document.id)"
        >
          <component :is="ICONS.SEARCH" :size="14" />
          Ver sus cargos
        </button>
      </td>
    </tr>
  </AppTable>
</template>

<style scoped>
.bloque {
  display: block;
}

.lectura {
  max-width: 18rem;
  text-align: right;
}

/* La fila cuya composición se está mirando. Solo geometría: el matiz lo pone el
   borde izquierdo con un token, y NUNCA es el único portador — la frase del
   filtro lo dice arriba en texto y la vive una región `role="status"`. */
.enfocado {
  box-shadow: inset 3px 0 0 0 var(--ring);
}
</style>
