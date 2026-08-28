<script setup lang="ts">
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-vue-next'
import { BILLING_CYCLE_OPTIONS } from '../types/commercial-catalog.types'
import { coverageSummary, type PriceListCoverage } from '../composables/priceListCoverage'

/**
 * La cobertura de una tarifa: qué artículos activos se quedan sin precio.
 *
 * <p><b>Nombra los que faltan, no solo cuántos.</b> «Faltan 3 precios» obliga a
 * cruzar dos tablas con el dedo; la lista con el código y el nombre se puede
 * arreglar sin salir de la pantalla, que es la diferencia entre un aviso que se
 * atiende y uno que se cierra.
 *
 * <p><b>El artículo del núcleo va aparte y con su consecuencia escrita.</b> Que
 * falte el precio de un extra deja una cotización rota; que falte el del núcleo
 * <b>impide que ninguna empresa se registre</b>, porque el alta cotiza el núcleo.
 * Son dos gravedades distintas y una lista sola las iguala.
 *
 * <p>El hueco de ciclo —precio mensual sí, anual no— se cuenta como información y
 * no como defecto: no tener precio anual puede ser una decisión comercial, y
 * pintarla en rojo enseñaría a ignorar el rojo.
 */
defineProps<{
  coverage: PriceListCoverage
  loading?: boolean
  error?: string | null
  traceId?: string | null
  /** `true` mientras la tarifa sigue siendo un borrador y se puede arreglar. */
  editable?: boolean
}>()

const emit = defineEmits<{ retry: [] }>()

const cycleLabel = (value: string) =>
  BILLING_CYCLE_OPTIONS.find((option) => option.value === value)?.label ?? value
</script>

<template>
  <section class="ds-card ds-stack ds-stack--10 caja" aria-labelledby="cobertura-titulo">
    <h3 id="cobertura-titulo" class="ds-label">Cobertura de la tarifa</h3>

    <div v-if="error" class="ds-banner ds-banner--error" role="alert">
      <CircleAlert :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ error }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="emit('retry')">
        Reintentar
      </button>
    </div>
    <p v-if="error && traceId" class="ds-meta">Traza: {{ traceId }}</p>

    <p v-else-if="loading" class="ds-meta">Comprobando qué artículos se quedan sin precio…</p>

    <template v-else>
      <p
        class="ds-banner ds-banner--sm"
        :class="
          coverage.coreGaps.length > 0
            ? 'ds-banner--error'
            : coverage.complete
              ? 'ds-banner--success'
              : 'ds-banner--warning'
        "
        role="status"
      >
        <component
          :is="
            coverage.complete
              ? CircleCheck
              : coverage.coreGaps.length > 0
                ? CircleAlert
                : TriangleAlert
          "
          :size="15"
          class="ds-banner-icon"
        />
        <span class="ds-flex-fill">{{ coverageSummary(coverage) }}</span>
      </p>

      <div v-if="coverage.gaps.length > 0" class="ds-stack ds-stack--8">
        <p class="ds-meta">Artículos activos sin precio en esta lista:</p>
        <ul class="ds-stack ds-stack--8 ds-list-reset">
          <li v-for="gap in coverage.gaps" :key="gap.item.id" class="ds-meta">
            <span class="ds-text-strong">{{ gap.item.name }}</span>
            ({{ gap.item.code }})
            <strong v-if="gap.core"> · es del núcleo: sin su precio no hay altas</strong>
          </li>
        </ul>
        <p v-if="editable" class="ds-meta">
          Se arregla desde «Agregar precio», aquí mismo, mientras la lista siga siendo un borrador.
        </p>
      </div>

      <div v-if="coverage.cycleGaps.length > 0" class="ds-stack ds-stack--8">
        <p class="ds-meta">
          Con precio en un solo ciclo. No bloquea —puede ser deliberado— pero cotizar el ciclo que
          falta será rechazado:
        </p>
        <ul class="ds-stack ds-stack--8 ds-list-reset">
          <li v-for="gap in coverage.cycleGaps" :key="gap.item.id" class="ds-meta">
            <span class="ds-text-strong">{{ gap.item.name }}</span>
            ({{ gap.item.code }}) · tiene {{ cycleLabel(gap.has).toLowerCase() }}, le falta
            {{ cycleLabel(gap.missing).toLowerCase() }}
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* Lo único propio: el relleno de la caja, que `.ds-card` deja a cada consumidor.
   El resto sale de primitivas ya medidas. */
.caja {
  padding: var(--space-16);
}
</style>
