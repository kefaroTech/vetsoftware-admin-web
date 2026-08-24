<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_VARIANT, type QuoteStatus } from '../types/quotes.types'

/**
 * El estado SIEMPRE con su rótulo textual, nunca un punto de color (WCAG 2.2 §1.4.1). Los cuatro
 * tonos de `AppBadge` salen de `tokens.css` y están medidos contra §1.4.3: aquí no se inventa uno.
 */
defineProps<{ status: QuoteStatus }>()
</script>

<template>
  <AppBadge :label="QUOTE_STATUS_LABEL[status]" :variant="QUOTE_STATUS_VARIANT[status]" />
</template>
