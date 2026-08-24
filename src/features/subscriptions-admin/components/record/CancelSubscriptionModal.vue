<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { formatDate, parseISODate } from '@/composables/format'
import { nowLocalDateTime, todayISODate } from '../../composables/subscriptionDateTime'
import type { SubscriptionResponse } from '../../types/subscriptions-admin.types'
import type { CancelSubscriptionRequest } from '../../types/subscription-record.types'

/**
 * «Cancelar contrato» — <b>dos fechas, no una</b> (§3.4.4).
 *
 * <p>El cliente cancela el 10 y se va el 30, que es lo que ya pagó. El texto lo
 * dice separado y en ese orden, porque fundir las dos fechas en una es lo que
 * hace que soporte le diga a un cliente que ya no tiene servicio cuando todavía
 * lo tiene. El backend hace lo mismo: `CancelSubscriptionService` anota la
 * petición y <b>no cambia el estado</b>; el paso a `CANCELLED` lo hace el proceso
 * que atiende la fecha efectiva.
 *
 * <p><b>`clientRequestId` se genera una vez al abrir el modal</b>, no en cada
 * envío. Es la llave de idempotencia que el servicio consulta antes de emitir el
 * otrosí de baja: con ella, dos clics en «Cancelar contrato» no emiten dos.
 * Regenerarla en cada envío la anularía justo cuando sirve.
 *
 * <p><b>Esta pantalla ya no envía importes.</b> `prorationAmount` y `monthlyDeltaAmount` se
 * mandaban en cero porque el contrato los declaraba `@NotNull` y la consola no tenía con qué
 * calcularlos. Desde la incidencia #386 los calcula el servidor —`ProrationCalculator`, sobre las
 * líneas vigentes del contrato— y la petición ya no los admite. El abono que verá el operador en
 * el otrosí de baja es, por fin, el real.
 */
const props = defineProps<{
  open: boolean
  subscription: SubscriptionResponse
  companyName: string
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; submit: [payload: CancelSubscriptionRequest] }>()

const effectiveId = useId()
const reasonId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive({ effectiveDate: '', reason: '' })
const touched = reactive({ effectiveDate: false, reason: false })
const clientRequestId = ref('')
const requestedAt = ref('')

const today = computed(() => todayISODate())

function validateEffectiveDate(value: string): string {
  if (!value)
    return 'La fecha efectiva es obligatoria: es el día en que la empresa deja de tener servicio.'
  const parsed = parseISODate(value)
  if (!parsed) return 'La fecha no es válida. Usa el calendario del campo.'
  if (value < today.value)
    return 'La fecha efectiva no puede ser anterior a hoy: no se puede dar de baja hacia atrás.'
  return ''
}

function validateReason(value: string): string {
  const v = value.trim()
  if (!v)
    return 'El motivo es obligatorio: es la única fuente que dice por qué se van los clientes.'
  if (v.length < 5) return 'Escribe un motivo de al menos 5 caracteres. Ejemplo: cerró la clínica.'
  if (v.length > 255) return 'El motivo no puede pasar de 255 caracteres.'
  return ''
}

const errors = computed(() => ({
  effectiveDate: validateEffectiveDate(form.effectiveDate),
  reason: validateReason(form.reason),
}))

const summaryItems = computed(() =>
  toSummaryItems(
    {
      effectiveDate: touched.effectiveDate ? errors.value.effectiveDate : '',
      reason: touched.reason ? errors.value.reason : '',
    },
    { effectiveDate: effectiveId, reason: reasonId },
    ['effectiveDate', 'reason'],
  ),
)

function err(field: 'effectiveDate' | 'reason'): string {
  return touched[field] ? errors.value[field] : ''
}

/**
 * Las dos fechas en una frase, que es como se le lee a un cliente por teléfono.
 * Se recalcula al cambiar el campo para que lo que se lee sea lo que se va a
 * enviar, no lo que se propuso por defecto.
 */
const dosFechas = computed(() => {
  const efectiva = form.effectiveDate ? formatDate(form.effectiveDate) : '—'
  return `Se solicita hoy, ${formatDate(today.value)}. El servicio sigue activo hasta el ${efectiva}, que es el periodo ya pagado.`
})

/** Permanencia del plan: es un hecho del contrato y se dice, no se decide aquí. */
const permanencia = computed(() => {
  const end = props.subscription.commitmentEndDate
  if (!end || !form.effectiveDate || form.effectiveDate >= end) return ''
  return `El plan tiene permanencia hasta el ${formatDate(end)}, después de la fecha efectiva elegida.`
})

/**
 * Al abrir: fecha efectiva propuesta al final del periodo ya pagado —el caso
 * normal—, motivo en blanco y una llave de idempotencia nueva.
 */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    const periodEnd = props.subscription.currentPeriodEnd
    form.effectiveDate = periodEnd && periodEnd >= today.value ? periodEnd : today.value
    form.reason = ''
    touched.effectiveDate = false
    touched.reason = false
    clientRequestId.value = crypto.randomUUID()
    requestedAt.value = nowLocalDateTime()
  },
)

function submit() {
  touched.effectiveDate = true
  touched.reason = true
  if (errors.value.effectiveDate || errors.value.reason) {
    void summary.value?.focus()
    return
  }
  emit('submit', {
    requestedAt: requestedAt.value,
    effectiveDate: form.effectiveDate,
    reason: form.reason.trim(),
    clientRequestId: clientRequestId.value,
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Cancelar contrato"
    :subtitle="`${subscription.subscriptionNumber} · ${companyName}`"
    :icon="ICONS.WARNING"
    accent="danger"
    role="alertdialog"
    compact
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <p class="ds-dialog-body">
          ¿Cancelar el contrato {{ subscription.subscriptionNumber }} de {{ companyName }}?
        </p>

        <div class="ds-banner ds-banner--info ds-banner--sm">
          <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
          <span>{{ dosFechas }}</span>
        </div>

        <AppInput
          :id="effectiveId"
          v-model="form.effectiveDate"
          label="Fecha efectiva"
          required
          type="date"
          :error="err('effectiveDate')"
          hint="Por defecto, el final del periodo ya pagado."
          @blur="touched.effectiveDate = true"
        />

        <p v-if="permanencia" class="ds-meta">{{ permanencia }}</p>

        <AppTextarea
          :id="reasonId"
          v-model="form.reason"
          label="Motivo"
          required
          :rows="3"
          hint="Queda en el otrosí de baja. Es lo que se mira cuando se pregunta por qué se van los clientes."
          :error="err('reason')"
          @blur="touched.reason = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        No cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--danger" :disabled="saving" @click="submit">
        {{ saving ? 'Guardando…' : 'Cancelar contrato' }}
      </button>
    </template>
  </ModalShell>
</template>
