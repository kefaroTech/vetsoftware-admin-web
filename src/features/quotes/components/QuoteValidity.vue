<script setup lang="ts">
import { computed } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { formatDate } from '@/composables/format'
import { quoteValidity } from '../composables/quoteValidity'

/**
 * `valid_until` en pantalla: la fecha **y** en qué punto de su vigencia está.
 *
 * <p>La fecha sola no responde la pregunta que se hace quien mira el embudo («¿esta oferta todavía
 * vale?»), y obliga a restar mentalmente contra el día de hoy. El distintivo lo dice con palabras
 * —«Vence en 3 días», «Venció hace 12 días»—, así que el tono del badge es refuerzo y no el único
 * portador de la información.
 */
const props = defineProps<{
  validUntil: string
  /** El documento ya está en `EXPIRED`: manda sobre el cálculo de fechas. */
  expired?: boolean
  /** Añade la fecha absoluta delante. La lista la muestra; la cabecera del detalle no. */
  showDate?: boolean
}>()

const validity = computed(() => quoteValidity(props.validUntil, props.expired))
</script>

<template>
  <span class="ds-flex-row ds-flex-row--6">
    <span v-if="showDate">{{ formatDate(validUntil) }}</span>
    <AppBadge :label="validity.label" :variant="validity.variant" />
  </span>
</template>
