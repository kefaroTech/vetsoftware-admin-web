<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { SUBSCRIPTION_STATUS_CHANGE_REASON_OPTIONS } from '../../composables/subscriptionStatusText'
import type { SubscriptionResponse } from '../../types/subscriptions-admin.types'
import type {
  SubscriptionStatusChangeReason,
  SubscriptionStatusTransition,
} from '../../types/subscription-record.types'

/**
 * Una transición de estado con nombre (§3.4.2).
 *
 * <p><b>Esto no es un `<select>` con seis estados.</b> La ruta acepta un enum de
 * seis valores, pero exponerlo como desplegable convertiría una decisión de
 * negocio —«esta clínica pasa a solo lectura»— en un cambio de campo. Cada
 * transición ofrecida llega aquí con su verbo y su consecuencia ya escritos, y
 * este modal solo añade lo que falta: el motivo y la confirmación explícita.
 *
 * <p><b>La pregunta repite el nombre de la empresa.</b> Ninguna acción de este
 * expediente se confirma sin decir sobre qué empresa se actúa: es la misma razón
 * por la que la cabecera es permanente (§4.4.2).
 *
 * <p><b>`reason` es vocabulario cerrado, obligatorio en el contrato y en la
 * interfaz.</b> Ya no es una `AppTextarea` de texto libre: era un `String` que
 * el controlador pasaba tal cual al canal de auditoría, y un operador podía
 * colar saltos de línea y fabricar entradas de bitácora que parecieran de otro
 * evento (log injection, ASVS V7.3.1). El backend lo cerró a
 * `SubscriptionStatusChangeReason`, un enum de seis valores, y esta pantalla
 * ahora ofrece exactamente esos seis en un `AppSelect` — ver
 * `SUBSCRIPTION_STATUS_CHANGE_REASON_OPTIONS` en `subscriptionStatusText.ts`.
 * Sigue siendo la única fuente que explica seis meses después por qué una
 * cuenta cambió de estado; ahora, además, no se puede falsificar.
 *
 * <p>Convención de formularios del repositorio, sin desviarse: validador puro →
 * `computed errors` → mapa `touched` que arranca en `false` → el error solo se
 * pinta tras `@blur` o tras un envío fallido → `ErrorSummary` con el mismo texto
 * literal que el error en línea, y el foco puesto en él.
 */
const props = defineProps<{
  open: boolean
  transition: SubscriptionStatusTransition
  subscription: SubscriptionResponse
  companyName: string
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; submit: [reason: SubscriptionStatusChangeReason] }>()

const reasonId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = reactive<{ reason: SubscriptionStatusChangeReason | null }>({ reason: null })
const touched = reactive({ reason: false })

function validateReason(value: SubscriptionStatusChangeReason | null): string {
  if (!value)
    return 'El motivo es obligatorio: es lo que explica este cambio en la historia del contrato.'
  return ''
}

const errors = computed(() => ({ reason: validateReason(form.reason) }))

const summaryItems = computed(() =>
  toSummaryItems({ reason: touched.reason ? errors.value.reason : '' }, { reason: reasonId }, [
    'reason',
  ]),
)

function err(): string {
  return touched.reason ? errors.value.reason : ''
}

const question = computed(
  () =>
    `¿${props.transition.label} en ${props.subscription.subscriptionNumber}, de ${props.companyName}?`,
)

/** Se limpia al abrir: un motivo tecleado para OTRA transición no puede quedarse aquí. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.reason = null
    touched.reason = false
  },
)

function submit() {
  touched.reason = true
  if (errors.value.reason || !form.reason) {
    void summary.value?.focus()
    return
  }
  emit('submit', form.reason)
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="transition.label"
    :subtitle="`${subscription.subscriptionNumber} · ${companyName}`"
    :icon="ICONS.SUBSCRIPTION"
    role="alertdialog"
    compact
    :width="520"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <p class="ds-dialog-body">{{ question }}</p>
        <p class="ds-dialog-body">{{ transition.consequence }}</p>

        <!-- La política, literal y en el sitio donde se decide: no existe corte
             total de acceso, y quien pulsa tiene que leerlo antes. -->
        <div v-if="transition.policyNote" class="ds-banner ds-banner--info ds-banner--sm">
          <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
          <span>{{ transition.policyNote }}</span>
        </div>

        <AppSelect
          :id="reasonId"
          v-model="form.reason"
          :options="SUBSCRIPTION_STATUS_CHANGE_REASON_OPTIONS"
          label="Motivo"
          required
          placeholder="Selecciona el motivo…"
          hint="Queda en la historia del contrato. Es lo que se lee cuando alguien pregunta por qué."
          :error="err()"
          @blur="touched.reason = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Guardando…' : transition.label }}
      </button>
    </template>
  </ModalShell>
</template>
