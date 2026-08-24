<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { formatCurrency, formatDate, parseISODate } from '@/composables/format'
import { todayISODate } from '../../composables/subscriptionDateTime'
import { taxLabel } from '../../composables/subscriptionItemLifecycle'
import type { SubscriptionResponse } from '../../types/subscriptions-admin.types'
import type {
  ChangeSubscriptionItemQuantityRequest,
  SubscriptionItemResponse,
} from '../../types/subscription-items.types'

/**
 * «Cambiar cantidad» — `POST /subscriptions/{id}/items/quantity`, y <b>la pantalla
 * donde se enseña que este modelo no edita</b>.
 *
 * <p>La ruta responde <b>201</b>, no 200, y eso no es un descuido: no modifica la
 * línea, <b>cierra una y abre otra</b>. El texto del modal lo dice con esas palabras,
 * porque es lo que el operador tiene que poder repetirle al cliente: «la línea
 * anterior queda en el expediente».
 *
 * <p><b>El precio no aparece como campo en ninguna parte.</b> La línea sucesora
 * arrastra `unitAmount`, `includedQuantity` y `taxRate` intactos, así que aquí se
 * pintan como hechos —en un `&lt;dl&gt;`— y lo único editable es la cantidad, la
 * fecha y el motivo. Si hiciera falta otro precio, la operación no es ésta: es cerrar
 * la línea y abrir otra desde el catálogo.
 *
 * <p>`clientRequestId` se genera una vez al abrir el modal: dos clics no emiten dos
 * otrosíes.
 */
const props = defineProps<{
  open: boolean
  item: SubscriptionItemResponse
  subscription: SubscriptionResponse
  companyName: string
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: ChangeSubscriptionItemQuantityRequest]
}>()

const quantityId = useId()
const effectiveId = useId()
const reasonId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive({ quantity: '', effectiveDate: '', reason: '' })
const touched = reactive({ quantity: false, effectiveDate: false, reason: false })
const clientRequestId = ref('')

const today = computed(() => todayISODate())

const quantityNumber = computed(() => {
  const parsed = Number(form.quantity.replace(',', '.'))
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN
})

function validateQuantity(value: string): string {
  if (!value.trim()) return 'La cantidad nueva es obligatoria.'
  const n = quantityNumber.value
  if (Number.isNaN(n) || n < 1) return 'La cantidad tiene que ser un número entero de 1 o más.'
  if (n === props.item.quantity)
    return `Ya son ${props.item.quantity}. Escribe una cantidad distinta o cierra el modal: abrir una línea idéntica no cambia nada y sí ensucia el expediente.`
  return ''
}

/**
 * La fecha del cambio no puede caer antes de que la línea existiera: cerraría un
 * tramo hacia atrás y dejaría el expediente diciendo algo que no pasó.
 */
function validateEffectiveDate(value: string): string {
  if (!value) return 'La fecha desde la que aplica es obligatoria.'
  if (!parseISODate(value)) return 'La fecha no es válida. Usa el calendario del campo.'
  if (value <= props.item.effectiveFrom)
    return `Tiene que ser posterior al ${formatDate(props.item.effectiveFrom)}, que es cuando empezó la línea actual.`
  if (props.item.effectiveTo && value >= props.item.effectiveTo)
    return `La línea ya está cerrada el ${formatDate(props.item.effectiveTo)}: el cambio tiene que caer antes.`
  return ''
}

function validateReason(value: string): string {
  const v = value.trim()
  if (!v) return 'El motivo es obligatorio: queda en el otrosí y es lo que explica el cargo.'
  if (v.length < 5)
    return 'Escribe un motivo de al menos 5 caracteres. Ejemplo: contrató dos usuarios más.'
  if (v.length > 255) return 'El motivo no puede pasar de 255 caracteres.'
  return ''
}

const errors = computed(() => ({
  quantity: validateQuantity(form.quantity),
  effectiveDate: validateEffectiveDate(form.effectiveDate),
  reason: validateReason(form.reason),
}))

type Field = keyof typeof errors.value

const ORDER: Field[] = ['quantity', 'effectiveDate', 'reason']

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(ORDER.map((f) => [f, touched[f] ? errors.value[f] : ''])),
    { quantity: quantityId, effectiveDate: effectiveId, reason: reasonId },
    ORDER,
  ),
)

function err(field: Field): string {
  return touched[field] ? errors.value[field] : ''
}

/** La consecuencia, con la fecha que se acaba de elegir y no con la propuesta. */
const consecuencia = computed(
  () =>
    `Se cerrará la línea actual y se abrirá una nueva desde el ${form.effectiveDate ? formatDate(form.effectiveDate) : '—'}. La línea anterior queda en el expediente.`,
)

const prorrateo = computed(
  () =>
    `Se calculará el proporcional de los días que quedan del periodo, hasta el ${formatDate(props.subscription.currentPeriodEnd)}. El importe exacto aparecerá en el otrosí.`,
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.quantity = String(props.item.quantity)
    // Mañana por defecto no: hoy es la respuesta habitual y una fecha posterior al
    // inicio de la línea es lo que exige el modelo. Cuando la línea empezó hoy
    // mismo, se propone el día siguiente, que es la primera fecha válida.
    form.effectiveDate = today.value > props.item.effectiveFrom ? today.value : ''
    form.reason = ''
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
  emit('submit', {
    subscriptionItemId: props.item.id,
    newQuantity: quantityNumber.value,
    clientRequestId: clientRequestId.value,
    effectiveDate: form.effectiveDate,
    reason: form.reason.trim(),
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Cambiar cantidad"
    :subtitle="`${item.itemName} · ${companyName}`"
    :icon="ICONS.SUBSCRIPTION"
    compact
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <!-- La línea actual, como hecho. Todo lo que se ve aquí viaja intacto a la
             sucesora: por eso son datos y no campos. -->
        <dl class="ds-detail-grid">
          <div>
            <dt class="ds-label">Artículo</dt>
            <dd class="valor">{{ item.itemName }} · {{ item.itemCode }}</dd>
          </div>
          <div>
            <dt class="ds-label">Cantidad actual</dt>
            <dd class="valor ds-num">{{ item.quantity }}</dd>
          </div>
          <div>
            <dt class="ds-label">Precio unitario (congelado)</dt>
            <dd class="valor ds-num">{{ formatCurrency(item.unitAmount) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Incluidas (congelado)</dt>
            <dd class="valor ds-num">{{ item.includedQuantity }}</dd>
          </div>
          <div>
            <dt class="ds-label">Impuesto (congelado)</dt>
            <dd class="valor">{{ taxLabel(item) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Vigente desde</dt>
            <dd class="valor">{{ formatDate(item.effectiveFrom) }}</dd>
          </div>
        </dl>

        <div class="ds-banner ds-banner--info ds-banner--sm">
          <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
          <span>{{ consecuencia }}</span>
        </div>

        <AppInput
          :id="quantityId"
          v-model="form.quantity"
          label="Cantidad nueva"
          required
          type="number"
          inputmode="numeric"
          :error="err('quantity')"
          @blur="touched.quantity = true"
        />

        <AppInput
          :id="effectiveId"
          v-model="form.effectiveDate"
          label="Aplica desde"
          required
          type="date"
          :error="err('effectiveDate')"
          hint="Tiene que ser posterior al día en que empezó la línea actual."
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
          hint="Queda en el otrosí, junto al importe que se recalcula."
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
        {{ saving ? 'Guardando…' : 'Cambiar cantidad' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.valor {
  margin: var(--space-4) 0 0;
}
</style>
