<script setup lang="ts">
import { formatDate } from '@/composables/format'
import DocumentSheet from '@/components/ui/DocumentSheet.vue'
import { formatDocumentAmount } from '../composables/billingFormat'
import type { BillingDocumentResponse } from '../types/billing-operations.types'

/**
 * **Una referencia externa ya registrada.** No es un formulario: es un hecho.
 *
 * <p>El chasis lo pone `DocumentSheet` (W3-B). Esta ficha tenía el suyo escrito a
 * mano, con el comentario de que `DocumentSheet` lo unificaría y adelantarlo aquí
 * crearía la pieza dos veces; ese componente ya existe, así que aquí solo queda lo
 * propio de un documento de facturación.
 *
 * <p>El contrato no expone ninguna operación que cambie una referencia externa ya
 * registrada, así que esta ficha <b>no pasa ningún `#actions`</b>: no es que estén
 * deshabilitadas, es que no hay ninguna. La nota del pie dice, con palabras, cómo se
 * corrige de verdad — nota crédito encadenada, y las dos quedan— que es la señal 4
 * de la §3.2 en el único formato que este documento puede darle todavía.
 */
defineProps<{ document: BillingDocumentResponse }>()
</script>

<template>
  <DocumentSheet
    kind-label="Factura externa registrada"
    :document-number="document.documentNumber"
    seal-text="Documento · solo se agrega"
    title-id="external-invoice-record-title"
  >
    <template #meta>
      <div>
        <dt class="ds-label">Número de la factura externa</dt>
        <dd>{{ document.externalInvoiceNumber ?? '—' }}</dd>
      </div>
      <div>
        <dt class="ds-label">Fecha de emisión</dt>
        <dd>{{ formatDate(document.externalIssuedAt) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Proveedor</dt>
        <dd>{{ document.externalProvider ?? '—' }}</dd>
      </div>
      <div>
        <dt class="ds-label">CUFE</dt>
        <dd class="cufe">{{ document.externalCufe ?? '—' }}</dd>
      </div>
      <div>
        <dt class="ds-label">Registrada el</dt>
        <dd>{{ formatDate(document.externalRegisteredAt) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Total del documento</dt>
        <dd class="ds-num">{{ formatDocumentAmount(document.totalAmount) }}</dd>
      </div>
    </template>

    <template #chain>
      <p class="ds-meta">
        Este documento ya no cambia de importe. Si algo está mal, se corrige emitiendo una
        <strong>nota crédito</strong> encadenada a él: el original se queda como está y las dos
        quedan.
      </p>
    </template>
  </DocumentSheet>
</template>

<style scoped>
/* Un CUFE es una cadena larga sin espacios: sin esto desborda la celda de la
   rejilla. Es lo único propio que le queda a esta ficha. */
.cufe {
  word-break: break-all;
}
</style>
