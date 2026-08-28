<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { parseId, toInstant, validateId, validateInstant } from '../composables/moneyFields'
import {
  CONSUMER_DETERMINATION_LABEL,
  CONSUMER_DETERMINATION_MEANING,
  REVERSAL_CAUSALS,
  REVERSAL_CAUSAL_LABEL,
  REVERSAL_ORIGIN_LABEL,
  type ConsumerDetermination,
  type OpenReversalRequest,
  type ReversalCausal,
  type ReversalOrigin,
} from '../types/payment-reversals.types'

/**
 * <b>Abrir una solicitud de reversión de pago.</b>
 *
 * <p><b>La causal es una de cinco y no hay una sexta.</b> La ley las enumera; una
 * reversión que no encaja en ninguna no procede. Por eso es un desplegable cerrado
 * y no un texto libre: con texto libre, dentro de dos ejercicios nadie puede contar
 * cuántas fueron por fraude y cuántas por producto no recibido, que es la cuenta que
 * pide el regulador.
 *
 * <p><b>Y son tres fechas distintas, no la misma repetida.</b> El reloj del
 * consumidor arranca cuando <b>él</b> tuvo conocimiento, no cuando nos llegó la
 * queja; la notificación al emisor abre además el plazo del banco. Tomar una por
 * otra regala días de plazo, y esa es la forma más común de perder una reversión que
 * se podía haber contestado. El formulario las pide por separado y lo explica.
 *
 * <p><b>«Sin determinar» es una respuesta legítima</b> y por eso está en la lista:
 * la reversión protege al consumidor, y una clínica que compra software para operar
 * normalmente no lo es. Obligar a decidirlo al abrir haría que se resolviera por
 * costumbre.
 */
const props = defineProps<{
  open: boolean
  saving: boolean
  defaultCompanyId?: number | null
}>()

const emit = defineEmits<{ close: []; submit: [companyId: number, payload: OpenReversalRequest] }>()

type Field =
  | 'companyId'
  | 'paymentId'
  | 'origin'
  | 'causal'
  | 'consumerDetermination'
  | 'consumerBecameAwareAt'
  | 'claimReceivedAt'
  | 'issuerNotifiedAt'
  | 'claimEvidenceRef'
  | 'deadlineAt'

const ORDER: Field[] = [
  'companyId',
  'paymentId',
  'origin',
  'causal',
  'consumerDetermination',
  'consumerBecameAwareAt',
  'claimReceivedAt',
  'issuerNotifiedAt',
  'deadlineAt',
  'claimEvidenceRef',
]

const ids = Object.fromEntries(ORDER.map((field) => [field, useId()])) as Record<Field, string>

const ORIGIN_OPTIONS: { value: string; label: string }[] = (
  ['CONSUMER_CLAIM', 'GATEWAY_CHARGEBACK'] as ReversalOrigin[]
).map((value) => ({ value, label: REVERSAL_ORIGIN_LABEL[value] }))

const CAUSAL_OPTIONS: { value: string; label: string }[] = REVERSAL_CAUSALS.map((value) => ({
  value,
  label: REVERSAL_CAUSAL_LABEL[value],
}))

const DETERMINATION_OPTIONS: { value: string; label: string }[] = (
  ['CONSUMER', 'NOT_CONSUMER', 'UNDETERMINED'] as ConsumerDetermination[]
).map((value) => ({ value, label: CONSUMER_DETERMINATION_LABEL[value] }))

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive<Record<Field, string>>({
  companyId: '',
  paymentId: '',
  origin: '',
  causal: '',
  consumerDetermination: '',
  consumerBecameAwareAt: '',
  claimReceivedAt: '',
  issuerNotifiedAt: '',
  claimEvidenceRef: '',
  deadlineAt: '',
})

const touched = reactive<Record<Field, boolean>>({
  companyId: false,
  paymentId: false,
  origin: false,
  causal: false,
  consumerDetermination: false,
  consumerBecameAwareAt: false,
  claimReceivedAt: false,
  issuerNotifiedAt: false,
  claimEvidenceRef: false,
  deadlineAt: false,
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
    form.consumerDetermination = 'UNDETERMINED'
  },
)

const determination = computed(() =>
  form.consumerDetermination ? (form.consumerDetermination as ConsumerDetermination) : null,
)

/**
 * Que el consumidor supiera <b>después</b> de que nos llegara la queja es imposible,
 * y casi siempre significa que se copió la misma fecha en los dos campos. No se
 * bloquea el envío por si el dato real es raro, pero se dice: el orden de estas dos
 * fechas es lo que decide cuántos días de plazo quedan.
 */
const awareAfterClaim = computed(() => {
  if (!form.consumerBecameAwareAt || !form.claimReceivedAt) return false
  return new Date(form.consumerBecameAwareAt).getTime() > new Date(form.claimReceivedAt).getTime()
})

const errors = computed<Record<Field, string>>(() => ({
  companyId: validateId(form.companyId, 'La empresa'),
  paymentId: validateId(form.paymentId, 'El pago que se pide revertir'),
  origin: form.origin ? '' : 'Debes seleccionar el origen de la solicitud.',
  causal: form.causal ? '' : 'Debes seleccionar una de las cinco causales: la lista es cerrada.',
  consumerDetermination: form.consumerDetermination
    ? ''
    : 'Debes indicar si quien reclama es consumidor.',
  consumerBecameAwareAt: form.consumerBecameAwareAt.trim()
    ? validateInstant(form.consumerBecameAwareAt, 'La fecha de conocimiento', false)
    : '',
  claimReceivedAt: validateInstant(form.claimReceivedAt, 'La fecha de la queja', false),
  issuerNotifiedAt: form.issuerNotifiedAt.trim()
    ? validateInstant(form.issuerNotifiedAt, 'La fecha de notificación al emisor', false)
    : '',
  claimEvidenceRef:
    form.claimEvidenceRef.trim().length > 255
      ? 'La referencia de la prueba no puede pasar de 255 caracteres.'
      : '',
  deadlineAt: validateInstant(form.deadlineAt, 'La fecha límite para contestar', true),
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
    paymentId: parseId(form.paymentId) ?? 0,
    origin: form.origin as ReversalOrigin,
    causal: form.causal as ReversalCausal,
    consumerDetermination: form.consumerDetermination as ConsumerDetermination,
    consumerBecameAwareAt: form.consumerBecameAwareAt.trim()
      ? toInstant(form.consumerBecameAwareAt)
      : null,
    claimReceivedAt: toInstant(form.claimReceivedAt),
    issuerNotifiedAt: form.issuerNotifiedAt.trim() ? toInstant(form.issuerNotifiedAt) : null,
    claimEvidenceRef: form.claimEvidenceRef.trim() || null,
    deadlineAt: toInstant(form.deadlineAt),
  })
}

function isDirty() {
  return ORDER.some((field) => field !== 'consumerDetermination' && form[field].trim() !== '')
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Abrir una solicitud de reversión de pago"
    subtitle="Estatuto del Consumidor · causales tasadas"
    :icon="ICONS.WARNING"
    accent="warn"
    compact
    :width="640"
    :confirm-close-when="isDirty"
    confirm-close-title="Se perderán los datos escritos"
    confirm-close-message="La solicitud no se ha abierto. Si sales ahora se pierde lo escrito."
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <div class="ds-banner ds-banner--info">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            Las <strong>tres fechas son distintas</strong>. El reloj del consumidor arranca cuando
            <strong>él</strong> tuvo conocimiento, no cuando nos llegó la queja; la notificación al
            emisor abre además el plazo del banco.
          </span>
        </div>

        <AppInput
          :id="ids.companyId"
          v-model="form.companyId"
          label="Empresa"
          required
          inputmode="numeric"
          hint="La del pago que se pide revertir."
          :error="err('companyId')"
          @blur="touched.companyId = true"
        />

        <AppInput
          :id="ids.paymentId"
          v-model="form.paymentId"
          label="Pago"
          required
          inputmode="numeric"
          :error="err('paymentId')"
          @blur="touched.paymentId = true"
        />

        <AppSelect
          :id="ids.origin"
          v-model="form.origin"
          :options="ORIGIN_OPTIONS"
          label="Origen"
          required
          placeholder="Quién la pide"
          :error="err('origin')"
          @blur="touched.origin = true"
        />

        <AppSelect
          :id="ids.causal"
          v-model="form.causal"
          :options="CAUSAL_OPTIONS"
          label="Causal"
          required
          placeholder="Una de las cinco"
          hint="La ley las enumera. Si el caso no encaja en ninguna, la reversión no procede."
          :error="err('causal')"
          @blur="touched.causal = true"
        />

        <AppSelect
          :id="ids.consumerDetermination"
          v-model="form.consumerDetermination"
          :options="DETERMINATION_OPTIONS"
          label="¿Quien reclama es consumidor?"
          required
          :hint="determination ? CONSUMER_DETERMINATION_MEANING[determination] : undefined"
          :error="err('consumerDetermination')"
          @blur="touched.consumerDetermination = true"
        />

        <AppInput
          :id="ids.consumerBecameAwareAt"
          v-model="form.consumerBecameAwareAt"
          label="Cuándo tuvo conocimiento el consumidor"
          type="datetime-local"
          hint="Aquí arranca su reloj. Déjalo vacío solo si de verdad no se sabe."
          :error="err('consumerBecameAwareAt')"
          @blur="touched.consumerBecameAwareAt = true"
        />

        <AppInput
          :id="ids.claimReceivedAt"
          v-model="form.claimReceivedAt"
          label="Cuándo llegó la queja"
          required
          type="datetime-local"
          :error="err('claimReceivedAt')"
          @blur="touched.claimReceivedAt = true"
        />

        <p v-if="awareAfterClaim" class="ds-meta nota">
          El conocimiento es posterior a la queja, que no puede ser. Suele significar que se copió
          la misma fecha en los dos campos; revísalo antes de guardar, porque de ese orden depende
          cuántos días de plazo quedan.
        </p>

        <AppInput
          :id="ids.issuerNotifiedAt"
          v-model="form.issuerNotifiedAt"
          label="Cuándo se notificó al emisor"
          type="datetime-local"
          hint="Abre el plazo del banco. Vacío mientras no se haya notificado."
          :error="err('issuerNotifiedAt')"
          @blur="touched.issuerNotifiedAt = true"
        />

        <AppInput
          :id="ids.deadlineAt"
          v-model="form.deadlineAt"
          label="Fecha límite para contestar"
          required
          type="datetime-local"
          hint="Es lo que ordena la lista de trabajo. Tiene que estar en el futuro."
          :error="err('deadlineAt')"
          @blur="touched.deadlineAt = true"
        />

        <AppInput
          :id="ids.claimEvidenceRef"
          v-model="form.claimEvidenceRef"
          label="Referencia de la prueba de la queja"
          :maxlength="255"
          hint="Opcional: el número de radicado, el correo o el expediente donde está."
          :error="err('claimEvidenceRef')"
          @blur="touched.claimEvidenceRef = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Abriendo…' : 'Abrir la solicitud' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.nota {
  margin: 0;
}
</style>
