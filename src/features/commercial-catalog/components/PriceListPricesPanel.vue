<script setup lang="ts">
import { computed } from 'vue'
import { Pencil, Plus, X } from 'lucide-vue-next'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { formatMoney } from '@/composables/format'
import type { useServerPaged } from '@/composables/useServerPaged'
import type {
  CatalogItemResponse,
  CatalogPriceResponse,
  PriceListResponse,
} from '../types/commercial-catalog.types'

/**
 * Los precios de la tarifa seleccionada, dentro de «Listas y precios».
 *
 * ── Por qué se separó de `PriceListsPanel` ────────────────────────────────
 *
 * Por el mismo techo de `css:budget` que partió la vista: el panel de tarifas
 * con este bloque dentro pasaba de 500 líneas. El corte va por «la tarifa» y
 * «los precios de la tarifa», que son dos tablas con dos ciclos de vida
 * distintos —una lista se publica y se archiva; un precio se agrega y se
 * borra— y solo comparten cuál está seleccionada.
 *
 * ── Presentacional a propósito: recibe el paginador, no lo crea ───────────
 *
 * `useServerPaged` devuelve una **instancia**, no un singleton: llamar aquí a
 * `useCommercialCatalog()` crearía un segundo paginador de `/catalog-prices`
 * que nadie recargaría —`selectPriceList` y `createCatalogPrice` recargan el
 * del padre— y la tabla se quedaría vacía tras cada escritura sin que nada
 * fallara. Por eso el paginador entra por `props` y las acciones salen por
 * `emits`: el dueño del ciclo de vida sigue siendo uno solo.
 */
const props = defineProps<{
  priceList: PriceListResponse
  paged: ReturnType<typeof useServerPaged<CatalogPriceResponse>>
  catalogItems: CatalogItemResponse[]
  /** Solo un borrador admite escritura: publicar congela la lista y sus precios. */
  editable: boolean
}>()

const emit = defineEmits<{
  add: []
  edit: [price: CatalogPriceResponse]
  remove: [price: CatalogPriceResponse]
  retry: []
  close: []
  'update:page': [page: number]
}>()

const catalogItemNames = computed(
  () => new Map(props.catalogItems.map((item) => [item.id, `${item.code} · ${item.name}`])),
)

function billingCycleLabel(value: CatalogPriceResponse['billingCycle']) {
  return value === 'MONTHLY' ? 'Mensual' : 'Anual'
}

function taxTreatmentLabel(value: CatalogPriceResponse['taxTreatment']) {
  return { TAXED: 'Gravado', EXEMPT: 'Exento', EXCLUDED: 'Excluido' }[value]
}

/**
 * La tarifa **sí** declara su divisa (`PriceListResponse.currency`), así que
 * este es uno de los dos únicos sitios del bloque del dinero que la rotula, y la
 * rotula con la de verdad. El `Intl.NumberFormat` propio que vivía aquí era la
 * tercera política de moneda del producto; ahora delega en `formatMoney`, que es
 * la misma que usan los pagos, y la elección entre símbolo y cifra desnuda queda
 * en un solo sitio (`src/composables/format.ts`).
 */
function money(value: number) {
  return formatMoney(value, props.priceList.currency)
}
</script>

<template>
  <div class="prices-card ds-card ds-stack ds-stack--14">
    <div class="prices-head">
      <div>
        <p class="eyebrow ds-meta">Precios de {{ priceList.code }}</p>
        <h2 class="subtitle">{{ priceList.name }}</h2>
        <p v-if="!editable" class="ds-meta">
          Esta lista ya no es un borrador: sus precios son de solo lectura.
        </p>
      </div>
      <div class="ds-actions">
        <button v-if="editable" type="button" class="ds-btn ds-btn--primary" @click="emit('add')">
          <Plus :size="15" />
          Agregar precio
        </button>
        <button
          type="button"
          class="ds-icon-btn"
          aria-label="Cerrar precios"
          @click="emit('close')"
        >
          <X :size="16" />
        </button>
      </div>
    </div>

    <AppTable
      :headers="['Artículo', 'Ciclo', 'Tramo', 'Incluido', 'Precio', 'Impuesto', 'Acciones']"
      :empty="paged.items.value.length === 0"
      :loading="paged.loading.value"
      :error="paged.error.value"
      :trace-id="paged.errorTraceId.value"
      @retry="emit('retry')"
    >
      <template #empty>
        <AppEmptyState
          title="Esta lista aún no tiene precios"
          description="Agrega al menos un precio antes de intentar publicarla."
        >
          <button v-if="editable" type="button" class="ds-btn ds-btn--primary" @click="emit('add')">
            <Plus :size="15" />
            Agregar precio
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="price in paged.items.value" :key="price.id" class="ds-row-hover">
        <td class="ds-text-strong">
          {{ catalogItemNames.get(price.catalogItemId) ?? `Artículo #${price.catalogItemId}` }}
        </td>
        <td>{{ billingCycleLabel(price.billingCycle) }}</td>
        <td>{{ price.tierMin }} — {{ price.tierMax ?? 'en adelante' }}</td>
        <td>{{ price.includedQuantity }}</td>
        <td>
          <span class="ds-text-strong">{{ money(price.unitAmount) }}</span>
          <span v-if="price.setupAmount > 0" class="description ds-meta">
            + {{ money(price.setupAmount) }} inicial
          </span>
        </td>
        <td>{{ taxTreatmentLabel(price.taxTreatment) }} · {{ price.taxRate }} %</td>
        <td>
          <div v-if="editable" class="ds-actions ds-actions--start">
            <button
              type="button"
              class="ds-icon-btn"
              aria-label="Editar precio"
              @click="emit('edit', price)"
            >
              <Pencil :size="15" />
            </button>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar precio"
              @click="emit('remove', price)"
            >
              <X :size="15" />
            </button>
          </div>
          <span v-else class="ds-meta">Solo lectura</span>
        </td>
      </tr>
    </AppTable>
    <AppPagination
      v-if="!paged.error.value && paged.total.value > 0"
      :page="paged.page.value"
      :page-size="paged.pageSize"
      :total="paged.total.value"
      :page-count="paged.pageCount.value"
      @update:page="emit('update:page', $event)"
    />
  </div>
</template>

<style scoped>
.eyebrow {
  margin: 0 0 var(--space-4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.description {
  display: block;
  margin-top: var(--space-2);
}

.prices-card {
  padding: var(--space-16);
}

.prices-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-16);
}

.subtitle {
  margin: 0;
  color: var(--text);
  font-size: var(--text-h3);
}

@media (width <= 680px) {
  .prices-head {
    flex-direction: column;
  }
}
</style>
