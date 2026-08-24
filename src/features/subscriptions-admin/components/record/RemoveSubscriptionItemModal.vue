<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { formatDate, parseISODate } from '@/composables/format'
import { todayISODate } from '../../composables/subscriptionDateTime'
import type { SubscriptionResponse } from '../../types/subscriptions-admin.types'
import type {
  RemoveSubscriptionItemRequest,
  SubscriptionItemResponse,
} from '../../types/subscription-items.types'

/**
 * «Dar de baja» — `PATCH /subscriptions/{id}/items/remove`.
 *
 * <p><b>El texto de §4.4.2 es literal y no se resume</b>, porque es lo que el
 * operador va a repetir por teléfono y porque es lo que separa este modelo del
 * anterior:
 *
 * <blockquote>No se borra nada. La línea queda en el expediente con fecha de fin del
 * {fecha}, y los datos de la empresa pasan a <b>solo lectura</b>, no se
 * eliminan.</blockquote>
 *
 * <p>Por eso el modal no es `accent="danger"` ni `role="alertdialog"` aunque
 * `CancelSubscriptionModal` sí lo sea: aquello termina un contrato, esto cierra un
 * tramo. Pintarlo en rojo diría «vas a destruir algo», y lo que va a pasar es que se
 * escribe una fecha.
 *
 * <p>El artículo del núcleo no llega hasta aquí: la tabla no ofrece la acción, porque
 * el backend la rechaza y ofrecerla sería prometer algo que no existe.
 */
const props = defineProps<{
  open: boolean
  item: SubscriptionItemResponse
  subscription: SubscriptionResponse
  companyName: string
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; submit: [payload: RemoveSubscriptionItemRequest] }>()

const effectiveId = useId()
const reasonId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive({ effectiveDate: '', reason: '' })
const touched = reactive({ effectiveDate: false, reason: false })
const clientRequestId = ref('')

const today = computed(() => todayISODate())

function validateEffectiveDate(value: string): string {
  if (!value) return 'La fecha de fin es obligatoria: es lo único que esta operación escribe.'
  if (!parseISODate(value)) return 'La fecha no es válida. Usa el calendario del campo.'
  if (value <= props.item.effectiveFrom)
    return `Tiene que ser posterior al ${formatDate(props.item.effectiveFrom)}, que es cuando empezó la línea.`
  return ''
}

function validateReason(value: string): string {
  const v = value.trim()
  if (!v)
    return 'El motivo es obligatorio: es lo que explica seis meses después por qué se quitó este módulo.'
  if (v.length < 5)
    return 'Escribe un motivo de al menos 5 caracteres. Ejemplo: dejó de usar el spa.'
  if (v.length > 255) return 'El motivo no puede pasar de 255 caracteres.'
  return ''
}

const errors = computed(() => ({
  effectiveDate: validateEffectiveDate(form.effectiveDate),
  reason: validateReason(form.reason),
}))

type Field = keyof typeof errors.value

const ORDER: Field[] = ['effectiveDate', 'reason']

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(ORDER.map((f) => [f, touched[f] ? errors.value[f] : ''])),
    { effectiveDate: effectiveId, reason: reasonId },
    ORDER,
  ),
)

function err(field: Field): string {
  return touched[field] ? errors.value[field] : ''
}

/** La frase literal de §4.4.2, con la fecha que se acaba de elegir. */
const queRealmentePasa = computed(
  () =>
    `No se borra nada. La línea queda en el expediente con fecha de fin del ${form.effectiveDate ? formatDate(form.effectiveDate) : '—'}, y los datos de la empresa pasan a solo lectura, no se eliminan.`,
)

const prorrateo = computed(
  () =>
    `Se calculará el proporcional de los días que quedan del periodo, hasta el ${formatDate(props.subscription.currentPeriodEnd)}. El importe exacto aparecerá en el otrosí.`,
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.effectiveDate = today.value > props.item.effectiveFrom ? today.value : ''
    form.reason = ''
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
    clientRequestId: clientRequestId.value,
    effectiveDate: form.effectiveDate,
    reason: form.reason.trim(),
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Dar de baja el artículo"
    :subtitle="`${item.itemName} · ${companyName}`"
    :icon="ICONS.HISTORY"
    compact
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <p class="ds-dialog-body">
          ¿Dar de baja «{{ item.itemName }}» en {{ subscription.subscriptionNumber }}, de
          {{ companyName }}?
        </p>

        <div class="ds-banner ds-banner--info ds-banner--sm">
          <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
          <span>{{ queRealmentePasa }}</span>
        </div>

        <AppInput
          :id="effectiveId"
          v-model="form.effectiveDate"
          label="Fecha de fin"
          required
          type="date"
          :error="err('effectiveDate')"
          hint="El día escrito ya no está cubierto: la línea deja de contar a partir de él."
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
          hint="Queda en el otrosí de baja. Es la única fuente que dice por qué se quitó."
          :error="err('reason')"
          @blur="touched.reason = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        No dar de baja
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Guardando…' : 'Dar de baja' }}
      </button>
    </template>
  </ModalShell>
</template>
