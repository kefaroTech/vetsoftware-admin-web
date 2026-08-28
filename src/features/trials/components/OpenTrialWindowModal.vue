<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import {
  TRIAL_WINDOW_NOT_EXTENDABLE,
  addDays,
  businessToday,
  daysLeftInclusive,
} from '../composables/trialWindowText'
import type { OpenTrialWindowRequest } from '../types/trials.types'

/**
 * <b>Abrir una ventana de prueba</b> — `POST /system/company-trial-windows/
 * companies/{companyId}`.
 *
 * <p><b>Por qué esto NO es un `SignedActionModal`, habiendo uno.</b> La firma de
 * `SignedActionModal` es un motivo de lista cerrada que viaja al servidor y queda
 * en la auditoría. Este cuerpo no tiene dónde ponerlo: sus tres campos son
 * `startDate`, `windowDays` y `sourceQuoteId`, y nada más. Pedir un motivo que el
 * borde descarta es peor que no pedirlo, porque el operador cree que queda
 * registrado cuando no queda nada — es el mismo criterio con el que
 * `http.client.ts` se niega a inventarse la cabecera del motivo de acceso de
 * soporte mientras el backend no la lea.
 *
 * <p><b>Lo que sí hay es una firma, y es mejor que una frase:</b>
 * `sourceQuoteId` es obligatorio en el contrato. No se puede abrir una prueba sin
 * apuntar a la cotización que la vendió, y ese número sí se puede auditar y
 * contar. La consecuencia va escrita arriba del formulario, que es lo que
 * `SignedActionModal` aporta en las pantallas donde sí encaja.
 *
 * <p><b>El último día se calcula y se enseña antes de confirmar.</b> `windowDays`
 * cuenta el primer día: 30 días desde el 1 terminan el 30, y el 30 se trabaja
 * entero. Es la aritmética que más se equivoca a ojo, así que la pantalla la hace
 * y la escribe con la fecha puesta. Se rotula «previsto» porque quien la fija es
 * el servidor: aquí se enseña lo que va a pedirse, no lo que ya quedó guardado.
 *
 * <p><b>Y se avisa si empieza en el pasado.</b> Retrodatar el inicio no está
 * prohibido —la cotización pudo aceptarse hace días— pero se come días de prueba
 * que el cliente no va a poder usar, y como la ventana <b>no se amplía nunca</b>,
 * ese error no tiene arreglo después. Se dice antes, con los números.
 */
const props = defineProps<{
  open: boolean
  companyName: string
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; submit: [payload: OpenTrialWindowRequest] }>()

const startId = useId()
const daysId = useId()
const quoteId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive({ startDate: '', windowDays: '', sourceQuoteId: '' })
const touched = reactive({ startDate: false, windowDays: false, sourceQuoteId: false })

/** Hoy en la zona del negocio, no en la del navegador. */
const today = computed(() => businessToday())

const daysNumber = computed(() => {
  const parsed = Number(form.windowDays.trim())
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN
})

const quoteNumber = computed(() => {
  const parsed = Number(form.sourceQuoteId.trim())
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN
})

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function validateStartDate(value: string): string {
  if (!value) return 'La fecha de inicio es obligatoria.'
  if (!ISO_DATE.test(value)) return 'La fecha no es válida. Usa el calendario del campo.'
  return ''
}

function validateWindowDays(value: string): string {
  if (!value.trim()) return 'Los días de la ventana son obligatorios.'
  const n = daysNumber.value
  if (Number.isNaN(n) || n < 1) return 'Tienen que ser un número entero de 1 o más.'
  if (n > 365)
    return 'Más de 365 días no es una prueba, es un contrato gratis. Si hace falta tanto, se acuerda comercialmente.'
  return ''
}

function validateQuote(value: string): string {
  if (!value.trim())
    return 'La cotización de origen es obligatoria: es lo que justifica esta prueba cuando alguien la audite.'
  const n = quoteNumber.value
  if (Number.isNaN(n) || n < 1) return 'Escribe el número de la cotización, sin el «#».'
  return ''
}

const errors = computed(() => ({
  startDate: validateStartDate(form.startDate),
  windowDays: validateWindowDays(form.windowDays),
  sourceQuoteId: validateQuote(form.sourceQuoteId),
}))

type Field = keyof typeof errors.value

const ORDER: Field[] = ['startDate', 'windowDays', 'sourceQuoteId']

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(ORDER.map((f) => [f, touched[f] ? errors.value[f] : ''])),
    { startDate: startId, windowDays: daysId, sourceQuoteId: quoteId },
    ORDER,
  ),
)

function err(field: Field): string {
  return touched[field] ? errors.value[field] : ''
}

/**
 * El último día, incluido: `inicio + (días − 1)`. Nulo mientras los dos campos no
 * sean legibles — un hueco honesto antes que una fecha inventada.
 */
const previewEnd = computed(() => {
  if (errors.value.startDate || errors.value.windowDays) return null
  return addDays(form.startDate, daysNumber.value - 1)
})

/** Lo que quedará de verdad si el inicio ya pasó. */
const previewLeft = computed(() =>
  previewEnd.value ? daysLeftInclusive(previewEnd.value, today.value) : null,
)

const startsInThePast = computed(() => !errors.value.startDate && form.startDate < today.value)

const backdateWarning = computed(() => {
  if (!startsInThePast.value || previewEnd.value === null || previewLeft.value === null) return ''
  const spent = daysNumber.value - previewLeft.value
  return `Empieza en el pasado: de los ${daysNumber.value} días, ${spent} ya han transcurrido y le quedarían ${previewLeft.value}, contando hoy. La ventana no se puede ampliar después.`
})

/** Cada apertura empieza en blanco, con el inicio propuesto en hoy. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.startDate = today.value
    form.windowDays = ''
    form.sourceQuoteId = ''
    touched.startDate = false
    touched.windowDays = false
    touched.sourceQuoteId = false
  },
)

function submit() {
  touched.startDate = true
  touched.windowDays = true
  touched.sourceQuoteId = true
  if (ORDER.some((field) => errors.value[field])) {
    void summary.value?.focus()
    return
  }
  emit('submit', {
    startDate: form.startDate,
    windowDays: daysNumber.value,
    sourceQuoteId: quoteNumber.value,
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Abrir una ventana de prueba"
    :subtitle="companyName"
    :icon="ICONS.HISTORY"
    accent="warn"
    role="alertdialog"
    compact
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <p class="ds-dialog-body">
          ¿Poner a <strong>{{ companyName }}</strong> en prueba?
        </p>

        <!-- La consecuencia que no se deshace. Va SIEMPRE, no solo cuando el
             formulario está completo: es la razón de que este modal exista. -->
        <div class="ds-banner ds-banner--warning" role="note">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ TRIAL_WINDOW_NOT_EXTENDABLE }}</span>
        </div>

        <AppInput
          :id="startId"
          v-model="form.startDate"
          label="Primer día de la prueba"
          type="date"
          required
          :error="err('startDate')"
          @blur="touched.startDate = true"
        />

        <AppInput
          :id="daysId"
          v-model="form.windowDays"
          label="Días de la ventana"
          type="number"
          inputmode="numeric"
          required
          hint="Cuentan desde el primer día, incluido."
          :error="err('windowDays')"
          @blur="touched.windowDays = true"
        />

        <!-- El resultado de la aritmética que se hace mal a ojo. -->
        <p v-if="previewEnd" class="ds-meta">
          Último día en prueba, incluido:
          <strong>{{ formatDate(previewEnd) }}</strong>
          — se trabaja entero. Lo fija el servidor al abrirla; aquí se enseña lo previsto.
        </p>

        <div v-if="backdateWarning" class="ds-banner ds-banner--warning" role="status">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ backdateWarning }}</span>
        </div>

        <AppInput
          :id="quoteId"
          v-model="form.sourceQuoteId"
          label="Cotización que la vendió"
          type="number"
          inputmode="numeric"
          required
          hint="Es la firma de esta prueba: sin cotización no hay nada que auditar."
          :error="err('sourceQuoteId')"
          @blur="touched.sourceQuoteId = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Abriendo…' : 'Abrir la ventana de prueba' }}
      </button>
    </template>
  </ModalShell>
</template>
