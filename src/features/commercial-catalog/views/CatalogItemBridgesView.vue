<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ICONS } from '@/constants/icons'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { formatDate } from '@/composables/format'
import BundleComponentsPanel from '../components/BundleComponentsPanel.vue'
import CatalogItemDependenciesPanel from '../components/CatalogItemDependenciesPanel.vue'
import CatalogItemLimitsPanel from '../components/CatalogItemLimitsPanel.vue'
import CatalogItemSubModulesPanel from '../components/CatalogItemSubModulesPanel.vue'
import { useCatalogItemBridges } from '../composables/useCatalogItemBridges'
import {
  CAPACITY_UNIT_OPTIONS,
  CATALOG_ITEM_STATUS_OPTIONS,
  ITEM_TYPE_OPTIONS,
} from '../types/commercial-catalog.types'

/**
 * Los tres puentes de un artículo del catálogo — §4.1, tarea W3-A.
 *
 * ── Por qué es una sub-vista con ruta propia y no tres modales ─────────────
 *
 * Cuatro razones, y la primera basta:
 *
 * 1. **El paso 2 de la puesta en marcha necesita un destino.** La lista de §3.7
 *    marca «Cada artículo MODULE activo tiene sus submódulos puenteados» como
 *    pendiente y cada paso es **un enlace al sitio donde se hace**. Un modal no
 *    tiene URL: no se puede enlazar, y el paso se quedaría diciendo qué falta
 *    sin poder llevar a nadie a arreglarlo.
 * 2. **Enlace profundo.** «Mira los puentes del artículo 7» se pega en un
 *    ticket. Un modal obliga a describir la ruta de clics.
 * 3. **Presupuesto de SFC.** `css-budget` fija 500 líneas y 0 infractores.
 *    `CommercialCatalogView.vue` ya era el único que lo pasaba (715 líneas);
 *    meterle tres editores dentro lo habría duplicado.
 * 4. **Los tres bloques se leen juntos.** Qué abre, qué exige y qué trae son
 *    tres respuestas sobre el mismo artículo, y decidir una mirando las otras
 *    es lo normal. Tres modales las separan; una página las pone a la vez.
 *
 * ── Y por qué los formularios de dentro SÍ son modales ────────────────────
 *
 * Crear una regla o cambiar una cantidad es una tarea corta sobre una fila
 * concreta, con vuelta inmediata a la tabla que se estaba mirando. Es el mismo
 * patrón que ya usan las tres tablas de `/catalogo-comercial`, y darle ruta
 * propia a cada alta sería inventar seis pantallas para seis formularios de dos
 * campos.
 *
 * ── Los datos del artículo son hechos, no un formulario ───────────────────
 *
 * Van en un `<dl>` sobre `ds-detail-grid` y **no** en `<input disabled>`: no se
 * editan aquí, y un campo apagado dice «esto se podría escribir» sobre algo que
 * no se escribe. Para cambiarlos está «Editar artículo» en el catálogo.
 */
const route = useRoute()

const { item, itemLoading, itemError, itemErrorTraceId, isBundle, loadAll } =
  useCatalogItemBridges()

const itemId = computed(() => Number(route.params.id))

const typeLabel = computed(
  () => ITEM_TYPE_OPTIONS.find((option) => option.value === item.value?.itemType)?.label ?? '—',
)

const capacityLabel = computed(() => {
  if (!item.value?.capacityUnit) return 'No aplica'
  return (
    CAPACITY_UNIT_OPTIONS.find((option) => option.value === item.value?.capacityUnit)?.label ?? '—'
  )
})

const statusLabel = computed(() => {
  if (!item.value) return '—'
  if (!item.value.enabled) return 'Deshabilitado'
  return (
    CATALOG_ITEM_STATUS_OPTIONS.find((option) => option.value === item.value?.status)?.label ?? '—'
  )
})

const statusVariant = computed<'success' | 'warning' | 'neutral'>(() => {
  if (!item.value || !item.value.enabled) return 'warning'
  if (item.value.status === 'ACTIVE') return 'success'
  return item.value.status === 'DRAFT' ? 'neutral' : 'warning'
})

async function reload() {
  if (Number.isNaN(itemId.value)) return
  await loadAll(itemId.value)
}

onMounted(reload)
// Navegar de un artículo a otro sin desmontar la vista (desde un enlace de la
// tabla de reglas) tiene que recargar: si no, se verían los puentes del anterior.
watch(itemId, reload)
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <div class="ds-stack ds-stack--8">
        <p class="eyebrow ds-meta">
          <RouterLink to="/catalogo-comercial" class="volver">
            <component :is="ICONS.BACK" :size="14" aria-hidden="true" />
            Catálogo comercial
          </RouterLink>
        </p>
        <h1 class="ds-title">{{ item?.name ?? 'Artículo del catálogo' }}</h1>
      </div>
      <AppBadge v-if="item" :variant="statusVariant" :label="statusLabel" />
    </div>

    <div v-if="itemError" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">
        {{ itemError }}
        <span v-if="itemErrorTraceId" class="ds-meta">Traza: {{ itemErrorTraceId }}</span>
      </span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="reload">
        <component :is="ICONS.RETRY" :size="14" aria-hidden="true" />
        Reintentar
      </button>
    </div>

    <p v-else-if="itemLoading && !item" class="ds-meta">Cargando el artículo…</p>

    <div v-else-if="item" class="ds-stack ds-stack--18 cuerpo">
      <!-- Hechos, no formulario: se leen, no se escriben (§ «Datos que son hechos»). -->
      <section class="ds-card ficha">
        <dl class="ds-detail-grid">
          <div class="par">
            <dt class="ds-label">Código</dt>
            <dd class="valor ds-text-strong">{{ item.code }}</dd>
          </div>
          <div class="par">
            <dt class="ds-label">Tipo</dt>
            <dd class="valor">{{ typeLabel }}</dd>
          </div>
          <div class="par">
            <dt class="ds-label">Capacidad</dt>
            <dd class="valor">{{ capacityLabel }}</dd>
          </div>
          <div class="par">
            <dt class="ds-label">Núcleo</dt>
            <dd class="valor">{{ item.core ? 'Sí' : 'No' }}</dd>
          </div>
          <div class="par">
            <dt class="ds-label">Cantidad</dt>
            <dd class="valor">{{ item.minQuantity }} — {{ item.maxQuantity ?? 'sin tope' }}</dd>
          </div>
          <div class="par">
            <dt class="ds-label">Alta</dt>
            <dd class="valor">{{ formatDate(item.createdDate) }}</dd>
          </div>
        </dl>
        <p v-if="item.shortDescription" class="ds-meta descripcion">{{ item.shortDescription }}</p>
      </section>

      <CatalogItemSubModulesPanel :item-id="item.id" :item-name="item.name" />
      <!-- Cuarta pregunta sobre el mismo artículo, y de la misma familia que las
           otras tres: qué abre, qué exige, qué trae y **cuánto cupo concede**. Un
           artículo que se vende y no concede nada se cobra sin ampliar nada, que
           es el mismo defecto que un MODULE sin submódulos puenteados. -->
      <CatalogItemLimitsPanel :item-id="item.id" :item-name="item.name" />
      <CatalogItemDependenciesPanel :item-id="item.id" :item-name="item.name" />
      <BundleComponentsPanel v-if="isBundle" :bundle-item-id="item.id" :item-name="item.name" />
    </div>
  </AppLayout>
</template>

<style scoped>
.eyebrow {
  margin: 0;
}

.volver {
  display: inline-flex;
  align-items: center;
  gap: var(--space-6);
}

.cuerpo {
  min-width: 0;
}

.ficha {
  padding: var(--space-16);
}

.par {
  min-width: 0;
}

.valor {
  margin: 0;
  color: var(--text);
}

.descripcion {
  margin: var(--space-12) 0 0;
  max-width: 72ch;
}
</style>
