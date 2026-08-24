<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { ROUTE_NAMES } from '@/constants/routes'
import type { QuoteResponse } from '../types/quotes.types'

/**
 * **La cadena de corrección, visible y en los dos sentidos.**
 *
 * <p>Un documento no se edita: se corrige con otro, y los dos quedan. Para una cotización esa
 * cadena tiene tres eslabones y la pantalla los hace navegables:
 *
 * <ol>
 *   <li><b>De dónde viene</b> — la empresa o el prospecto al que se ofreció. Con enlace real a la
 *       ficha cuando ya existe como empresa.</li>
 *   <li><b>A dónde va</b> — una cotización aceptada es el origen de un contrato. El expediente del
 *       contrato enlaza de vuelta aquí por su `quoteId`, que es la vuelta del enlace.</li>
 *   <li><b>Cómo se corrige</b> — no se corrige: se emite otra. La acción está aquí, con ese
 *       nombre, en vez de un «Editar» que mentiría sobre lo que el sistema permite.</li>
 * </ol>
 *
 * <p>⚠️ Límite conocido del contrato, y por eso se dice en pantalla en vez de fingir lo contrario:
 * `GET /platform-subscriptions` no admite filtro por `quoteId`, así que el enlace de ida lleva al
 * listado de contratos y no al contrato exacto. Está abierto como issue.
 */
const props = defineProps<{ quote: QuoteResponse }>()

const emit = defineEmits<{ reissue: [] }>()

const esAceptada = computed(() => props.quote.status === 'ACCEPTED')
const seCorrigeEmitiendoOtra = computed(
  () => props.quote.status === 'REJECTED' || props.quote.status === 'EXPIRED',
)
</script>

<template>
  <section class="ds-stack ds-stack--10" aria-labelledby="cadena-titulo">
    <h3 id="cadena-titulo" class="ds-title">Cadena</h3>

    <ol class="ds-list-reset ds-stack ds-stack--8">
      <li class="eslabon">
        <component :is="ICONS.COMPANY" :size="15" class="ds-icon-muted" />
        <span>
          Cotizada para
          <RouterLink
            v-if="quote.company"
            class="enlace"
            :to="{ name: ROUTE_NAMES.COMPANY_DETAIL, params: { id: quote.company.id } }"
          >
            {{ quote.company.name }}
          </RouterLink>
          <strong v-else>{{ quote.prospectName || 'Prospecto sin nombre' }}</strong>
          <span v-if="quote.company" class="ds-meta"> · {{ quote.company.identifier }}</span>
          <span v-else class="ds-meta"> · prospecto, todavía no existe como empresa</span>
        </span>
      </li>

      <li v-if="esAceptada" class="eslabon">
        <component :is="ICONS.SUBSCRIPTION" :size="15" class="ds-icon-muted" />
        <span>
          Aceptada el {{ formatDate(quote.acceptedAt) }}: de este documento nace el contrato.
          <RouterLink class="enlace" :to="{ name: ROUTE_NAMES.SUBSCRIPTIONS_ADMIN }">
            Ver contratos
          </RouterLink>
          <span class="ds-meta">
            · el expediente del contrato enlaza de vuelta aquí por su <code>quoteId</code>
          </span>
        </span>
      </li>

      <li v-if="seCorrigeEmitiendoOtra" class="eslabon">
        <component :is="ICONS.RETRY" :size="15" class="ds-icon-muted" />
        <span>
          Una cotización no se corrige: se emite otra. La original se queda como está, y las dos
          conviven en el embudo.
        </span>
      </li>
    </ol>

    <div v-if="seCorrigeEmitiendoOtra">
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('reissue')">
        <component :is="ICONS.ADD" :size="15" />
        Emitir una cotización nueva a partir de esta
      </button>
    </div>
  </section>
</template>

<style scoped>
.eslabon {
  display: flex;
  align-items: flex-start;
  gap: var(--space-8);
}

.enlace {
  font-weight: var(--weight-semibold);
}
</style>
