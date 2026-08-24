<script setup lang="ts">
import { ICONS } from '@/constants/icons'
import { formatDateTime } from '../composables/quoteDateTime'
import type { QuoteResponse } from '../types/quotes.types'

/**
 * **La prueba de la aceptación**: quién dijo que sí, cuándo y desde qué IP.
 *
 * <p>Es lo que se enseña si alguien discute que contrató, así que se pinta como un hecho del
 * documento —un `<dl>`— y no como un dato secundario en letra pequeña.
 *
 * <p>La IP la escribe el **servidor** desde la petición: el formulario de aceptación no la pide y
 * no debe pedirla, porque una prueba que el cliente escribe no prueba nada. Si llega vacía se
 * dice, en vez de dejar el hueco: un campo de prueba ausente es información.
 */
defineProps<{ quote: QuoteResponse }>()
</script>

<template>
  <div
    class="ds-banner ds-banner--success prueba"
    role="group"
    aria-label="Prueba de la aceptación"
  >
    <component :is="ICONS.SUCCESS" :size="16" class="ds-banner-icon" />
    <dl class="ds-detail-grid ds-flex-fill">
      <div>
        <dt class="ds-label">Quién aceptó</dt>
        <dd class="valor">{{ quote.acceptedByEmail || 'No consta' }}</dd>
      </div>
      <div>
        <dt class="ds-label">Cuándo</dt>
        <dd class="valor">{{ formatDateTime(quote.acceptedAt) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Desde qué IP</dt>
        <dd class="valor">
          {{ quote.acceptedIp || 'No consta' }}
          <span class="ds-meta">· la registra el servidor, no el cliente</span>
        </dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.prueba {
  align-items: flex-start;
}

.valor {
  margin: var(--space-4) 0 0;
}
</style>
