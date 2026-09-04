<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowUpCircle, Gauge, Pencil, Plus } from 'lucide-vue-next'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppTable from '@/components/ui/AppTable.vue'
import CapacityMeter from '@/components/ui/CapacityMeter.vue'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { formatAmount } from '@/composables/format'
import BridgeSection from './BridgeSection.vue'
import CatalogItemLimitForm from './CatalogItemLimitForm.vue'
import PropagateLimitModal from './PropagateLimitModal.vue'
import { useCatalogItemLimits } from '../composables/useCatalogItemLimits'
import {
  LIMIT_ENFORCEMENT_MEANING,
  LIMIT_ENFORCEMENT_OPTIONS,
  LIMIT_RESET_PERIOD_OPTIONS,
  type CatalogItemLimitResponse,
  type CreateCatalogItemLimitRequest,
  type PropagateCatalogLimitImprovementRequest,
} from '../types/commercial-catalog.types'
/**
 * <b>Los techos de fábrica</b> que un artículo concede sobre cada eje de cupo, y
 * la propagación de una mejora a los contratos vivos.
 *
 * <p><b>Por qué «de fábrica».</b> Es el valor con el que nace el producto. Lo que
 * una empresa acaba teniendo puede ser más —si se le negoció una excepción— pero
 * nunca sale de la nada: sin una fila aquí, vender el artículo no concede ningún
 * cupo, igual que sin un puente de submódulos no abre ninguna pantalla.
 *
 * <p><b>El medidor enseña el techo, no un consumo.</b> `CapacityMeter` se reutiliza
 * con `used = 0` y `exhausted = false` explícito: aquí no hay consumo que
 * enseñar —esto es el catálogo, no una empresa— y el `| null` de `exhausted`
 * existe justo para que «el servidor no se pronunció» no se confunda con «no está
 * agotado». Decirlo a mano es lo correcto: en el catálogo nunca lo está.
 *
 * ── El hueco honesto de la política de prueba ─────────────────────────────
 *
 * <p>De la política de prueba de un artículo, el contrato declara <b>la mitad</b>:
 * `trialMode` y `trialLimitQuantity` dicen cuánto cupo hay durante la prueba, y
 * se editan aquí. <b>Cuántos días dura y qué le pasa al cliente al vencer</b>
 * (`policyTrialDays`, `policyTrialOutcome`) no son campos del artículo: viven en
 * la concesión por empresa (`CompanyTrialGrantResponse`) y en el valor por
 * defecto de la plataforma (`PlatformBillingConfigResponse.defaultTrialDays`).
 * Esta pantalla lo dice en vez de fabricar dos campos que no viajarían a ningún
 * sitio.
 */
const props = defineProps<{ itemId: number; itemName: string }>()

const {
  limits,
  loading,
  error,
  errorTraceId,
  dimensionOptions,
  dimensionsLoading,
  dimensionsError,
  availableDimensions,
  load,
  loadDimensions,
  create,
  update,
  propagate,
  dimensionName,
} = useCatalogItemLimits()

const formModalOpen = ref(false)
const propagateModalOpen = ref(false)
const editing = ref<CatalogItemLimitResponse | null>(null)
const propagating = ref<CatalogItemLimitResponse | null>(null)
const saving = ref(false)
const formRef = ref<InstanceType<typeof CatalogItemLimitForm> | null>(null)

/** Los ejes elegibles: los libres, más el propio al editar. */
const formOptions = computed(() => {
  const free = availableDimensions(editing.value?.id).map((dimension) => ({
    value: dimension.id,
    label: dimension.name,
  }))
  if (!editing.value) return free
  const own = dimensionOptions.value.find(
    (option) => option.value === editing.value?.limitDimensionId,
  )
  return own && !free.some((option) => option.value === own.value) ? [own, ...free] : free
})

onMounted(() => void load(props.itemId))
watch(
  () => props.itemId,
  (id) => void load(id),
)

useUnsavedChangesGuard(() => formModalOpen.value && (formRef.value?.isDirty() ?? false))

function enforcementLabel(limit: CatalogItemLimitResponse) {
  return (
    LIMIT_ENFORCEMENT_OPTIONS.find((option) => option.value === limit.enforcement)?.label ??
    limit.enforcement
  )
}

function resetLabel(limit: CatalogItemLimitResponse) {
  return (
    LIMIT_RESET_PERIOD_OPTIONS.find((option) => option.value === (limit.resetPeriod ?? ''))
      ?.label ?? '—'
  )
}

function openCreate() {
  editing.value = null
  formModalOpen.value = true
  void loadDimensions()
}

function openEdit(limit: CatalogItemLimitResponse) {
  editing.value = limit
  formModalOpen.value = true
  void loadDimensions()
}

function openPropagate(limit: CatalogItemLimitResponse) {
  propagating.value = limit
  propagateModalOpen.value = true
}

async function submit(payload: CreateCatalogItemLimitRequest) {
  if (saving.value) return
  saving.value = true
  try {
    const current = editing.value
    if (current) {
      const { limitDimensionId: _ignored, ...rest } = payload
      await update(props.itemId, current.id, rest)
    } else {
      await create(props.itemId, payload)
    }
    formModalOpen.value = false
    editing.value = null
  } catch {
    // El composable ya avisó con el ProblemDetail y su traza.
  } finally {
    saving.value = false
  }
}

async function confirmPropagate(payload: PropagateCatalogLimitImprovementRequest) {
  if (saving.value) return
  saving.value = true
  try {
    await propagate(payload)
    propagateModalOpen.value = false
    propagating.value = null
  } catch {
    // Ídem.
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Se monta sobre `BridgeSection`, el chasis que ya usan los tres puentes:
       misma cabecera, misma devolución de foco y ni una copia de su CSS — que
       es la regla 2 del presupuesto («lo que se copia en varios sitios es una
       primitiva que falta»). -->
  <BridgeSection
    title="Techos de fábrica"
    help="Qué cupo concede este artículo sobre cada eje y qué le pasa a la clínica al llegar al techo. Es el valor con el que nace el producto: sin una fila aquí, venderlo no concede ningún cupo."
  >
    <template #actions>
      <button type="button" class="ds-btn ds-btn--primary" @click="openCreate">
        <Plus :size="15" />
        Añadir techo
      </button>
    </template>

    <!--
      `money` (la nota de divisa de plataforma) y NO `formatMoney`, al revés que las cotizaciones
      y que los dos paneles de precios de esta misma pantalla.

      El motivo es del contrato, no de estilo: `CatalogItemLimitResponse` cuelga de
      `(catalogItemId, limitDimensionId)` y **no tiene ninguna vía hacia una lista de precios** —
      ni `priceListId`, ni `currency`, ni la entidad de la que sale (`catalog_item_limits`) tiene
      una clave foránea hacia `price_lists`. `overageUnitAmount` es un techo de fábrica del
      artículo, no un precio de una tarifa, así que aquí no hay divisa declarada que resolver: es
      el caso en el que la nota de plataforma es lo único honesto que se puede decir.

      **Es la más débil de las notas de plataforma del repositorio y conviene saberlo.** Convive
      en pantalla con `PriceListPricesPanel` y `TierSimulatorPanel`, que sí pintan la divisa real
      de su tarifa y pueden decir «US$». Que no se contradigan depende de que el rótulo viva en el
      `<caption>` de ESTA tabla y no en la pantalla: acota la afirmación a estas filas. Lo que lo
      cerraría de verdad es `currency` en `CatalogItemLimitResponse`, o un vínculo explícito a la
      tarifa desde la que se cobra el excedente.
    -->
    <AppTable
      caption="Techos de fábrica del artículo"
      money
      :headers="['Eje', 'Techo de pago', 'Durante la prueba', 'Al llegar', 'Reinicio', 'Acciones']"
      :empty="limits.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="load(itemId)"
    >
      <template #empty>
        <AppEmptyState
          :icon="Gauge"
          title="Este artículo no concede ningún cupo"
          description="Se puede vender y cobrar, pero no amplía nada: la empresa que lo contrate se queda con el cupo que ya tuviera. Si eso no es lo que se quiere, ata el artículo a un eje."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="openCreate">
            <Plus :size="15" />
            Añadir el primero
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="limit in limits" :key="limit.id" class="ds-row-hover">
        <td class="ds-text-strong">{{ dimensionName(limit) }}</td>
        <td class="medidor">
          <CapacityMeter
            :label="dimensionName(limit)"
            :used="0"
            :limit="limit.mode === 'LIMITED' ? limit.limitQuantity : null"
            :exhausted="false"
            unit="de techo"
          />
        </td>
        <td>
          {{
            limit.trialMode === 'FULL'
              ? 'Sin techo'
              : limit.trialLimitQuantity === null
                ? 'Con techo, sin cantidad declarada'
                : `Hasta ${limit.trialLimitQuantity}`
          }}
        </td>
        <td>
          <div class="ds-stack ds-stack--8">
            <span>{{ enforcementLabel(limit) }}</span>
            <span class="ds-meta">{{ LIMIT_ENFORCEMENT_MEANING[limit.enforcement] }}</span>
            <span v-if="limit.enforcement === 'OVERAGE'" class="ds-meta ds-num">
              {{ formatAmount(limit.overageUnitAmount) }} por unidad de más
            </span>
          </div>
        </td>
        <td>{{ resetLabel(limit) }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <button
              type="button"
              class="ds-icon-btn"
              :aria-label="`Editar el techo de ${dimensionName(limit)}`"
              @click="openEdit(limit)"
            >
              <Pencil :size="15" />
            </button>
            <button
              type="button"
              class="ds-icon-btn"
              :aria-label="`Propagar la mejora de ${dimensionName(limit)} a los contratos vivos`"
              @click="openPropagate(limit)"
            >
              <ArrowUpCircle :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <!-- Hueco honesto, no un formulario a medias: ver el javadoc del componente. -->
    <p class="ds-meta nota">
      <strong>Los días de prueba y qué pasa al vencer no se declaran en el artículo.</strong> Aquí
      se edita cuánto cupo hay durante la prueba; los días y el desenlace
      (<code>policyTrialDays</code>, <code>policyTrialOutcome</code>) viajan en la concesión de cada
      empresa y en el valor por defecto de la plataforma. No se inventan dos campos que no irían a
      ningún sitio.
    </p>

    <AppModal
      :open="formModalOpen"
      :title="editing ? 'Editar el techo de fábrica' : 'Añadir un techo de fábrica'"
      :max-width="760"
      @close="formModalOpen = false"
    >
      <CatalogItemLimitForm
        ref="formRef"
        :initial="editing"
        :dimension-options="formOptions"
        :options-loading="dimensionsLoading"
        :options-error="dimensionsError"
        :saving="saving"
        @submit="submit"
        @cancel="formModalOpen = false"
        @retry-options="loadDimensions(true)"
      />
    </AppModal>

    <PropagateLimitModal
      :open="propagateModalOpen"
      :limit="propagating"
      :dimension-name="propagating ? dimensionName(propagating) : ''"
      :item-name="itemName"
      :saving="saving"
      @close="propagateModalOpen = false"
      @confirm="confirmPropagate"
    />
  </BridgeSection>
</template>

<style scoped>
/* El medidor necesita ancho mínimo para que la barra signifique algo dentro de
   una celda que si no se encoge al contenido. */
.medidor {
  min-width: 12rem;
}

.nota {
  max-width: 84ch;
}
</style>
