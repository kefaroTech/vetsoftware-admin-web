<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Archive, CircleDollarSign, Pencil, Plus, Power, Send } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { formatDate } from '@/composables/format'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import CatalogPriceForm from './CatalogPriceForm.vue'
import PriceListForm from './PriceListForm.vue'
import PriceListPricesPanel from './PriceListPricesPanel.vue'
import PriceListValidityNotice from './PriceListValidityNotice.vue'
import PriceListCoveragePanel from './PriceListCoveragePanel.vue'
import PublishPriceListModal from './PublishPriceListModal.vue'
import TierSimulatorPanel from './TierSimulatorPanel.vue'
import { useCommercialCatalog } from '../composables/useCommercialCatalog'
import { usePriceListPublishing } from '../composables/usePriceListPublishing'
import { businessToday, priceListEffectiveness } from '../composables/priceListValidity'
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

/**
 * El día de hoy **en la zona del negocio** (D-73). Ver `priceListValidity.ts`
 * para por qué no sale del reloj del navegador.
 *
 * <p>Se refresca al montar y cada vez que la tabla trae datos nuevos, que es
 * cuando el operador está mirando. Residuo conocido y aceptado: una consola
 * abierta y quieta desde antes de medianoche conserva el día con el que
 * cargó hasta la siguiente recarga. Un temporizador que repinte la tabla sola
 * costaría más de lo que arregla, y cualquier acción de la pantalla ya la
 * recarga.
 */
const today = ref(businessToday())

/**
 * Publicar dejó de ser una llamada: comprueba la cobertura de la tarifa, la
 * enseña y exige un reconocimiento explícito si faltan precios. Todo eso vive en
 * `usePriceListPublishing` — este fichero estaba en 466 de las 500 líneas que
 * fija `css:budget` y meterlo aquí lo habría pasado de largo.
 */
const publishing = usePriceListPublishing({
  catalogItems: () => catalogOptions.value,
  publish: publishPriceList,
  today,
})

onMounted(async () => {
  await priceLists.goTo(1)
  if (selectedPriceList.value) await selectPriceList(selectedPriceList.value)
})

watch(priceLists.items, () => {
  today.value = businessToday()
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
    // La cobertura se pide al abrir la tarifa, no al publicarla: enseñar antes
    // lo que falta es lo que evita descubrirlo con el diálogo ya abierto.
    await publishing.refreshCoverage(priceList.id)
  } catch {
    // Los paneles de error conservan las salidas de reintento.
  }
}

async function closePrices() {
  publishing.clearCoverage()
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
    if (selectedPriceList.value) await publishing.refreshCoverage(selectedPriceList.value.id)
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
    if (selectedPriceList.value) await publishing.refreshCoverage(selectedPriceList.value.id)
  } catch {
    // El composable ya avisó.
  }
}

defineExpose({ openCreatePriceList })
</script>

<template>
  <section class="section ds-stack ds-stack--18">
    <div class="ds-stack ds-stack--14">
      <PriceListValidityNotice
        :lists="priceLists.items.value"
        :not-effective="publishing.notEffective.value"
        @dismiss="publishing.notEffective.value = null"
      />

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
          <!-- D-73 · La ventana en crudo no dice si sirve HOY: una lista
               publicada puede estar caducada. El distintivo sale de la fecha,
               no del estado, y lleva su texto para no comunicar por color. -->
          <td>
            <div class="ds-stack ds-stack--8">
              <!-- El `<div>` intermedio evita que el badge, hijo directo de una
                   columna flex, se estire a todo el ancho de la celda. -->
              <div>
                <AppBadge
                  :variant="priceListEffectiveness(priceList, today).variant"
                  :label="priceListEffectiveness(priceList, today).label"
                />
              </div>
              <span class="ds-meta">
                {{ formatDate(priceList.validFrom) }} —
                {{ priceList.validTo ? formatDate(priceList.validTo) : 'sin fecha final' }}
              </span>
            </div>
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
                @click="publishing.start(priceList)"
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

    <!-- La cobertura va junto a los precios de la tarifa seleccionada: qué falta
         se arregla donde se añaden los precios, no en otra pantalla. -->
    <PriceListCoveragePanel
      v-if="selectedPriceList && publishing.isCoverageLoadedFor(selectedPriceList.id)"
      :coverage="publishing.coverage.value"
      :loading="publishing.coverageLoading.value"
      :error="publishing.coverageError.value"
      :trace-id="publishing.coverageTraceId.value"
      :editable="selectedListIsDraft"
      @retry="publishing.refreshCoverage(selectedPriceList.id)"
    />

    <!-- D-66 · Va debajo de los precios y no en una pestaña propia: se simula
         la tarifa que se está mirando, y la escalera que explica está a un
         palmo. La tabla de arriba enseña los tramos declarados; esto enseña lo
         que cuestan quince usuarios con esos tramos. -->
    <TierSimulatorPanel v-if="selectedPriceList" :price-list="selectedPriceList" />

    <PublishPriceListModal
      :open="publishing.open.value"
      :price-list="publishing.target.value"
      :coverage="publishing.coverage.value"
      :today="today"
      :coverage-loading="publishing.coverageLoading.value"
      :coverage-error="publishing.coverageError.value"
      :coverage-trace-id="publishing.coverageTraceId.value"
      :saving="publishing.saving.value"
      @close="publishing.close()"
      @retry-coverage="
        publishing.target.value && publishing.refreshCoverage(publishing.target.value.id)
      "
      @confirm="publishing.confirm()"
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
