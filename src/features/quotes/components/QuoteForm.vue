<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import {
  tooLong,
  validateEmail,
  validatePhone,
  validateProspectName,
  validateQuoteLines,
  validateTrialDays,
  validateValidUntil,
  type QuoteLineDraft,
} from '../composables/quoteFormValidators'
import {
  QUOTE_BILLING_CYCLE_OPTIONS,
  type CreateQuoteRequest,
  type QuoteBillingCycle,
  type QuoteResponse,
} from '../types/quotes.types'

/**
 * **El único formulario de esta feature**, y por eso se pinta como tal: `ds-card`, campos reales,
 * validación en vivo y un botón de guardar. Todo lo que viene después —el borrador creado y la
 * cotización enviada— se pinta con otro chasis, porque ya no se edita.
 *
 * <p>Convención de formularios del repositorio, sin desviarse: validador puro por campo →
 * `computed errors` → mapa `touched` que arranca todo en `false` → el error aparece solo tras
 * `@blur` o tras un `validate()` fallido → `defineExpose({ validate, isDirty })` → el padre aborta
 * y enfoca el `ErrorSummary`, cuyo texto es **literalmente el mismo** que el del error en línea.
 *
 * <p>`validUntil` usa `<input type="date">` nativo a propósito: esta consola no tiene primitiva de
 * fecha (el front del tenant sí, `DateInput`) y abrir esa divergencia por un solo control no está
 * justificado. El nativo trae calendario, teclado y localización del sistema.
 */
const props = defineProps<{
  itemOptions: { value: number; label: string }[]
  priceListOptions: { value: number; label: string }[]
  optionsLoading?: boolean
  optionsError?: string | null
  saving?: boolean
  /**
   * Cotización de la que parte esta, cuando se emite para reemplazar a una rechazada o vencida.
   * Se copian el prospecto, las condiciones y las líneas; **la fecha de vigencia no**, porque es
   * justo lo que hay que volver a decidir.
   */
  reissuedFrom?: QuoteResponse | null
}>()

const emit = defineEmits<{
  submit: [payload: Omit<CreateQuoteRequest, 'clientRequestId'>]
  cancel: []
  retryOptions: []
}>()

const ids = {
  prospectName: useId(),
  prospectDocument: useId(),
  prospectEmail: useId(),
  prospectPhone: useId(),
  priceListId: useId(),
  billingCycle: useId(),
  validUntil: useId(),
  trialDays: useId(),
  lines: useId(),
}

type Field = keyof typeof ids

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive({
  prospectName: '',
  prospectEmail: '',
  prospectDocument: '',
  prospectPhone: '',
  priceListId: null as number | null,
  billingCycle: 'MONTHLY' as QuoteBillingCycle,
  validUntil: '',
  trialDays: '',
  lines: [{ catalogItemId: null, quantity: '1', discountPercent: '0' }] as QuoteLineDraft[],
})

const touched = reactive<Record<Field, boolean>>({
  prospectName: false,
  prospectDocument: false,
  prospectEmail: false,
  prospectPhone: false,
  priceListId: false,
  billingCycle: false,
  validUntil: false,
  trialDays: false,
  lines: false,
})

let baseline = JSON.stringify(form)

/**
 * Copia la oferta de la que se parte cuando se emite una cotización nueva para reemplazar a otra.
 *
 * <p>Se copian el prospecto, las condiciones y las líneas —lo que ya se negoció—, y **no** la
 * fecha de vigencia: la original venció o se rechazó, así que volver a proponer su misma fecha es
 * el error que se está corrigiendo. Los importes tampoco se copian: los recalcula el servidor
 * contra la tarifa, que es lo que hace que esta cotización sea otra y no la misma.
 *
 * <p>Tras copiar se reajusta la referencia de «sin cambios»: el borrador precargado todavía no es
 * trabajo del usuario y salir de la pantalla no debería avisar de nada.
 */
watch(
  () => props.reissuedFrom,
  (source) => {
    if (!source) return
    form.prospectName = source.prospectName ?? ''
    form.prospectEmail = source.prospectEmail ?? ''
    form.prospectDocument = source.prospectDocument ?? ''
    form.prospectPhone = source.prospectPhone ?? ''
    form.priceListId = source.priceListId
    form.billingCycle = source.billingCycle
    form.trialDays = String(source.trialDays ?? '')
    form.lines = source.lines.map((line) => ({
      catalogItemId: line.catalogItemId,
      quantity: String(line.quantity),
      discountPercent: String(line.discountPercent),
    }))
    baseline = JSON.stringify(form)
  },
  { immediate: true },
)

const errors = computed<Record<Field, string>>(() => ({
  prospectName: validateProspectName(form.prospectName),
  prospectDocument: tooLong(form.prospectDocument, 'El documento', 50),
  prospectEmail: validateEmail(form.prospectEmail),
  prospectPhone: validatePhone(form.prospectPhone),
  priceListId: form.priceListId === null ? 'Debes seleccionar la tarifa.' : '',
  billingCycle: form.billingCycle ? '' : 'Debes seleccionar el ciclo de facturación.',
  validUntil: validateValidUntil(form.validUntil),
  trialDays: validateTrialDays(form.trialDays),
  lines: validateQuoteLines(form.lines),
}))

/** El orden es el del DOM, no el de las claves del objeto (WCAG 2.2 §2.4.3). */
const FIELD_ORDER: Field[] = [
  'prospectName',
  'prospectDocument',
  'prospectEmail',
  'prospectPhone',
  'priceListId',
  'billingCycle',
  'validUntil',
  'trialDays',
  'lines',
]

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(FIELD_ORDER.map((f) => [f, touched[f] ? errors.value[f] : ''])),
    ids,
    FIELD_ORDER,
  ),
)

function err(field: Field): string {
  return touched[field] ? errors.value[field] : ''
}

function touch(field: Field) {
  touched[field] = true
}

function addLine() {
  form.lines.push({ catalogItemId: null, quantity: '1', discountPercent: '0' })
}

function removeLine(index: number) {
  form.lines.splice(index, 1)
  touched.lines = true
}

function validate(): boolean {
  for (const field of FIELD_ORDER) touched[field] = true
  return FIELD_ORDER.every((field) => !errors.value[field])
}

function isDirty(): boolean {
  return JSON.stringify(form) !== baseline
}

function submit() {
  if (!validate()) {
    summary.value?.focus()
    return
  }
  emit('submit', {
    prospectName: form.prospectName.trim(),
    prospectEmail: form.prospectEmail.trim() || null,
    prospectDocument: form.prospectDocument.trim() || null,
    prospectPhone: form.prospectPhone.trim() || null,
    priceListId: form.priceListId as number,
    billingCycle: form.billingCycle,
    validUntil: form.validUntil,
    trialDays: form.trialDays.trim() ? Number(form.trialDays) : null,
    lines: form.lines.map((line) => ({
      catalogItemId: line.catalogItemId as number,
      quantity: Number(line.quantity),
      discountPercent: Number(line.discountPercent.replace(',', '.')),
    })),
  })
}

const lineCount = computed(() => form.lines.length)
const optionsBusy = computed(() => props.optionsLoading === true)

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-card ds-stack ds-stack--18" @submit.prevent="submit">
    <ErrorSummary ref="summary" :items="summaryItems" />

    <div v-if="optionsError" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ optionsError }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="emit('retryOptions')">
        <component :is="ICONS.RETRY" :size="14" />
        Reintentar
      </button>
    </div>

    <p v-if="reissuedFrom" class="ds-kicker">
      Se emite a partir de {{ reissuedFrom.quoteNumber }} · elige una fecha de vigencia nueva
    </p>

    <section class="ds-stack ds-stack--14" aria-labelledby="prospecto-titulo">
      <h2 id="prospecto-titulo" class="ds-title" tabindex="-1">A quién se cotiza</h2>
      <div class="ds-grid-2">
        <AppInput
          :id="ids.prospectName"
          v-model="form.prospectName"
          label="Nombre del prospecto"
          required
          :error="err('prospectName')"
          @blur="touch('prospectName')"
        />
        <AppInput
          :id="ids.prospectDocument"
          v-model="form.prospectDocument"
          label="Documento"
          placeholder="NIT o cédula"
          :error="err('prospectDocument')"
          @blur="touch('prospectDocument')"
        />
        <AppInput
          :id="ids.prospectEmail"
          v-model="form.prospectEmail"
          label="Correo"
          type="email"
          autocomplete="email"
          hint="Se propone luego como correo de quien acepta la oferta."
          :error="err('prospectEmail')"
          @blur="touch('prospectEmail')"
        />
        <AppInput
          :id="ids.prospectPhone"
          v-model="form.prospectPhone"
          label="Teléfono"
          inputmode="tel"
          :error="err('prospectPhone')"
          @blur="touch('prospectPhone')"
        />
      </div>
    </section>

    <section class="ds-stack ds-stack--14" aria-labelledby="condiciones-titulo">
      <h2 id="condiciones-titulo" class="ds-title" tabindex="-1">Condiciones de la oferta</h2>
      <div class="ds-grid-2">
        <AppSelect
          :id="ids.priceListId"
          v-model="form.priceListId"
          :options="priceListOptions"
          label="Tarifa"
          required
          :disabled="optionsBusy"
          :placeholder="optionsBusy ? 'Cargando…' : 'Selecciona una tarifa publicada'"
          hint="Solo tarifas publicadas y vigentes: el precio queda congelado contra la elegida."
          :error="err('priceListId')"
          @blur="touch('priceListId')"
        />
        <AppSelect
          :id="ids.billingCycle"
          v-model="form.billingCycle"
          :options="QUOTE_BILLING_CYCLE_OPTIONS"
          label="Ciclo de facturación"
          required
          :error="err('billingCycle')"
          @blur="touch('billingCycle')"
        />
        <div class="campo ds-stack ds-stack--8">
          <label :for="ids.validUntil" class="etiqueta">
            Vigente hasta<span class="obligatorio">*</span>
          </label>
          <input
            :id="ids.validUntil"
            v-model="form.validUntil"
            type="date"
            class="ds-field ds-focus-ring fecha"
            :class="err('validUntil') ? 'ds-field-invalid' : 'ds-field-rest'"
            :aria-invalid="!!err('validUntil') || undefined"
            :aria-describedby="`${ids.validUntil}-ayuda`"
            @blur="touch('validUntil')"
          />
          <p :id="`${ids.validUntil}-ayuda`" class="ds-hint">
            <span v-if="err('validUntil')" class="mensaje-error">{{ err('validUntil') }}</span>
            <span v-else>
              Hasta cuándo se respeta este precio. Pasada la fecha, la oferta vence.
            </span>
          </p>
        </div>
        <AppInput
          :id="ids.trialDays"
          v-model="form.trialDays"
          label="Días de prueba"
          type="number"
          placeholder="0"
          :error="err('trialDays')"
          @blur="touch('trialDays')"
        />
      </div>
    </section>

    <section class="ds-stack ds-stack--14" aria-labelledby="lineas-titulo">
      <div class="ds-block-head">
        <h2 id="lineas-titulo" class="ds-title" tabindex="-1">Qué se ofrece</h2>
        <p class="ds-meta">{{ lineCount }} {{ lineCount === 1 ? 'línea' : 'líneas' }}</p>
      </div>

      <p v-if="err('lines')" :id="ids.lines" class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ err('lines') }}</span>
      </p>

      <ul class="ds-list-reset ds-stack ds-stack--10">
        <li v-for="(line, index) in form.lines" :key="index" class="linea">
          <AppSelect
            v-model="line.catalogItemId"
            :options="itemOptions"
            :label="`Artículo de la línea ${index + 1}`"
            required
            :disabled="optionsBusy"
            :placeholder="optionsBusy ? 'Cargando…' : 'Selecciona un artículo activo'"
            @blur="touch('lines')"
          />
          <AppInput
            v-model="line.quantity"
            :label="`Cantidad de la línea ${index + 1}`"
            type="number"
            required
            @blur="touch('lines')"
          />
          <AppInput
            v-model="line.discountPercent"
            :label="`Descuento (%) de la línea ${index + 1}`"
            inputmode="decimal"
            @blur="touch('lines')"
          />
          <button
            type="button"
            class="ds-icon-btn ds-icon-btn--danger quitar"
            :disabled="form.lines.length === 1"
            :aria-label="`Quitar la línea ${index + 1}`"
            @click="removeLine(index)"
          >
            <component :is="ICONS.DELETE" :size="15" />
          </button>
        </li>
      </ul>

      <div>
        <button type="button" class="ds-btn ds-btn--ghost" @click="addLine">
          <component :is="ICONS.ADD" :size="15" />
          Añadir línea
        </button>
      </div>

      <p class="ds-meta">
        Los importes los calcula el servidor contra la tarifa elegida y quedan congelados en el
        borrador. Esta pantalla no los adelanta: una suma en cliente sería una segunda verdad que
        puede no coincidir con la del documento.
      </p>
    </section>

    <div class="ds-actions">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving || optionsBusy">
        {{ saving ? 'Creando…' : 'Crear borrador' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.linea {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-10);
}

.campo {
  min-width: 0;
}

.etiqueta {
  color: var(--text);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}

.obligatorio {
  color: var(--danger-500);
}

.fecha {
  width: 100%;
  font-family: inherit;
  font-size: inherit;
}

.mensaje-error {
  color: var(--danger-500);
}

.quitar {
  margin-bottom: var(--space-6);
}

/* `.ds-grid-2` ya colapsa sola a 640px; aquí solo colapsa la fila de línea, que a 680px
   tiene cuatro columnas y se queda sin ancho antes. */
@media (width <= 680px) {
  .linea {
    grid-template-columns: 1fr;
  }
}
</style>
