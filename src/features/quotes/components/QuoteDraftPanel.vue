<script setup lang="ts">
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import QuoteStatusBadge from './QuoteStatusBadge.vue'
import QuoteValidity from './QuoteValidity.vue'
import QuoteLinesTable from './QuoteLinesTable.vue'
import QuoteTotals from './QuoteTotals.vue'
import { QUOTE_BILLING_CYCLE_LABEL, type QuoteResponse } from '../types/quotes.types'

/**
 * **El chasis de borrador** — el otro lado de la decisión §3.2, y por eso se lee distinto a simple
 * vista.
 *
 * <p>Diferencias deliberadas con `QuoteDocument.vue`, ninguna de color:
 *
 * <ul>
 *   <li><b>Sin regla superior y sobre superficie apagada</b> (`.ds-card--flat`): es una mesa de
 *       trabajo, no un papel emitido.</li>
 *   <li><b>El número no es el titular.</b> Un borrador no se cita por su número, así que el
 *       titular es «Borrador sin enviar» y el número baja a metadato.</li>
 *   <li><b>Sin sello de documento.</b> En su lugar, un aviso que dice exactamente qué es y qué
 *       falta por pasar.</li>
 *   <li><b>Otro repertorio de acciones</b>: «Enviar» y «Eliminar», las dos únicas que existen
 *       aquí. `DELETE /quotes/{id}` solo se ofrece en este estado.</li>
 * </ul>
 *
 * <p>⚠️ **Tampoco hay «Editar», y no es un olvido.** El contrato no expone `PUT`/`PATCH` sobre una
 * cotización en ningún estado, ni siquiera en borrador. Así que el aviso lo dice con todas las
 * letras en vez de pintar un botón gris: lo que se corrige, se corrige eliminando y emitiendo
 * otra. Esa frase es la diferencia entre una interfaz honesta y una que promete una operación
 * inexistente.
 */
defineProps<{
  quote: QuoteResponse
  currentName?: (catalogItemId: number) => string | undefined
  /** Divisa declarada por la tarifa de la oferta; se reenvía tal cual a las cifras. */
  currency: string | null
}>()
</script>

<template>
  <article class="ds-card ds-card--flat borrador ds-stack ds-stack--18">
    <header class="ds-stack ds-stack--10">
      <p class="ds-kicker">Cotización</p>
      <div class="ds-flex-row ds-flex-row--12 titular">
        <h2 class="ds-title titulo">Borrador sin enviar</h2>
        <QuoteStatusBadge :status="quote.status" />
      </div>
      <p class="ds-meta numero">
        {{ quote.quoteNumber }} · creado el {{ formatDate(quote.createdDate) }}
      </p>
    </header>

    <div class="ds-banner ds-banner--info" role="status">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        Todavía no se ha enviado a nadie. <strong>Una cotización no se edita</strong> —el contrato
        no expone ninguna operación para hacerlo—: si algo está mal, se elimina este borrador y se
        emite otro. Al enviarlo pasa a ser un documento y deja de poder eliminarse.
      </span>
    </div>

    <dl class="ds-detail-grid">
      <div>
        <dt class="ds-label">Cliente</dt>
        <dd class="valor">
          {{ quote.company?.name ?? quote.prospectName ?? '—' }}
          <span v-if="!quote.company" class="ds-meta">· Prospecto</span>
        </dd>
      </div>
      <div>
        <dt class="ds-label">Correo</dt>
        <dd class="valor">{{ quote.prospectEmail ?? '—' }}</dd>
      </div>
      <div>
        <dt class="ds-label">Ciclo de facturación</dt>
        <dd class="valor">{{ QUOTE_BILLING_CYCLE_LABEL[quote.billingCycle] }}</dd>
      </div>
      <div>
        <dt class="ds-label">Vigente hasta</dt>
        <dd class="valor"><QuoteValidity :valid-until="quote.validUntil" show-date /></dd>
      </div>
    </dl>

    <div v-if="$slots.actions" class="ds-actions ds-actions--start">
      <slot name="actions" />
    </div>

    <section class="ds-stack ds-stack--10" aria-labelledby="borrador-lineas-titulo">
      <h3 id="borrador-lineas-titulo" class="ds-title">Lo que se va a ofrecer</h3>
      <QuoteLinesTable :lines="quote.lines" :current-name="currentName" :currency="currency" />
      <QuoteTotals :quote="quote" :currency="currency" />
    </section>
  </article>
</template>

<style scoped>
.titular {
  flex-wrap: wrap;
}

.titulo {
  margin: 0;
}

.numero {
  margin: 0;
}

.valor {
  margin: var(--space-4) 0 0;
}
</style>
