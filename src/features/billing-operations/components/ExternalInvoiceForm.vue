<script setup lang="ts">
import { computed, reactive, useId, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { length, maxLength } from '@/composables/validators'
import { parseISODate } from '@/composables/format'
import type { RegisterExternalInvoiceRequest } from '../types/billing-operations.types'

/**
 * El único formulario de toda la pantalla de cobranza: los cuatro datos con los
 * que se anota la factura fiscal que **otro sistema** emitió.
 *
 * <p><b>Aquí no se emite nada.</b> VetSoftware no factura al cliente de la
 * suscripción: lo hace el proveedor externo, y esto solo guarda su referencia
 * para poder cruzarla después. Por eso los rótulos hablan de «lo que devolvió el
 * proveedor» y el botón dice «Registrar la referencia», no «Facturar».
 *
 * <p>Convención de formularios del repositorio, sin desviarse: validador puro por
 * campo → `computed errors` → mapa `touched` que arranca en `false` → el error
 * solo se pinta tras `@blur` o tras un `validate()` fallido → `ErrorSummary` con
 * el **mismo texto literal** que el error en línea (GOV.UK, *Validation
 * pattern*) y el foco puesto en él. `AppInput` ata el mensaje al control con
 * `aria-describedby` y marca `aria-invalid`.
 */
const props = defineProps<{ defaultProvider?: string | null }>()

const emit = defineEmits<{ submit: [payload: RegisterExternalInvoiceRequest] }>()

type Field = 'invoiceNumber' | 'cufe' | 'issuedAt' | 'provider'

const ids: Record<Field, string> = {
  invoiceNumber: useId(),
  cufe: useId(),
  issuedAt: useId(),
  provider: useId(),
}

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive<Record<Field, string>>({
  invoiceNumber: '',
  cufe: '',
  issuedAt: '',
  provider: '',
})

const touched = reactive<Record<Field, boolean>>({
  invoiceNumber: false,
  cufe: false,
  issuedAt: false,
  provider: false,
})

/**
 * La fecha la pone el PROVEEDOR, así que puede ser anterior a hoy — lo que no
 * puede es ser futura: una factura fiscal no se emite mañana, y aceptarla aquí
 * mete en la contabilidad una emisión que todavía no ocurrió.
 */
function validateIssuedAt(value: string): string {
  if (!value.trim()) return 'La fecha de emisión es obligatoria.'
  const parsed = parseISODate(value)
  if (!parsed) return 'La fecha de emisión no es válida. Ejemplo: 03/03/2026'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (parsed.getTime() > today.getTime())
    return 'La fecha de emisión no puede ser futura: escribe la que trae la factura del proveedor.'
  return ''
}

const errors = computed<Record<Field, string>>(() => ({
  invoiceNumber: length(form.invoiceNumber, 'El número de la factura', 1, 60),
  cufe: maxLength(form.cufe, 'El CUFE', 100),
  issuedAt: validateIssuedAt(form.issuedAt),
  provider: length(form.provider, 'El proveedor', 1, 40),
}))

/** El orden del resumen es el orden VISUAL del formulario (WCAG §2.4.3), no el de las claves. */
const ORDER: Field[] = ['invoiceNumber', 'issuedAt', 'provider', 'cufe']

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(ORDER.map((f) => [f, touched[f] ? errors.value[f] : ''])),
    ids,
    ORDER,
  ),
)

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

/** El proveedor por defecto se propone, no se impone: es editable y se puede borrar. */
watch(
  () => props.defaultProvider,
  (provider) => {
    if (provider && !form.provider) form.provider = provider
  },
  { immediate: true },
)

function submit() {
  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    summary.value?.focus()
    return
  }
  emit('submit', {
    invoiceNumber: form.invoiceNumber.trim(),
    cufe: form.cufe.trim() || null,
    issuedAt: form.issuedAt,
    provider: form.provider.trim(),
  })
}

/** FORM-07 · lo que decide si cerrar el modal pide confirmación. */
function isDirty() {
  return ORDER.some((field) => form[field].trim() !== '')
}

defineExpose({ submit, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <ErrorSummary ref="summary" :items="summaryItems" />

    <!-- El aviso que evita el error caro: confundir esta factura con la de la
         clínica a sus clientes. Son dos emisores y dos numeraciones. -->
    <div class="ds-banner ds-banner--info">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        Esta es la factura que el proveedor externo emite a la empresa por su suscripción a
        VetSoftware. <strong>No es la facturación electrónica DIAN</strong> con la que la clínica le
        factura a los dueños de las mascotas: son dos emisores y dos numeraciones distintas.
      </span>
    </div>

    <AppInput
      :id="ids.invoiceNumber"
      v-model="form.invoiceNumber"
      label="Número de la factura externa"
      required
      hint="El consecutivo tal cual lo devolvió el proveedor."
      :error="err('invoiceNumber')"
      @blur="touched.invoiceNumber = true"
    />

    <AppInput
      :id="ids.issuedAt"
      v-model="form.issuedAt"
      label="Fecha de emisión"
      required
      type="date"
      hint="La que trae la factura, no la de hoy."
      :error="err('issuedAt')"
      @blur="touched.issuedAt = true"
    />

    <AppInput
      :id="ids.provider"
      v-model="form.provider"
      label="Proveedor"
      required
      :error="err('provider')"
      @blur="touched.provider = true"
    />

    <AppInput
      :id="ids.cufe"
      v-model="form.cufe"
      label="CUFE"
      hint="Opcional: no todos los proveedores lo devuelven."
      :error="err('cufe')"
      @blur="touched.cufe = true"
    />
  </form>
</template>
