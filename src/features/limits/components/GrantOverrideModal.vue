<script lang="ts">
/** Puros y exportados: los barre una prueba sin montar el modal. */
export function validateLimitQuantity(value: string): string | null {
  const raw = value.trim()
  if (!raw) return 'Escribe el techo que se le concede.'
  if (!/^\d+$/.test(raw)) return 'El techo es un número entero de unidades. Ejemplo: 250'
  if (Number(raw) <= 0)
    return 'Un techo de cero no es una excepción: es dejar a la cuenta sin poder crear nada.'
  return null
}

export function validateValidFrom(value: string): string | null {
  if (!value) return 'Indica desde cuándo rige la excepción.'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return 'La fecha no es válida.'
  const d = new Date(`${value}T00:00:00`)
  if (
    Number.isNaN(d.getTime()) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
  )
    return 'Esa fecha no existe en el calendario.'
  return null
}
</script>

<script setup lang="ts">
import { computed, reactive, useId, watch } from 'vue'
import SignedActionModal, {
  type SignedActionSignature,
} from '@/components/ui/SignedActionModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { ICONS } from '@/constants/icons'
import {
  isoDay,
  OVERRIDE_NOTE_REQUIRED,
  OVERRIDE_REASON_LABEL,
  OVERRIDE_REASON_OPTIONS,
} from '../composables/limitText'
import type {
  GrantCompanyLimitOverrideRequest,
  LimitDimensionResponse,
  LimitOverrideReasonCode,
} from '../types/limits.types'

/**
 * **Negociar una excepción de techo.** Acción que se firma.
 *
 * <p><b>El motivo es de lista cerrada y lo impone `SignedActionModal`.</b> No se
 * reimplementa aquí ni el desplegable, ni el resumen de errores, ni la regla de
 * que sin motivo no se emite: la pieza compartida es la que sujeta eso, y
 * `tests/unit/signed-action-modal.spec.ts` la sujeta a ella. Lo que este
 * componente aporta son los tres datos propios de la excepción —eje, techo y
 * desde cuándo—, que viajan por el slot `details`.
 *
 * <p><b>Qué se manda como `reason`.</b> El contrato exige un `reason` no vacío
 * junto al `reasonCode`. Cuando quien firma escribe nota, esa es el `reason`;
 * cuando no —y el motivo elegido se explica solo—, se manda el rótulo del propio
 * motivo. No se inventa nada: es el mismo motivo, escrito. Y para los dos
 * motivos que NO se explican solos la nota es obligatoria, así que ahí siempre
 * hay texto de quien firmó.
 *
 * <p><b>Los ejes que ya tienen excepción viva no se ofrecen.</b> Solo puede haber
 * una por eje: dejar elegirlo llevaría a un rechazo del servidor sobre una
 * pantalla que había dicho que sí. Se listan aparte y se dice qué hacer.
 */
const props = defineProps<{
  open: boolean
  companyId: number
  dimensions: LimitDimensionResponse[]
  /** Ejes con excepción viva. Se excluyen del desplegable y se nombran abajo. */
  taken: Set<number>
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: GrantCompanyLimitOverrideRequest]
}>()

const dimensionId = useId()
const quantityId = useId()
const fromId = useId()

const form = reactive({
  limitDimensionId: null as number | null,
  limitQuantity: '',
  validFrom: isoDay(new Date()),
})
const touched = reactive({ limitDimensionId: false, limitQuantity: false, validFrom: false })

/** Cada apertura empieza en blanco: una excepción nunca hereda la del caso anterior. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.limitDimensionId = null
    form.limitQuantity = ''
    form.validFrom = isoDay(new Date())
    touched.limitDimensionId = false
    touched.limitQuantity = false
    touched.validFrom = false
  },
)

const available = computed(() => props.dimensions.filter((d) => !props.taken.has(d.id)))

const options = computed(() =>
  available.value.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
)

const takenNames = computed(() =>
  props.dimensions
    .filter((d) => props.taken.has(d.id))
    .map((d) => d.name)
    .join(', '),
)

const errors = computed(() => ({
  limitDimensionId:
    form.limitDimensionId === null ? 'Elige el eje al que se le concede la excepción.' : null,
  limitQuantity: validateLimitQuantity(form.limitQuantity),
  validFrom: validateValidFrom(form.validFrom),
}))

type Field = keyof typeof errors.value

function err(field: Field): string {
  return touched[field] ? (errors.value[field] ?? '') : ''
}

function submit(signature: SignedActionSignature) {
  touched.limitDimensionId = true
  touched.limitQuantity = true
  touched.validFrom = true

  const limitDimensionId = form.limitDimensionId
  if (limitDimensionId === null || errors.value.limitQuantity || errors.value.validFrom) return

  // Se estrecha contra la propia lista cerrada en vez de castear: si el modal
  // devolviera un motivo que este componente no conoce, el `as` lo dejaría
  // pasar hasta el backend y el 400 llegaría sin explicación.
  const reasonCode: LimitOverrideReasonCode | undefined = OVERRIDE_REASON_OPTIONS.find(
    (o) => o.value === signature.reason,
  )?.value
  if (reasonCode === undefined) return

  emit('submit', {
    limitDimensionId,
    limitQuantity: Number(form.limitQuantity.trim()),
    validFrom: form.validFrom,
    reasonCode,
    reason: signature.note ?? OVERRIDE_REASON_LABEL[reasonCode],
  })
}
</script>

<template>
  <SignedActionModal
    :open="open"
    title="Negociar una excepción de techo"
    :question="`¿Conceder a la empresa #${companyId} un techo distinto del que le tocaría por plan o por contrato?`"
    :reasons="OVERRIDE_REASON_OPTIONS"
    :note-required-reasons="OVERRIDE_NOTE_REQUIRED"
    reason-hint="La lista es cerrada para que dentro de dos ejercicios se pueda contar a cuántos clientes se les hizo excepción y por qué."
    note-label="Nota"
    note-hint="Lo que el motivo no captura: el número del ticket, con quién se acordó, hasta cuándo se revisa."
    consequence="El techo de este eje deja de seguir al plan. Un recálculo no lo repone: queda como excepción negociada hasta que alguien la revoque."
    confirm-label="Negociar la excepción"
    confirm-tone="primary"
    accent="amatista"
    :icon="ICONS.EDIT"
    :saving="saving"
    :width="600"
    @close="emit('close')"
    @submit="submit"
  >
    <template #details>
      <AppSelect
        :id="dimensionId"
        v-model="form.limitDimensionId"
        :options="options"
        label="Eje de cupo"
        required
        placeholder="Elige el eje"
        :error="err('limitDimensionId')"
        @blur="touched.limitDimensionId = true"
      />

      <p v-if="taken.size > 0" class="ds-meta">
        Ya tienen excepción viva y por eso no aparecen: {{ takenNames }}. Para cambiarles el techo,
        revoca la que tienen y negocia otra.
      </p>

      <AppInput
        :id="quantityId"
        v-model="form.limitQuantity"
        label="Techo concedido"
        required
        inputmode="numeric"
        placeholder="250"
        hint="Unidades que podrá tener. Sustituye al techo del plan o del contrato mientras la excepción viva."
        :error="err('limitQuantity')"
        @blur="touched.limitQuantity = true"
      />

      <AppInput
        :id="fromId"
        v-model="form.validFrom"
        label="Rige desde"
        required
        type="date"
        hint="Desde qué día vale. El contrato no admite fecha de fin en el alta: la excepción vive hasta que se revoque."
        :error="err('validFrom')"
        @blur="touched.validFrom = true"
      />
    </template>
  </SignedActionModal>
</template>
