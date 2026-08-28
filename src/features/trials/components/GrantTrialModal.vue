<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import SignedActionModal, {
  type SignedActionSignature,
} from '@/components/ui/SignedActionModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import {
  TRIAL_GRANT_BACKING_OPTIONS,
  TRIAL_GRANT_CONSEQUENCE,
  TRIAL_GRANT_NO_DURABLE_TRACE,
  TRIAL_GRANT_REASONS,
  TRIAL_GRANT_REASON_REQUIRES,
  TRIAL_POLICY_OUTCOME_LABEL,
  addDays,
  businessToday,
  grantBackingMismatch,
  validateGrantedDays,
  type TrialGrantBacking,
  type TrialGrantReason,
} from '../composables/trialWindowText'
import type { GrantTrialRequest, TrialPolicyOutcome } from '../types/trials.types'

/**
 * <b>Conceder un artículo a mano</b> — `POST /system/company-trial-grants/
 * companies/{companyId}`.
 *
 * <p><b>Por qué esto SÍ es un `SignedActionModal` y abrir una ventana no lo es.</b>
 * Ninguno de los dos cuerpos tiene campo de motivo, así que la pregunta no puede
 * ser «¿viaja el motivo?» —no viaja en ninguno—. La pregunta es si la elección
 * del operador <b>cambia lo que se manda</b>. Al abrir una ventana no cambia
 * nada: `sourceQuoteId` es obligatorio pase lo que pase, así que un desplegable
 * de motivos sería adorno, y `OpenTrialWindowModal.vue` lo rechaza con razón.
 * Aquí sí cambia: `sourceQuoteId` y `grantingAmendmentId` son los dos opcionales
 * en el contrato, y el motivo <b>decide cuál de los dos tiene que ir</b>. El
 * motivo deja de ser una frase que el borde tira y pasa a gobernar el número que
 * el servidor sí guarda.
 *
 * <p><b>El respaldo se elige aparte del motivo, y luego se contrastan.</b>
 * `SignedActionModal` no expone su motivo como `v-model` —es suyo, y validarlo
 * es su razón de ser—, así que este formulario no puede reaccionar al motivo
 * mientras se escribe. En vez de espiarlo con un truco frágil, pide el respaldo
 * por su cuenta y <b>cruza los dos al firmar</b>: si el motivo dice «se vendió en
 * una cotización» y el respaldo dice «enmienda», la firma se para con el texto
 * exacto de la contradicción (WCAG 2.2 §3.3.1, resumen de errores con enlace al
 * campo). Es el patrón de validación al enviar de GOV.UK, no un botón apagado
 * que no diría qué falta.
 *
 * <p><b>Cuando no hay documento detrás, se dice en voz alta.</b> «Sin documento»
 * es una opción legítima —un gesto comercial existe— pero deja una concesión sin
 * nada a lo que apuntar, así que se pinta {@link TRIAL_GRANT_NO_DURABLE_TRACE} en
 * cuanto se elige, y con esos motivos la nota pasa a ser obligatoria. Un hueco
 * declarado, no un hueco silencioso.
 *
 * <p><b>Los días son obligatorios y el validador exige ≥ 1.</b> El `@NotNull` del
 * borde acepta el cero, y una concesión de cero días es justamente la que
 * sobrevive a todos los recálculos: ninguno la retira porque ninguno la ve
 * vencer. El techo de 365 lo pone esta pantalla, no el contrato: más de un año
 * sin contrato y sin cargo no es una prueba.
 *
 * <p><b>El último día se calcula y se enseña antes de firmar</b>, igual que al
 * abrir la ventana: `concedida el + (días − 1)`. Es la aritmética que se hace mal
 * a ojo, y aquí no hay segunda oportunidad — una concesión no se edita.
 *
 * <p>⚠️ <b>El artículo se pide por número.</b> El contrato no publica ningún
 * listado de artículos concedibles, y `CompanyTrialGrantResponse` solo devuelve
 * `catalogItemId`. Un desplegable escrito a mano se quedaría corto en cuanto se
 * sembrara un artículo nuevo. Se pide el número, con su rótulo diciendo qué es.
 */
const props = defineProps<{
  open: boolean
  companyName: string
  /** El último día de la ventana vigente, si la hay. Recorta lo que se conceda. */
  windowEndDate?: string | null
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; submit: [payload: GrantTrialRequest] }>()

const itemId = useId()
const grantedOnId = useId()
const daysId = useId()
const policyDaysId = useId()
const policyOutcomeId = useId()
const backingId = useId()
const documentId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

/**
 * El motivo que entregó `SignedActionModal` al firmar. Vacío hasta el primer
 * intento: antes de firmar, este formulario no lo conoce y no puede acusar una
 * contradicción que todavía no existe.
 */
const signedReason = ref<TrialGrantReason | ''>('')

const form = reactive({
  catalogItemId: '',
  grantedOn: '',
  daysGranted: '',
  policyTrialDays: '',
  policyTrialOutcome: 'CONVERT_TO_PAID' as TrialPolicyOutcome,
  backing: 'QUOTE' as TrialGrantBacking,
  document: '',
})

const touched = reactive({
  catalogItemId: false,
  grantedOn: false,
  daysGranted: false,
  policyTrialDays: false,
  backing: false,
  document: false,
})

const today = computed(() => businessToday())

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function positiveInt(value: string): number {
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN
}

function validateReference(value: string, missing: string): string {
  if (!value.trim()) return missing
  const parsed = positiveInt(value)
  if (Number.isNaN(parsed) || parsed < 1) return 'Escribe el número, sin el «#».'
  return ''
}

/** El número del respaldo solo se exige cuando hay respaldo que pedir. */
function validateDocument(): string {
  if (form.backing === 'NONE') return ''
  return validateReference(
    form.document,
    form.backing === 'AMENDMENT'
      ? 'La enmienda es obligatoria: es lo único que quedará en el servidor explicando la concesión.'
      : 'La cotización es obligatoria: es lo único que quedará en el servidor explicando la concesión.',
  )
}

/**
 * La contradicción entre el motivo firmado y el respaldo elegido. Vacía hasta el
 * primer intento de firma — ver {@link signedReason}.
 */
function validateBacking(): string {
  if (signedReason.value === '') return ''
  return grantBackingMismatch(signedReason.value, form.backing)
}

const errors = computed(() => ({
  catalogItemId: validateReference(form.catalogItemId, 'El artículo es obligatorio.'),
  grantedOn: !form.grantedOn
    ? 'La fecha de la concesión es obligatoria.'
    : !ISO_DATE.test(form.grantedOn)
      ? 'La fecha no es válida. Usa el calendario del campo.'
      : '',
  daysGranted: validateGrantedDays(form.daysGranted),
  policyTrialDays: !form.policyTrialDays.trim()
    ? 'Los días de la política son obligatorios: es lo que el artículo dice que dura su prueba.'
    : Number.isNaN(positiveInt(form.policyTrialDays)) || positiveInt(form.policyTrialDays) < 0
      ? 'Tienen que ser un número entero de 0 o más.'
      : '',
  backing: validateBacking(),
  document: validateDocument(),
}))

type Field = keyof typeof errors.value

const ORDER: Field[] = [
  'catalogItemId',
  'grantedOn',
  'daysGranted',
  'policyTrialDays',
  'backing',
  'document',
]

const FIELD_IDS: Record<Field, string> = {
  catalogItemId: itemId,
  grantedOn: grantedOnId,
  daysGranted: daysId,
  policyTrialDays: policyDaysId,
  backing: backingId,
  document: documentId,
}

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(ORDER.map((field) => [field, touched[field] ? errors.value[field] : ''])),
    FIELD_IDS,
    ORDER,
  ),
)

function err(field: Field): string {
  return touched[field] ? errors.value[field] : ''
}

/** El último día de la concesión, incluido: `concedida el + (días − 1)`. */
const previewEnd = computed(() => {
  if (errors.value.grantedOn || errors.value.daysGranted) return null
  return addDays(form.grantedOn, positiveInt(form.daysGranted) - 1)
})

/**
 * Lo que el servidor va a recortar. La ventana manda: una concesión no puede
 * durar más que la prueba dentro de la que vive, y quien firma tiene que ver el
 * número real antes, no el que pidió.
 */
const trimWarning = computed(() => {
  const end = previewEnd.value
  const windowEnd = props.windowEndDate
  if (!end || !windowEnd || !ISO_DATE.test(windowEnd) || end <= windowEnd) return ''
  return `La ventana de prueba termina el ${formatDate(windowEnd)}, antes que esta concesión. El servidor la recortará: los días efectivos serán menos de los ${positiveInt(form.daysGranted)} que estás pidiendo.`
})

/** El aviso de que esta concesión no va a dejar rastro. Es live, no de submit. */
const noTraceWarning = computed(() => (form.backing === 'NONE' ? TRIAL_GRANT_NO_DURABLE_TRACE : ''))

const documentLabel = computed(() =>
  form.backing === 'AMENDMENT' ? 'Número de la enmienda' : 'Número de la cotización',
)

const POLICY_OUTCOME_OPTIONS = (
  Object.keys(TRIAL_POLICY_OUTCOME_LABEL) as TrialPolicyOutcome[]
).map((value) => ({ value, label: TRIAL_POLICY_OUTCOME_LABEL[value] }))

/** Cada apertura empieza en blanco, con la fecha propuesta en hoy. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    signedReason.value = ''
    form.catalogItemId = ''
    form.grantedOn = today.value
    form.daysGranted = ''
    form.policyTrialDays = ''
    form.policyTrialOutcome = 'CONVERT_TO_PAID'
    form.backing = 'QUOTE'
    form.document = ''
    for (const field of ORDER) touched[field] = false
  },
)

/**
 * Cambiar el tipo de respaldo cambia qué número se pide, así que el escrito para
 * el anterior no se arrastra: una cotización presentada como enmienda es peor
 * que un campo vacío.
 */
watch(
  () => form.backing,
  () => {
    form.document = ''
    touched.document = false
  },
)

/**
 * `SignedActionModal` ya validó su motivo y su nota cuando llega aquí — sin
 * motivo no emite nunca. Lo que queda por validar son los campos propios de este
 * formulario, que él no conoce, y el cruce entre su motivo y el respaldo elegido.
 *
 * <p>`signature.note` no se manda: `GrantTrialRequest` no tiene dónde ponerla y
 * no se le inventa un destino. Que no viaja lo dice el propio campo en su pista,
 * antes de escribirla.
 */
function onSigned(signature: SignedActionSignature) {
  signedReason.value = signature.reason as TrialGrantReason
  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    void summary.value?.focus()
    return
  }

  const document = positiveInt(form.document)
  emit('submit', {
    catalogItemId: positiveInt(form.catalogItemId),
    grantedOn: form.grantedOn,
    daysGranted: positiveInt(form.daysGranted),
    policyTrialDays: positiveInt(form.policyTrialDays),
    policyTrialOutcome: form.policyTrialOutcome,
    ...(form.backing === 'QUOTE' ? { sourceQuoteId: document } : {}),
    ...(form.backing === 'AMENDMENT' ? { grantingAmendmentId: document } : {}),
  })
}

/** Los motivos cuya nota es obligatoria: los que no traen documento detrás. */
const NOTE_REQUIRED = Object.entries(TRIAL_GRANT_REASON_REQUIRES)
  .filter(([, backing]) => backing === null)
  .map(([reason]) => reason)
</script>

<template>
  <SignedActionModal
    :open="open"
    title="Conceder un artículo a mano"
    :subtitle="companyName"
    :icon="ICONS.LIMIT"
    :question="`¿Conceder un artículo del catálogo a ${companyName} sin contrato y sin cargo?`"
    :reasons="[...TRIAL_GRANT_REASONS]"
    reason-label="Motivo de la concesión"
    reason-hint="Tiene que cuadrar con el respaldo que elijas abajo: es lo que se comprueba al firmar."
    :note-required-reasons="NOTE_REQUIRED"
    note-label="Nota"
    note-hint="Queda en esta pantalla y no viaja al servidor: el cuerpo de la concesión no tiene campo de nota."
    :consequence="TRIAL_GRANT_CONSEQUENCE"
    confirm-label="Conceder el artículo"
    confirm-tone="danger"
    accent="warn"
    :width="620"
    :saving="saving"
    saving-label="Concediendo…"
    @close="emit('close')"
    @submit="onSigned"
  >
    <template #details>
      <div class="ds-stack ds-stack--14">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <AppInput
          :id="itemId"
          v-model="form.catalogItemId"
          label="Artículo del catálogo"
          type="number"
          inputmode="numeric"
          required
          hint="Su número. El contrato no publica un listado de artículos concedibles."
          :error="err('catalogItemId')"
          @blur="touched.catalogItemId = true"
        />

        <AppInput
          :id="grantedOnId"
          v-model="form.grantedOn"
          label="Concedida el"
          type="date"
          required
          :error="err('grantedOn')"
          @blur="touched.grantedOn = true"
        />

        <AppInput
          :id="daysId"
          v-model="form.daysGranted"
          label="Días concedidos"
          type="number"
          inputmode="numeric"
          required
          hint="Obligatorios: son lo que hace que la concesión caduque. Cuentan desde el primer día, incluido."
          :error="err('daysGranted')"
          @blur="touched.daysGranted = true"
        />

        <p v-if="previewEnd" class="ds-meta">
          Último día de la concesión, incluido:
          <strong>{{ formatDate(previewEnd) }}</strong>
          — se trabaja entero.
        </p>

        <div v-if="trimWarning" class="ds-banner ds-banner--warning" role="status">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ trimWarning }}</span>
        </div>

        <AppInput
          :id="policyDaysId"
          v-model="form.policyTrialDays"
          label="Días de prueba que dice la política del artículo"
          type="number"
          inputmode="numeric"
          required
          hint="Lo que el artículo declara. Puede no coincidir con lo concedido, y si no coincide se verá en la tabla."
          :error="err('policyTrialDays')"
          @blur="touched.policyTrialDays = true"
        />

        <AppSelect
          :id="policyOutcomeId"
          v-model="form.policyTrialOutcome"
          :options="POLICY_OUTCOME_OPTIONS"
          label="Qué debe pasar cuando termine"
          required
          hint="Es la intención escrita hoy, no el desenlace: el desenlace se escribe al vencer."
        />

        <AppSelect
          :id="backingId"
          v-model="form.backing"
          :options="TRIAL_GRANT_BACKING_OPTIONS"
          label="Documento que la respalda"
          required
          hint="Es lo único de esta concesión que queda guardado explicando por qué se dio."
          :error="err('backing')"
          @blur="touched.backing = true"
        />

        <AppInput
          v-if="form.backing !== 'NONE'"
          :id="documentId"
          v-model="form.document"
          :label="documentLabel"
          type="number"
          inputmode="numeric"
          required
          hint="Es la firma de esta concesión: el número que sí viaja al servidor."
          :error="err('document')"
          @blur="touched.document = true"
        />

        <div v-if="noTraceWarning" class="ds-banner ds-banner--warning" role="status">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ noTraceWarning }}</span>
        </div>
      </div>
    </template>
  </SignedActionModal>
</template>
