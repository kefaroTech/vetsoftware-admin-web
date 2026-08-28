<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { useCompanyLocations } from '../../../composables/useCompanyLocations'
import {
  BILLING_TAX_REGIME_OPTIONS,
  CESSION_CONSEQUENCE,
  CESSION_DATA_AUTHORIZATIONS_GAP,
  CESSION_NO_REASON_FIELD,
  PERSON_KIND_OPTIONS,
  TAX_ID_KIND_OPTIONS,
  billingProfileName,
  businessToday,
} from '../../../composables/companyCessionText'
import {
  CESSION_FIELD_ORDER,
  cessionBackdateWarning,
  cessionErrors,
  emptyCessionForm,
  isCessionFieldShown,
  toSuccessionRequest,
  type CessionField,
} from '../../../composables/cessionForm'
import type {
  CompanyBillingProfileResponse,
  SucceedCompanyBillingProfileRequest,
} from '../../../types/company-cession.types'

/**
 * <b>Ceder el contrato</b> — `POST /company-billing-profile/succession`.
 *
 * <p><b>Por qué esto NO es un `SignedActionModal`.</b> Mismo criterio que
 * `OpenTrialWindowModal.vue`: el cuerpo no tiene campo de motivo ni de nota, y un
 * desplegable de motivos que el borde descarta es peor que ninguno, porque el
 * operador cree que quedó registrado. Aquí, además, la elección del operador
 * tampoco cambiaría qué se manda —a diferencia de `GrantTrialModal.vue`, donde el
 * motivo decide qué campo pasa a obligatorio—, así que sería adorno puro. Lo que
 * sí lleva es la consecuencia escrita arriba del formulario, que es lo que
 * `SignedActionModal` aporta en las pantallas donde encaja.
 *
 * <p><b>La fecha de efecto es la línea que parte la responsabilidad.</b> Todo lo
 * facturado antes es del titular saliente; todo lo posterior, del entrante. No se
 * rellena con hoy en silencio: se pide, y se avisa si cae en el pasado —una
 * cesión retroactiva mueve de destinatario facturas que ya se emitieron— o si cae
 * antes de que el titular actual entrara, que directamente no tiene sentido.
 *
 * <p><b>Los nombres cambian con el tipo de persona, y no se mandan los que
 * sobran.</b> Una jurídica tiene razón social; una natural, nombre y apellidos.
 * Mandar los cuatro campos de persona natural vacíos en una cesión a una empresa
 * deja cadenas vacías donde el contrato espera ausencia, y eso acaba imprimiéndose
 * en una factura.
 *
 * <p><b>Se declara lo que la cesión no arrastra.</b> Las autorizaciones de
 * tratamiento de datos del titular anterior no se heredan y quedan pendientes de
 * reconfirmar; esta pantalla no puede listarlas porque el contrato no las publica,
 * así que lo dice con palabras antes de firmar en vez de callarlo o de pintar un
 * contador en cero. Ver {@link CESSION_DATA_AUTHORIZATIONS_GAP}.
 */
const props = defineProps<{
  open: boolean
  companyName: string
  /** El titular al que se sucede. `null` si la empresa no tiene ninguno. */
  currentHolder: CompanyBillingProfileResponse | null
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: SucceedCompanyBillingProfileRequest]
}>()

const personKindId = useId()
const taxIdKindId = useId()
const taxIdFieldId = useId()
const digitId = useId()
const legalNameId = useId()
const firstNameId = useId()
const lastNameId = useId()
const addressId = useId()
const countryFieldId = useId()
const stateFieldId = useId()
const cityFieldId = useId()
const emailId = useId()
const regimeId = useId()
const effectiveFromId = useId()

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const {
  countryOptions,
  stateOptions,
  cityOptions,
  loadingStates,
  loadingCities,
  loadCountries,
  loadStates,
  loadCities,
  clearStatesAndCities,
  clearCities,
} = useCompanyLocations()

const countryId = ref<number | null>(null)
const stateId = ref<number | null>(null)

const form = reactive(emptyCessionForm())

const touched = reactive<Record<CessionField, boolean>>({
  taxId: false,
  legalName: false,
  firstName: false,
  lastName: false,
  address: false,
  cityId: false,
  billingEmail: false,
  effectiveFrom: false,
})

const isLegal = computed(() => form.personKind === 'LEGAL')
const today = computed(() => businessToday())

const errors = computed(() => cessionErrors(form, props.currentHolder))

const FIELD_IDS: Record<CessionField, string> = {
  taxId: taxIdFieldId,
  legalName: legalNameId,
  firstName: firstNameId,
  lastName: lastNameId,
  address: addressId,
  cityId: cityFieldId,
  billingEmail: emailId,
  effectiveFrom: effectiveFromId,
}

/** Un error solo se acusa si su campo está pintado y ya se tocó. */
function shown(field: CessionField): boolean {
  return isCessionFieldShown(field, form.personKind) && touched[field]
}

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(
      CESSION_FIELD_ORDER.map((field) => [field, shown(field) ? errors.value[field] : '']),
    ),
    FIELD_IDS,
    CESSION_FIELD_ORDER,
  ),
)

function err(field: CessionField): string {
  return shown(field) ? errors.value[field] : ''
}

/** Ceder con efecto en el pasado mueve facturas ya emitidas de destinatario. */
const backdateWarning = computed(() =>
  errors.value.effectiveFrom ? '' : cessionBackdateWarning(form.effectiveFrom, today.value),
)

const outgoingName = computed(() =>
  props.currentHolder ? billingProfileName(props.currentHolder) : '',
)

async function onCountryChange(id: number) {
  countryId.value = id
  stateId.value = null
  form.cityId = 0
  clearStatesAndCities()
  await loadStates(id)
}

async function onStateChange(id: number) {
  stateId.value = id
  form.cityId = 0
  clearCities()
  await loadCities(id)
}

/** Cada apertura empieza en blanco: una cesión nunca hereda los datos de otra. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(form, emptyCessionForm())
    countryId.value = null
    stateId.value = null
    clearStatesAndCities()
    for (const field of CESSION_FIELD_ORDER) touched[field] = false
  },
)

onMounted(() => void loadCountries())

function submit() {
  for (const field of CESSION_FIELD_ORDER) touched[field] = true
  const blocking = CESSION_FIELD_ORDER.some(
    (field) => isCessionFieldShown(field, form.personKind) && errors.value[field],
  )
  if (blocking) {
    void summary.value?.focus()
    return
  }
  emit('submit', toSuccessionRequest(form))
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Ceder el contrato"
    :subtitle="companyName"
    :icon="ICONS.COMPANY"
    accent="warn"
    role="alertdialog"
    :width="720"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <p class="ds-dialog-body">
          ¿Ceder el contrato de <strong>{{ companyName }}</strong>
          <template v-if="outgoingName">, hoy a nombre de {{ outgoingName }}</template>
          , a un titular nuevo?
        </p>

        <div class="ds-banner ds-banner--warning" role="note">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ CESSION_CONSEQUENCE }}</span>
        </div>

        <!-- Lo que la cesión NO arrastra. Va antes de firmar, no después: es
             trabajo que alguien tiene que asumir y hoy no lo recuerda ninguna
             pantalla (R14). -->
        <div class="ds-banner ds-banner--info" role="note">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ CESSION_DATA_AUTHORIZATIONS_GAP }}</span>
        </div>

        <AppInput
          :id="effectiveFromId"
          v-model="form.effectiveFrom"
          label="El nuevo titular responde desde"
          type="date"
          required
          hint="Lo facturado antes de esta fecha sigue siendo del titular saliente."
          :error="err('effectiveFrom')"
          @blur="touched.effectiveFrom = true"
        />

        <div v-if="backdateWarning" class="ds-banner ds-banner--warning" role="status">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ backdateWarning }}</span>
        </div>

        <AppSelect
          :id="personKindId"
          v-model="form.personKind"
          :options="PERSON_KIND_OPTIONS"
          label="Tipo de persona"
          required
        />

        <div class="ds-wrap-row">
          <AppSelect
            :id="taxIdKindId"
            v-model="form.taxIdKind"
            :options="TAX_ID_KIND_OPTIONS"
            label="Tipo de documento"
            required
          />
          <AppInput
            :id="taxIdFieldId"
            v-model="form.taxId"
            label="Documento"
            required
            :error="err('taxId')"
            @blur="touched.taxId = true"
          />
          <AppInput
            :id="digitId"
            v-model="form.verificationDigit"
            label="Dígito de verificación"
            :maxlength="1"
            hint="Opcional."
          />
        </div>

        <AppInput
          v-if="isLegal"
          :id="legalNameId"
          v-model="form.legalName"
          label="Razón social"
          required
          :error="err('legalName')"
          @blur="touched.legalName = true"
        />

        <template v-else>
          <div class="ds-wrap-row">
            <AppInput
              :id="firstNameId"
              v-model="form.firstName"
              label="Primer nombre"
              required
              :error="err('firstName')"
              @blur="touched.firstName = true"
            />
            <AppInput v-model="form.middleName" label="Segundo nombre" hint="Opcional." />
          </div>
          <div class="ds-wrap-row">
            <AppInput
              :id="lastNameId"
              v-model="form.lastName"
              label="Primer apellido"
              required
              :error="err('lastName')"
              @blur="touched.lastName = true"
            />
            <AppInput v-model="form.secondLastName" label="Segundo apellido" hint="Opcional." />
          </div>
        </template>

        <AppInput
          :id="addressId"
          v-model="form.address"
          label="Dirección de facturación"
          required
          :error="err('address')"
          @blur="touched.address = true"
        />

        <div class="ds-wrap-row">
          <AppSelect
            :id="countryFieldId"
            :model-value="countryId"
            :options="countryOptions"
            label="País"
            required
            @update:model-value="onCountryChange"
          />
          <AppSelect
            :id="stateFieldId"
            :model-value="stateId"
            :options="stateOptions"
            label="Departamento"
            required
            :disabled="!countryId || loadingStates"
            :placeholder="loadingStates ? 'Cargando…' : 'Selecciona una opción'"
            @update:model-value="onStateChange"
          />
          <AppSelect
            :id="cityFieldId"
            v-model="form.cityId"
            :options="cityOptions"
            label="Ciudad"
            required
            :disabled="!stateId || loadingCities"
            :placeholder="loadingCities ? 'Cargando…' : 'Selecciona una opción'"
            :error="err('cityId')"
            @blur="touched.cityId = true"
          />
        </div>

        <AppInput
          :id="emailId"
          v-model="form.billingEmail"
          label="Correo de facturación"
          type="email"
          required
          :error="err('billingEmail')"
          @blur="touched.billingEmail = true"
        />

        <AppSelect
          :id="regimeId"
          v-model="form.taxRegime"
          :options="BILLING_TAX_REGIME_OPTIONS"
          label="Régimen"
          required
        />

        <AppCheckbox v-model="form.withholdingAgent" label="Es agente de retención" />

        <p class="ds-meta">{{ CESSION_NO_REASON_FIELD }}</p>
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--danger" :disabled="saving" @click="submit">
        {{ saving ? 'Cediendo…' : 'Ceder el contrato' }}
      </button>
    </template>
  </ModalShell>
</template>
