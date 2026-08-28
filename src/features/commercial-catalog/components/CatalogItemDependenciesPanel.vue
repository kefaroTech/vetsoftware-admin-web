<script setup lang="ts">
import { ref } from 'vue'
import { ICONS } from '@/constants/icons'
import AppModal from '@/components/ui/AppModal.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import BridgeSection from './BridgeSection.vue'
import CatalogItemDependencyForm from './CatalogItemDependencyForm.vue'
import { useCatalogItemBridges } from '../composables/useCatalogItemBridges'
import {
  RELATION_TYPE_LABEL,
  RELATION_TYPE_MEANING,
  type CatalogItemDependencyResponse,
  type CreateCatalogItemDependencyRequest,
  type UpdateCatalogItemDependencyRequest,
} from '../types/commercial-catalog.types'

/**
 * Puente 2 · **las reglas del configurador** (`catalog_item_dependencies`).
 *
 * ── El ciclo se pinta con su ruta, no con un «hay un ciclo» ────────────────
 *
 * El servidor detecta los bucles indirectos con un recorrido del grafo y
 * devuelve **la ruta completa** como propiedad estructurada del `ProblemDetail`
 * (`CATALOG_ITEM_DEPENDENCY_CYCLE`). «CORE → HC → CORE» dice dónde está el
 * problema y qué arco quitar; «dependencia inválida» obliga a buscarlo a mano
 * entre decenas de reglas. Por eso el aviso vive **fuera del modal** y
 * sobrevive a su cierre: se lee mirando la tabla.
 *
 * La comprobación NO se duplica aquí. El grafo entero vive en el servidor —esta
 * pantalla solo ve las reglas de un artículo—, así que una validación local
 * sería una aproximación que a veces bloquea lo válido y a veces deja pasar lo
 * inválido: lo peor de los dos mundos.
 *
 * ── `note` se pinta como copy, no como comentario ─────────────────────────
 *
 * En la tabla ocupa una columna propia y con el texto entero, porque es lo que
 * va a leer el cliente. Una regla sin mensaje se marca como incompleta en vez
 * de dejar la celda en blanco.
 */
const props = defineProps<{ itemId: number; itemName: string }>()

const {
  dependencies,
  dependenciesLoading,
  dependenciesError,
  dependenciesErrorTraceId,
  dependencyCycle,
  cycleLabel,
  catalogOptions,
  catalogOptionsLoading,
  catalogOptionsError,
  catalogItemLabel,
  clearCycle,
  loadCatalogOptions,
  loadDependencies,
  createDependency,
  updateDependency,
  removeDependency,
} = useCatalogItemBridges()
const { confirm } = useConfirmDialog()

const section = ref<InstanceType<typeof BridgeSection> | null>(null)
const modalOpen = ref(false)
const editing = ref<CatalogItemDependencyResponse | null>(null)
const saving = ref(false)
const formRef = ref<InstanceType<typeof CatalogItemDependencyForm> | null>(null)

useUnsavedChangesGuard(() => modalOpen.value && (formRef.value?.isDirty() ?? false))

function moveFocusToHeading() {
  section.value?.focus()
}

function openCreate() {
  editing.value = null
  modalOpen.value = true
}

function openEdit(rule: CatalogItemDependencyResponse) {
  editing.value = rule
  modalOpen.value = true
}

function closeModal() {
  if (saving.value) return
  modalOpen.value = false
  editing.value = null
}

async function submit(
  data: CreateCatalogItemDependencyRequest | UpdateCatalogItemDependencyRequest,
) {
  if (saving.value) return
  saving.value = true
  try {
    if (editing.value) await updateDependency(props.itemId, editing.value.id, data)
    else if ('relatedItemId' in data) await createDependency(props.itemId, data)
    modalOpen.value = false
    editing.value = null
    moveFocusToHeading()
  } catch {
    // El modal se conserva: el aviso lleva el `ProblemDetail` y su traza, y el
    // banner de ciclo —si lo hubo— ya está pintado detrás con la ruta del bucle.
  } finally {
    saving.value = false
  }
}

async function remove(rule: CatalogItemDependencyResponse) {
  const accepted = await confirm({
    message: `¿Eliminar la regla «${props.itemName} ${RELATION_TYPE_MEANING[rule.relationType]} ${catalogItemLabel(rule.relatedItemId)}»?`,
    consequence: 'El configurador dejará de aplicarla y de enseñar su mensaje al cliente.',
    confirmLabel: 'Eliminar regla',
  })
  if (!accepted) return
  try {
    await removeDependency(props.itemId, rule.id)
    moveFocusToHeading()
  } catch {
    // El composable ya avisó.
  }
}
</script>

<template>
  <BridgeSection
    ref="section"
    title="Reglas del configurador"
    help="Qué hace falta, qué se sugiere y qué no puede convivir. Cada regla lleva el mensaje que lee quien está comprando."
  >
    <template #actions>
      <button type="button" class="ds-btn ds-btn--primary" @click="openCreate">
        <component :is="ICONS.ADD" :size="15" aria-hidden="true" />
        Nueva regla
      </button>
    </template>

    <!-- E8 · Lo que estas reglas hacen HOY, que no es lo que su nombre promete.
         Tono aviso y no información (§1 de `docs/ux/patron-de-mensajes.md`,
         pregunta 2): quien las declara se va creyendo que el sistema las
         aplicará, y la consecuencia —una venta cerrada sin la pieza que
         «requiere»— no la ve nadie mirando esta pantalla. `role="status"` con
         `aria-live="polite"`, que es lo que §4.1 fija para el aviso. -->
    <div class="ds-banner ds-banner--warning" role="status" aria-live="polite">
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill ds-stack ds-stack--8">
        <span class="ds-text-strong">Hoy estas reglas son documentación, no norma.</span>
        <span>
          Ningún otro sitio las lee todavía: ni el configurador, ni la cotización, ni la ampliación,
          ni el recálculo. Se puede vender facturación electrónica sin caja y el contrato queda
          perfectamente válido.
        </span>
        <span>
          Sirven para que quien arma la oferta sepa qué va con qué; no impiden nada, así que
          compruébalas a mano antes de cerrar una venta que dependa de ellas.
        </span>
      </span>
    </div>

    <!-- El servidor rechazó un alta porque cerraría un bucle. Se pinta la ruta
         completa: es lo que dice qué arco sobra. -->
    <div v-if="dependencyCycle !== null" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill ds-stack ds-stack--8">
        <span>
          Esa regla cerraría un bucle de dependencias y el configurador no podría cotizar.
        </span>
        <span v-if="cycleLabel" class="ruta">{{ cycleLabel }}</span>
        <span v-else class="ds-meta">
          El servidor no envió la ruta del bucle, así que hay que buscarlo entre las reglas
          «Requiere» de estos artículos.
        </span>
      </span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="clearCycle">
        Entendido
      </button>
    </div>

    <AppTable
      :headers="['Regla', 'El otro artículo', 'Mensaje para el cliente', 'Acciones']"
      :empty="dependencies.length === 0"
      :loading="dependenciesLoading"
      :error="dependenciesError"
      :trace-id="dependenciesErrorTraceId"
      @retry="loadDependencies(props.itemId)"
    >
      <template #empty>
        <p class="ds-empty ds-empty--boxed">
          <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" aria-hidden="true" />
          Este artículo se puede vender solo, sin condiciones. Eso está bien: no toda pieza del
          catálogo necesita reglas.
        </p>
      </template>

      <tr v-for="rule in dependencies" :key="rule.id" class="ds-row-hover">
        <td>
          <span class="ds-text-strong">{{ RELATION_TYPE_LABEL[rule.relationType] }}</span>
          <span class="descripcion ds-meta">{{ RELATION_TYPE_MEANING[rule.relationType] }}</span>
        </td>
        <td>{{ catalogItemLabel(rule.relatedItemId) }}</td>
        <td>
          <span v-if="rule.note">{{ rule.note }}</span>
          <span v-else class="ds-flex-row ds-flex-row--6">
            <component :is="ICONS.WARNING" :size="14" aria-hidden="true" />
            Sin mensaje: el cliente verá un rechazo sin explicación
          </span>
        </td>
        <td>
          <div class="ds-actions ds-actions--start">
            <button
              type="button"
              class="ds-icon-btn"
              :aria-label="`Editar la regla con ${catalogItemLabel(rule.relatedItemId)}`"
              @click="openEdit(rule)"
            >
              <component :is="ICONS.EDIT" :size="15" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              :aria-label="`Eliminar la regla con ${catalogItemLabel(rule.relatedItemId)}`"
              @click="remove(rule)"
            >
              <component :is="ICONS.DELETE" :size="15" aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal
      :open="modalOpen"
      :title="editing ? 'Editar regla' : 'Nueva regla'"
      :max-width="640"
      @close="closeModal"
    >
      <CatalogItemDependencyForm
        ref="formRef"
        :catalog-item-id="props.itemId"
        :catalog-items="catalogOptions"
        :initial="editing"
        :saving="saving"
        :options-loading="catalogOptionsLoading"
        :options-error="catalogOptionsError"
        @submit="submit"
        @cancel="closeModal"
        @retry-options="loadCatalogOptions(true)"
      />
    </AppModal>
  </BridgeSection>
</template>

<style scoped>
.ruta {
  font-family: var(--font-mono);
  font-weight: var(--weight-medium);
}

.descripcion {
  display: block;
  margin-top: var(--space-2);
}
</style>
