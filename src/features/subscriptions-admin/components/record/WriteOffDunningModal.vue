<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { formatDateTime } from '../../composables/entitlementText'
import {
  WRITE_OFF_ACCESS_NOTE,
  WRITE_OFF_CONFIRM_LABEL,
  WRITE_OFF_MEANING,
  WRITE_OFF_RECOVERY_NOTE,
  WRITE_OFF_TITLE,
  toDateTimeInput,
  validateDaysOverdue,
  validateOccurredAt,
  validateWriteOffReason,
} from '../../composables/dunningRecordText'
import type { DunningEventDraft } from '../../types/dunning-record.types'

/**
 * <b>Dar de baja contable</b> — declarar que una deuda no se va a cobrar.
 *
 * <p><b>Por qué tiene formulario propio y no es una opción del otro.</b>
 * `WRITTEN_OFF` es el único hito de esta pantalla que no describe algo que pasó:
 * es una <b>decisión</b>, tomada aquí y con consecuencias contables. Ofrecerla
 * como el quinto valor de un desplegable la dejaría a un clic de «anoté una
 * llamada», con el mismo botón, el mismo peso visual y la misma confirmación. Así
 * que vive en su propio bloque, al final de la pantalla, con su propio verbo y
 * con esta confirmación, que dice lo que significa.
 *
 * <p><b>Las tres cosas que la confirmación tiene que decir</b>, y que son
 * justamente las que alguien podría dar por supuestas al revés:
 *
 * <ol>
 *   <li><b>Qué es</b>: una decisión de contabilidad, no una nota interna.</li>
 *   <li><b>Que no se deshace</b>: la bitácora no tiene `PUT` ni `DELETE`. Si la
 *       deuda se cobra después, se anota una reactivación encima; esta anotación
 *       no se retira.</li>
 *   <li><b>Que no cambia nada del acceso de la empresa.</b> Es el malentendido
 *       más caro posible aquí: declarar incobrable no «cierra» la cuenta de
 *       nadie. Su nivel de uso lo decide el contrato, y en ningún caso pierde la
 *       consulta e impresión de su propia información.</li>
 * </ol>
 *
 * <p><b>La justificación es obligatoria</b> y no se puede corregir después: es lo
 * único que explica, dentro de dos ejercicios, por qué esta deuda salió de los
 * libros. Y la pregunta repite el nombre de la empresa, como toda acción de este
 * expediente (§4.4.2).
 *
 * <p>`role="alertdialog"`: es una decisión con consecuencia y su cuerpo hay que
 * leerlo sí o sí.
 */
const props = defineProps<{
  open: boolean
  subscriptionNumber: string
  companyName: string
  /** Si ya se declaró antes, cuándo. Se dice; anotarlo dos veces no se impide. */
  alreadyWrittenOffAt: string | null
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; submit: [draft: DunningEventDraft] }>()

const occurredAtId = useId()
const daysOverdueId = useId()
const reasonId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const draft = reactive<DunningEventDraft>({
  eventType: 'WRITTEN_OFF',
  occurredAt: toDateTimeInput(new Date()),
  channel: '',
  daysOverdue: '',
  detail: '',
})

const touched = reactive({ occurredAt: false, daysOverdue: false, detail: false })

const errors = computed(() => ({
  occurredAt: validateOccurredAt(draft.occurredAt),
  daysOverdue: validateDaysOverdue(draft.daysOverdue),
  detail: validateWriteOffReason(draft.detail),
}))

const shown = computed(() => ({
  occurredAt: touched.occurredAt ? errors.value.occurredAt : '',
  daysOverdue: touched.daysOverdue ? errors.value.daysOverdue : '',
  detail: touched.detail ? errors.value.detail : '',
}))

const summaryItems = computed(() =>
  toSummaryItems(
    shown.value,
    { occurredAt: occurredAtId, daysOverdue: daysOverdueId, detail: reasonId },
    ['occurredAt', 'daysOverdue', 'detail'],
  ),
)

const question = computed(
  () => `¿Declarar incobrable la deuda de ${props.subscriptionNumber}, de ${props.companyName}?`,
)

const alreadyText = computed(() =>
  props.alreadyWrittenOffAt
    ? `Esta deuda ya se declaró incobrable el ${formatDateTime(props.alreadyWrittenOffAt)}. Si anotas otra, las dos quedan en el expediente.`
    : null,
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    draft.occurredAt = toDateTimeInput(new Date())
    draft.daysOverdue = ''
    draft.detail = ''
    touched.occurredAt = false
    touched.daysOverdue = false
    touched.detail = false
  },
)

function submit() {
  touched.occurredAt = true
  touched.daysOverdue = true
  touched.detail = true
  if (Object.values(errors.value).some(Boolean)) {
    void summary.value?.focus()
    return
  }
  emit('submit', { ...draft })
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="WRITE_OFF_TITLE"
    :subtitle="`${subscriptionNumber} · ${companyName}`"
    :icon="ICONS.WARNING"
    role="alertdialog"
    accent="warn"
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <p class="ds-dialog-body">{{ question }}</p>

        <div class="ds-banner ds-banner--warning">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <div class="ds-stack ds-stack--8 ds-flex-fill">
            <span>{{ WRITE_OFF_MEANING }}</span>
            <span>{{ WRITE_OFF_RECOVERY_NOTE }}</span>
          </div>
        </div>

        <!-- La frase que impide el malentendido más caro: esto no toca el acceso
             de nadie. -->
        <div class="ds-banner ds-banner--info ds-banner--sm">
          <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
          <span>{{ WRITE_OFF_ACCESS_NOTE }}</span>
        </div>

        <p v-if="alreadyText" class="ds-meta">{{ alreadyText }}</p>

        <AppInput
          :id="occurredAtId"
          v-model="draft.occurredAt"
          type="datetime-local"
          label="Fecha de la decisión"
          required
          hint="Cuándo se tomó la decisión contable. No puede estar en el futuro."
          :error="shown.occurredAt"
          @blur="touched.occurredAt = true"
        />

        <AppInput
          :id="daysOverdueId"
          v-model="draft.daysOverdue"
          inputmode="numeric"
          label="Días de mora"
          hint="Días que llevaba vencida la deuda al declararla incobrable. Déjalo vacío si no lo sabes con certeza."
          :error="shown.daysOverdue"
          @blur="touched.daysOverdue = true"
        />

        <AppTextarea
          :id="reasonId"
          v-model="draft.detail"
          label="Justificación contable"
          required
          :rows="3"
          hint="Por qué esta deuda no se va a cobrar. Queda para siempre y no se puede corregir."
          :error="shown.detail"
          @blur="touched.detail = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--danger" :disabled="saving" @click="submit">
        {{ saving ? 'Anotando…' : WRITE_OFF_CONFIRM_LABEL }}
      </button>
    </template>
  </ModalShell>
</template>
