<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Archive, CircleDollarSign, Pencil, Plus, Power, Send } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import CatalogPriceForm from './CatalogPriceForm.vue'
import PriceListForm from './PriceListForm.vue'
import PriceListPricesPanel from './PriceListPricesPanel.vue'
import { useCommercialCatalog } from '../composables/useCommercialCatalog'
import type {
  CatalogPriceResponse,
  CreateCatalogPriceRequest,
  CreatePriceListRequest,
  PriceListResponse,
  UpdateCatalogPriceRequest,
  UpdatePriceListRequest,
} from '../types/commercial-catalog.types'

/**
 * La pestaña «Listas y precios» de `/catalogo-comercial`.
 *
 * ── Por qué es un componente y no parte de la vista ────────────────────────
 *
 * `CommercialCatalogView.vue` era el **único SFC del repositorio por encima del
 * techo de 500 líneas** (715) y por eso `npm run css:budget` estaba en rojo
 * (issue #146). El corte se hizo por la pestaña, que es la costura natural: las
 * dos mitades ya eran excluyentes en el marcado (`v-if` / `v-else`) y no
 * comparten ni un handler. Lo que queda en la vista es lo que la vista es —
 * cabecera, pestañas y la tabla de artículos—; aquí vive el ciclo de vida
 * completo de una tarifa: crearla, ponerle precios, publicarla y archivarla.
 *
 * Nada de este fichero es código nuevo: es el bloque `v-else` de la vista, sus
 * dos modales y sus manejadores, movidos tal cual. La única diferencia de
 * comportamiento es que la lista de tarifas se pide **al abrir la pestaña** en
 * vez de al abrir la pantalla, que es la regla de recargar al abrir; y que si
 * ya había una tarifa seleccionada, al volver se recarga en vez de quedarse con
 * la tabla de precios vacía.
 *
 * <p>La tabla de precios de la tarifa seleccionada se fue a su vez a
 * `PriceListPricesPanel.vue`: con ella dentro, este fichero volvía a pasar de
 * 500 líneas. Este panel sigue siendo el **dueño del ciclo de vida** —el
 * paginador de `/catalog-prices` y los manejadores de alta, edición y borrado
 * viven aquí— y el hijo solo pinta y avisa; ver allí por qué no puede crear su
 * propio paginador.
 */
const {
  priceLists,
  catalogPrices,
  selectedPriceList,
  catalogOptions,
  catalogOptionsLoading,
  catalogOptionsError,
  loadCatalogOptions,
  createPriceList,
  updatePriceList,
  publishPriceList,
  archivePriceList,
  enablePriceList,
  selectPriceList,
  createCatalogPrice,
  updateCatalogPrice,
  removeCatalogPrice,
} = useCommercialCatalog()
const { confirm } = useConfirmDialog()

const priceListModalOpen = ref(false)
const catalogPriceModalOpen = ref(false)
const editingPriceList = ref<PriceListResponse | null>(null)
const editingCatalogPrice = ref<CatalogPriceResponse | null>(null)
const saving = ref(false)
const priceListFormRef = ref<InstanceType<typeof PriceListForm> | null>(null)
const catalogPriceFormRef = ref<InstanceType<typeof CatalogPriceForm> | null>(null)

const selectedListIsDraft = computed(
  () => selectedPriceList.value?.status === 'DRAFT' && selectedPriceList.value.enabled,
)

onMounted(async () => {
  await priceLists.goTo(1)
  if (selectedPriceList.value) await selectPriceList(selectedPriceList.value)
})

useUnsavedChangesGuard(
  () =>
    (priceListModalOpen.value && (priceListFormRef.value?.isDirty() ?? false)) ||
    (catalogPriceModalOpen.value && (catalogPriceFormRef.value?.isDirty() ?? false)),
)

function priceListStatusLabel(priceList: PriceListResponse) {
  if (!priceList.enabled) return 'Deshabilitada'
  return { DRAFT: 'Borrador', PUBLISHED: 'Publicada', ARCHIVED: 'Archivada' }[priceList.status]
}

function priceListStatusVariant(priceList: PriceListResponse): 'success' | 'warning' | 'neutral' {
  if (!priceList.enabled || priceList.status === 'ARCHIVED') return 'warning'
  return priceList.status === 'PUBLISHED' ? 'success' : 'neutral'
}

function openCreatePriceList() {
  editingPriceList.value = null
  priceListModalOpen.value = true
}

function openEditPriceList(priceList: PriceListResponse) {
  editingPriceList.value = priceList
  priceListModalOpen.value = true
}

function closePriceListModal() {
  if (saving.value) return
  priceListModalOpen.value = false
  editingPriceList.value = null
}

async function submitPriceList(data: CreatePriceListRequest | UpdatePriceListRequest) {
  if (saving.value) return
  saving.value = true
  try {
    if (editingPriceList.value) await updatePriceList(editingPriceList.value.id, data)
    else if ('code' in data) await createPriceList(data)
    priceListModalOpen.value = false
    editingPriceList.value = null
  } catch {
    // El composable conserva el modal y muestra el ProblemDetail con su traza.
  } finally {
    saving.value = false
  }
}

async function publishList(priceList: PriceListResponse) {
  const accepted = await confirm({
    message: `¿Publicar la lista "${priceList.name}"?`,
    consequence: 'La lista y sus precios quedarán congelados para preservar lo ofrecido.',
    confirmLabel: 'Publicar lista',
  })
  if (!accepted) return
  try {
    await publishPriceList(priceList.id)
  } catch {
    // El composable ya avisó.
  }
}

async function archiveList(priceList: PriceListResponse) {
  const accepted = await confirm({
    message: `¿Archivar la lista "${priceList.name}"?`,
    consequence: 'Se conservará para trazabilidad, pero dejará de ser una tarifa vigente.',
    confirmLabel: 'Archivar lista',
  })
  if (!accepted) return
  try {
    await archivePriceList(priceList.id)
  } catch {
    // El composable ya avisó.
  }
}

async function activateList(priceList: PriceListResponse) {
  try {
    await enablePriceList(priceList.id)
  } catch {
    // El composable ya avisó.
  }
}

async function managePrices(priceList: PriceListResponse) {
  try {
    await selectPriceList(priceList)
  } catch {
    // Los paneles de error conservan las salidas de reintento.
  }
}

async function closePrices() {
  await selectPriceList(null)
}

async function openCreateCatalogPrice() {
  editingCatalogPrice.value = null
  catalogPriceModalOpen.value = true
  try {
    await loadCatalogOptions()
  } catch {
    // El modal muestra el error persistente y permite reintentar.
  }
}

function openEditCatalogPrice(price: CatalogPriceResponse) {
  editingCatalogPrice.value = price
  catalogPriceModalOpen.value = true
}

function closeCatalogPriceModal() {
  if (saving.value) return
  catalogPriceModalOpen.value = false
  editingCatalogPrice.value = null
}

async function submitCatalogPrice(data: CreateCatalogPriceRequest | UpdateCatalogPriceRequest) {
  if (saving.value) return
  saving.value = true
  try {
    if (editingCatalogPrice.value) await updateCatalogPrice(editingCatalogPrice.value.id, data)
    else if ('priceListId' in data) await createCatalogPrice(data)
    catalogPriceModalOpen.value = false
    editingCatalogPrice.value = null
  } catch {
    // El composable conserva el modal y muestra el ProblemDetail con su traza.
  } finally {
    saving.value = false
  }
}

async function removePrice(price: CatalogPriceResponse) {
  const accepted = await confirm({
    message: '¿Eliminar este precio de la lista?',
    consequence: 'El tramo dejará de estar disponible en este borrador.',
    confirmLabel: 'Eliminar precio',
  })
  if (!accepted) return
  try {
    await removeCatalogPrice(price.id)
  } catch {
    // El composable ya avisó.
  }
}

defineExpose({ openCreatePriceList })
</script>

<template>
  <section class="section ds-stack ds-stack--18">
    <div class="ds-stack ds-stack--14">
      <AppTable
        :headers="['Código', 'Lista', 'Moneda', 'Vigencia', 'Estado', 'Acciones']"
        :empty="priceLists.items.value.length === 0"
        :loading="priceLists.loading.value"
        :error="priceLists.error.value"
        :trace-id="priceLists.errorTraceId.value"
        @retry="priceLists.reload"
      >
        <template #empty>
          <AppEmptyState
            title="Aún no hay listas de precios"
            description="Crea un borrador, agrega sus precios y publícalo cuando esté listo."
          >
            <button type="button" class="ds-btn ds-btn--primary" @click="openCreatePriceList">
              <Plus :size="15" />
              Nueva lista
            </button>
          </AppEmptyState>
        </template>

        <tr v-for="priceList in priceLists.items.value" :key="priceList.id" class="ds-row-hover">
          <td class="ds-text-strong">{{ priceList.code }}</td>
          <td>{{ priceList.name }}</td>
          <td>{{ priceList.currency }}</td>
          <td class="ds-meta">
            {{ priceList.validFrom }} — {{ priceList.validTo ?? 'sin fecha final' }}
          </td>
          <td>
            <AppBadge
              :variant="priceListStatusVariant(priceList)"
              :label="priceListStatusLabel(priceList)"
            />
          </td>
          <td>
            <div class="ds-actions ds-actions--start">
              <button
                type="button"
                class="ds-icon-btn"
                :aria-label="`Gestionar precios de ${priceList.name}`"
                @click="managePrices(priceList)"
              >
                <CircleDollarSign :size="15" />
              </button>
              <button
                v-if="priceList.status === 'DRAFT' && priceList.enabled"
                type="button"
                class="ds-icon-btn"
                :aria-label="`Editar ${priceList.name}`"
                @click="openEditPriceList(priceList)"
              >
                <Pencil :size="15" />
              </button>
              <button
                v-if="priceList.status === 'DRAFT' && priceList.enabled"
                type="button"
                class="ds-icon-btn"
                :aria-label="`Publicar ${priceList.name}`"
                @click="publishList(priceList)"
              >
                <Send :size="15" />
              </button>
              <button
                v-if="priceList.status === 'PUBLISHED' && priceList.enabled"
                type="button"
                class="ds-icon-btn"
                :aria-label="`Archivar ${priceList.name}`"
                @click="archiveList(priceList)"
              >
                <Archive :size="15" />
              </button>
              <button
                v-if="!priceList.enabled"
                type="button"
                class="ds-icon-btn"
                :aria-label="`Activar ${priceList.name}`"
                @click="activateList(priceList)"
              >
                <Power :size="15" />
              </button>
            </div>
          </td>
        </tr>
      </AppTable>
      <AppPagination
        v-if="!priceLists.loading.value && !priceLists.error.value && priceLists.total.value > 0"
        :page="priceLists.page.value"
        :page-size="priceLists.pageSize"
        :total="priceLists.total.value"
        :page-count="priceLists.pageCount.value"
        @update:page="priceLists.goTo"
      />
    </div>

    <PriceListPricesPanel
      v-if="selectedPriceList"
      :price-list="selectedPriceList"
      :paged="catalogPrices"
      :catalog-items="catalogOptions"
      :editable="selectedListIsDraft"
      @add="openCreateCatalogPrice"
      @edit="openEditCatalogPrice"
      @remove="removePrice"
      @retry="catalogPrices.reload"
      @close="closePrices"
      @update:page="catalogPrices.goTo"
    />

    <AppModal
      :open="priceListModalOpen"
      :title="editingPriceList ? 'Editar lista de precios' : 'Nueva lista de precios'"
      :max-width="720"
      @close="closePriceListModal"
    >
      <PriceListForm
        ref="priceListFormRef"
        :initial="editingPriceList"
        :saving="saving"
        @submit="submitPriceList"
        @cancel="closePriceListModal"
      />
    </AppModal>

    <AppModal
      :open="catalogPriceModalOpen"
      :title="editingCatalogPrice ? 'Editar precio' : 'Agregar precio'"
      :max-width="760"
      @close="closeCatalogPriceModal"
    >
      <CatalogPriceForm
        v-if="selectedPriceList"
        ref="catalogPriceFormRef"
        :price-list-id="selectedPriceList.id"
        :catalog-items="catalogOptions"
        :initial="editingCatalogPrice"
        :saving="saving"
        :options-loading="catalogOptionsLoading"
        :options-error="catalogOptionsError"
        @submit="submitCatalogPrice"
        @cancel="closeCatalogPriceModal"
        @retry-options="loadCatalogOptions(true)"
      />
    </AppModal>
  </section>
</template>

<style scoped>
.section {
  min-width: 0;
}
</style>
