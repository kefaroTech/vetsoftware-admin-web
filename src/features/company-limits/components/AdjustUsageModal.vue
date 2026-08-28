<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import SignedActionModal, {
  type SignedActionSignature,
} from '@/components/ui/SignedActionModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import {
  USAGE_ADJUSTMENT_CONSEQUENCE,
  USAGE_ADJUSTMENT_NOTE_REQUIRED,
  USAGE_ADJUSTMENT_REASONS,
  USAGE_ADJUSTMENT_REASON_MAX,
  projectedUsage,
  validateDelta,
  parseDelta,
} from '../composables/companyLimitsText'
import type { AdjustCompanyUsageRequest, CompanyLimitRow } from '../types/company-limits.types'

/**
 * <b>Corregir un contador</b> — `POST /system/company-limit-events/companies/
 * {companyId}/usage-adjustments`.
 *
 * <p><b>Este SÍ es un `SignedActionModal`, y es el único de la pantalla.</b> El
 * cuerpo tiene `reasonCode` y `reason`, así que aquí el motivo de lista cerrada
 * viaja de verdad al servidor y queda en la bitácora junto a la firma que pone el
 * backend (`authz.currentSystemUserId()`). Es la diferencia con abrir una ventana
 * de prueba, donde el motivo no tendría dónde ir.
 *
 * <p><b>El eje no se elige aquí, se hereda de la tarjeta.</b> `limitDimensionId` y
 * `capacityUnit` salen de la fila desde la que se abrió el modal. Poner un
 * desplegable de ejes sería a la vez una segunda oportunidad de equivocarse y una
 * lista que se queda corta: `capacityUnit` ya no es el enum de cuatro valores que
 * su nombre sugiere, sino el <code>code</code> de la dimensión, y un eje sembrado
 * después no estaría en ninguna lista escrita a mano.
 *
 * <p><b>Se enseña a cuánto quedaría antes de firmar.</b> Un delta con el signo
 * cambiado es el error más fácil de cometer en esta pantalla, y el único momento
 * en que se puede detectar es antes de mandarlo: la corrección no se deshace.
 *
 * <p><b>Por qué el error del movimiento va en su propio `ErrorSummary`.</b>
 * `SignedActionModal` valida sus dos campos y no conoce este tercero, así que
 * cuando emite `submit` con el movimiento mal escrito hay que pararlo aquí. Se
 * para con el mismo mecanismo que usa él —resumen de errores con enlace al campo
 * y foco— y no con un botón deshabilitado, que no diría qué falta (WCAG 2.2
 * §3.3.1).
 */
const props = defineProps<{
  open: boolean
  row: CompanyLimitRow
  companyName: string
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; submit: [payload: AdjustCompanyUsageRequest] }>()

const deltaId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const delta = ref('')
const deltaTouched = ref(false)

const deltaError = computed(() => validateDelta(delta.value))

const summaryItems = computed(() =>
  toSummaryItems({ delta: deltaTouched.value ? deltaError.value : '' }, { delta: deltaId }, [
    'delta',
  ]),
)

/** A cuánto quedaría. `null` mientras no haya un movimiento legible o no se sepa el consumo. */
const projected = computed(() => projectedUsage(props.row.used, delta.value))

const consequence = computed(() => USAGE_ADJUSTMENT_CONSEQUENCE)

/** Cada apertura empieza en blanco: una corrección nunca hereda la del caso anterior. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    delta.value = ''
    deltaTouched.value = false
  },
)

/**
 * El motivo ya viene validado por `SignedActionModal` —nunca emite sin él—, así
 * que aquí solo queda el movimiento.
 *
 * <p>`reason` es obligatorio en el contrato y la nota es opcional en la firma:
 * cuando no se escribió nota, viaja el rótulo del motivo elegido. Mandar una
 * cadena vacía sería un 400; inventarse un texto distinto del que el operador
 * eligió sería peor.
 */
function onSignature(signature: SignedActionSignature) {
  deltaTouched.value = true
  if (deltaError.value) {
    void summary.value?.focus()
    return
  }
  const label =
    USAGE_ADJUSTMENT_REASONS.find((reason) => reason.value === signature.reason)?.label ??
    signature.reason
  emit('submit', {
    limitDimensionId: props.row.capacity.limitDimensionId,
    capacityUnit: props.row.capacity.dimensionCode,
    delta: parseDelta(delta.value),
    reasonCode: signature.reason,
    reason: (signature.note ?? label).slice(0, USAGE_ADJUSTMENT_REASON_MAX),
  })
}
</script>

<template>
  <SignedActionModal
    :open="open"
    title="Corregir el contador"
    :subtitle="companyName"
    :icon="ICONS.EDIT"
    :question="`¿Corregir el contador de ${row.noun} de ${companyName}?`"
    :reasons="USAGE_ADJUSTMENT_REASONS"
    :note-required-reasons="USAGE_ADJUSTMENT_NOTE_REQUIRED"
    reason-hint="Es lo que explica esta corrección cuando alguien la audite dentro de dos ejercicios."
    note-label="Qué pasó"
    note-hint="Lo que el motivo por sí solo no cuenta: el número de la incidencia, qué migración, cuántas filas."
    :max-note-length="USAGE_ADJUSTMENT_REASON_MAX"
    :consequence="consequence"
    confirm-label="Corregir el contador"
    confirm-tone="danger"
    :saving="saving"
    saving-label="Corrigiendo…"
    @close="emit('close')"
    @submit="onSignature"
  >
    <template #details>
      <dl class="ds-detail-grid">
        <div>
          <dt class="ds-label">Eje</dt>
          <dd class="valor">{{ row.title }} ({{ row.capacity.dimensionCode }})</dd>
        </div>
        <div>
          <dt class="ds-label">Consumo actual</dt>
          <dd class="valor num">
            {{ row.used === null ? 'No se conoce' : row.used }}
          </dd>
        </div>
        <div>
          <dt class="ds-label">Techo</dt>
          <dd class="valor num">{{ row.limit === null ? 'Sin techo declarado' : row.limit }}</dd>
        </div>
      </dl>
    </template>

    <template #extra>
      <ErrorSummary ref="summary" :items="summaryItems" />

      <AppInput
        :id="deltaId"
        v-model="delta"
        label="Movimiento"
        type="number"
        inputmode="numeric"
        required
        hint="Es la diferencia, no el total. Escribe −500 para restar quinientos."
        :error="deltaTouched ? deltaError : ''"
        @blur="deltaTouched = true"
      />

      <p v-if="projected !== null" class="ds-meta">
        El contador quedaría en <strong class="num">{{ projected }}</strong
        >. Compruébalo antes de firmar: la corrección no se deshace.
      </p>
      <p v-else-if="row.used === null" class="ds-meta">
        No se puede anticipar en cuánto quedaría: el servidor no manda el consumo actual de este
        eje.
      </p>
    </template>
  </SignedActionModal>
</template>

<style scoped>
.valor {
  margin: var(--space-4) 0 0;
}

.num {
  font-variant-numeric: tabular-nums;
}
</style>
