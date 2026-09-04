<script setup lang="ts">
import { formatDate } from '@/composables/format'
import DocumentSheet from '@/components/ui/DocumentSheet.vue'
import QuoteStatusBadge from './QuoteStatusBadge.vue'
import QuoteValidity from './QuoteValidity.vue'
import QuoteLinesTable from './QuoteLinesTable.vue'
import QuoteTotals from './QuoteTotals.vue'
import QuoteAcceptanceProof from './QuoteAcceptanceProof.vue'
import QuoteChain from './QuoteChain.vue'
import { QUOTE_BILLING_CYCLE_LABEL, type QuoteResponse } from '../types/quotes.types'

/**
 * **Una cotización emitida.** No es un formulario: es un hecho.
 *
 * <p>El chasis lo pone `DocumentSheet` (W3-B). Antes esta ficha lo tenía escrito a
 * mano —regla superior, titular, sello, rejilla de detalle— con el comentario de que
 * `DocumentSheet` lo unificaría y adelantarlo aquí crearía la pieza dos veces. Ese
 * componente ya existe, así que lo que queda aquí es <b>solo lo propio de una
 * cotización</b>: qué campos son, en qué orden y qué se pinta debajo.
 *
 * <p>Las cuatro señales de la §3.2 no se repiten aquí porque ya no son opcionales:
 * las garantiza el chasis. Lo que esta ficha sí decide es que sus acciones
 * (`#actions`, que llega desde la vista) solo llevan verbos de añadir — «Editar» no
 * aparece en ningún estado porque el contrato no expone la operación, y «Eliminar»
 * solo existe en el borrador, que es otro componente.
 */
defineProps<{
  quote: QuoteResponse
  currentName?: (catalogItemId: number) => string | undefined
  /** Divisa declarada por la tarifa de la oferta; se reenvía tal cual a las cifras. */
  currency: string | null
}>()

defineEmits<{ reissue: [] }>()
</script>

<template>
  <DocumentSheet
    kind-label="Cotización"
    :document-number="quote.quoteNumber"
    seal-text="Documento · solo se agrega"
    title-id="quote-document-title"
    heading-level="h1"
  >
    <template #titular>
      <QuoteStatusBadge :status="quote.status" />
      <QuoteValidity :valid-until="quote.validUntil" :expired="quote.status === 'EXPIRED'" />
    </template>

    <template #meta>
      <div>
        <dt class="ds-label">Cliente</dt>
        <dd>
          {{ quote.company?.name ?? quote.prospectName ?? '—' }}
          <span v-if="!quote.company" class="ds-meta">· Prospecto</span>
        </dd>
      </div>
      <div>
        <dt class="ds-label">Documento</dt>
        <dd>{{ quote.company?.identifier ?? quote.prospectDocument ?? '—' }}</dd>
      </div>
      <div>
        <dt class="ds-label">Correo</dt>
        <dd>{{ quote.prospectEmail ?? '—' }}</dd>
      </div>
      <div>
        <dt class="ds-label">Teléfono</dt>
        <dd>{{ quote.prospectPhone ?? '—' }}</dd>
      </div>
      <div>
        <dt class="ds-label">Ciclo de facturación</dt>
        <dd>{{ QUOTE_BILLING_CYCLE_LABEL[quote.billingCycle] ?? '—' }}</dd>
      </div>
      <div>
        <dt class="ds-label">Días de prueba</dt>
        <dd>{{ quote.trialDays }}</dd>
      </div>
      <div>
        <dt class="ds-label">Vigente hasta</dt>
        <dd>
          <QuoteValidity
            :valid-until="quote.validUntil"
            :expired="quote.status === 'EXPIRED'"
            show-date
          />
        </dd>
      </div>
      <div>
        <dt class="ds-label">Emitida el</dt>
        <dd>{{ formatDate(quote.createdDate) }}</dd>
      </div>
    </template>

    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>

    <template #body>
      <QuoteAcceptanceProof v-if="quote.status === 'ACCEPTED'" :quote="quote" />

      <section class="ds-stack ds-stack--10" aria-labelledby="lineas-titulo">
        <h3 id="lineas-titulo" class="ds-title">La oferta</h3>
        <QuoteLinesTable :lines="quote.lines" :current-name="currentName" :currency="currency" />
        <QuoteTotals :quote="quote" :currency="currency" />
      </section>
    </template>

    <template #chain>
      <QuoteChain :quote="quote" @reissue="$emit('reissue')" />
    </template>
  </DocumentSheet>
</template>
