<script setup lang="ts">
import { computed } from 'vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import DocumentSheet from '@/components/ui/DocumentSheet.vue'
import { formatAmount, formatDate } from '@/composables/format'
import type { BillingDocumentResponse } from '@/features/billing-operations/types/billing-operations.types'
import { BILLING_DOCUMENT_ROUTE_NAMES } from '@/router/routes/billing-documents.routes'
import ContractGapNotice from './ContractGapNotice.vue'
import DocumentCircuitBadge from './DocumentCircuitBadge.vue'
import {
  DOCUMENT_KIND_DIRECTION,
  DOCUMENT_KIND_LABEL,
  ISSUE_STATUS_PRESENTATION,
} from '../types/billing-documents.types'
import MoneyScopeNote from '@/components/ui/MoneyScopeNote.vue'

/**
 * <b>Bloque 1 · la cabecera del documento</b>: quién es, de qué periodo, en qué
 * punto del circuito y a quién se emitió.
 *
 * <p>El chasis lo pone `DocumentSheet` (W3-B), que ya trae las cuatro señales de
 * la §3.2 —regla superior, sello textual, `&lt;dl&gt;` en vez de inputs, y el
 * hueco de la cadena de corrección—. Aquí solo va lo propio de un documento de
 * cobro. <b>No se declara ningún `#actions` con verbos de edición</b>: el slot de
 * acciones lo llena la vista y solo admite verbos de añadir, porque
 * `DocumentSheet` no expone ninguna prop `editable` — la operación no existe en el
 * contrato y por eso tampoco existe en el marcado.
 *
 * <p><b>Los importes van en positivo, siempre.</b> Una nota crédito de 40.000
 * trae `totalAmount: 40000`; el signo lo aporta su tipo, y por eso el tipo se
 * pinta con su dirección escrita («resta de lo que la empresa debe») en vez de
 * dibujar un menos delante de la cifra. Mezclar las dos convenciones deja
 * cualquier suma de pantalla sin cuadrar con la del servidor.
 *
 * <p><b>Dos huecos del contrato que se dicen en voz alta</b> en vez de rellenarse:
 * el perfil de facturación congelado con el que se emitió —§G3 pide NIT, razón
 * social, domicilio y correo, y el contrato solo trae `companyId`— y la vuelta de
 * la cadena de corrección, que existe en la base y no en la respuesta.
 */
const props = defineProps<{ document: BillingDocumentResponse }>()

const period = computed(
  () => `${formatDate(props.document.periodStart)} – ${formatDate(props.document.periodEnd)}`,
)

/**
 * El significado del estado, en texto. Se lee por teléfono y se copia en un
 * correo: nunca viaja solo en el tono del distintivo (§5.2, WCAG 2.2 §1.4.1).
 */
const issueMeaning = computed(() => ISSUE_STATUS_PRESENTATION[props.document.issueStatus].meaning)
</script>

<template>
  <DocumentSheet
    :kind-label="DOCUMENT_KIND_LABEL[document.documentKind]"
    :document-number="document.documentNumber"
    seal-text="Documento · solo se agrega"
    title-id="documento-titulo"
  >
    <template #titular>
      <DocumentCircuitBadge :status="document.issueStatus" />
    </template>

    <template #meta>
      <div>
        <dt class="ds-label">Empresa</dt>
        <dd><CompanyRef :company-id="document.companyId" /></dd>
      </div>
      <div>
        <dt class="ds-label">Contrato</dt>
        <dd>#{{ document.subscriptionId }}</dd>
      </div>
      <div>
        <dt class="ds-label">Periodo facturado</dt>
        <dd>{{ period }}</dd>
      </div>
      <div>
        <dt class="ds-label">Vencimiento</dt>
        <dd>{{ formatDate(document.dueDate) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Emitido el</dt>
        <dd>{{ formatDate(document.createdDate) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Total del documento</dt>
        <dd class="ds-num">{{ formatAmount(document.totalAmount) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Saldo</dt>
        <dd class="ds-num">{{ formatAmount(document.balanceAmount) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Qué clase de documento es</dt>
        <dd>{{ DOCUMENT_KIND_DIRECTION[document.documentKind] }}</dd>
      </div>
    </template>

    <template #actions>
      <slot name="actions" />
    </template>

    <template #body>
      <MoneyScopeNote />

      <p class="ds-meta estado">
        {{ issueMeaning }}
      </p>

      <ContractGapNotice
        title="A quién se emitió: no está en el contrato"
        reason="La respuesta del documento trae la empresa como número y nada más. El perfil de
          facturación con el que se emitió —NIT, razón social, domicilio, correo de facturación—
          se congela al emitir y no viaja aquí, así que esta ficha no puede decir el nombre con
          el que salió la factura."
        needed="Que `BillingDocumentResponse` incluya el perfil de facturación congelado, o una
          ruta que lo devuelva por documento."
      />
    </template>

    <template #chain>
      <p v-if="document.correctsDocumentId" class="ds-meta cadena">
        Este documento <strong>corrige</strong> al
        <RouterLink
          :to="{
            name: BILLING_DOCUMENT_ROUTE_NAMES.DETAIL,
            params: { companyId: document.companyId, id: document.correctsDocumentId },
          }"
          :aria-label="`Abrir el documento ${document.correctsDocumentId} al que corrige este`"
        >
          documento #{{ document.correctsDocumentId }}
        </RouterLink>
        . El original se queda como está: los dos quedan.
      </p>

      <ContractGapNotice
        title="La vuelta de la cadena de corrección"
        reason="Desde un documento se ve a cuál corrige, pero no qué nota crédito lo corrigió a él:
          la respuesta no declara ningún `correctedByDocumentId`. Un documento ya corregido se lee
          aquí como si nadie lo hubiera tocado."
        needed="Que `BillingDocumentResponse` exponga el documento que lo corrige, para poder
          pintar las dos partes de la cadena como exige §3.2."
      />
    </template>
  </DocumentSheet>
</template>

<style scoped>
.estado,
.cadena {
  margin: 0;
}
</style>
