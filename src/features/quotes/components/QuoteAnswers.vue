<script setup lang="ts">
import { ICONS } from '@/constants/icons'
import type { QuoteAnswerResponse } from '../types/quotes.types'

/**
 * «Por qué se cotizó esto» — las respuestas del configurador que produjeron la oferta.
 *
 * <p>No es accesorio. Es la única forma de responder «¿por qué le vendimos esto?» seis meses
 * después, cuando el comercial que cotizó ya no está. Por eso se pinta como pares
 * pregunta/respuesta legibles y **no** como `questionId: 12, optionId: 47`.
 *
 * <p>El `<dl>` es deliberado: son hechos del documento, no campos. `questionCode` es lo único que
 * el DTO trae del enunciado — el texto completo de la pregunta vive en el configurador y pedirlo
 * por cada respuesta serían N llamadas para adornar un documento cerrado.
 */
defineProps<{ answers: QuoteAnswerResponse[] }>()
</script>

<template>
  <dl v-if="answers.length > 0" class="ds-detail-grid">
    <div v-for="answer in answers" :key="answer.id" class="par">
      <dt class="ds-label">{{ answer.questionCode }}</dt>
      <dd class="valor">{{ answer.answerValue || '—' }}</dd>
    </div>
  </dl>
  <p v-else class="ds-empty ds-empty--boxed">
    <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
    Esta cotización se armó a mano, sin pasar por el configurador. No hay respuestas que mostrar.
  </p>
</template>

<style scoped>
.par {
  min-width: 0;
}

.valor {
  margin: var(--space-4) 0 0;
}
</style>
