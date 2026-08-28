<script setup lang="ts">
import { computed } from 'vue'
import VerdictLine from './VerdictLine.vue'
import { settlementCountVerdict } from '../composables/reconciliationVerdict'
import type { GatewaySettlementReconciliationResponse } from '../types/reconciliation.types'

/**
 * La celda de «la cuenta» de un lote, con sus tres estados posibles.
 *
 * <p>Existe como componente por una razón concreta y no por gusto: el veredicto
 * se saca de un mapa indexado por id de liquidación, y con
 * `noUncheckedIndexedAccess` ese acceso vale `T | undefined`. Resolverlo en la
 * plantilla del panel obliga a un `!` por celda —que la puerta de lint rechaza,
 * y con razón: un `!` aquí es exactamente la afirmación que no se puede hacer,
 * porque la cuenta puede no haber llegado todavía—. Con una prop opcional, la
 * distinción entre «todavía no ha llegado», «no se pudo pedir» y «esto es lo que
 * dice» la hace el tipo.
 *
 * <p><b>«Contrastando…» no es lo mismo que «cuadra».</b> Una celda vacía mientras
 * la cuenta viaja se lee como conforme, y ese es justo el pago perdido que nadie
 * reclama.
 */
const props = defineProps<{
  count?: GatewaySettlementReconciliationResponse
  error?: string
  /** `true` añade la frase que explica el veredicto. En una tabla, nunca. */
  explain?: boolean
}>()

const verdict = computed(() => (props.count ? settlementCountVerdict(props.count) : null))
</script>

<template>
  <VerdictLine v-if="verdict" :verdict="verdict" :explain="explain" />
  <span v-else-if="error" class="ds-meta">No se pudo contrastar la cuenta de este lote.</span>
  <span v-else class="ds-meta">Contrastando…</span>
</template>
