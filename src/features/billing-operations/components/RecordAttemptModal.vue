<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import {
  parseAmount,
  parseId,
  toInstant,
  validateAmount,
  validateId,
  validateInstant,
} from '../composables/moneyFields'
import {
  DECLINE_KINDS,
  DECLINE_KIND_PRESENTATION,
  type DeclineKind,
  type RecordPaymentAttemptRequest,
} from '../types/payment-attempts.types'

/**
 * <b>Anotar un intento de cobro y su rechazo.</b>
 *
 * <p><b>La familia del rechazo gobierna el formulario, no solo el rótulo.</b> Al
 * elegir «rechazo duro», el campo del próximo reintento <b>desaparece</b> y en su
 * sitio se explica por qué: las redes penalizan el reintento excesivo y programarlo
 * es programar una multa. Un campo apagado invitaría a preguntarse cómo encenderlo;
 * su ausencia con su motivo cierra la pregunta.
 *
 * <p>Con «error nuestro» aparece el aviso que evita el otro daño: ese intento
 * <b>no</b> consume los intentos del cliente ni arranca cobranza contra él.
 * Clasificarlo mal es restringirle la cuenta por una credencial mal puesta.
 *
 * <p><b>La empresa se escribe.</b> El endpoint la exige como parámetro y tiene que
 * ser la del documento que se intentó cobrar; heredarla de la pantalla sería anotar
 * el intento contra la clínica equivocada.
 */
const props = defineProps<{
  open: boolean
  saving: boolean
  defaultCompanyId?: number | null
}>()

const emit = defineEmits<{
  close: []
  submit: [companyId: number, payload: RecordPaymentAttemptRequest]
}>()

type Field =
  | 'companyId'
  | 'billingDocumentId'
  | 'paymentMethodId'
  | 'gateway'
  | 'requestedAmount'
  | 'gatewayDeclineCode'
  | 'declineKind'
  | 'attemptedAt'
  | 'nextAttemptAt'

const ORDER: Field[] = [
  'companyId',
  'billingDocumentId',
  'gateway',
  'requestedAmount',
  'declineKind',
  'gatewayDeclineCode',
  'attemptedAt',
  'nextAttemptAt',
  'paymentMethodId',
]

const ids = Object.fromEntries(ORDER.map((field) => [field, useId()])) as Record<Field, string>

const KIND_OPTIONS: { value: string; label: string }[] = DECLINE_KINDS.map((value) => ({
  value,
  label: DECLINE_KIND_PRESENTATION[value].label,
}))

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive<Record<Field, string>>({
  companyId: '',
  billingDocumentId: '',
  paymentMethodId: '',
  gateway: '',
  requestedAmount: '',
  gatewayDeclineCode: '',
  declineKind: '',
  attemptedAt: '',
  nextAttemptAt: '',
})

const touched = reactive<Record<Field, boolean>>({
  companyId: false,
  billingDocumentId: false,
  paymentMethodId: false,
  gateway: false,
  requestedAmount: false,
  gatewayDeclineCode: false,
  declineKind: false,
  attemptedAt: false,
  nextAttemptAt: false,
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    for (const field of ORDER) {
      form[field] = ''
      touched[field] = false
    }
    form.companyId = props.defaultCompanyId ? String(props.defaultCompanyId) : ''
  },
)

const kind = computed(() => (form.declineKind ? (form.declineKind as DeclineKind) : null))

const retryable = computed(() =>
  kind.value ? DECLINE_KIND_PRESENTATION[kind.value].retryable : false,
)

/**
 * Al pasar a un rechazo duro se limpia el reintento ya escrito: dejarlo dentro del
 * estado y ocultarlo solo en el marcado lo mandaría igual al servidor.
 */
watch(retryable, (allowed) => {
  if (!allowed) {
    form.nextAttemptAt = ''
    touched.nextAttemptAt = false
  }
})

const errors = computed<Record<Field, string>>(() => ({
  companyId: validateId(form.companyId, 'La empresa'),
  billingDocumentId: validateId(form.billingDocumentId, 'El documento que se intentó cobrar'),
  paymentMethodId: validateId(form.paymentMethodId, 'El medio de pago', false),
  gateway: form.gateway.trim()
    ? form.gateway.trim().length > 40
      ? 'La pasarela no puede pasar de 40 caracteres.'
      : ''
    : 'La pasarela es obligatoria.',
  requestedAmount: validateAmount(form.requestedAmount, 'El importe intentado'),
  gatewayDeclineCode:
    form.gatewayDeclineCode.trim().length > 50
      ? 'El código de rechazo no puede pasar de 50 caracteres.'
      : '',
  declineKind: form.declineKind ? '' : 'Debes seleccionar la familia del rechazo.',
  attemptedAt: validateInstant(form.attemptedAt, 'La fecha del intento', false),
  nextAttemptAt:
    retryable.value && form.nextAttemptAt.trim()
      ? validateInstant(form.nextAttemptAt, 'La fecha del próximo reintento', true)
      : '',
}))

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

const summaryItems = computed(() =>
  toSummaryItems(Object.fromEntries(ORDER.map((field) => [field, err(field)])), ids, ORDER),
)

function submit() {
  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    summary.value?.focus()
    return
  }
  emit('submit', Number(form.companyId), {
    billingDocumentId: parseId(form.billingDocumentId) ?? 0,
    paymentMethodId: parseId(form.paymentMethodId),
    gateway: form.gateway.trim(),
    requestedAmount: parseAmount(form.requestedAmount) ?? 0,
    gatewayDeclineCode: form.gatewayDeclineCode.trim() || null,
    declineKind: form.declineKind as DeclineKind,
    attemptedAt: toInstant(form.attemptedAt),
    // En un rechazo duro viaja `null` siempre, pase lo que pase en el marcado.
    nextAttemptAt:
      retryable.value && form.nextAttemptAt.trim() ? toInstant(form.nextAttemptAt) : null,
  })
}

function isDirty() {
  return ORDER.some((field) => form[field].trim() !== '')
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Anotar un intento de cobro"
    :icon="ICONS.RECEIPT"
    compact
    :width="620"
    :confirm-close-when="isDirty"
    confirm-close-title="Se perderán los datos escritos"
    confirm-close-message="El intento no se ha anotado. Si sales ahora se pierde lo escrito."
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <AppInput
          :id="ids.companyId"
          v-model="form.companyId"
          label="Empresa"
          required
          inputmode="numeric"
          hint="La del documento que se intentó cobrar."
          :error="err('companyId')"
          @blur="touched.companyId = true"
        />

        <AppInput
          :id="ids.billingDocumentId"
          v-model="form.billingDocumentId"
          label="Documento que se intentó cobrar"
          required
          inputmode="numeric"
          :error="err('billingDocumentId')"
          @blur="touched.billingDocumentId = true"
        />

        <AppInput
          :id="ids.gateway"
          v-model="form.gateway"
          label="Pasarela"
          required
          :maxlength="40"
          :error="err('gateway')"
          @blur="touched.gateway = true"
        />

        <AppInput
          :id="ids.requestedAmount"
          v-model="form.requestedAmount"
          label="Importe intentado"
          required
          inputmode="decimal"
          :error="err('requestedAmount')"
          @blur="touched.requestedAmount = true"
        />

        <AppSelect
          :id="ids.declineKind"
          v-model="form.declineKind"
          :options="KIND_OPTIONS"
          label="Familia del rechazo"
          required
          placeholder="Qué contestó la pasarela"
          :hint="kind ? DECLINE_KIND_PRESENTATION[kind].meaning : undefined"
          :error="err('declineKind')"
          @blur="touched.declineKind = true"
        />

        <!-- Rechazo duro: el reintento desaparece, con su motivo. -->
        <div v-if="kind === 'HARD'" class="ds-banner ds-banner--warning">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            Un rechazo duro <strong>no se reintenta nunca</strong>: el emisor prohíbe el cobro y las
            redes penalizan el reintento. Por eso aquí no hay fecha de próximo intento — lo que hay
            que hacer es pedirle otro medio de pago al cliente.
          </span>
        </div>

        <!-- Error nuestro: el aviso que impide perseguir al cliente. -->
        <div v-else-if="kind === 'CONFIGURATION'" class="ds-banner ds-banner--info">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            Este intento
            <strong>no consume los intentos del cliente ni arranca cobranza contra él</strong>:
            falló nuestra configuración o la pasarela, y contárselo sería restringirle la cuenta por
            una avería que no es suya.
          </span>
        </div>

        <AppInput
          :id="ids.gatewayDeclineCode"
          v-model="form.gatewayDeclineCode"
          label="Código de rechazo de la pasarela"
          :maxlength="50"
          hint="El código crudo del proveedor. Es lo que se pega en su soporte."
          :error="err('gatewayDeclineCode')"
          @blur="touched.gatewayDeclineCode = true"
        />

        <AppInput
          :id="ids.attemptedAt"
          v-model="form.attemptedAt"
          label="Fecha y hora del intento"
          required
          type="datetime-local"
          :error="err('attemptedAt')"
          @blur="touched.attemptedAt = true"
        />

        <AppInput
          v-if="retryable"
          :id="ids.nextAttemptAt"
          v-model="form.nextAttemptAt"
          label="Próximo reintento"
          type="datetime-local"
          hint="Opcional. Déjalo vacío si todavía no hay fecha decidida."
          :error="err('nextAttemptAt')"
          @blur="touched.nextAttemptAt = true"
        />

        <AppInput
          :id="ids.paymentMethodId"
          v-model="form.paymentMethodId"
          label="Medio de pago"
          inputmode="numeric"
          hint="Opcional: el medio guardado de la empresa con el que se intentó."
          :error="err('paymentMethodId')"
          @blur="touched.paymentMethodId = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Anotando…' : 'Anotar el intento' }}
      </button>
    </template>
  </ModalShell>
</template>
