<script lang="ts">
import type { SignedActionReason } from '@/components/ui/SignedActionModal.vue'

/**
 * Por qué se cierra a mano un cuadre. Lista cerrada, no texto libre: dentro de
 * dos ejercicios alguien tiene que poder contar cuántos se cerraron «porque el
 * emisor rehízo la factura» y cuántos «porque el importe se dio por perdido», y
 * con prosa esa cuenta no se puede hacer.
 *
 * <p>El motivo viaja dentro de `resolutionNote` porque el contrato **no tiene
 * campo de motivo**: `ResolveExternalInvoiceReconciliationRequest` solo declara
 * `resolvedBySystemUserId`, `resolutionNote` y `postingPeriod`. Se antepone el
 * rótulo del motivo a la nota en vez de perderlo — ver
 * {@link composeResolutionNote}— y queda anotado como hueco del contrato: un
 * prefijo de texto se puede contar con un `LIKE`, pero no es un campo.
 */
export const RESOLUTION_REASONS: SignedActionReason[] = [
  { value: 'EXTERNAL_REISSUED', label: 'El emisor rehízo la factura y ahora coincide' },
  { value: 'CREDIT_NOTE', label: 'Se emitió una nota crédito que corrige la diferencia' },
  { value: 'ROUNDING', label: 'La diferencia es de redondeo y se acepta' },
  { value: 'WRITTEN_OFF', label: 'El importe se da por perdido' },
  { value: 'OUR_ERROR', label: 'El error era nuestro y ya está corregido' },
  { value: 'OTHER', label: 'Otro' },
]

/** Con estos dos el motivo por sí solo no dice qué pasó, así que la nota es obligatoria. */
export const RESOLUTION_NOTE_REQUIRED = ['OTHER', 'OUR_ERROR']

/** Lo que cabe en `resolutionNote` (`@Size(max = 255)` del DTO). */
export const RESOLUTION_NOTE_MAX = 255

/**
 * Mete el rótulo del motivo delante de la nota, recortando al máximo del DTO.
 *
 * <p>Se recorta la NOTA y nunca el motivo: si algo se pierde, que sea el detalle
 * y no la clasificación, que es la parte que después se cuenta.
 */
export function composeResolutionNote(reasonLabel: string, note: string | null): string {
  const prefix = `${reasonLabel}.`
  if (!note) return prefix.slice(0, RESOLUTION_NOTE_MAX)
  const room = RESOLUTION_NOTE_MAX - prefix.length - 1
  return room <= 0 ? prefix.slice(0, RESOLUTION_NOTE_MAX) : `${prefix} ${note.slice(0, room)}`
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileCheck } from 'lucide-vue-next'
import AppInput from '@/components/ui/AppInput.vue'
import SignedActionModal, {
  type SignedActionSignature,
} from '@/components/ui/SignedActionModal.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { formatAmount } from '@/composables/format'
import ExternalAmountsGrid from './ExternalAmountsGrid.vue'
import VerdictLine from './VerdictLine.vue'
import {
  currentPostingPeriod,
  externalVerdict,
  POSTING_PERIOD_PATTERN,
} from '../composables/reconciliationVerdict'
import type {
  ExternalInvoiceReconciliationResponse,
  ResolveExternalInvoiceReconciliationRequest,
} from '../types/reconciliation.types'

/**
 * Cerrar un cuadre a mano — la acción que se firma.
 *
 * <p>Envuelve `SignedActionModal`, que es la pieza compartida de las once
 * pantallas que escriben algo que después hay que poder explicar. No se replica
 * nada de lo suyo: el motivo de lista cerrada, la nota, el foco al resumen de
 * errores y la garantía de que nunca emite sin motivo son de allí.
 * `confirmLabel` va nombrado —«Cerrar el cuadre»— porque el componente lo exige
 * y porque «Confirmar» no dice qué queda hecho (WCAG 2.2 §3.3.4).
 *
 * <p>Lo que este añade es el <b>periodo contable</b>, que el contrato exige con su
 * propio patrón y que decide en qué mes queda imputado el cierre. Va en el slot
 * `extra` del modal firmado, dentro del mismo formulario, y se valida antes de
 * emitir.
 */
const props = defineProps<{
  open: boolean
  reconciliation: ExternalInvoiceReconciliationResponse | null
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [data: ResolveExternalInvoiceReconciliationRequest]
}>()

const auth = useAuthStore()

const period = ref(currentPostingPeriod())
const periodTouched = ref(false)

/** Cada apertura empieza en el mes corriente: una firma no hereda la del caso anterior. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    period.value = currentPostingPeriod()
    periodTouched.value = false
  },
)

const periodError = computed(() =>
  POSTING_PERIOD_PATTERN.test(period.value.trim())
    ? ''
    : 'El periodo contable va como año y mes: 2026-08.',
)

const shownPeriodError = computed(() => (periodTouched.value ? periodError.value : ''))

const verdict = computed(() =>
  props.reconciliation ? externalVerdict(props.reconciliation.status) : null,
)

const question = computed(() =>
  props.reconciliation
    ? `¿Cerrar el cuadre del documento #${props.reconciliation.billingDocumentId} de la empresa #${props.reconciliation.companyId}?`
    : '',
)

const consequence = computed(() => {
  if (!props.reconciliation) return ''
  const base =
    'El cuadre queda cerrado y firmado con tu usuario, y se imputa al periodo contable que elijas. La firma no se borra.'
  if (props.reconciliation.status === 'MISSING_EXTERNAL')
    return `${base} Ojo: este documento sigue SIN factura externa — cerrarlo no la crea, solo deja escrito que alguien decidió no esperarla.`
  return base
})

/**
 * Sin identificador de usuario en la sesión no se puede firmar: el contrato
 * exige `resolvedBySystemUserId` y ponerle un cero inventaría un autor. Se dice
 * y se bloquea, en vez de mandar una firma que no identifica a nadie.
 */
const signerId = computed(() => auth.userId)

function submit(signature: SignedActionSignature) {
  periodTouched.value = true
  const id = signerId.value
  if (periodError.value || id === null) return
  const label =
    RESOLUTION_REASONS.find((reason) => reason.value === signature.reason)?.label ??
    signature.reason
  emit('submit', {
    resolvedBySystemUserId: id,
    resolutionNote: composeResolutionNote(label, signature.note),
    postingPeriod: period.value.trim(),
  })
}
</script>

<template>
  <SignedActionModal
    v-if="reconciliation && verdict"
    :open="open"
    title="Cerrar el cuadre"
    subtitle="Queda firmado con tu usuario y con el periodo contable que elijas."
    :icon="FileCheck"
    :question="question"
    :consequence="consequence"
    :reasons="RESOLUTION_REASONS"
    reason-label="Por qué se cierra"
    reason-hint="Es lo que alguien va a leer dentro de dos ejercicios para entender esta decisión."
    :note-required-reasons="RESOLUTION_NOTE_REQUIRED"
    note-label="Detalle"
    :max-note-length="200"
    note-hint="El motivo se guarda delante del detalle: el contrato no tiene un campo aparte para él."
    confirm-label="Cerrar el cuadre"
    confirm-tone="primary"
    accent="amatista"
    :width="700"
    :saving="saving"
    saving-label="Cerrando…"
    @close="emit('close')"
    @submit="submit"
  >
    <template #details>
      <div class="ds-stack ds-stack--10">
        <VerdictLine :verdict="verdict" explain />
        <ExternalAmountsGrid :reconciliation="reconciliation" />
        <p class="ds-meta">
          Devengado por nosotros:
          <span class="ds-num">{{ formatAmount(reconciliation.computedTotal) }}</span>
        </p>
      </div>
    </template>

    <template #extra>
      <AppInput
        v-model="period"
        label="Periodo contable"
        required
        placeholder="2026-08"
        hint="Año y mes al que se imputa el cierre. Decide en qué mes aparece."
        :error="shownPeriodError"
        @blur="periodTouched = true"
      />

      <p v-if="signerId === null" class="ds-banner ds-banner--error" role="alert">
        <span>
          La sesión no trae un identificador de usuario, así que esta firma no puede identificar a
          nadie y el cierre no se va a enviar. Vuelve a iniciar sesión y reinténtalo.
        </span>
      </p>
    </template>
  </SignedActionModal>
</template>
