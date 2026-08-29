<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Pencil, Plus, Power } from 'lucide-vue-next'
import { ICONS } from '@/constants/icons'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import PlatformSetupChecklist from '@/components/feedback/PlatformSetupChecklist.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import CatalogItemForm from '../components/CatalogItemForm.vue'
import PriceListsPanel from '../components/PriceListsPanel.vue'
import { useCommercialCatalog } from '../composables/useCommercialCatalog'
import { CAPACITY_UNIT_OPTIONS, ITEM_TYPE_OPTIONS } from '../types/commercial-catalog.types'
import type {
  CatalogItemResponse,
  CreateCatalogItemRequest,
  UpdateCatalogItemRequest,
} from '../types/commercial-catalog.types'

/**
 * Catálogo comercial: qué se puede vender y a cuánto.
 *
 * ── Esta vista quedó siendo la pestaña de artículos, y a propósito ─────────
 *
 * Era el **único SFC del repositorio por encima del techo de 500 líneas** (715)
 * y el motivo de que `npm run css:budget` estuviera en rojo (issue #146). La
 * mitad de «Listas y precios» —tabla de tarifas, panel de precios y sus dos
 * modales— se mudó tal cual a `PriceListsPanel.vue`. El corte es por la
 * pestaña porque las dos mitades ya eran excluyentes en el marcado y no
 * comparten ningún manejador; partir por «tabla» y «modales» habría dejado dos
 * ficheros que solo se entienden juntos.
 *
 * ── Cada artículo tiene sus tres puentes en una pantalla propia ───────────
 *
 * La acción «Qué abre y qué exige» de cada fila lleva a
 * `/catalogo-comercial/articulos/:id` (§4.1, W3-A): qué pantallas desbloquea,
 * qué reglas impone al configurador y —si es un paquete— qué trae dentro. Es el
 * paso 2 de la puesta en marcha, y hasta ahora la lista de §3.7 lo marcaba
 * pendiente sin poder enlazar a ningún sitio donde completarlo.
 */
type Tab = 'items' | 'priceLists'

const activeTab = ref<Tab>('items')
const itemModalOpen = ref(false)
const editingItem = ref<CatalogItemResponse | null>(null)
const saving = ref(false)
const itemFormRef = ref<InstanceType<typeof CatalogItemForm> | null>(null)
const priceListsPanelRef = ref<InstanceType<typeof PriceListsPanel> | null>(null)

const {
  catalogItems,
  createCatalogItem,
  updateCatalogItem,
  disableCatalogItem,
  enableCatalogItem,
} = useCommercialCatalog()
const { confirm } = useConfirmDialog()

onMounted(async () => {
  await catalogItems.goTo(1)
})

useUnsavedChangesGuard(() => itemModalOpen.value && (itemFormRef.value?.isDirty() ?? false))

function itemStatusLabel(item: CatalogItemResponse) {
  if (!item.enabled) return 'Deshabilitado'
  return { DRAFT: 'Borrador', ACTIVE: 'Activo', DEPRECATED: 'Obsoleto' }[item.status]
}

function itemStatusVariant(item: CatalogItemResponse): 'success' | 'warning' | 'neutral' {
  if (!item.enabled) return 'warning'
  return item.status === 'ACTIVE' ? 'success' : item.status === 'DRAFT' ? 'neutral' : 'warning'
}

function openCreateItem() {
  editingItem.value = null
  itemModalOpen.value = true
}

function openEditItem(item: CatalogItemResponse) {
  editingItem.value = item
  itemModalOpen.value = true
}

function closeItemModal() {
  if (saving.value) return
  itemModalOpen.value = false
  editingItem.value = null
}

async function submitItem(data: CreateCatalogItemRequest | UpdateCatalogItemRequest) {
  if (saving.value) return
  saving.value = true
  try {
    if (editingItem.value) await updateCatalogItem(editingItem.value.id, data)
    else if ('code' in data) await createCatalogItem(data)
    itemModalOpen.value = false
    editingItem.value = null
  } catch {
    // El composable conserva el modal y muestra el ProblemDetail con su traza.
  } finally {
    saving.value = false
  }
}

async function toggleItem(item: CatalogItemResponse) {
  if (item.enabled) {
    const accepted = await confirm({
      message: `¿Deshabilitar el artículo "${item.name}"?`,
      consequence: 'Dejará de estar disponible para nuevas configuraciones comerciales.',
      confirmLabel: 'Deshabilitar artículo',
    })
    if (!accepted) return
  }
  try {
    if (item.enabled) await disableCatalogItem(item.id)
    else await enableCatalogItem(item.id)
  } catch {
    // El composable ya avisó y la página conserva el estado confirmado por el servidor.
  }
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <div>
        <p class="eyebrow ds-meta">Suscripciones · Configuración comercial</p>
        <h1 class="ds-title">Catálogo comercial</h1>
      </div>
      <button
        v-if="activeTab === 'items'"
        type="button"
        class="ds-btn ds-btn--primary"
        @click="openCreateItem"
      >
        <Plus :size="15" />
        Nuevo artículo
      </button>
      <button
        v-else
        type="button"
        class="ds-btn ds-btn--primary"
        @click="priceListsPanelRef?.openCreatePriceList()"
      >
        <Plus :size="15" />
        Nueva lista
      </button>
    </div>

    <div class="tabs ds-flex-row" role="tablist" aria-label="Catálogo comercial">
      <button
        type="button"
        role="tab"
        class="ds-btn"
        :class="activeTab === 'items' ? 'ds-btn--primary' : 'ds-btn--ghost'"
        :aria-selected="activeTab === 'items'"
        @click="activeTab = 'items'"
      >
        Artículos
      </button>
      <button
        type="button"
        role="tab"
        class="ds-btn"
        :class="activeTab === 'priceLists' ? 'ds-btn--primary' : 'ds-btn--ghost'"
        :aria-selected="activeTab === 'priceLists'"
        @click="activeTab = 'priceLists'"
      >
        Listas y precios
      </button>
    </div>

    <section v-if="activeTab === 'items'" class="section ds-stack ds-stack--14">
      <AppTable
        :headers="['Código', 'Artículo', 'Tipo', 'Capacidad', 'Estado', 'Acciones']"
        :empty="catalogItems.items.value.length === 0"
        :loading="catalogItems.loading.value"
        :error="catalogItems.error.value"
        :trace-id="catalogItems.errorTraceId.value"
        @retry="catalogItems.reload"
      >
        <template #empty>
          <!-- §3.7 · Sin filtro y con el catálogo —prerrequisito de arranque— vacío,
               el estado no es «sin resultados»: es la plataforma sin sembrar. -->
          <PlatformSetupChecklist />
        </template>

        <tr v-for="item in catalogItems.items.value" :key="item.id" class="ds-row-hover">
          <td class="ds-text-strong">{{ item.code }}</td>
          <td>
            <span class="ds-text-strong">{{ item.name }}</span>
            <span v-if="item.shortDescription" class="description ds-meta">
              {{ item.shortDescription }}
            </span>
          </td>
          <td>{{ ITEM_TYPE_OPTIONS.find((option) => option.value === item.itemType)?.label }}</td>
          <td>
            <span v-if="item.capacityUnit">
              {{
                CAPACITY_UNIT_OPTIONS.find((option) => option.value === item.capacityUnit)?.label
              }}
            </span>
            <span v-else class="ds-meta">No aplica</span>
          </td>
          <td>
            <AppBadge :variant="itemStatusVariant(item)" :label="itemStatusLabel(item)" />
          </td>
          <td>
            <div class="ds-actions ds-actions--start">
              <RouterLink
                :to="`/catalogo-comercial/articulos/${item.id}`"
                class="ds-icon-btn"
                :aria-label="`Qué abre y qué exige ${item.name}`"
              >
                <component :is="ICONS.SUBMODULE" :size="15" aria-hidden="true" />
              </RouterLink>
              <button
                type="button"
                class="ds-icon-btn"
                :aria-label="`Editar ${item.name}`"
                @click="openEditItem(item)"
              >
                <Pencil :size="15" />
              </button>
              <button
                type="button"
                class="ds-icon-btn"
                :class="item.enabled ? 'ds-icon-btn--danger' : null"
                :aria-label="item.enabled ? `Deshabilitar ${item.name}` : `Activar ${item.name}`"
                @click="toggleItem(item)"
              >
                <Power :size="15" />
              </button>
            </div>
          </td>
        </tr>
      </AppTable>
      <AppPagination
        v-if="!catalogItems.error.value && catalogItems.total.value > 0"
        :page="catalogItems.page.value"
        :page-size="catalogItems.pageSize"
        :total="catalogItems.total.value"
        :page-count="catalogItems.pageCount.value"
        @update:page="catalogItems.goTo"
      />
    </section>

    <PriceListsPanel v-else ref="priceListsPanelRef" />

    <AppModal
      :open="itemModalOpen"
      :title="editingItem ? 'Editar artículo' : 'Nuevo artículo'"
      :max-width="760"
      @close="closeItemModal"
    >
      <CatalogItemForm
        ref="itemFormRef"
        :initial="editingItem"
        :saving="saving"
        @submit="submitItem"
        @cancel="closeItemModal"
      />
    </AppModal>
  </AppLayout>
</template>

<style scoped>
.eyebrow {
  margin: 0 0 var(--space-4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.tabs {
  margin-bottom: var(--space-20);
}

.section {
  min-width: 0;
}

.description {
  display: block;
  margin-top: var(--space-2);
}
</style>
