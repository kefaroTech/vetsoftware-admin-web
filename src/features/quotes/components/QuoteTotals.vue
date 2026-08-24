<script setup lang="ts">
import { formatCurrency, formatDate } from '@/composables/format'
import type { QuoteResponse } from '../types/quotes.types'

/**
 * Los totales de la oferta, **guardados y no recalculados**.
 *
 * <p>`subtotalAmount`, `discountAmount`, `taxAmount` y `totalAmount` vienen del documento; esta
 * pantalla no suma las líneas para obtenerlos. Si algún día no cuadraran, la verdad es el
 * documento y el descuadre es un defecto que hay que ver, no maquillar con una suma en cliente.
 *
 * <p>El pie lo dice explícitamente, con la fecha y la tarifa: es la frase que responde «¿por qué
 * este precio y no el de hoy?» sin que nadie tenga que abrir el catálogo.
 */
defineProps<{ quote: QuoteResponse }>()
</script>

<template>
  <div class="ds-stack ds-stack--8">
    <dl class="totales">
      <div class="fila">
        <dt>Subtotal</dt>
        <dd class="ds-num">{{ formatCurrency(quote.subtotalAmount) }}</dd>
      </div>
      <div class="fila">
        <dt>Descuento</dt>
        <dd class="ds-num">{{ formatCurrency(quote.discountAmount) }}</dd>
      </div>
      <div class="fila">
        <dt>Impuestos</dt>
        <dd class="ds-num">{{ formatCurrency(quote.taxAmount) }}</dd>
      </div>
      <div class="fila fila--total">
        <dt class="ds-text-strong">Total</dt>
        <dd class="ds-num ds-text-strong">{{ formatCurrency(quote.totalAmount) }}</dd>
      </div>
    </dl>
    <p class="ds-meta">
      Importes congelados al {{ formatDate(quote.createdDate) }} con la tarifa #{{
        quote.priceListId
      }}.
    </p>
  </div>
</template>

<style scoped>
.totales {
  margin: 0;
  margin-left: auto;
  min-width: 18rem;
}

.fila {
  display: flex;
  justify-content: space-between;
  gap: var(--space-24);
  padding: var(--space-4) 0;
}

.fila dt,
.fila dd {
  margin: 0;
}

.fila--total {
  border-top: 1px solid var(--border);
  margin-top: var(--space-6);
  padding-top: var(--space-8);
}
</style>
