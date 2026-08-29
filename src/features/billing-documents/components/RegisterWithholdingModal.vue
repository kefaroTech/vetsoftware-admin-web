<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import {
  parseAmount,
  validateAmount,
  validateDate,
  validatePercent,
} from '@/features/billing-operations/composables/moneyFields'
import {
  WITHHOLDING_ROUNDING_TOLERANCE,
  WITHHOLDING_TYPE_MEANING,
  WITHHOLDING_TYPE_OPTIONS,
  type RegisterDocumentWithholdingRequest,
  type WithholdingType,
} from '../types/document-money.types'
import { formatAmount } from '@/composables/format'
import MoneyScopeNote from '@/components/ui/MoneyScopeNote.vue'
/**
 * <b>Registrar la retención que practicó el cliente.</b>
 *
 * <p>El caso que justifica esta pantalla: <i>«Ana debe 213.010. Su contadora le
 * practica retención en la fuente y le gira 205.850. El sistema aplica el pago,
 * deja 7.160 vivos, arranca la mora y su clínica cae a solo lectura por una deuda
 * que fiscalmente no existe.»</i> <b>Una retención saldada no es una deuda</b>: esa
 * plata está en la DIAN, no sin pagar. Registrarla es lo que convierte el saldo
 * vivo en una fila explicada y lo que impide que la cobranza arranque contra
 * alguien que pagó bien.
 *
 * <p><b>El periodo fiscal no es un campo de texto.</b> El contrato lo restringe a
 * `\d{4}-(A|B0[1-6])` —anual o uno de los seis bimestres—, así que se compone de
 * un año y un desplegable cerrado en vez de dejar teclear una cadena que el
 * servidor rechaza con un 400 después de rellenar siete campos.
 *
 * <p><b>El importe no se calcula solo.</b> Base × tarifa se compara con el importe
 * escrito y se avisa si no cuadran, pero no se corrige: el que manda es el que el
 * cliente puso en su certificado, y ajustarlo «para que cuadre» produciría una
 * retención que no coincide con ningún papel. Una diferencia de miles casi siempre
 * es una tarifa mal tecleada, y verlo antes de guardar cuesta un segundo.
 */
const props = defineProps<{
  open: boolean
  /** El documento sobre el que se practicó. Su saldo se pinta como referencia. */
  documentId: number
  documentNumber: string | null
  balanceAmount: number
  saving: boolean
  returnFocusTo?: string
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: RegisterDocumentWithholdingRequest]
}>()

type Field =
  | 'type'
  | 'taxableBase'
  | 'ratePercent'
  | 'amount'
  | 'municipalityCode'
  | 'fiscalYear'
  | 'fiscalPeriod'
  | 'practicedOn'

/** El orden del resumen es el orden VISUAL del formulario (WCAG §2.4.3). */
const ORDER: Field[] = [
  'type',
  'practicedOn',
  'taxableBase',
  'ratePercent',
  'amount',
  'municipalityCode',
  'fiscalYear',
  'fiscalPeriod',
]

const ids = Object.fromEntries(ORDER.map((field) => [field, useId()])) as Record<Field, string>

/** Los siete valores que el contrato acepta en `fiscalPeriodKey`, ya rotulados. */
const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: 'A', label: 'Anual' },
  { value: 'B01', label: 'Bimestre 1 · enero–febrero' },
  { value: 'B02', label: 'Bimestre 2 · marzo–abril' },
  { value: 'B03', label: 'Bimestre 3 · mayo–junio' },
  { value: 'B04', label: 'Bimestre 4 · julio–agosto' },
  { value: 'B05', label: 'Bimestre 5 · septiembre–octubre' },
  { value: 'B06', label: 'Bimestre 6 · noviembre–diciembre' },
]

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const CURRENT_YEAR = String(new Date().getFullYear())

const form = reactive<Record<Field, string>>({
  type: '',
  taxableBase: '',
  ratePercent: '',
  amount: '',
  municipalityCode: '',
  fiscalYear: CURRENT_YEAR,
  fiscalPeriod: '',
  practicedOn: '',
})

const touched = reactive<Record<Field, boolean>>({
  type: false,
  taxableBase: false,
  ratePercent: false,
  amount: false,
  municipalityCode: false,
  fiscalYear: false,
  fiscalPeriod: false,
  practicedOn: false,
})

/** Cada apertura empieza en blanco: una retención nunca hereda la del documento anterior. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    for (const field of ORDER) {
      form[field] = ''
      touched[field] = false
    }
    form.fiscalYear = String(new Date().getFullYear())
  },
)

const isIca = computed(() => form.type === 'ICA')

/**
 * El municipio solo se exige con ICA, y por un motivo que no es de formato: el
 * certificado de reteica lo expide el municipio, no la DIAN. Sin su código no hay
 * a quién pedírselo, y la retención queda registrada pero inservible.
 */
function validateMunicipality(): string {
  const text = form.municipalityCode.trim()
  if (!text) return isIca.value ? 'El código del municipio es obligatorio con ICA.' : ''
  return /^\d{5}$/.test(text)
    ? ''
    : 'El código del municipio son 5 dígitos DIVIPOLA. Ejemplo: 05001'
}

function validateFiscalYear(): string {
  const text = form.fiscalYear.trim()
  if (!text) return 'El año gravable es obligatorio.'
  if (!/^\d{4}$/.test(text)) return 'El año gravable son cuatro dígitos. Ejemplo: 2026'
  const year = Number(text)
  if (year < 2020 || year > 2100) return 'El año gravable tiene que estar entre 2020 y 2100.'
  return ''
}

const errors = computed<Record<Field, string>>(() => ({
  type: form.type ? '' : 'Debes seleccionar el tipo de retención.',
  taxableBase: validateAmount(form.taxableBase, 'La base gravable'),
  ratePercent: validatePercent(form.ratePercent, 'La tarifa'),
  amount: validateAmount(form.amount, 'El importe retenido'),
  municipalityCode: validateMunicipality(),
  fiscalYear: validateFiscalYear(),
  fiscalPeriod: form.fiscalPeriod ? '' : 'Debes seleccionar el periodo fiscal.',
  practicedOn: validateDate(form.practicedOn, 'La fecha en la que se practicó', false),
}))

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

const summaryItems = computed(() =>
  toSummaryItems(Object.fromEntries(ORDER.map((field) => [field, err(field)])), ids, ORDER),
)

/**
 * Base × tarifa contra el importe escrito. No bloquea: avisa. Un peso de
 * diferencia es redondeo del certificado; mil pesos es una tarifa mal tecleada.
 */
const arithmetic = computed(() => {
  const base = parseAmount(form.taxableBase)
  const rate = parseAmount(form.ratePercent)
  const written = parseAmount(form.amount)
  if (base === null || rate === null || written === null) return null
  const expected = Math.round(((base * rate) / 100) * 100) / 100
  const difference = Math.round((written - expected) * 100) / 100
  return {
    expected,
    written,
    difference,
    agrees: Math.abs(difference) <= WITHHOLDING_ROUNDING_TOLERANCE,
  }
})

const typeMeaning = computed(() =>
  form.type ? WITHHOLDING_TYPE_MEANING[form.type as WithholdingType] : undefined,
)

function submit() {
  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    summary.value?.focus()
    return
  }
  emit('submit', {
    billingDocumentId: props.documentId,
    type: form.type as WithholdingType,
    taxableBase: parseAmount(form.taxableBase) ?? 0,
    ratePercent: parseAmount(form.ratePercent) ?? 0,
    amount: parseAmount(form.amount) ?? 0,
    municipalityCode: form.municipalityCode.trim() || null,
    fiscalYear: Number(form.fiscalYear),
    fiscalPeriodKey: form.fiscalYear.trim() + '-' + form.fiscalPeriod,
    practicedOn: form.practicedOn,
  })
}

/** FORM-07 · cerrar con algo escrito pregunta antes de perderlo. */
function isDirty() {
  return ORDER.some((field) => field !== 'fiscalYear' && form[field].trim() !== '')
}

const subtitle = computed(() => {
  const name = props.documentNumber ?? 'Documento #' + props.documentId
  return name + ' · saldo ' + formatAmount(props.balanceAmount)
})
</script>

<template>
  <ModalShell
    :open="open"
    title="Registrar una retención practicada por el cliente"
    :subtitle="subtitle"
    :icon="ICONS.RECEIPT"
    compact
    :width="620"
    :return-focus-to="returnFocusTo"
    :confirm-close-when="isDirty"
    confirm-close-title="Se perderán los datos escritos"
    confirm-close-message="La retención no se ha registrado. Si sales ahora se pierde lo escrito."
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <MoneyScopeNote />

        <div class="ds-banner ds-banner--info">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            Una retención <strong>no es un descuento</strong>: no reduce el ingreso, baja la cartera
            y sube un activo. Y el saldo que quede después de registrarla
            <strong>no es una deuda</strong> — esa plata fue directa a la DIAN.
          </span>
        </div>

        <AppSelect
          :id="ids.type"
          v-model="form.type"
          :options="WITHHOLDING_TYPE_OPTIONS"
          label="Tipo de retención"
          required
          placeholder="Elige el impuesto retenido"
          :hint="typeMeaning"
          :error="err('type')"
          @blur="touched.type = true"
        />

        <AppInput
          :id="ids.practicedOn"
          v-model="form.practicedOn"
          label="Fecha en la que se practicó"
          required
          type="date"
          hint="La del certificado del cliente, no la de hoy."
          :error="err('practicedOn')"
          @blur="touched.practicedOn = true"
        />

        <AppInput
          :id="ids.taxableBase"
          v-model="form.taxableBase"
          label="Base gravable"
          required
          inputmode="decimal"
          hint="Sobre cuánto se calculó. Siempre en positivo."
          :error="err('taxableBase')"
          @blur="touched.taxableBase = true"
        />

        <AppInput
          :id="ids.ratePercent"
          v-model="form.ratePercent"
          label="Tarifa (%)"
          required
          inputmode="decimal"
          placeholder="2,5"
          :error="err('ratePercent')"
          @blur="touched.ratePercent = true"
        />

        <AppInput
          :id="ids.amount"
          v-model="form.amount"
          label="Importe retenido"
          required
          inputmode="decimal"
          hint="El que dice el certificado. No se ajusta para que cuadre con la tarifa."
          :error="err('amount')"
          @blur="touched.amount = true"
        />

        <div v-if="arithmetic && !arithmetic.agrees" class="ds-banner ds-banner--warning">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            Base por tarifa da {{ formatAmount(arithmetic.expected) }} y el importe escrito es
            {{ formatAmount(arithmetic.written) }}: hay
            {{ formatAmount(Math.abs(arithmetic.difference)) }} de diferencia. Se puede guardar así
            —manda el certificado—, pero revisa la tarifa antes.
          </span>
        </div>

        <AppInput
          v-if="isIca"
          :id="ids.municipalityCode"
          v-model="form.municipalityCode"
          label="Código del municipio"
          required
          inputmode="numeric"
          :maxlength="5"
          placeholder="05001"
          hint="Cinco dígitos DIVIPOLA. El certificado de reteica lo expide el municipio, no la DIAN."
          :error="err('municipalityCode')"
          @blur="touched.municipalityCode = true"
        />

        <AppInput
          :id="ids.fiscalYear"
          v-model="form.fiscalYear"
          label="Año gravable"
          required
          inputmode="numeric"
          :maxlength="4"
          :error="err('fiscalYear')"
          @blur="touched.fiscalYear = true"
        />

        <AppSelect
          :id="ids.fiscalPeriod"
          v-model="form.fiscalPeriod"
          :options="PERIOD_OPTIONS"
          label="Periodo fiscal"
          required
          placeholder="Elige el periodo"
          hint="Anual o el bimestre al que se imputa. El contrato solo acepta estos siete."
          :error="err('fiscalPeriod')"
          @blur="touched.fiscalPeriod = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Registrando…' : 'Registrar la retención' }}
      </button>
    </template>
  </ModalShell>
</template>
