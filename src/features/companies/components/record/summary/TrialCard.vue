<script setup lang="ts">
import { computed } from 'vue'
import { formatDate, parseISODate } from '@/composables/format'
import { companyRecordTabTarget } from '@/router/routes/companies.routes'
import type { SubscriptionResponse } from '@/features/subscriptions-admin/types/subscriptions-admin.types'
import SummaryCard from '../SummaryCard.vue'
import CardState from './CardState.vue'
import { TRIAL_ITEMS_GAP } from '../../../composables/companySummaryText'

/**
 * <b>Ventana de prueba</b> — la cuarta tarjeta de §I2.
 *
 * <p>`trialEndDate` es real y es lo único que hay: dice cuándo se cierra —o se
 * cerró— la ventana. Cuántos artículos se probaron y cuántos se convirtieron
 * necesita las líneas del contrato, que son de la pantalla C2/I5, así que aquí se
 * nombra la pestaña donde estarán en vez de contarlos mal.
 *
 * <p><b>Un `trialEndDate` nulo no es «cerrada»</b>, es «no hubo prueba», y se
 * dicen distinto: un contrato firmado directamente y uno cuya prueba terminó
 * ayer son dos situaciones comerciales opuestas.
 *
 * <p>La comparación es contra medianoche de hoy y no contra el instante actual:
 * una ventana que termina «hoy» sigue abierta hoy.
 */
const props = defineProps<{
  subscription: SubscriptionResponse | null
  hasNoContract: boolean
  loading: boolean
  error: string | null
  companyId: number
}>()

const to = computed(() => companyRecordTabTarget('prueba', props.companyId))

const estado = computed(() => {
  const fin = parseISODate(props.subscription?.trialEndDate)
  if (!fin) return null
  const hoy = new Date()
  const medianoche = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const abierta = fin.getTime() >= medianoche.getTime()
  return abierta
    ? `Abierta hasta el ${formatDate(props.subscription?.trialEndDate)}`
    : `Cerrada el ${formatDate(props.subscription?.trialEndDate)}`
})
</script>

<template>
  <SummaryCard title="Ventana de prueba" :to="to" :link-label="to ? 'Ver la prueba' : undefined">
    <CardState :loading="loading" :error="error">
      <p v-if="hasNoContract" class="parrafo">Sin contrato no hay ventana de prueba que enseñar.</p>

      <template v-else-if="subscription">
        <p v-if="estado" class="ds-text-strong parrafo">{{ estado }}</p>
        <p v-else class="parrafo">Este contrato no tuvo ventana de prueba.</p>
        <p class="ds-meta parrafo">{{ TRIAL_ITEMS_GAP }}</p>
      </template>
    </CardState>
  </SummaryCard>
</template>

<style scoped>
.parrafo {
  margin: 0;
}
</style>
