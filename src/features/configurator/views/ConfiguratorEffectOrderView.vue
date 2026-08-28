<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ListOrdered, RotateCcw, Save, TriangleAlert } from 'lucide-vue-next'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import EffectOrderList from '../components/EffectOrderList.vue'
import { useConfiguratorEditor } from '../composables/useConfiguratorEditor'
import { useEffectOrder } from '../composables/useEffectOrder'
import { useConfiguratorStore } from '../stores/configurator.store'
import { catalogItemLabel, describeEffect } from '../composables/effect-sentence'

/**
 * El orden de los efectos — `/configurador/orden`.
 *
 * ── Por qué esto es una pantalla y no una columna ─────────────────────────
 *
 * El backend aplica los efectos en orden ascendente de `priority` y el último
 * que toca un artículo manda. La consola **ya tipaba `priority` y no lo leía
 * nadie**: la lista del cuestionario salía en el orden en que llegaran las filas.
 * Con eso, un efecto que añade Inventario porque el prospecto «vende productos»
 * y otro que lo quita porque hace «solo estética» dejan sin Inventario a quien
 * marque las dos cosas — y marcar más servicios acaba produciendo un carrito más
 * pequeño, que nadie configuró a propósito.
 *
 * <p>El orden es una propiedad **del conjunto**, no de cada efecto: no cabe como
 * columna dentro de las tarjetas por pregunta, donde los efectos aparecen
 * repartidos por disparador y nunca en la sucesión en que se ejecutan. Aquí se
 * ven todos, seguidos, en el orden real, y se corrigen sin borrar y recrear —
 * que era la única salida antes de que existiera
 * `PUT /configurator/effects/priorities`.
 *
 * <p><b>Se recarga al abrir</b>, como el resto de la consola: reordenar sobre una
 * foto vieja escribe prioridades calculadas contra efectos que ya no están.
 */
const store = useConfiguratorStore()
const { loadAll, loading, error, errorTraceId } = useConfiguratorEditor()
const {
  ordered,
  conflicts,
  conflictedIds,
  losingConflicts,
  dirty,
  canReorder,
  truncated,
  catalogItemById,
  move,
  reset,
  save,
} = useEffectOrder()

const context = computed(() => ({
  optionById: store.optionById,
  questionById: store.questionById,
  catalogItemById: store.catalogItemById,
}))

const effectCount = computed(() =>
  ordered.value.length === 1 ? '1 efecto' : `${ordered.value.length} efectos`,
)

/**
 * El aviso que da nombre a la pantalla, con el artículo y el efecto que gana
 * dentro. Un «hay conflictos» a secas obliga a buscarlos a ojo por una lista de
 * decenas de filas, que es como se acaba no mirando ninguno.
 */
const losingMessages = computed(() =>
  losingConflicts.value.map((conflict) => ({
    id: conflict.catalogItemId,
    text: `${catalogItemLabel(conflict.catalogItemId, catalogItemById.value)} sale del carrito: gana «${describeEffect(conflict.winner, context.value)}», que hoy se aplica el último.`,
  })),
)

onMounted(loadAll)
</script>

<template>
  <div class="ds-stack ds-stack--18">
    <section class="ds-stack ds-stack--14" aria-labelledby="orden-titulo">
      <div class="ds-block-head">
        <div class="ds-stack ds-stack--8">
          <h2 id="orden-titulo" class="ds-title">El orden de aplicación</h2>
          <p class="ds-meta">
            {{ effectCount }}, en el orden exacto en que el servidor los aplica: prioridad
            ascendente y, a igualdad, el identificador. El último que toca un artículo es el que
            manda.
          </p>
        </div>
        <div class="ds-flex-row ds-flex-row--6">
          <button type="button" class="ds-btn ds-btn--ghost" :disabled="loading" @click="loadAll">
            <component :is="ICONS.RETRY" :size="15" />
            Actualizar
          </button>
          <button type="button" class="ds-btn ds-btn--ghost" :disabled="!dirty" @click="reset">
            <RotateCcw :size="15" />
            Descartar los cambios
          </button>
          <button type="button" class="ds-btn ds-btn--primary" :disabled="!dirty" @click="save">
            <Save :size="15" />
            Guardar el orden
          </button>
        </div>
      </div>

      <!-- Estado del reordenamiento para lector de pantalla: mover una fila
           desplaza el foco con ella y el botón vuelve a leerse igual, así que sin
           esto el movimiento no se anuncia (WCAG 2.2 §4.1.3). -->
      <p class="ds-sr-only" role="status">
        {{ dirty ? 'Orden modificado y sin guardar.' : 'Orden guardado.' }}
      </p>

      <div v-if="error" class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="loadAll">
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="error && errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>

      <p v-if="truncated" class="ds-banner ds-banner--warning" role="status">
        <TriangleAlert :size="16" class="ds-banner-icon" />
        <span>
          Hay más efectos de los que esta pantalla trae de una vez, así que el orden
          <strong>no se puede guardar</strong>: renumerar una lista incompleta escribiría
          prioridades calculadas sobre filas que no se ven. Se puede mirar, no cambiar.
        </span>
      </p>

      <div v-if="losingMessages.length > 0" class="ds-banner ds-banner--warning" role="status">
        <TriangleAlert :size="16" class="ds-banner-icon" />
        <div class="ds-stack ds-stack--8 ds-flex-fill">
          <p class="ds-text-strong">
            Con el orden de hoy, marcar más servicios deja un carrito más pequeño.
          </p>
          <ul class="ds-stack ds-stack--8 ds-list-reset">
            <li v-for="message in losingMessages" :key="message.id">{{ message.text }}</li>
          </ul>
          <p>
            Si eso no es lo que se quiere, sube el efecto que añade el artículo por encima del que
            lo quita. Este aviso señala la disputa <strong>posible</strong>: si los dos disparadores
            llegan a cumplirse a la vez es cosa del cuestionario, y eso se comprueba en «Probarlo».
          </p>
        </div>
      </div>

      <p v-if="loading && ordered.length === 0" class="ds-meta">Cargando los efectos…</p>

      <AppEmptyState
        v-else-if="!error && ordered.length === 0"
        title="No hay efectos que ordenar"
        :icon="ListOrdered"
        description="Sin efectos, ninguna respuesta mete nada en el carrito y el orden no decide nada. Los efectos se crean desde «Editar el cuestionario», colgando de una respuesta o de una pregunta numérica."
      />

      <EffectOrderList
        v-else
        :effects="ordered"
        :context="context"
        :conflicted-ids="conflictedIds"
        :reorderable="canReorder"
        @move="move"
      />

      <p v-if="conflicts.length > 0" class="ds-meta">
        {{ conflicts.length === 1 ? '1 artículo' : `${conflicts.length} artículos` }} con más de un
        efecto encima. El orden es lo único que decide cuál manda.
      </p>
    </section>
  </div>
</template>
