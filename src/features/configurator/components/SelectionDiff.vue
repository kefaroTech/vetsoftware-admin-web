<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '@/constants/icons'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'
import { catalogItemLabel } from '../composables/effect-sentence'
import { countChanges, diffSelections } from '../composables/configurator-answers'
import type { SelectedItemResponse } from '../types/configurator.types'

/**
 * «Qué cambió al guardar» — la comparación antes/después.
 *
 * <p><b>Se llama por su nombre.</b> No es una vista previa: el configurador no
 * tiene estado de borrador (§1.3), un `PUT` cambia el cuestionario en vivo para
 * el siguiente prospecto que entre, y no hay forma de previsualizar lo no
 * publicado. Lo que sí se puede hacer, y es lo que hace esta pieza, es resolver
 * un escenario fijo justo antes y justo después de escribir, y enseñar las dos
 * listas. Es previsualización *a posteriori inmediata*, y el encabezado lo dice.
 *
 * <p><b>Cada diferencia lleva la palabra</b> —«AÑADIDO», «QUITADO»,
 * «cantidad: 1 → 3»— y no solo un color de fondo: WCAG 2.2 §1.4.1 no admite el
 * color como único portador, y aquí la información es dinero.
 *
 * <p>`role="status"`: el bloque aparece después de una acción del operador y hay
 * que anunciarlo, pero sin interrumpir ni robar el foco (§5.3).
 */
const props = defineProps<{
  before: SelectedItemResponse[] | null
  after: SelectedItemResponse[] | null
  /** Qué se acaba de escribir: «Guardar el efecto», «Crear la pregunta»… */
  label: string
  /** Contra qué respuestas se comparó. */
  scenario: string
  catalogItemById: Map<number, CatalogItemResponse>
}>()

const rows = computed(() =>
  props.before && props.after ? diffSelections(props.before, props.after) : [],
)
const changes = computed(() => countChanges(rows.value))
const failed = computed(() => !props.before || !props.after)

function itemName(catalogItemId: number) {
  return catalogItemLabel(catalogItemId, props.catalogItemById)
}

function quantity(value: number | null) {
  return value == null ? '—' : `×${String(value)}`
}
</script>

<template>
  <section class="ds-card ds-stack ds-stack--10" role="status" aria-live="polite">
    <div class="ds-stack ds-stack--8">
      <p class="ds-kicker">{{ label }}</p>
      <h2 class="ds-title">Qué cambió al guardar</h2>
      <p class="ds-meta">Resuelto con {{ scenario }}, antes y después de escribir.</p>
    </div>

    <p v-if="failed" class="ds-banner ds-banner--warning">
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
      <span>
        El cambio <strong>sí se guardó</strong>, pero no se pudo calcular la comparación. Abre
        «Probar» y resuelve el escenario a mano para ver cómo queda el carrito.
      </span>
    </p>

    <template v-else>
      <p v-if="changes === 0" class="ds-banner ds-banner--info">
        <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
        <span>
          <strong>Sin diferencias en este escenario.</strong> Eso no significa que el cambio sea
          inocuo: significa que no afecta a estas respuestas. Prueba otro escenario en «Probar».
        </span>
      </p>
      <p v-else class="ds-meta">
        {{ changes === 1 ? '1 diferencia' : `${changes} diferencias` }} sobre
        {{ rows.length === 1 ? '1 artículo' : `${rows.length} artículos` }}.
      </p>

      <div v-if="rows.length > 0" class="ds-table-scroll">
        <table class="ds-table ds-table--dense">
          <thead>
            <tr>
              <th scope="col">Artículo</th>
              <th scope="col" class="ds-num">Antes</th>
              <th scope="col" class="ds-num">Después</th>
              <th scope="col">Cambio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.catalogItemId">
              <td>{{ itemName(row.catalogItemId) }}</td>
              <td class="ds-num">{{ quantity(row.before) }}</td>
              <td class="ds-num">{{ quantity(row.after) }}</td>
              <td>
                <strong v-if="row.change !== 'SAME'">{{ row.changeText }}</strong>
                <span v-else class="ds-meta">sin cambios</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
