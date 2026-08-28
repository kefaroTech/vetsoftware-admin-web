<script setup lang="ts">
import { computed } from 'vue'
import SignedActionModal, {
  type SignedActionSignature,
} from '@/components/ui/SignedActionModal.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import {
  TRIAL_OUTCOME_CONSEQUENCE,
  TRIAL_OUTCOME_OPTIONS,
  TRIAL_POLICY_OUTCOME_LABEL,
} from '../composables/trialWindowText'
import type {
  CompanyTrialGrantResponse,
  ConsumeTrialGrantRequest,
  TrialOutcome,
} from '../types/trials.types'

/**
 * <b>Escribir el desenlace de una concesión</b> — `POST /system/
 * company-trial-grants/companies/{companyId}/catalog-items/{catalogItemId}/
 * consumptions`.
 *
 * <p><b>Aquí la lista cerrada de `SignedActionModal` no es un adorno: es el
 * cuerpo.</b> `ConsumeTrialGrantRequest` tiene un único campo, `outcome`, y es
 * exactamente un valor de lista cerrada. Así que el desplegable del motivo <b>es</b>
 * el dato que viaja, y la garantía del componente —«nunca emite sin motivo»— se
 * convierte aquí en «nunca cierra una concesión sin decir qué pasó», que es la
 * regla que esta pantalla necesita. Por eso su rótulo no es «Motivo» sino la
 * pregunta que se está contestando.
 *
 * <p><b>Por qué se exige el desenlace habiendo el contrato hecho `outcome`
 * opcional.</b> Consumir sin desenlace deja la concesión cerrada y muda: se
 * pierde la única diferencia que importa, la que hay entre «se convirtió» y «se
 * perdió». Y como no existe operación que reescriba un desenlace, ese hueco no
 * se rellena después. Mandar el campo vacío sería escribir el cierre y tirar el
 * dato por el que se cierra.
 *
 * <p><b>Se enseña lo que la política decía antes de elegir.</b> Cuando el
 * desenlace no coincide con la política del artículo hay una conversación
 * pendiente con el cliente —se vendió una cosa y pasó otra—, y el único momento
 * en que se puede notar es ahora. No lo bloquea: lo dice.
 *
 * <p>⚠️ <b>La nota no viaja.</b> El cuerpo no tiene dónde ponerla, y el campo lo
 * dice en su pista en vez de dejar creer que queda registrada — mismo criterio
 * que `GrantTrialModal.vue` y que `OpenTrialWindowModal.vue`.
 */
const props = defineProps<{
  open: boolean
  /** La concesión que se cierra. El modal no la elige: la hereda de la fila. */
  grant: CompanyTrialGrantResponse | null
  companyName: string
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; submit: [payload: ConsumeTrialGrantRequest] }>()

/** Lo que la política del artículo decía que iba a pasar, para contrastarlo. */
const policyLine = computed(() => {
  const grant = props.grant
  if (!grant) return ''
  return `La política del artículo decía: «${TRIAL_POLICY_OUTCOME_LABEL[grant.policyTrialOutcome]}». Terminó el ${formatDate(grant.trialEndDate)}, que fue su último día.`
})

const question = computed(() =>
  props.grant
    ? `¿Qué pasó con el artículo #${props.grant.catalogItemId} de ${props.companyName} cuando terminó su prueba?`
    : '',
)

function onSigned(signature: SignedActionSignature) {
  // `SignedActionModal` no emite sin motivo, así que `reason` es siempre uno de
  // los cuatro desenlaces. `signature.note` no se manda: no hay campo.
  emit('submit', { outcome: signature.reason as TrialOutcome })
}
</script>

<template>
  <SignedActionModal
    v-if="grant"
    :open="open"
    title="Escribir el desenlace de la prueba"
    :subtitle="companyName"
    :icon="ICONS.HISTORY"
    :question="question"
    :reasons="TRIAL_OUTCOME_OPTIONS"
    reason-label="Qué pasó al vencer"
    reason-hint="Es el dato que se guarda. Sin él, la concesión queda cerrada sin que nadie sepa si se convirtió o se perdió."
    note-label="Nota"
    note-hint="Queda en esta pantalla y no viaja al servidor: el cuerpo del desenlace solo tiene ese campo."
    :consequence="TRIAL_OUTCOME_CONSEQUENCE"
    confirm-label="Escribir el desenlace"
    confirm-tone="primary"
    accent="amatista"
    :width="580"
    :saving="saving"
    saving-label="Escribiendo…"
    @close="emit('close')"
    @submit="onSigned"
  >
    <template #details>
      <p class="ds-meta">{{ policyLine }}</p>
    </template>
  </SignedActionModal>
</template>
