<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, TriangleAlert } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import { describeEffect, type EffectSentenceContext } from '../composables/effect-sentence'
import type { ConfiguratorEffectResponse } from '../types/configurator.types'

/**
 * La lista reordenable de efectos, con su posición y su choque.
 *
 * <p><b>Botones, no arrastrar.</b> Arrastrar y soltar es la primera idea y la
 * peor aquí: no tiene equivalente de teclado sin reimplementar el patrón
 * completo, y WCAG 2.2 §2.5.7 (<i>Dragging Movements</i>, AA) exige que toda
 * acción de arrastre tenga una alternativa de un solo puntero. Dos botones por
 * fila son esa alternativa **y** el camino de teclado, sin nada que añadir.
 *
 * <p><b>El movimiento se anuncia.</b> Reordenar con el teclado mueve el foco con
 * la fila, así que un lector de pantalla vuelve a leer el botón y no dice qué
 * pasó. La región `role="status"` de la vista lo cuenta; aquí cada botón lleva
 * su nombre accesible con el sujeto dentro («Subir: si responde “vendo
 * productos”…»), que es lo que pide R04.
 *
 * <p><b>La posición se pinta.</b> Un orden que solo existe como sucesión visual
 * no se puede leer por teléfono ni citar en un ticket: la columna del ordinal
 * está siempre, y el aviso de choque lleva texto además del tono.
 */
const props = defineProps<{
  effects: ConfiguratorEffectResponse[]
  context: EffectSentenceContext
  /** Ids de los efectos que se disputan un artículo con otro. */
  conflictedIds: Set<number>
  /** `false` deja la lista en solo lectura y explica por qué desde la vista. */
  reorderable: boolean
}>()

const emit = defineEmits<{ move: [index: number, delta: -1 | 1] }>()

const rows = computed(() =>
  props.effects.map((effect, index) => ({
    effect,
    index,
    position: index + 1,
    sentence: describeEffect(effect, props.context),
    conflicted: props.conflictedIds.has(effect.id),
    first: index === 0,
    last: index === props.effects.length - 1,
  })),
)
</script>

<template>
  <ol class="ds-stack ds-stack--8 ds-list-reset">
    <li v-for="row in rows" :key="row.effect.id" class="ds-card ds-card--flat fila">
      <span class="ds-num orden" aria-hidden="true">{{ row.position }}</span>

      <div class="ds-stack ds-stack--8 ds-flex-fill">
        <p class="frase">
          <span class="ds-sr-only">Posición {{ row.position }} de {{ rows.length }}. </span>
          {{ row.sentence }}
        </p>
        <p class="ds-meta">
          Prioridad guardada: {{ row.effect.priority }}
          <span v-if="!row.effect.enabled"> · dado de baja, no se aplica</span>
        </p>
        <div v-if="row.conflicted">
          <AppBadge variant="warning" label="Se disputa este artículo con otro efecto" />
        </div>
      </div>

      <div class="ds-actions ds-actions--start">
        <button
          type="button"
          class="ds-icon-btn"
          :disabled="!reorderable || row.first"
          :aria-label="`Subir: ${row.sentence}`"
          @click="emit('move', row.index, -1)"
        >
          <ArrowUp :size="15" />
        </button>
        <button
          type="button"
          class="ds-icon-btn"
          :disabled="!reorderable || row.last"
          :aria-label="`Bajar: ${row.sentence}`"
          @click="emit('move', row.index, 1)"
        >
          <ArrowDown :size="15" />
        </button>
      </div>
    </li>

    <li v-if="rows.length === 0" class="ds-meta">
      <TriangleAlert :size="15" class="ds-banner-icon" aria-hidden="true" />
      No hay efectos que ordenar.
    </li>
  </ol>
</template>

<style scoped>
/* La lista consume `.ds-list-reset` (primitives.css:748) en vez de reescribir
   sus tres declaraciones: eso es justo lo que rechaza
   `vetsoftware/no-duplicate-primitive`. Aquí solo va la geometría de la fila,
   que no existe como primitiva. */
.fila {
  display: flex;
  gap: var(--space-12);
  align-items: flex-start;
}

/* `.ds-num` ya alinea a la derecha con cifras tabulares; lo único que aquí no
   existe como primitiva es el ancho fijo de la columna del ordinal, que es lo
   que mantiene las frases alineadas al pasar de 9 a 10. */
.orden {
  min-width: var(--space-24);
  color: var(--text-muted);
  font-weight: var(--weight-semibold);
}

.frase {
  margin: 0;
  color: var(--text);
  font-size: var(--text-body);
}
</style>
