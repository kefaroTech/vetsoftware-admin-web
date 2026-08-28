<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { formatCurrency, formatDate, parseISODate } from '@/composables/format'
import { todayISODate } from '../../composables/subscriptionDateTime'
import { useSubscriptionItemCatalog } from '../../composables/useSubscriptionItemCatalog'
import { capacityUnitLabel, itemTypeLabel } from '../../composables/subscriptionItemLifecycle'
import type { SubscriptionResponse } from '../../types/subscriptions-admin.types'
import type { AddSubscriptionItemRequest } from '../../types/subscription-items.types'

/**
 * «Añadir artículo» — `POST /subscriptions/{id}/items`.
 *
 * <p><b>El precio no se teclea: se enseña, y desde la incidencia de dinero que
 * cerró esto, tampoco se manda.</b> `unitAmount`, `includedQuantity`, `taxRate` y
 * `taxTreatment` salían antes en el cuerpo de la petición —congelados en el
 * cliente— y el servicio los persistía tal cual: un `unitAmount: 0` abría la
 * línea gratis, un `includedQuantity: 9999` movía el techo del contador. El
 * servidor ahora los <b>resuelve contra la tarifa vigente del contrato</b> y
 * <b>rechaza lo que venga en el cuerpo</b> — de ahí que `line` de
 * `AddSubscriptionItemRequest` sea hoy `RequestedSubscriptionItemRequest`:
 * artículo, cantidad y fechas, nada de importes.
 *
 * <p>Lo que <b>no</b> cambia es que esta pantalla siga pintando el precio en un
 * `&lt;dl&gt;` —hechos, no campos— antes de firmar: sigue leyéndolo de
 * `useSubscriptionItemCatalog().findPrice(...)`, que resuelve contra el mismo
 * catálogo/tarifa que después valida el servidor. Es una lectura para informar
 * al operador, no la fuente de lo que se envía. Un campo de importe editable
 * aquí sería la operación «editar el precio» que §3.3 dice que no existe.
 *
 * <p>Si la tarifa no publica precio para ese artículo en el ciclo del contrato, el
 * alta <b>no se abre un campo de importe</b>: se para con una explicación y con la
 * salida real, que es publicar el precio en la tarifa.
 *
 * <p><b>`clientRequestId` se genera una vez al abrir</b>, no en cada envío: es lo que
 * hace que dos clics en «Añadir» no generen dos cobros.
 *
 * <p>Convención de formularios del repositorio, sin desviarse: validador puro por
 * campo → `computed errors` → mapa `touched` que arranca en `false` → el error solo
 * se pinta tras `@blur` o tras un envío fallido → `ErrorSummary` con el texto literal
 * del error en línea y el foco puesto en él.
 */
const props = defineProps<{
  open: boolean
  subscription: SubscriptionResponse
  companyName: string
  /** Artículos que ya tienen una línea sin cerrar: no se pueden volver a contratar. */
  openCatalogItemIds: Set<number>
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; submit: [payload: AddSubscriptionItemRequest] }>()

const itemId = useId()
const quantityId = useId()
const effectiveId = useId()
const reasonId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const { loading, error, sellableItems, findItemById, findPrice, refresh } =
  useSubscriptionItemCatalog()

const form = reactive({
  catalogItemId: null as number | null,
  quantity: '1',
  effectiveDate: '',
  reason: '',
})
const touched = reactive({
  catalogItemId: false,
  quantity: false,
  effectiveDate: false,
  reason: false,
})
const clientRequestId = ref('')

const today = computed(() => todayISODate())

/**
 * Lo ya contratado no se ofrece. El backend lo rechazaría con el índice único de
 * `uq_subscription_items_current` —una sola línea abierta por artículo— y ofrecerlo
 * sería empujar al operador contra una restricción que no puede ver.
 */
const options = computed(() =>
  sellableItems.value
    .filter((item) => !props.openCatalogItemIds.has(item.id))
    .map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` })),
)

const selectedItem = computed(() => findItemById(form.catalogItemId))

const quantityNumber = computed(() => {
  const parsed = Number(form.quantity.replace(',', '.'))
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN
})

/** El precio congelado que le tocaría a esta cantidad, o nada si la tarifa no lo cubre. */
const price = computed(() =>
  findPrice(form.catalogItemId, Number.isNaN(quantityNumber.value) ? 1 : quantityNumber.value),
)

function validateItem(value: number | null): string {
  if (value === null) return 'Elige el artículo que se va a contratar.'
  if (!price.value)
    return 'La tarifa aplicada a este contrato no publica precio para este artículo en su ciclo de facturación. Publícalo en la tarifa antes de contratarlo.'
  return ''
}

function validateQuantity(value: string): string {
  if (!value.trim()) return 'La cantidad es obligatoria.'
  const n = quantityNumber.value
  if (Number.isNaN(n) || n < 1) return 'La cantidad tiene que ser un número entero de 1 o más.'
  const item = selectedItem.value
  if (item && n < item.minQuantity) return `El mínimo de este artículo es ${item.minQuantity}.`
  if (item?.maxQuantity != null && n > item.maxQuantity)
    return `El máximo de este artículo es ${item.maxQuantity}.`
  return ''
}

function validateEffectiveDate(value: string): string {
  if (!value) return 'La fecha desde la que se contrata es obligatoria.'
  if (!parseISODate(value)) return 'La fecha no es válida. Usa el calendario del campo.'
  if (value < props.subscription.startDate)
    return `No puede empezar antes que el contrato, que arrancó el ${formatDate(props.subscription.startDate)}.`
  return ''
}

function validateReason(value: string): string {
  const v = value.trim()
  if (!v) return 'El motivo es obligatorio: queda en el otrosí y es lo que explica el cargo.'
  if (v.length < 5)
    return 'Escribe un motivo de al menos 5 caracteres. Ejemplo: amplía a dos sedes.'
  if (v.length > 255) return 'El motivo no puede pasar de 255 caracteres.'
  return ''
}

const errors = computed(() => ({
  catalogItemId: validateItem(form.catalogItemId),
  quantity: validateQuantity(form.quantity),
  effectiveDate: validateEffectiveDate(form.effectiveDate),
  reason: validateReason(form.reason),
}))

type Field = keyof typeof errors.value

const ORDER: Field[] = ['catalogItemId', 'quantity', 'effectiveDate', 'reason']

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(ORDER.map((f) => [f, touched[f] ? errors.value[f] : ''])),
    {
      catalogItemId: itemId,
      quantity: quantityId,
      effectiveDate: effectiveId,
      reason: reasonId,
    },
    ORDER,
  ),
)

function err(field: Field): string {
  return touched[field] ? errors.value[field] : ''
}

/** Lo que se congela. Se lee antes de firmar, y por eso va en un `<dl>` y no en campos. */
const prorrateo = computed(
  () =>
    `Se calculará el proporcional de los días que quedan del periodo, hasta el ${formatDate(props.subscription.currentPeriodEnd)}. El importe exacto aparecerá en el otrosí.`,
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.catalogItemId = null
    form.quantity = '1'
    form.effectiveDate = today.value
    form.reason = ''
    touched.catalogItemId = false
    touched.quantity = false
    touched.effectiveDate = false
    touched.reason = false
    clientRequestId.value = crypto.randomUUID()
  },
)

function submit() {
  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    void summary.value?.focus()
    return
  }
  const item = selectedItem.value
  // `frozen` no viaja en el cuerpo — el servidor resuelve el precio contra la
  // tarifa del contrato y rechazaría estos campos si se los mandáramos. Sigue
  // siendo la guarda de que la tarifa cubre este artículo y esta cantidad: sin
  // precio publicado no hay nada que firmar.
  const frozen = price.value
  if (!item || !frozen) return
  emit('submit', {
    clientRequestId: clientRequestId.value,
    effectiveDate: form.effectiveDate,
    reason: form.reason.trim(),
    line: {
      catalogItemId: item.id,
      quantity: quantityNumber.value,
      effectiveFrom: form.effectiveDate,
    },
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Añadir artículo"
    :subtitle="`${subscription.subscriptionNumber} · ${companyName}`"
    :icon="ICONS.ADD"
    compact
    :width="580"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <div v-if="error" class="ds-banner ds-banner--error ds-banner--sm" role="alert">
          <component :is="ICONS.ERROR" :size="15" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ error }}</span>
          <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="refresh">
            <component :is="ICONS.RETRY" :size="13" />
            Reintentar
          </button>
        </div>

        <AppSelect
          :id="itemId"
          v-model="form.catalogItemId"
          label="Artículo"
          required
          :options="options"
          :placeholder="loading ? 'Cargando…' : 'Elige un artículo del catálogo'"
          hint="Solo se ofrecen los artículos activos que este contrato todavía no tiene."
          :error="err('catalogItemId')"
          @blur="touched.catalogItemId = true"
        />

        <!-- El precio congelado, como hecho. Nunca en `<input disabled>`: un campo
             gris diría «editable, pero ahora no», y esta operación no existe. -->
        <dl v-if="price && selectedItem" class="ds-detail-grid congelado">
          <div>
            <dt class="ds-label">Precio unitario</dt>
            <dd class="valor ds-num">{{ formatCurrency(price.unitAmount) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Incluidas en el precio</dt>
            <dd class="valor ds-num">{{ price.includedQuantity }}</dd>
          </div>
          <div>
            <dt class="ds-label">Impuesto</dt>
            <dd class="valor">{{ price.taxRate }} %</dd>
          </div>
          <div>
            <dt class="ds-label">Tipo</dt>
            <dd class="valor">
              {{ itemTypeLabel(selectedItem.itemType) }}
              <template v-if="selectedItem.capacityUnit">
                · {{ capacityUnitLabel(selectedItem.capacityUnit) }}
              </template>
            </dd>
          </div>
          <div class="ds-grid-span">
            <dt class="ds-label">Cómo queda</dt>
            <dd class="valor ds-meta">
              Estos tres valores se congelan hoy en la línea. Si mañana cambia la tarifa, esta línea
              sigue cobrando lo pactado: cambiar de precio es cerrarla y abrir otra.
            </dd>
          </div>
        </dl>

        <AppInput
          :id="quantityId"
          v-model="form.quantity"
          label="Cantidad"
          required
          type="number"
          inputmode="numeric"
          :error="err('quantity')"
          hint="El precio por tramos se resuelve con esta cantidad."
          @blur="touched.quantity = true"
        />

        <AppInput
          :id="effectiveId"
          v-model="form.effectiveDate"
          label="Contratado desde"
          required
          type="date"
          :error="err('effectiveDate')"
          hint="Una fecha futura deja la línea como «Programada» hasta ese día."
          @blur="touched.effectiveDate = true"
        />

        <div class="ds-banner ds-banner--info ds-banner--sm">
          <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
          <span>{{ prorrateo }}</span>
        </div>

        <AppTextarea
          :id="reasonId"
          v-model="form.reason"
          label="Motivo"
          required
          :rows="3"
          hint="Queda en el otrosí. Es lo que se lee cuando el cliente pregunta por un cargo."
          :error="err('reason')"
          @blur="touched.reason = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Guardando…' : 'Añadir artículo' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* La regla superior marca el bloque de hechos dentro de un formulario: lo de arriba
   se elige, esto se lee. */
.congelado {
  padding-top: var(--space-10);
  border-top: 1px solid var(--border);
}

.valor {
  margin: var(--space-4) 0 0;
}
</style>
