<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { PLATFORM_SETUP_TEXTS } from '@/features/platform-setup/types/platform-setup.types'
import {
  validateDayCount,
  validateExternalProvider,
  validateInvoiceDay,
} from '../composables/platformBillingValidators'
import {
  INVOICE_DAY_MAX,
  INVOICE_DAY_MIN,
  type PlatformBillingConfigResponse,
  type UpdatePlatformBillingConfigRequest,
} from '../types/platform-billing.types'

/**
 * Las políticas del negocio, en un formulario (§4.6).
 *
 * <p><b>Es un formulario, no un documento</b> (§3.2): sus valores se editan, no
 * se agregan, así que va con `ds-card` y campos reales — nada de `<dl>` ni de
 * `<input disabled>`. Y es <b>uno solo</b>, no un CRUD: la tabla tiene una fila
 * garantizada por el esquema, así que no hay «crear», ni «eliminar», ni un
 * listado de un elemento. La única acción es guardar.
 *
 * <p><b>Convención de formularios del repositorio, entera</b>: validador puro por
 * campo, `computed errors`, mapa `touched` que arranca todo en `false`, el error
 * solo aparece tras `@blur` del campo o tras un `validate()` fallido,
 * `ErrorSummary` con el texto <b>literalmente idéntico</b> al del error en línea
 * (`toSummaryItems` con el orden explícito del DOM) y `defineExpose`. Nunca
 * validación prematura.
 *
 * <p><b>Accesibilidad.</b> `aria-describedby` y `aria-invalid` los ponen ya
 * `AppInput`/`AppSelect` a partir de `error` y `hint`, que es el hueco sistémico
 * que §5.6 pide no heredar. El foco se gestiona en el guardado: si la validación
 * falla va al `ErrorSummary` (`role="alert"`), y si el guardado sale bien va al
 * banner de confirmación, que lleva `tabindex="-1"`. Quedarse en el botón dejaría
 * a quien usa lector de pantalla sin saber que pasó algo.
 *
 * <p><b>Vocabulario.</b> §4 prohíbe «bloquear», «suspender el acceso», «cortar»,
 * «desactivar la cuenta» e «inhabilitar» en toda la consola, y esta pantalla es
 * justo donde estaría la tentación: los días de cortesía alimentan el paso a solo
 * lectura. No existe ni existirá corte total de acceso, así que el aviso que
 * acompaña al campo lo dice explícitamente en vez de dejarlo a la imaginación de
 * quien lo lea.
 */
const props = defineProps<{
  initial: PlatformBillingConfigResponse
  saving?: boolean
  /** Tarifas `PUBLISHED`, ya filtradas por el composable. */
  priceListOptions: { value: number; label: string }[]
  priceListsLoading?: boolean
  priceListsError?: string | null
  /** `true` justo después de un guardado correcto: pinta y enfoca la confirmación. */
  saved?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: UpdatePlatformBillingConfigRequest]
  retryPriceLists: []
}>()

/**
 * «Sin tarifa por defecto» necesita un valor propio porque `AppSelect` no
 * distingue «no elegido» de «elegido: ninguna». Se usa `0` —que no es un `id`
 * válido— y se traduce a `null` al enviar. Quitar la tarifa es una decisión
 * legítima: la columna es nulable y el backend lo contempla.
 */
const NO_PRICE_LIST = 0

const ids = {
  defaultPriceListId: useId(),
  defaultGraceDays: useId(),
  defaultTrialDays: useId(),
  invoiceDayOfMonth: useId(),
  defaultPaymentTermDays: useId(),
  externalBillingProvider: useId(),
}

type Field = keyof typeof ids

/** El orden es el del DOM, no el de las claves del objeto (WCAG 2.2 §2.4.3). */
const FIELD_ORDER: Field[] = [
  'defaultPriceListId',
  'defaultGraceDays',
  'defaultTrialDays',
  'invoiceDayOfMonth',
  'defaultPaymentTermDays',
  'externalBillingProvider',
]

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)
const confirmation = ref<HTMLElement | null>(null)

const form = reactive({
  defaultPriceListId: NO_PRICE_LIST,
  defaultGraceDays: '',
  defaultTrialDays: '',
  invoiceDayOfMonth: '',
  defaultPaymentTermDays: '',
  externalBillingProvider: '',
})

const touched = reactive<Record<Field, boolean>>({
  defaultPriceListId: false,
  defaultGraceDays: false,
  defaultTrialDays: false,
  invoiceDayOfMonth: false,
  defaultPaymentTermDays: false,
  externalBillingProvider: false,
})

let baseline = JSON.stringify(form)

function reset(initial: PlatformBillingConfigResponse) {
  form.defaultPriceListId = initial.defaultPriceList?.id ?? NO_PRICE_LIST
  form.defaultGraceDays = String(initial.defaultGraceDays)
  form.defaultTrialDays = String(initial.defaultTrialDays)
  form.invoiceDayOfMonth = String(initial.invoiceDayOfMonth)
  form.defaultPaymentTermDays = String(initial.defaultPaymentTermDays)
  form.externalBillingProvider = initial.externalBillingProvider ?? ''
  for (const field of FIELD_ORDER) touched[field] = false
  baseline = JSON.stringify(form)
}

watch(() => props.initial, reset, { immediate: true })

/**
 * Tras guardar, lo que hay en pantalla pasa a ser la nueva referencia de «sin
 * cambios»: si no, salir justo después de guardar avisaría de un trabajo que ya
 * está a salvo. El foco va al banner de confirmación (§5.1).
 */
watch(
  () => props.saved,
  async (saved) => {
    if (!saved) return
    baseline = JSON.stringify(form)
    await nextTick()
    confirmation.value?.focus()
  },
)

const errors = computed<Record<Field, string>>(() => ({
  // La tarifa por defecto es opcional en el contrato: quitarla es válido y no es
  // un error de formulario. Que falte sí impide dar de alta una empresa, y eso se
  // dice con un aviso, no rechazando el guardado.
  defaultPriceListId: '',
  defaultGraceDays: validateDayCount(form.defaultGraceDays, 'los días de cortesía'),
  defaultTrialDays: validateDayCount(form.defaultTrialDays, 'los días de prueba'),
  invoiceDayOfMonth: validateInvoiceDay(form.invoiceDayOfMonth),
  defaultPaymentTermDays: validateDayCount(form.defaultPaymentTermDays, 'el plazo de pago'),
  externalBillingProvider: validateExternalProvider(form.externalBillingProvider),
}))

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

const priceListChoices = computed(() => [
  { value: NO_PRICE_LIST, label: 'Sin tarifa por defecto' },
  ...props.priceListOptions,
])

/** Sin tarifa elegida: es el paso 5 de la puesta en marcha, con sus palabras. */
const missingPriceList = computed(() => form.defaultPriceListId === NO_PRICE_LIST)

/**
 * La tarifa guardada ya no está entre las publicadas: se archivó, volvió a
 * borrador o desapareció. El desplegable no la puede ofrecer, así que hay que
 * decirlo. Si no, el campo aparecería en «Sin tarifa por defecto» sin que nadie
 * lo haya tocado y el primer guardado la borraría en silencio.
 */
const savedListUnavailable = computed(
  () =>
    props.initial.defaultPriceList !== null &&
    props.priceListsLoading !== true &&
    !props.priceListOptions.some((option) => option.value === props.initial.defaultPriceList?.id),
)

function isDirty(): boolean {
  return JSON.stringify(form) !== baseline
}

function validate(): boolean {
  for (const field of FIELD_ORDER) touched[field] = true
  return FIELD_ORDER.every((field) => !errors.value[field])
}

function submit() {
  if (!validate()) {
    summary.value?.focus()
    return
  }
  emit('submit', {
    defaultPriceListId:
      form.defaultPriceListId === NO_PRICE_LIST ? null : Number(form.defaultPriceListId),
    defaultGraceDays: Number(form.defaultGraceDays.trim()),
    defaultTrialDays: Number(form.defaultTrialDays.trim()),
    invoiceDayOfMonth: Number(form.invoiceDayOfMonth.trim()),
    defaultPaymentTermDays: Number(form.defaultPaymentTermDays.trim()),
    externalBillingProvider: form.externalBillingProvider.trim() || null,
  })
}

useUnsavedChangesGuard(isDirty)

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-card ds-stack ds-stack--18" @submit.prevent="submit">
    <ErrorSummary ref="summary" :items="summaryItems" />

    <p
      v-if="saved"
      ref="confirmation"
      tabindex="-1"
      class="ds-banner ds-banner--success aviso"
      role="status"
    >
      <component :is="ICONS.SUCCESS" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">
        Políticas guardadas. Se aplican a los contratos que se creen a partir de ahora; los que ya
        existen conservan lo que se pactó con cada cliente.
      </span>
    </p>

    <div v-if="priceListsError" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">{{ priceListsError }}</span>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--sm"
        @click="emit('retryPriceLists')"
      >
        <component :is="ICONS.RETRY" :size="14" aria-hidden="true" />
        Reintentar
      </button>
    </div>

    <div class="ds-grid-2">
      <div class="ds-grid-span">
        <AppSelect
          :id="ids.defaultPriceListId"
          v-model="form.defaultPriceListId"
          :options="priceListChoices"
          label="Tarifa por defecto"
          :disabled="priceListsLoading"
          :placeholder="priceListsLoading ? 'Cargando…' : 'Sin tarifa por defecto'"
          hint="Con esta tarifa se cotiza y se crea el contrato inicial de toda empresa nueva. Solo se ofrecen las publicadas: apuntar a un borrador dejaría la configuración por hecha y el alta rota."
          @blur="touch('defaultPriceListId')"
        />
      </div>

      <p
        v-if="savedListUnavailable"
        class="ds-banner ds-banner--warning ds-grid-span aviso"
        role="status"
      >
        <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
        <span class="ds-flex-fill">
          La tarifa guardada ({{ initial.defaultPriceList?.name }} ·
          {{ initial.defaultPriceList?.code }}) ya no está publicada, así que no aparece en la
          lista. Si guardas ahora sin elegir otra, la configuración se quedará sin tarifa por
          defecto.
        </span>
      </p>

      <p
        v-else-if="missingPriceList"
        class="ds-banner ds-banner--warning ds-grid-span aviso"
        role="status"
      >
        <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
        <span class="ds-flex-fill">
          Sin tarifa por defecto no se puede dar de alta ninguna empresa: es el paso 5 de «{{
            PLATFORM_SETUP_TEXTS.heading
          }}».
        </span>
      </p>

      <AppInput
        :id="ids.defaultGraceDays"
        v-model="form.defaultGraceDays"
        label="Días de cortesía"
        required
        type="number"
        inputmode="numeric"
        hint="Días de cortesía tras el vencimiento antes de pasar a solo lectura. Se puede subir por contrato para un cliente grande."
        :error="err('defaultGraceDays')"
        @blur="touch('defaultGraceDays')"
      />

      <AppInput
        :id="ids.defaultTrialDays"
        v-model="form.defaultTrialDays"
        label="Días de prueba"
        required
        type="number"
        inputmode="numeric"
        hint="Con cuántos días de prueba nace un contrato nuevo. 0 = sin prueba: la empresa entra directamente en cobro."
        :error="err('defaultTrialDays')"
        @blur="touch('defaultTrialDays')"
      />

      <p class="ds-banner ds-banner--info ds-grid-span aviso">
        <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
        <span class="ds-flex-fill">
          Pasada la cortesía, la cuenta pasa a <strong>solo lectura</strong>. La empresa conserva la
          consulta y la impresión de toda su información, incluida su historia clínica; deja de
          poder crear y modificar hasta que se regularice el pago. No hay ningún estado por debajo
          de ese.
        </span>
      </p>

      <AppInput
        :id="ids.invoiceDayOfMonth"
        v-model="form.invoiceDayOfMonth"
        label="Día de emisión de los cobros"
        required
        type="number"
        inputmode="numeric"
        :hint="`Qué día del mes se emiten los cobros. Del ${INVOICE_DAY_MIN} al ${INVOICE_DAY_MAX} porque febrero no llega a 29: un día mayor dejaría meses sin emitir.`"
        :error="err('invoiceDayOfMonth')"
        @blur="touch('invoiceDayOfMonth')"
      />

      <AppInput
        :id="ids.defaultPaymentTermDays"
        v-model="form.defaultPaymentTermDays"
        label="Plazo de pago"
        required
        type="number"
        inputmode="numeric"
        hint="Días desde la emisión hasta el vencimiento de la factura. 0 = pago inmediato: vence el mismo día en que se emite."
        :error="err('defaultPaymentTermDays')"
        @blur="touch('defaultPaymentTermDays')"
      />

      <div class="ds-grid-span">
        <AppInput
          :id="ids.externalBillingProvider"
          v-model="form.externalBillingProvider"
          label="Proveedor de facturación externa"
          placeholder="Sin proveedor"
          hint="Con qué sistema se emite la factura fiscal de las suscripciones. Aquí solo se registra su referencia; el documento lo emite ese sistema. Déjalo vacío mientras no haya ninguno."
          :error="err('externalBillingProvider')"
          @blur="touch('externalBillingProvider')"
        />
      </div>
    </div>

    <div class="ds-actions">
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : 'Guardar políticas' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
/* Los avisos son `<p>`, y el margen por defecto del párrafo los descuadraría
   dentro de la rejilla. El resto —fondo, borde, disposición— lo pone
   `.ds-banner`, que no se reescribe aquí. */
.aviso {
  margin: 0;
}
</style>
