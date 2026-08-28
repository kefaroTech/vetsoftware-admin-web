<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { TRIAL_WINDOW_NOT_EXTENDABLE, type TrialWindowState } from '../composables/trialWindowText'
import type { CompanyTrialWindowResponse } from '../types/trials.types'

/**
 * <b>La ventana de prueba, en una tarjeta.</b> Es lo primero de la pestaña porque
 * es lo que decide todo lo demás: sin ventana no hay concesiones que valgan, y su
 * último día es el que marca cuándo hay que llamar al cliente.
 *
 * <p><b>La frase del último día va escrita, no deducida de dos fechas.</b>
 * «Termina el 30» y «se puede trabajar el 30» no son la misma afirmación, y la
 * segunda es la que hace falta. La compone `trialWindowState`, que es donde vive
 * la única comparación de fechas de esta feature.
 *
 * <p><b>No hay «Ampliar», y se explica por qué.</b> Un botón ausente sin
 * explicación se pide por soporte una vez al mes; con la frase delante, la
 * conversación es la correcta desde el principio.
 */
defineProps<{
  window: CompanyTrialWindowResponse
  state: TrialWindowState
  /** `false` cuando el anfitrión es de solo lectura (el expediente del contrato). */
  canClose?: boolean
  closing?: boolean
}>()

defineEmits<{ close: [] }>()
</script>

<template>
  <section class="ds-card ds-stack ds-stack--10" aria-labelledby="ventana-prueba-title">
    <div class="ds-block-head">
      <h2 id="ventana-prueba-title" class="ds-title">Ventana de prueba</h2>
      <AppBadge :variant="state.variant" :label="state.label" />
    </div>

    <dl class="ds-detail-grid">
      <div>
        <dt class="ds-label">Primer día</dt>
        <dd class="valor">{{ formatDate(window.startDate) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Último día, incluido</dt>
        <dd class="valor">{{ formatDate(window.endDate) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Días de ventana</dt>
        <dd class="valor num">{{ window.windowDays }}</dd>
      </div>
      <div>
        <dt class="ds-label">Cotización que la vendió</dt>
        <dd class="valor num">#{{ window.sourceQuoteId }}</dd>
      </div>
      <div v-if="window.closedAt">
        <dt class="ds-label">Cerrada antes de tiempo</dt>
        <dd class="valor">{{ formatDate(window.closedAt) }}</dd>
      </div>
    </dl>

    <!-- Estado presente, no consecuencia de una acción: banner, no toast. -->
    <p class="ds-banner ds-banner--info ds-banner--sm ds-banner--flush" role="note">
      <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ TRIAL_WINDOW_NOT_EXTENDABLE }}</span>
    </p>

    <div v-if="canClose && state.level !== 'cerrada'" class="ds-actions ds-actions--start">
      <button
        type="button"
        class="ds-btn ds-btn--danger"
        :disabled="closing"
        @click="$emit('close')"
      >
        <component :is="ICONS.PAUSE" :size="15" />
        {{ closing ? 'Cerrando…' : 'Cerrar la prueba antes de tiempo' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.valor {
  margin: var(--space-4) 0 0;
}

.num {
  font-variant-numeric: tabular-nums;
}
</style>
