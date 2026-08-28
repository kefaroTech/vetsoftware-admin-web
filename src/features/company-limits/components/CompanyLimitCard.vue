<script setup lang="ts">
import CapacityMeter from '@/components/ui/CapacityMeter.vue'
import ProvenanceLine from '@/components/ui/ProvenanceLine.vue'
import { ICONS } from '@/constants/icons'
import { LIMIT_SOURCE_LABEL } from '../composables/companyLimitsText'
import type { CompanyLimitRow } from '../types/company-limits.types'

/**
 * <b>Un cupo de la empresa</b>: cuánto lleva usado, cuál es su techo, de dónde
 * sale ese techo y qué pasa al agotarlo.
 *
 * <p><b>Los cuatro huecos honestos de esta tarjeta</b>, que son la mitad de su
 * valor (R14 · un hueco honesto antes que un dato inventado):
 *
 * <ol>
 *   <li><b>Sin consumo conocido no hay medidor.</b> `CapacityMeter` lee un `used`
 *       nulo como cero —es su contrato y está bien para las nueve pantallas que lo
 *       usan—, pero aquí «no lo sé» y «cero» son dos respuestas distintas y solo
 *       una es cierta. Cuando el servidor no manda consumo, esta tarjeta escribe
 *       que no se conoce y no pinta barra.</li>
 *   <li><b>Sin techo declarado tampoco hay barra</b>, y de eso ya se encarga el
 *       propio medidor: una barra al 100 % sobre un techo inexistente es un cupo
 *       agotado que nadie tiene.</li>
 *   <li><b>Sin origen no hay línea de procedencia.</b> Un eje cuyo techo efectivo
 *       no llegó —o que el servidor declara `NONE`— se queda sin `ProvenanceLine`
 *       y lo dice con palabras. Pintar «Valor de fábrica» ahí afirmaría que
 *       alguien decidió ese cupo.</li>
 *   <li><b>Estar por encima del techo no es un error</b> y se dice como tal: el
 *       cliente conserva lo suyo y no puede crear más.</li>
 * </ol>
 *
 * <p><b>El botón de corregir nombra el eje.</b> «Corregir» a secas en una pantalla
 * con cinco tarjetas iguales no dice cuál (R04 · el nombre accesible lleva el
 * sujeto de la fila).
 */
defineProps<{
  row: CompanyLimitRow
  /** `false` mientras alguna corrección esté en vuelo. */
  busy?: boolean
}>()

defineEmits<{ adjust: [row: CompanyLimitRow] }>()
</script>

<template>
  <article class="ds-card ds-stack ds-stack--10">
    <!-- 1 · El medidor, solo cuando hay consumo que medir. -->
    <CapacityMeter
      v-if="row.used !== null"
      :label="row.title"
      :used="row.used"
      :limit="row.limit"
      :unit="row.noun"
      :exhausted="row.exhausted"
      :exhausted-message="`Se agotó el cupo de ${row.noun}. La empresa no puede añadir más hasta que se amplíe la cantidad contratada. Lo que ya tiene sigue funcionando.`"
    />

    <!-- 2 · El hueco honesto: hay eje, pero el servidor no manda consumo. -->
    <div v-else class="ds-stack ds-stack--8">
      <p class="ds-label">{{ row.title }}</p>
      <p class="ds-meta">
        No se conoce el consumo de este eje. No es cero: es que el servidor no lo ha calculado
        todavía.
      </p>
    </div>

    <!-- 3 · De dónde sale el techo. -->
    <ProvenanceLine
      v-if="row.provenance"
      :source="row.provenance"
      :detail="row.effective ? LIMIT_SOURCE_LABEL[row.effective.source] : null"
      explain
    />
    <p v-else class="ds-meta">
      {{
        row.effective
          ? LIMIT_SOURCE_LABEL[row.effective.source]
          : 'No se pudo leer de dónde sale este techo.'
      }}
    </p>

    <!-- 4 · Por encima del techo, que está permitido. -->
    <div
      v-if="row.overLimit"
      class="ds-banner ds-banner--warning ds-banner--sm ds-banner--flush"
      role="status"
    >
      <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ row.overLimit }}</span>
    </div>

    <div class="ds-actions ds-actions--start">
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--sm"
        :disabled="busy"
        :aria-label="`Corregir el contador de ${row.noun}`"
        @click="$emit('adjust', row)"
      >
        <component :is="ICONS.EDIT" :size="14" />
        Corregir el contador
      </button>
    </div>
  </article>
</template>
