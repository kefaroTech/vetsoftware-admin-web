<script setup lang="ts">
import { computed, ref } from 'vue'
import { ICONS } from '@/constants/icons'
import AppModal from '@/components/ui/AppModal.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import BridgeSection from './BridgeSection.vue'
import BundleComponentForm from './BundleComponentForm.vue'
import { useCatalogItemBridges } from '../composables/useCatalogItemBridges'
import type {
  BundleComponentResponse,
  CreateBundleComponentRequest,
  UpdateBundleComponentRequest,
} from '../types/commercial-catalog.types'

/**
 * Puente 3 · **qué trae el paquete** (`bundle_components`).
 *
 * ── Este bloque no existe para los demás tipos ────────────────────────────
 *
 * No se pinta deshabilitado: para un `MODULE` o una `CAPACITY` la pregunta «qué
 * trae» no tiene sentido, y un bloque gris invita a buscar cómo activarlo. La
 * vista lo monta solo cuando `itemType === 'BUNDLE'`.
 *
 * ── Aquí aterrizan los planes antiguos ────────────────────────────────────
 *
 * Un paquete deja de ser una jaula y pasa a ser un atajo comercial: el cliente
 * parte de él y puede quitar o añadir piezas. Por eso la cantidad se edita en
 * sitio y las piezas se listan una a una, en vez de enseñar «Plan Profesional»
 * como una caja cerrada.
 */
const props = defineProps<{ bundleItemId: number; itemName: string }>()

const {
  components,
  componentsLoading,
  componentsError,
  componentsErrorTraceId,
  catalogOptions,
  catalogOptionsLoading,
  catalogItemLabel,
  loadComponents,
  createComponent,
  updateComponent,
  removeComponent,
} = useCatalogItemBridges()
const { confirm } = useConfirmDialog()

const section = ref<InstanceType<typeof BridgeSection> | null>(null)
const modalOpen = ref(false)
const editing = ref<BundleComponentResponse | null>(null)
const saving = ref(false)
const formRef = ref<InstanceType<typeof BundleComponentForm> | null>(null)

useUnsavedChangesGuard(() => modalOpen.value && (formRef.value?.isDirty() ?? false))

const includedIds = computed(() => new Set(components.value.map((row) => row.componentItemId)))

/**
 * Lo que el servidor aceptaría: ni paquetes (anidarlos es
 * `INVALID_BUNDLE_COMPOSITION`), ni este mismo artículo, ni lo ya incluido.
 */
const candidates = computed(() =>
  catalogOptions.value.filter(
    (item) =>
      item.itemType !== 'BUNDLE' &&
      item.id !== props.bundleItemId &&
      !includedIds.value.has(item.id),
  ),
)

function moveFocusToHeading() {
  section.value?.focus()
}

function openCreate() {
  editing.value = null
  modalOpen.value = true
}

function openEdit(row: BundleComponentResponse) {
  editing.value = row
  modalOpen.value = true
}

function closeModal() {
  if (saving.value) return
  modalOpen.value = false
  editing.value = null
}

async function submit(data: CreateBundleComponentRequest | UpdateBundleComponentRequest) {
  if (saving.value) return
  saving.value = true
  try {
    if (editing.value) await updateComponent(props.bundleItemId, editing.value.id, data)
    else if ('componentItemId' in data) await createComponent(props.bundleItemId, data)
    modalOpen.value = false
    editing.value = null
    moveFocusToHeading()
  } catch {
    // El modal se conserva y el aviso lleva el `ProblemDetail` con su traza.
  } finally {
    saving.value = false
  }
}

async function remove(row: BundleComponentResponse) {
  const accepted = await confirm({
    message: `¿Quitar «${catalogItemLabel(row.componentItemId)}» de ${props.itemName}?`,
    consequence: 'El paquete dejará de incluir esa pieza en las cotizaciones nuevas.',
    confirmLabel: 'Quitar pieza',
  })
  if (!accepted) return
  try {
    await removeComponent(props.bundleItemId, row.id)
    moveFocusToHeading()
  } catch {
    // El composable ya avisó.
  }
}
</script>

<template>
  <BridgeSection
    ref="section"
    title="Qué trae el paquete"
    help="Las piezas que el cliente recibe al contratar este paquete, y en qué cantidad. Puede quitarlas o añadir otras al cotizar: un paquete es un atajo, no una jaula."
  >
    <template #actions>
      <button
        type="button"
        class="ds-btn ds-btn--primary"
        :disabled="candidates.length === 0 && !catalogOptionsLoading"
        @click="openCreate"
      >
        <component :is="ICONS.ADD" :size="15" aria-hidden="true" />
        Agregar pieza
      </button>
    </template>

    <!--
      Aviso permanente, no una interrupción: `role="status"` y no `role="alert"`
      (docs/ux/patron-de-mensajes.md §4). Lo que dice no es evidente y es la
      diferencia entre editar tranquilo y no atreverse a tocar el paquete: la
      composición de un paquete se CONGELA al firmar, así que lo de aquí decide
      lo que trae la PRÓXIMA venta y no toca ni un contrato vivo.
    -->
    <p class="ds-banner ds-banner--info" role="status">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span>
        <strong>Editar esto no afecta a los contratos que ya están firmados.</strong> La composición
        del paquete se congela al firmar: cada suscripción viva conserva las piezas y las cantidades
        con las que se vendió. Lo que se cambia aquí es lo que traerá la próxima cotización.
      </span>
    </p>

    <AppTable
      :headers="['Pieza', 'Cantidad', 'Acciones']"
      :empty="components.length === 0"
      :loading="componentsLoading"
      :error="componentsError"
      :trace-id="componentsErrorTraceId"
      @retry="loadComponents(props.bundleItemId)"
    >
      <template #empty>
        <p class="ds-empty ds-empty--boxed">
          <component :is="ICONS.WARNING" :size="15" class="ds-banner-icon" aria-hidden="true" />
          Este paquete está vacío. Contratarlo hoy no trae ninguna pieza.
        </p>
      </template>

      <tr v-for="row in components" :key="row.id" class="ds-row-hover">
        <td class="ds-text-strong">{{ catalogItemLabel(row.componentItemId) }}</td>
        <td class="ds-num">{{ row.quantity }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <button
              type="button"
              class="ds-icon-btn"
              :aria-label="`Cambiar la cantidad de ${catalogItemLabel(row.componentItemId)}`"
              @click="openEdit(row)"
            >
              <component :is="ICONS.EDIT" :size="15" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              :aria-label="`Quitar ${catalogItemLabel(row.componentItemId)} del paquete`"
              @click="remove(row)"
            >
              <component :is="ICONS.DELETE" :size="15" aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal
      :open="modalOpen"
      :title="editing ? 'Cambiar la cantidad' : 'Agregar pieza al paquete'"
      :max-width="600"
      @close="closeModal"
    >
      <BundleComponentForm
        ref="formRef"
        :bundle-item-id="props.bundleItemId"
        :candidates="candidates"
        :initial="editing"
        :initial-label="editing ? catalogItemLabel(editing.componentItemId) : undefined"
        :saving="saving"
        :options-loading="catalogOptionsLoading"
        @submit="submit"
        @cancel="closeModal"
      />
    </AppModal>
  </BridgeSection>
</template>
